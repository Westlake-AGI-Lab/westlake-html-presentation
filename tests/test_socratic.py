"""Model responses are fixtures; these tests never contact a provider."""
import base64
import copy
import io
import json
import unittest
from http.client import HTTPConnection
from unittest.mock import patch, Mock
import threading

import _bootstrap
from PIL import Image
from westlake_ppt.socratic import SocraticPractice
from westlake_ppt.classroom.state import ClassroomError


def source():
    out = io.BytesIO(); Image.new('RGB', (160, 90), 'white').save(out, 'PNG')
    return {'id': '/lecture.html?course=math&lecture=one', 'title': 'Projection', 'page': 4,
            'text': 'A vector and its horizontal projection',
            'image': {'dataUrl': 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()}}


class SocraticTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.status = 'misconception'
        self.quote = 'It increases'
        self.safe = True
        self.elements = [{'id':'vector','label':'T above x axis','box':[.1,.1,.2,.3]},
                         {'id':'foot','label':'horizontal projection','box':[.1,.7,.6,.1]}]
        self.task = {'question':'On Slide 4, how would rotating T change its horizontal projection?',
                     'bloom':'analyze','references':['vector','foot'],
                     'rubric':'Use the foot on the x axis as evidence.',
                     'answer':'PRIVATE_WORKED_REASONING'}
        self.p = SocraticPractice(self.generate)

    def generate(self, prompt, data, image):
        self.calls.append((prompt, copy.deepcopy(data), image))
        if 'visual Curator' in prompt:
            return json.dumps({'usable':True,'elements':self.elements,'relations':[
                {'from':'vector','to':'foot','description':'Dashed line connects the tip to the axis.'}]})
        if 'You are the Questioner' in prompt: return json.dumps(self.task)
        if 'Assess the student' in prompt:
            return json.dumps({'status':self.status,'quote':self.quote,'references':['vector'], 'focus':'Student assumes angle and projection grow together.'})
        if 'Act as a Socratic Tutor' in prompt:
            return json.dumps({'question':'On Slide 4, where would the foot be if T became vertical?'})
        if 'Review a candidate' in prompt: return json.dumps({'safe':self.safe})
        raise AssertionError('Unexpected stage')

    def start(self):
        return self.p.action({'action':'start','source':source(),'language':'en'}, 'owner')

    def action(self, s, action, **kwargs):
        return self.p.action(dict(action=action,session=s['session'],revision=s['revision'],**kwargs),'owner')

    def test_pixels_and_visual_references_reach_every_stage(self):
        s = self.start()
        self.assertEqual(len(self.calls),3)
        self.assertTrue(all(c[2]['type']=='input_image' for c in self.calls))
        self.assertEqual(s['references'],['vector','foot'])
        self.assertEqual(s['snapshot'],self.calls[0][2]['image_url'])
        self.assertNotIn('PRIVATE_WORKED', json.dumps(s))
        self.assertNotIn('rubric', json.dumps(s))
        with self.assertRaises(ClassroomError): self.action(s,'explain')
        result = self.action(s,'attempt',answer='It increases because the angle and horizontal force are proportional.')
        self.assertEqual(result['attempts'],1)
        self.assertFalse(result['canExplain'])
        self.assertNotIn('PRIVATE_WORKED',json.dumps(result))
        self.assertIn('vertical',result['turns'][-1]['text'])
        self.assertEqual(len(self.calls),6)

    def test_even_correct_first_attempt_requires_socratic_revision(self):
        self.status='supported'; self.quote='The foot'
        s=self.start()
        first='The foot moves left on the horizontal axis when T rotates upward.'
        s=self.action(s,'attempt',answer=first)
        self.assertFalse(s['canExplain'])
        with self.assertRaises(ClassroomError):self.action(s,'explain')
        with self.assertRaises(ClassroomError):self.action(s,'attempt',answer=first.upper())
        s=self.action(s,'attempt',answer='The foot reaches the origin at ninety degrees, consistent with my prediction.')
        self.assertTrue(s['canExplain'])
        self.assertEqual(self.action(s,'explain')['explanation'],'PRIVATE_WORKED_REASONING')
        self.status='misconception'; self.quote='It increases'
        s=self.action(s,'attempt',answer='It increases after all because the larger angle must stretch the projection.')
        self.assertFalse(s['canExplain']);self.assertEqual(s['explanation'],'')

    def test_unreadable_visual_and_wrong_reference_do_not_create_session(self):
        self.elements=[]
        with self.assertRaises(ClassroomError):self.start()
        self.assertEqual(len(self.p.sessions),0)
        self.setUp(); self.task['references']=['missing-element']
        with self.assertRaises(ClassroomError):self.start()
        self.assertEqual(len(self.p.sessions),0)
        self.task['references']=['vector'];self.task['bloom']='remember'
        with self.assertRaises(ClassroomError):self.start()

    def test_invalid_boxes_and_relations_are_rejected(self):
        self.elements[0]['box']=[.9,.1,.5,.5]
        with self.assertRaises(ClassroomError):self.start()
        self.setUp();self.elements[1]['id']='unknown'
        with self.assertRaises(ClassroomError):self.start()

    def test_critic_rejection_and_fabricated_quotes_leave_attempt_unmodified(self):
        s=self.start();self.safe=False
        with self.assertRaises(ClassroomError):
            self.action(s,'attempt',answer='It increases because the angle and horizontal force are proportional.')
        self.assertEqual(self.p.sessions[s['session']]['answers'],[])
        self.assertFalse(self.p.sessions[s['session']]['busy'])
        self.safe=True;self.quote='NOT IN RESPONSE'
        with self.assertRaises(ClassroomError):
            self.action(s,'attempt',answer='It increases because the angle and horizontal force are proportional.')
        self.assertEqual(self.p.sessions[s['session']]['turns'],[])

    def test_nonattempt_owner_revision_and_expiry_guards(self):
        s=self.start()
        for answer in ['just answer', 'Show the answer because I do not want to solve this task myself.']:
            self.status='nonattempt';self.quote=''
            with self.assertRaises(ClassroomError):self.action(s,'attempt',answer=answer)
        self.assertEqual(self.p.sessions[s['session']]['answers'],[])
        with self.assertRaises(ClassroomError):self.action(dict(s,revision='wrong'),'explain')
        with self.assertRaises(ClassroomError):
            self.p.action(dict(action='explain',session=s['session'],revision=s['revision']),'other-owner')
        self.p.sessions[s['session']]['expires']=0
        with self.assertRaises(ClassroomError):self.action(s,'explain')

    def test_browser_snapshot_revision_changes_with_pixels_and_page(self):
        a,_=self.p.source({'source':source()})
        changed=source();changed['page']=5
        b,_=self.p.source({'source':changed})
        self.assertNotEqual(a['revision'],b['revision'])
        bad=source();bad['image']={'dataUrl':'https://example.com/image.png'}
        with self.assertRaises(ValueError):self.p.source({'source':bad})

    def test_server_model_adapter_sends_pixels_with_each_stage(self):
        from westlake_ppt.server import app
        def mocked_provider(payload, body):
            content=body['input'][0]['content']
            self.assertEqual(content[1]['type'],'input_image')
            self.assertFalse(body['store'])
            return self.generate(body['instructions'],json.loads(content[0]['text']),content[1]),'mock'
        data={'action':'start','source':dict(source(),id='/snapshot')}
        with patch.object(app,'SOCRATIC',None),patch.object(app,'call_openai',side_effect=mocked_provider):
            engine=app.socratic();s=engine.action(data,'owner')
            engine.action(dict(action='attempt',session=s['session'],revision=s['revision'],answer='It increases because the angle grows in direct proportion to the force.'),'owner')
            self.assertEqual(len(self.calls),6)
            self.assertNotIn('PRIVATE_WORKED',json.dumps(s))

    def test_registered_pdf_pixels_replace_client_image_and_reject_wrong_page(self):
        from westlake_ppt.server import app
        from pathlib import Path
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);image=root/'original.webp';Image.new('RGB',(80,60),'red').save(image)
            lecture={'id':'one','source':{'format':'pdf'},'slides':[{'title':'Official slide','image':'original.webp','text':'Official text'}]}
            data={'source':dict(source(),id='/lecture.html?course=math&lecture=one',page=1)}
            with patch.object(app,'BASE_DIR',root),patch.object(app,'PUBLIC_FILES',{'original.webp'}),patch.object(app,'teaching',return_value=Mock(catalog=Mock(return_value=[{'id':'math','lectures':[lecture]}]))):
                resolved=app.resolve_practice_source(data)['source']
                self.assertEqual(resolved['origin'],'instructor-image')
                self.assertEqual(resolved['title'],'Official slide')
                self.assertNotEqual(resolved['image'],data['source']['image'])
                with self.assertRaises(ClassroomError):app.resolve_practice_source({'source':dict(data['source'],page=2)})
                engine=SocraticPractice(self.generate,app.resolve_practice_source)
                active=engine.action(dict(data,action='start'),'owner')
                Image.new('RGB',(80,60),'blue').save(image)
                with self.assertRaises(ClassroomError) as error:
                    engine.action(dict(action='attempt',session=active['session'],revision=active['revision'],answer='It increases because the angle and horizontal force grow together.'),'owner')
                self.assertIn('instructor slide changed',str(error.exception))
                self.assertEqual(engine.sessions[active['session']]['answers'],[])
                forged=app.resolve_practice_source({'source':dict(data['source'],id='/snapshot',origin='instructor-image')})
                self.assertEqual(forged['source']['origin'],'browser-snapshot')
                lecture['slides'][0]['image']='../outside.webp'
                with self.assertRaises(ClassroomError):app.resolve_practice_source(data)

    def test_http_origin_limit_and_wiring_without_a_real_provider(self):
        from westlake_ppt.server import app
        http=app.ThreadingHTTPServer(('127.0.0.1',0),app.PresentationHandler)
        worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        try:
            origin='http://127.0.0.1:'+str(http.server_port)
            def post(data, sender=origin):
                conn=HTTPConnection('127.0.0.1',http.server_port)
                conn.request('POST','/api/socratic',json.dumps(data),{'Origin':sender,'Content-Type':'application/json'})
                response=conn.getresponse();result=(response.status,json.loads(response.read()));conn.close();return result
            with patch.object(app,'SOCRATIC',self.p):
                self.assertEqual(post({'action':'start','source':source()},'https://other.example')[0],403)
                code,s=post({'action':'start','source':source()});self.assertEqual(code,200)
                self.assertEqual(post(dict(action='explain',session=s['session'],revision=s['revision']))[0],409)
                with patch.object(app.REQUEST_LIMITS,'acquire',return_value='test limit'):
                    self.assertEqual(post({'action':'start','source':source()})[0],429)
        finally:http.shutdown();http.server_close();worker.join()


if __name__=='__main__':unittest.main()
