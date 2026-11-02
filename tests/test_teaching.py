import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import pymupdf as fitz
from westlake_ppt.auth import Accounts,password_hash
from westlake_ppt.teaching import Teaching,TeachingError

class TeachingTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.accounts=Accounts(Path(self.tmp.name)/'private/accounts.sqlite3');self.web=Path(__file__).resolve().parents[1]/'web'
  with self.accounts.connect() as db:
   for id,teacher in [('202400000',1),('other',1),('student',0)]:db.execute('INSERT INTO accounts VALUES (?,?,?,?)',(id,id,password_hash('fictional-test-password'),teacher))
  self.t=Teaching(self.accounts,self.web);self.t.seed();self.course=self.t.catalog('202400000')[0];self.cid=self.course['id'];self.lid=self.course['lectures'][0]['id']
 def mutate(self,action,**kwargs):return self.t.mutate('202400000',action,dict(course=self.cid,lecture=self.lid,**kwargs))
 def test_ownership(self):
  for fn in [lambda:self.t.lecture(self.cid,self.lid,'other'),lambda:self.t.detail('other',self.cid,self.lid),lambda:self.t.mutate('other','status',dict(course=self.cid,lecture=self.lid,status='published')),lambda:self.t.upload('other',self.cid,'a.pdf',b'%PDF-x')]:
   with self.assertRaises(TeachingError) as e:fn()
   self.assertEqual(e.exception.code,404)
  self.assertEqual(self.t.catalog('other'),[])
 def test_publish_hide_and_notes(self):
  self.mutate('note',slide=1,note='<script>text</script>')
  self.assertEqual(self.t.notes(self.cid,self.lid)[1],'<script>text</script>')
  for status in ['draft','hidden']:
   self.mutate('status',status=status)
   with self.assertRaises(TeachingError):self.t.lecture(self.cid,self.lid)
  self.mutate('status',status='published');self.assertEqual(self.t.lecture(self.cid,self.lid)[1]['status'],'published')
 def test_events_counts_and_flags(self):
  student={'id':'student','is_teacher':0};context=dict(course=self.cid,lecture=self.lid,slide=1,action='opened')
  self.t.event(student,context);self.t.event(student,context,'Why?','Because.');self.t.event(student,dict(context,slide=2),'How?','Try this.')
  self.t.event({'id':'202400000','is_teacher':1},dict(context,preview=True),'Should not record','')
  detail=self.t.detail('202400000',self.cid,self.lid);self.assertEqual(detail['counts'],{1:1,2:1});self.assertEqual(len(detail['events']),2)
  self.assertNotIn('student',detail['events'][0]);self.mutate('flag',event=detail['events'][0]['id'],reason='Needs review')
  self.assertTrue(self.t.detail('202400000',self.cid,self.lid)['events'][0]['flagged'])
  self.assertEqual(self.t.today('202400000')['top'][0]['count'],1)
 def pdf(self):
  doc=fitz.open();p=doc.new_page();p.insert_text((50,50),'Uploaded title');return doc.tobytes()
 def test_upload_happy_and_file_access(self):
  item=self.t.upload('202400000',self.cid,'Sample.pdf',self.pdf());_,lecture=self.t.lecture(self.cid,item['id'],'202400000')
  self.assertEqual(lecture['status'],'draft');self.assertEqual(lecture['slides'][0]['title'],'Uploaded title');token=lecture['fileToken']
  self.assertTrue(self.t.file(token,'1.webp',{'id':'202400000','is_teacher':1}).is_file())
  with self.assertRaises(TeachingError):self.t.file(token,'1.webp',{'id':'student','is_teacher':0})
  with self.assertRaises(TeachingError):self.t.file(token,'1.webp',{'id':'other','is_teacher':1})
  self.t.mutate('202400000','status',dict(course=self.cid,lecture=item['id'],status='published'))
  self.assertTrue(self.t.file(token,'1.webp',{'id':'student','is_teacher':0}).is_file())
 def test_upload_failures_and_reorder(self):
  for name,raw in [('x.pdf',b'notpdf'),('x.exe',b'%PDF-x'),('x.pptx',b'broken'),('x.pdf',b'%PDF-broken')]:
   with self.assertRaises(TeachingError):self.t.upload('202400000',self.cid,name,raw)
  ids=[l['id'] for l in self.course['lectures']];self.t.mutate('202400000','reorder',dict(course=self.cid,order=ids[::-1]));self.assertEqual(self.t.catalog('202400000')[0]['lectures'][0]['id'],ids[-1])
  with self.assertRaises(TeachingError):self.t.mutate('202400000','reorder',dict(course=self.cid,order=[ids[0]]))
 def test_replace_archives_and_schedule(self):
  uploaded=self.t.upload('202400000',self.cid,'first.pdf',self.pdf())['id']
  self.t.mutate('202400000','note',dict(course=self.cid,lecture=uploaded,slide=1,note='Prior note'))
  self.t.upload('202400000',self.cid,'replacement.pdf',self.pdf(),uploaded)
  with self.accounts.connect() as db:
   version=json.loads(db.execute('SELECT data FROM lecture_versions WHERE lecture=?',(uploaded,)).fetchone()[0])
   self.assertEqual(version['notes'][0]['note'],'Prior note')
  from datetime import datetime,timezone
  future=datetime.fromtimestamp(__import__('time').time()+3600,timezone.utc).isoformat()
  self.t.mutate('202400000','status',dict(course=self.cid,lecture=uploaded,status='draft',publish_at=future))
  with self.assertRaises(TeachingError):self.t.lecture(self.cid,uploaded)
  with patch('westlake_ppt.teaching.time.time',return_value=__import__('time').time()+7200):self.assertEqual(self.t.lecture(self.cid,uploaded)[1]['status'],'published')

 def test_new_course_and_seed_idempotence(self):
  item=self.t.mutate('other','new-course',dict(title='New',zh='新课',code='TEST',term='2026',description='A course',category='Other'))
  self.assertEqual(len(self.t.catalog('other')),1);self.t.seed(mock=True);self.t.seed(mock=True)
  self.assertTrue(self.t.today('202400000')['mock'])
  self.t.own('other',item['id'])

