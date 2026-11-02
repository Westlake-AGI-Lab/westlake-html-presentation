"""No real token or external inference; actual HTTP handlers plus mock transport."""
import contextlib
import io
import json
import threading
import time
import unittest
from unittest.mock import patch
from urllib import request, error

from westlake_ppt.llm import university as u
from westlake_ppt.server import app


def payload(number=1):
    slides = [{'title':'First','content':'FIRST_ONLY'}, {'title':'Second','content':'SECOND_ONLY'}]
    return {'question':'Explain this slide', 'slides':slides,
            'currentSlide':dict(slides[number-1],number=number), 'stream':True, 'language':'en'}


class SessionTests(unittest.TestCase):
    def test_isolation_expiry_disconnect(self):
        s=u.Sessions(30); a=s.create('MOCK_A','Qwen'); b=s.create('MOCK_B','glm-flash')
        self.assertNotEqual(a,b); self.assertGreaterEqual(len(a),40)
        self.assertEqual(s.get(a).token,'MOCK_A');self.assertEqual(s.get(b).token,'MOCK_B')
        s.remove(a)
        for sid in (a,'missing'):
            with self.assertRaises(u.AccessError):s.get(sid)
        with patch.object(u.time,'time',return_value=time.time()+31):
            with self.assertRaises(u.AccessError):s.get(b)
        self.assertEqual(s.items,{})

    def test_rate_concurrency_and_cleanup(self):
        s=u.Sessions(30);a=s.create('MOCK','Qwen');b=s.create('OTHER','Qwen')
        student=s.acquire(a)
        with self.assertRaises(u.AccessError):s.acquire(a)
        other=s.acquire(b);s.release(other);s.release(student)
        s.remove(a);self.assertEqual(student.token,'')

    def test_context_current_only(self):
        for n,yes,no in [(1,'FIRST_ONLY','SECOND_ONLY'),(2,'SECOND_ONLY','FIRST_ONLY')]:
            body=u.chat_body(payload(n));text=json.dumps(body)
            self.assertIn(yes,text);self.assertNotIn(no,text);self.assertIn('Current slide /',text)
        with self.assertRaises(u.AccessError):u.chat_body(dict(payload(),images=[{'dataUrl':'mock'}]))
        with self.assertRaises(u.AccessError):u.chat_body(dict(payload(),history=[{'images':[{}]}]))

    def test_auth_alias_redaction_and_schema(self):
        student=u.Student('SENSITIVE_MOCK_TOKEN','Qwen',time.time()+60)
        captured=[]
        def opener(req,timeout):
            captured.append(req)
            return io.BytesIO(json.dumps({'choices':[{'finish_reason':'stop','message':{'content':'OK SENSITIVE_MOCK_TOKEN'}}]}).encode())
        real_upstream=u.upstream
        def wrapped(s,b):return real_upstream(s,b,opener=opener)
        with patch.object(u,'upstream',side_effect=wrapped):
            answer,model=u.infer(student,u.chat_body(payload()))
        self.assertEqual(answer,'OK [redacted]');self.assertEqual(model,'Qwen')
        req=captured[0];self.assertEqual(req.full_url,u.ENDPOINT)
        self.assertEqual(req.get_header('Authorization'),'Bearer SENSITIVE_MOCK_TOKEN')
        body=json.loads(req.data);self.assertEqual(body['model'],'Qwen');self.assertFalse(body['stream'])
        self.assertNotIn('input',body);self.assertNotIn('store',body)
        self.assertEqual(body['messages'][0]['role'],'system')
        self.assertIsNone(u.NoRedirect().redirect_request(None,None,302,'',{},'https://elsewhere.example'))

    def test_failures_never_expose_body(self):
        for status,code in [(401,'token_invalid'),(403,'model_unavailable'),(404,'model_unavailable'),(429,'quota'),(402,'quota'),(500,'provider_unavailable'),(302,'provider_unavailable'),(400,'schema'),(415,'schema')]:
            secret=io.BytesIO(b'SENSITIVE_MOCK_TOKEN')
            def opener(*args,**kwargs):raise error.HTTPError(u.ENDPOINT,status,'',{},secret)
            with self.assertRaises(u.AccessError) as caught:
                u.upstream(u.Student('SENSITIVE_MOCK_TOKEN','Qwen',time.time()+60),{},opener=opener)
            self.assertEqual(caught.exception.code,code);self.assertNotIn('SENSITIVE',str(caught.exception))
        for exc,code in [(error.URLError('SECRET'),'network'),(TimeoutError('SECRET'),'timeout')]:
            with self.assertRaises(u.AccessError) as caught:
                u.upstream(u.Student('SECRET','Qwen',time.time()+60),{},opener=lambda *a,**k: (_ for _ in ()).throw(exc))
            self.assertEqual(caught.exception.code,code);self.assertNotIn('SECRET',str(caught.exception))
        for result in [{}, {'choices':[{'finish_reason':'length','message':{'content':'partial'}}]}]:
            with self.assertRaises(u.AccessError):
                u.upstream(u.Student('SECRET','Qwen',time.time()+60),{},opener=lambda *a,**k:io.BytesIO(json.dumps(result).encode()))


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.stack=contextlib.ExitStack();self.addCleanup(self.stack.close)
        self.sessions=u.Sessions(30);self.stack.enter_context(patch.object(u,'SESSIONS',self.sessions))
        self.stack.enter_context(patch.object(u,'enabled',return_value=True))
        self.stack.enter_context(patch.object(app,'REQUEST_LIMITS',app.RequestLimits(100,1000,10)))
        self.calls=[]
        def inference(student,body):
            self.calls.append((student.token,student.model,body))
            if student.token=='MOCK_BAD':u.fail(401,'token_invalid','Invalid token; reconnect.')
            if student.token=='MOCK_QUOTA':u.fail(429,'quota','Quota reached.')
            return 'MOCK completed answer',student.model
        self.stack.enter_context(patch.object(u,'upstream',side_effect=inference))
        self.shared=self.stack.enter_context(patch.object(app,'open_upstream',side_effect=AssertionError('SHARED KEY USED')))
        self.http=app.ThreadingHTTPServer(('127.0.0.1',0),app.PresentationHandler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.addCleanup(self.stop)
        self.base='http://127.0.0.1:'+str(self.http.server_port)

    def stop(self):
        self.http.shutdown();self.http.server_close();self.thread.join()

    def post(self,path,data,cookie='',origin=None):
        req=request.Request(self.base+path,method='POST',data=json.dumps(data).encode(),headers={
            'Content-Type':'application/json','Origin':self.base if origin is None else origin,'Cookie':cookie})
        try:r=request.urlopen(req)
        except error.HTTPError as e:r=e
        with r:return r.status,json.load(r),r.headers

    def connect(self,token='MOCK_A',model='Qwen'):
        status,data,headers=self.post('/api/university/connect',{'token':token,'model':model})
        self.assertEqual(status,200);self.assertTrue(data['connected']);self.assertNotIn(token,json.dumps(data))
        cookie=headers['Set-Cookie'];self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
        return cookie.split(';')[0]

    def test_two_students_full_workflow_and_no_fallback(self):
        a=self.connect();b=self.connect('MOCK_B','glm-flash')
        for cookie,number,token,alias in [(a,1,'MOCK_A','Qwen'),(b,2,'MOCK_B','glm-flash'),(a,2,'MOCK_A','Qwen')]:
            status,data,_=self.post('/api/chat',payload(number),cookie)
            self.assertEqual(status,200);self.assertEqual(data['model'],alias)
            self.assertEqual(self.calls[-1][0],token);self.assertEqual(self.calls[-1][2]['model'],alias)
            text=json.dumps(self.calls[-1][2]);self.assertIn('FIRST_ONLY' if number==1 else 'SECOND_ONLY',text)
            self.assertNotIn('SECOND_ONLY' if number==1 else 'FIRST_ONLY',text)
        self.assertEqual(self.post('/api/chat',payload())[0],401)
        self.assertEqual(self.post('/api/university/disconnect',{},a)[0],200)
        self.assertEqual(self.post('/api/chat',payload(),a)[0],401)
        self.assertEqual(self.post('/api/chat',payload(),b)[0],200)
        for student in self.sessions.items.values():student.expires=0
        self.assertEqual(self.post('/api/chat',payload(),b)[0],401)
        self.shared.assert_not_called()

    def test_switch_reuses_isolated_token_and_subsequent_chat(self):
        a=self.connect();b=self.connect('MOCK_B','glm-flash')
        sid=a.split('=',1)[1];original=self.sessions.get(sid);expiry=original.expires
        for model in u.ALIASES:
            status,data,headers=self.post('/api/university/model',{'model':model,'token':'IGNORED'},a)
            self.assertEqual(status,200);self.assertEqual(data['model'],model)
            self.assertNotIn('Set-Cookie',headers);self.assertNotIn('MOCK_A',json.dumps(data))
            self.assertEqual(self.calls[-1][:2],('MOCK_A',model))
            self.assertEqual(self.calls[-1][2]['max_tokens'],16)
            self.assertEqual(self.calls[-1][2]['messages'],[{'role':'user','content':'Reply with OK.'}])
            self.assertIs(self.sessions.get(sid),original);self.assertEqual(original.expires,expiry)
            status,data,_=self.post('/api/chat',payload(2),a)
            self.assertEqual(status,200);self.assertEqual(data['model'],model)
        self.assertEqual(self.post('/api/chat',payload(),b)[1]['model'],'glm-flash')
        self.assertEqual(self.post('/api/university/model',{'model':'Qwen'})[0],401)
        self.assertEqual(self.post('/api/university/model',{'model':'Qwen'},a,'https://evil.example')[0],403)

    def test_switch_failure_retains_model_and_session(self):
        a=self.connect();sid=a.split('=',1)[1];student=self.sessions.get(sid)
        for code,status in [('quota',429),('model_unavailable',403),('timeout',504),('token_invalid',401),('provider_response',502)]:
            with patch.object(u,'probe',side_effect=u.AccessError(status,code,'Safe error')):
                result=self.post('/api/university/model',{'model':'glm-flash'},a)
            self.assertEqual(result[0],status);self.assertEqual(student.model,'Qwen')
            self.assertIs(self.sessions.get(sid),student);self.assertFalse(student.active)
        self.assertEqual(self.post('/api/university/model',{'model':'arbitrary'},a)[0],400)
        self.assertEqual(student.model,'Qwen')
        self.assertEqual(self.post('/api/chat',payload(),a)[0],200)

    def test_switch_blocks_chat_and_other_switch_and_checks_expiry(self):
        a=self.connect();sid=a.split('=',1)[1];student=self.sessions.get(sid)
        entered=threading.Event();finish=threading.Event()
        def probe(*args):entered.set();finish.wait(3)
        from concurrent.futures import ThreadPoolExecutor
        with patch.object(u,'probe',side_effect=probe), ThreadPoolExecutor(1) as pool:
            switching=pool.submit(self.post,'/api/university/model',{'model':'glm-flash'},a)
            self.assertTrue(entered.wait(2))
            self.assertEqual(student.model,'Qwen')
            self.assertEqual(self.post('/api/chat',payload(),a)[0],429)
            self.assertEqual(self.post('/api/university/model',{'model':'deepseek-flash'},a)[0],429)
            student.expires=0;finish.set()
            self.assertEqual(switching.result()[0],401)
            self.assertEqual(student.model,'Qwen');self.assertFalse(student.active)

    def test_parallel_students_keep_request_credentials(self):
        from concurrent.futures import ThreadPoolExecutor
        a=self.connect();b=self.connect('MOCK_B','glm-flash')
        barrier=threading.Barrier(2)
        def inference(student,body):
            barrier.wait(timeout=3)
            return 'MOCK '+student.model,student.model
        with patch.object(u,'upstream',side_effect=inference):
            with ThreadPoolExecutor(2) as pool:
                results=list(pool.map(lambda c:self.post('/api/chat',payload(),c),[a,b]))
        self.assertEqual([r[1]['model'] for r in results],['Qwen','glm-flash'])
        self.shared.assert_not_called()

    def test_session_lock_and_expiry_during_inference(self):
        a=self.connect();sid=a.split('=',1)[1];student=self.sessions.acquire(sid)
        self.assertEqual(self.post('/api/chat',payload(),a)[0],429)
        self.sessions.release(student)
        student.expires=0
        self.assertEqual(self.post('/api/chat',payload(),a)[0],401)
        self.shared.assert_not_called()

    def test_https_sets_secure_and_http_local_does_not(self):
        class CookieHandler:
            headers={'Host':'slides.example.edu'}
            client_address=('127.0.0.1',1)
            connection=object()
            output=[]
            def send_header(self,k,v):self.output.append((k,v))
        h=CookieHandler()
        with patch.dict('os.environ',{'UNIVERSITY_PUBLIC_ORIGIN':'https://slides.example.edu'}):
            app.PresentationHandler.student_cookie(h,'MOCK_SESSION')
            self.assertIn('; Secure',h.output[-1][1])
        h.headers={'Host':'127.0.0.1:8784'}
        app.PresentationHandler.student_cookie(h,'')
        self.assertNotIn('; Secure',h.output[-1][1]);self.assertIn('Max-Age=0',h.output[-1][1])

    def test_failed_probe_no_cookie_and_expired_token(self):
        status,data,headers=self.post('/api/university/connect',{'token':'MOCK_BAD','model':'Qwen'})
        self.assertEqual(status,401);self.assertNotIn('Set-Cookie',headers);self.assertFalse(self.sessions.items)
        a=self.connect();sid=a.split('=',1)[1];self.sessions.get(sid).token='MOCK_BAD'
        self.assertEqual(self.post('/api/chat',payload(),a)[0],401)
        self.assertNotIn(sid,self.sessions.items)
        self.shared.assert_not_called()

    def test_origin_size_unsupported_images_and_legacy_routes(self):
        a=self.connect();before=len(self.calls)
        self.assertEqual(self.post('/api/chat',payload(),a,'https://evil.example')[0],403)
        self.assertEqual(self.post('/api/chat',dict(payload(),images=[{}]),a)[0],422)
        self.assertEqual(self.post('/api/socratic',{'action':'start'},a)[0],422)
        self.assertEqual(len(self.calls),before)
        for path in ['/api/socratic','/api/personal-slides','/api/learning']:
            self.assertEqual(self.post(path,{},'')[0],401)
        self.assertEqual(self.post('/api/university/connect',{'token':'X'*9000,'model':'Qwen'})[0],413)
        self.assertEqual(self.post('/api/university/connect',{'token':'MOCK','model':'Offline'})[0],400)
        self.shared.assert_not_called()

    def test_remote_requires_https_and_secure_cookie(self):
        class H:
            headers={'Host':'10.21.3.45:8765'}
            client_address=('10.21.3.12',4000)
            connection=object()
        self.assertIsNone(u.secure_origin(H()))
        H.headers={'Host':'slides.example.edu'};H.client_address=('127.0.0.1',1)
        with patch.dict('os.environ',{'UNIVERSITY_PUBLIC_ORIGIN':'https://slides.example.edu'}):
            self.assertEqual(u.secure_origin(H()),'https://slides.example.edu')
        self.shared.assert_not_called()


if __name__=='__main__':unittest.main()
