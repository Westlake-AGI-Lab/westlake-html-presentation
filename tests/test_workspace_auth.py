"""Real HTTP authentication checks, isolated DB, no campus/provider requests."""
import http.client
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from westlake_ppt.auth import Accounts, MESSAGE, password_hash
from westlake_ppt.server import app

class WorkspaceAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.accounts = Accounts(Path(cls.temp.name)/'accounts.sqlite3')
        cls.student_password = 'FictionalStudent123!'
        cls.teacher_password = 'FictionalInstructor123!'
        cls.accounts.seed(cls.student_password, cls.teacher_password)
        # Deliberately invert the ID lengths; the DB flag alone controls authorization.
        with cls.accounts.connect() as db:
            db.execute('INSERT INTO accounts VALUES (?,?,?,0)', ('123456789', 'Nine digit learner', password_hash(cls.student_password)))
            db.execute('INSERT INTO accounts VALUES (?,?,?,1)', ('12345678901', 'Eleven digit instructor', password_hash(cls.teacher_password)))
        cls.patch = patch.object(app, 'ACCOUNTS', cls.accounts); cls.patch.start()
        cls.httpd = app.ThreadingHTTPServer(('127.0.0.1',0), app.PresentationHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever,daemon=True); cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close(); cls.patch.stop(); cls.temp.cleanup()

    def setUp(self):
        with self.accounts.connect() as db: db.execute('DELETE FROM failures')

    def request(self, path, data=None, cookie='', method=None, origin=True):
        conn = http.client.HTTPConnection('127.0.0.1',self.httpd.server_port)
        headers = {'Cookie':cookie}
        if data is not None:
            headers['Content-Type']='application/json'
            if origin: headers['Origin']=f'http://127.0.0.1:{self.httpd.server_port}'
        conn.request(method or ('POST' if data is not None else 'GET'), path, json.dumps(data) if data is not None else None, headers)
        response=conn.getresponse(); body=response.read(); result=(response.status,dict(response.getheaders()),body);conn.close(); return result

    def login(self, account_id, password):
        return self.request('/api/auth/login', {'id':account_id,'password':password})

    def cookie(self, account_id='DEMO2026', password=None):
        status, headers, body = self.login(account_id,password or self.student_password)
        self.assertEqual(status,200)
        self.assertIn('HttpOnly',headers['Set-Cookie']);self.assertIn('SameSite=Strict',headers['Set-Cookie'])
        return headers['Set-Cookie'].split(';')[0], json.loads(body)['redirect']

    def test_routing_and_no_length_heuristic(self):
        for account_id, password, target in [('DEMO2026',self.student_password,'/courses'),('202400000',self.teacher_password,'/teacher'),('123456789',self.student_password,'/courses'),('12345678901',self.teacher_password,'/teacher'),('20243841001',self.student_password,'/courses')]:
            cookie, destination=self.cookie(account_id,password);self.assertEqual(destination,target)
            for route in ['/', '/student.html', '/login', '/login.html']:
                status,headers,_=self.request(route,cookie=cookie);self.assertEqual(status,303);self.assertEqual(headers['Location'],target)
            self.assertEqual(self.request(target,cookie=cookie)[0],200)

    def test_generic_failure(self):
        existing=self.login('DEMO2026','wrong');missing=self.login('does-not-exist','wrong')
        self.assertEqual(existing[0],401);self.assertEqual(existing[2],missing[2]);self.assertEqual(json.loads(existing[2]),{'error':MESSAGE})
        self.assertEqual(self.login('','')[2],existing[2])

    def test_access_and_live_role_revalidation(self):
        cookie,_=self.cookie()
        for route in ['/teacher','/teacher/students','/teacher.html','/teacher/anything']:
            status,headers,body=self.request(route,cookie=cookie);self.assertEqual(status,303);self.assertEqual(headers['Location'],'/courses');self.assertNotIn(b'Teacher',body)
        for method in ['GET','HEAD','POST','PUT','DELETE','PATCH','OPTIONS']:
            status,_,_=self.request('/api/teacher/workspace',{} if method=='POST' else None,cookie,method);self.assertEqual(status,403)
        self.assertEqual(self.request('/api/teacher/workspace')[0],403)
        cookie,_=self.cookie('202400000',self.teacher_password)
        self.assertEqual(self.request('/api/teacher/workspace',cookie=cookie)[0],200)
        with self.accounts.connect() as db: db.execute('UPDATE accounts SET is_teacher=0 WHERE id=?',('202400000',))
        try: self.assertEqual(self.request('/api/teacher/workspace',cookie=cookie)[0],403)
        finally:
            with self.accounts.connect() as db: db.execute('UPDATE accounts SET is_teacher=1 WHERE id=?',('202400000',))

    def test_logout_expiry_csrf_and_direct_file(self):
        cookie,_=self.cookie()
        self.assertEqual(self.request('/api/auth/logout',{},cookie,origin=False)[0],403)
        self.assertEqual(self.request('/api/auth/logout',{},cookie)[0],200)
        self.assertEqual(json.loads(self.request('/api/auth/session',cookie=cookie)[2])['authenticated'],False)
        cookie,_=self.cookie()
        with self.accounts.connect() as db: db.execute('UPDATE sessions SET expires=?',(time.time()-1,))
        self.assertEqual(self.request('/courses',cookie=cookie)[1]['Location'],'/student.html')
        self.assertEqual(self.request('/teacher.html')[1]['Location'],'/student.html')

    def test_persistent_id_and_ip_lockouts(self):
        for _ in range(5): self.assertIsNone(self.accounts.login('DEMO2026','wrong','one'))
        # A new IP cannot evade the ID lock, and a new instance preserves it.
        self.assertIsNone(Accounts(self.accounts.path).login('DEMO2026',self.student_password,'two'))
        with self.accounts.connect() as db: db.execute('UPDATE failures SET at=?',(time.time()-901,))
        self.assertIsNotNone(self.accounts.login('DEMO2026',self.student_password,'one'))
        for i in range(20): self.assertIsNone(self.accounts.login(f'missing-{i}','wrong','ip-limit'))
        self.assertIsNone(self.accounts.login('202400000',self.teacher_password,'ip-limit'))
        self.assertIsNotNone(self.accounts.login('202400000',self.teacher_password,'another'))

if __name__ == '__main__': unittest.main()