if __name__=='__main__':unittest.main()

class TeachingHTTPTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  import threading
  from westlake_ppt.server import app
  cls.app=app;cls.tmp=tempfile.TemporaryDirectory();cls.a=Accounts(Path(cls.tmp.name)/'private/accounts.sqlite3')
  with cls.a.connect() as db:
   for id,role in [('202400000',1),('other',1),('student',0)]:db.execute('INSERT INTO accounts VALUES (?,?,?,?)',(id,id,password_hash('fictional-test-password'),role))
  cls.t=Teaching(cls.a,app.BASE_DIR);cls.t.seed();cls.course=cls.t.catalog('202400000')[0];cls.cid=cls.course['id'];cls.lid=cls.course['lectures'][0]['id']
  cls.patches=[patch.object(app,'ACCOUNTS',cls.a),patch.object(app,'TEACHING',cls.t),patch.object(app.university,'enabled',return_value=False)]
  for p in cls.patches:p.start()
  cls.http=app.ThreadingHTTPServer(('127.0.0.1',0),app.PresentationHandler);threading.Thread(target=cls.http.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):
  cls.http.shutdown();cls.http.server_close()
  for p in cls.patches:p.stop()
  cls.tmp.cleanup()
 def request(self,path,user='202400000',data=None,raw=None,filename='upload.pdf'):
  import http.client
  token=self.a.login(user,'fictional-test-password','test')[0];c=http.client.HTTPConnection('127.0.0.1',self.http.server_port)
  headers={'Cookie':'workspace_session='+token,'Origin':f'http://127.0.0.1:{self.http.server_port}'}
  if raw is not None:body=raw;headers.update({'Content-Type':'application/octet-stream','X-Filename':filename})
  elif data is not None:body=json.dumps(data);headers['Content-Type']='application/json'
  else:body=None
  c.request('POST' if body is not None else 'GET',path,body,headers);r=c.getresponse();result=(r.status,r.read());c.close();return result
 def test_http_ownership_and_publishing(self):
  endpoint=f'/api/teacher/lecture?course={self.cid}&lecture={self.lid}'
  self.assertEqual(self.request(endpoint,'other')[0],404);self.assertEqual(self.request(endpoint,'student')[0],403)
  self.assertEqual(self.request(f'/teacher/courses/{self.cid}','other')[0],404)
  self.assertEqual(self.request(f'/lecture.html?course={self.cid}&lecture={self.lid}','other')[0],404)
  self.assertEqual(json.loads(self.request('/api/courses','other')[1])['courses'],[])
  for status in ['draft','hidden','published']:
   self.assertEqual(self.request('/api/teacher/status',data=dict(course=self.cid,lecture=self.lid,status=status))[0],200)
   catalog=json.loads(self.request('/api/courses','student')[1]);course=next(c for c in catalog['courses'] if c['id']==self.cid)
   self.assertEqual(self.lid in [l['id'] for l in course['lectures']],status=='published')
   self.assertEqual(self.request(f'/lecture.html?course={self.cid}&lecture={self.lid}','student')[0],200 if status=='published' else 404)
 def test_http_question_logging(self):
  payload=dict(question='Why?',slides=[{'number':1,'title':'Title','content':'Text'}],currentSlide={'number':1,'title':'Title'},studyContext=dict(course=self.cid,lecture=self.lid,slide=1))
  with patch.object(self.app,'call_openai',return_value=('Mock explanation','mock')):
   self.assertEqual(self.request('/api/chat','student',payload)[0],200)
  detail=self.t.detail('202400000',self.cid,self.lid);self.assertEqual(detail['events'][0]['answer'],'Mock explanation')
  # Preview visits and teacher requests never create student activity.
  count=len(detail['events']);self.assertEqual(self.request(f'/lecture.html?course={self.cid}&lecture={self.lid}&preview=1')[0],200)
  self.assertEqual(len(self.t.detail('202400000',self.cid,self.lid)['events']),count)
 def test_failed_inference_keeps_question(self):
  payload=dict(question='Accepted but failed',slides=[{'number':1,'title':'Title','content':'Text'}],currentSlide={'number':1,'title':'Title'},studyContext=dict(course=self.cid,lecture=self.lid,slide=1))
  with patch.object(self.app,'call_openai',side_effect=RuntimeError('Mock unavailable')):self.assertEqual(self.request('/api/chat','student',payload)[0],502)
  events=self.t.detail('202400000',self.cid,self.lid)['events'];self.assertEqual(next(e for e in events if e['question']=='Accepted but failed')['answer'],'')

 def test_streamed_question_logging(self):
  payload=dict(question='Streamed question?',stream=True,slides=[{'number':1,'title':'Title','content':'Text'}],currentSlide={'number':1,'title':'Title'},studyContext=dict(course=self.cid,lecture=self.lid,slide=1))
  def stream(body,emit):
   emit({'type':'delta','text':'A streamed '});emit({'type':'delta','text':'explanation.'});emit({'type':'done'})
  with patch.object(self.app,'stream_response',side_effect=stream):self.assertEqual(self.request('/api/chat','student',payload)[0],200)
  self.assertEqual(self.t.detail('202400000',self.cid,self.lid)['events'][0]['answer'],'A streamed explanation.')

 def test_http_upload(self):
  doc=fitz.open();doc.new_page().insert_text((30,30),'HTTP upload title');pdf=doc.tobytes()
  route='/api/teacher/upload?course='+self.cid
  self.assertEqual(self.request(route,'student',raw=pdf)[0],403);self.assertEqual(self.request(route,'other',raw=pdf)[0],404)
  self.assertEqual(self.request(route,raw=b'broken')[0],400)
  status,body=self.request(route,raw=pdf);self.assertEqual(status,200)
  lecture=json.loads(body)['id'];item=self.t.lecture(self.cid,lecture,'202400000')[1];file=item['slides'][0]['image']
  self.assertEqual(self.request(file,'student')[0],404);self.assertEqual(self.request(file)[0],200)
  self.request('/api/teacher/status',data=dict(course=self.cid,lecture=lecture,status='published'))
  self.assertEqual(self.request(file,'student')[0],200)
  self.request('/api/teacher/status',data=dict(course=self.cid,lecture=lecture,status='hidden'));self.assertEqual(self.request(file,'student')[0],404)
