import concurrent.futures
import tempfile
import time
import unittest
from pathlib import Path
import sys
import threading
import json
from urllib.request import urlopen, Request
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from classroom import Classroom, ClassroomError


class ClassroomTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.c=Classroom(self.temp.name,'test-only-password','deck',['A','B','C'])
        self.teacher=self.c.post('login',{'password':'test-only-password'},address='local')['_cookie']
        self.room=self.c.post('create',{'title':'Test'},self.teacher)['room']
        self.student=self.c.post('join',{'room':self.room},address='local')['token']
    def tearDown(self): self.temp.cleanup()
    def post(self,action,**data):
        return self.c.post(action,dict(room=self.room,requestId=str(time.time_ns()),**data),member_token=self.student)
    def control(self,op,**data): return self.c.post('control',dict(room=self.room,op=op,**data),self.teacher)
    def state(self): return self.c.get('state',{'room':self.room,'teacher':'1'},self.teacher,'')
    def test_privilege_and_isolation(self):
        with self.assertRaises(ClassroomError):self.c.post('control',{'room':self.room,'op':'end'},member_token=self.student)
        with self.assertRaises(ClassroomError):self.c.get('rooms',{},'','')
        other=self.c.post('create',{'title':'Other'},self.teacher)['room']
        with self.assertRaises(ClassroomError):self.c.get('state',{'room':other},'',self.student)
        self.post('question',page=1,text='Private classroom feedback')
        s=self.c.get('state',{'room':self.room},'',self.student)
        self.assertNotIn('posts',s);self.assertNotIn('feedback',s)
        self.assertEqual(self.c.ai_identity(self.room,self.student).split(':')[0],'class')
    def test_reactions_and_idempotency(self):
        request=dict(room=self.room,requestId='one')
        self.c.post('like',request,member_token=self.student)
        self.assertTrue(self.c.post('like',request,member_token=self.student)['duplicate'])
        with self.assertRaises(ClassroomError):self.post('like')
        self.assertEqual(self.state()['likeCounts'],{'1':1})
        self.control('likes',enabled=False)
        with self.assertRaises(ClassroomError):self.post('like')
        self.post('feedback',page=2,kind='confused');self.post('feedback',page=2,kind='understood')
        self.assertEqual(len(self.state()['feedback']),1)
        self.post('feedback',page=2,kind='');self.assertEqual(self.state()['feedback'],[])
    def test_danmaku_controls(self):
        with self.assertRaises(ClassroomError):self.post('danmaku',text='closed')
        self.control('danmaku',enabled=True)
        with self.assertRaises(ClassroomError):self.post('danmaku',text='x'*61)
        self.post('danmaku',text='<script>alert(1)</script>')
        post=self.state()['posts'][0];self.assertEqual(post['page'],1)
        with self.assertRaises(ClassroomError):self.post('danmaku',text='too soon')
        self.control('mute',id=post['id'])
        with self.assertRaises(ClassroomError):self.post('question',page=1,text='muted')
        self.control('remove',id=post['id']);self.assertEqual(self.state()['posts'],[])
        self.control('danmaku',enabled=False)
        self.assertFalse(self.state()['danmaku'])
    def test_page_events_and_restart(self):
        self.control('page',page=2);self.post('like')
        self.assertEqual(self.state()['likeCounts'],{'2':1})
        fresh=self.c.get('state',{'room':self.room,'role':'project'},'',self.student)
        self.assertEqual(fresh['events'],[])
        replay=self.c.get('state',{'room':self.room,'since':'0','boot':self.c.boot},'',self.student)
        self.assertEqual(len(replay['events']),1)
        self.control('page',page=3);self.assertEqual(self.state()['events'],[])
        self.control('danmaku',enabled=True)
        restart=Classroom(self.temp.name,'test-only-password','deck',['A','B','C'])
        fresh=restart.get('state',{'room':self.room},'',self.student)
        self.assertFalse(fresh['danmaku']);self.assertEqual(fresh['likeCounts'],{'2':1})
        self.assertNotEqual(self.c.boot,restart.boot)
    def test_end_retention_and_delete(self):
        self.post('question',page=3,text='Question')
        self.control('end')
        with self.assertRaises(ClassroomError):self.post('like')
        with self.assertRaises(ClassroomError):self.c.post('join',{'room':self.room})
        self.assertTrue(self.state()['ended'])
        self.assertEqual(len(self.c.get('export',{'room':self.room,'teacher':'1'},self.teacher,'')['posts']),1)
        with self.c.db() as db: db.execute('UPDATE rooms SET ended=?',(time.time()-31*86400,))
        self.assertEqual(self.c.get('rooms',{},self.teacher,'')['rooms'],[])
    def test_fifty_students_polling(self):
        tokens=[self.c.post('join',{'room':self.room},address='campus')['token'] for _ in range(50)]
        start=time.monotonic()
        def poll(token):
            for _ in range(3): self.c.get('state',{'room':self.room},'',token)
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as pool:list(pool.map(poll,tokens))
        self.assertEqual(self.state()['online'],50)
        self.assertLess(time.monotonic()-start,3)

    def test_http_cookie_csrf_and_source_blocking(self):
        import server
        previous=server.CLASSROOM;server.CLASSROOM=self.c
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.PresentationHandler)
        thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        base='http://127.0.0.1:'+str(http.server_address[1])
        try:
            request=Request(base+'/api/classroom/login',data=json.dumps({'password':'test-only-password'}).encode(),headers={'Origin':base,'Content-Type':'application/json'})
            with urlopen(request) as response:
                cookie=response.headers['Set-Cookie'];self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
            with urlopen(Request(base+'/api/classroom/rooms',headers={'Cookie':cookie.split(';')[0]})) as response:
                self.assertEqual(len(json.load(response)['rooms']),1)
            for path in ('/classroom.py','/configure_classroom.py','/classroom.sqlite3','/api/classroom/rooms'):
                with self.assertRaises(HTTPError) as error:urlopen(base+path)
                self.assertIn(error.exception.code,(401,404))
            request=Request(base+'/api/classroom/login',data=b'{}',headers={'Origin':'http://evil.test','Content-Type':'application/json'})
            with self.assertRaises(HTTPError) as error:urlopen(request)
            self.assertEqual(error.exception.code,403)
        finally:
            http.shutdown();http.server_close();thread.join();server.CLASSROOM=previous

    def test_two_decks_share_storage_without_leaking_rooms(self):
        self.control('danmaku',enabled=True)
        other=Classroom(self.temp.name,'test-only-password','other-deck',['X'])
        teacher=other.post('login',{'password':'test-only-password'},address='local')['_cookie']
        self.assertEqual(other.get('rooms',{},teacher,'')['rooms'],[])
        self.assertTrue(self.state()['danmaku'])
        with self.assertRaises(ClassroomError):other.get('state',{'room':self.room},'',self.student)

if __name__=='__main__':unittest.main()
