import json
from pathlib import Path
import tempfile
import threading
import unittest
import io
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import Mock, patch

from classroom import Classroom, ClassroomError
from improvements import Improvements, validate_slides, DeckText


class ImprovementTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.source = Path(self.tmp.name)/'deck.html'
        self.source.write_text('<html><head></head><body><main class="deck"><section class="slide" data-title="Lesson"><h2>Original lesson</h2></section></main></body></html>')
        self.c = Classroom(self.tmp.name, 'test-only', 'test-deck', ['Lesson'])
        self.teacher = self.c.post('login', {'password':'test-only'})['_cookie']
        self.room = self.c.post('create', {'title':'Lesson'}, self.teacher)['room']
        self.student = self.c.post('join', {'room':self.room})['token']
        self.generate = Mock()
        self.i = Improvements(self.c, self.source, self.generate)
        self.payload = {'question':'Why?', 'currentSlide':{'number':1}, 'shareForImprovement':True, 'improvementRequestId':'request-1'}

    def tearDown(self):
        self.tmp.cleanup()

    def action(self, name, **data):
        return self.i.action(name, dict(room=self.room, language='en', **data), self.teacher)

    def dashboard(self):
        return self.i.dashboard(self.room, self.teacher)

    def test_consent_retry_privacy_and_permissions(self):
        self.i.record(self.room, self.student, dict(self.payload, shareForImprovement=False))
        self.assertEqual(self.dashboard()['questions'], 0)
        self.i.record(self.room, self.student, dict(self.payload, images=['private'], history=['private']))
        self.i.record(self.room, self.student, self.payload)
        self.assertEqual(self.dashboard()['questions'], 1)
        self.assertEqual(self.dashboard()['students'], 1)
        with self.c.db() as db:
            record = dict(db.execute('SELECT * FROM improvement_questions').fetchone())
        self.assertNotIn('images', record)
        self.assertNotIn('history', record)
        for fn in [lambda:self.i.dashboard(self.room, self.student), lambda:self.i.action('sample', {}, self.student), lambda:self.i.record(self.room, 'bad', self.payload)]:
            with self.assertRaises(ClassroomError): fn()
        self.assertEqual(self.c.get('state', {'room':self.room}, '', self.student).get('questions'), None)

    def test_semantic_counts_are_computed_from_evidence(self):
        self.i.record(self.room, self.student, self.payload)
        self.i.record(self.room, self.student, dict(self.payload, improvementRequestId='request-2', question='Explain why'))
        another = self.c.post('join', {'room':self.room})['token']
        self.i.record(self.room, another, self.payload)
        with self.c.db() as db: ids = [r['id'] for r in db.execute('SELECT id FROM improvement_questions')]
        self.generate.return_value = (json.dumps({'topics':[{'title':'Reasoning', 'suggestion':'Add an example', 'questionIds':ids, 'students':999}]}), 'mock')
        report = self.action('analyze')['report']
        self.assertEqual(report['topics'][0]['students'], 2)
        self.assertEqual(report['topics'][0]['questions'], 3)
        self.assertNotIn('member', self.generate.call_args.args[0]['question'])
        self.generate.return_value = (json.dumps({'topics':[{'title':'Bad', 'suggestion':'Bad', 'questionIds':['made-up']}]}), 'mock')
        with self.assertRaises(ClassroomError): self.action('analyze')

    def sample_draft(self):
        self.room = self.action('sample')['room']
        report = self.dashboard()['report']
        result = self.action('draft', report=report['id'], topic=report['topics'][0]['id'])
        self.generate.assert_not_called()
        return result['drafts'][0]

    def test_sample_review_export_and_idempotent_approval(self):
        draft = self.sample_draft()
        self.assertTrue(draft['sample'])
        edited = draft['slides']
        edited[0]['title'] = '<script>alert(1)</script>'
        self.action('save', id=draft['id'], slides=edited)
        with self.assertRaises(ClassroomError): self.i.artifact(draft['id'], self.teacher)
        self.action('approve', id=draft['id'], slides=edited)
        self.action('approve', id=draft['id'], slides=edited)
        result = self.i.artifact(draft['id'], self.teacher)
        parsed = DeckText(); parsed.feed(result)
        self.assertEqual(len(parsed.slides), 2)
        self.assertIn('&lt;script&gt;', result)
        self.assertNotIn('<script>alert', result)
        self.assertNotIn('questionIds', result)
        self.assertIn('SAMPLE', result)
        self.assertNotIn('improvement-slide', self.source.read_text())
        with self.assertRaises(ClassroomError): self.i.artifact(draft['id'], self.student)
        with self.assertRaises(ClassroomError): self.c.post('join', {'room':self.room})

    def test_revision_and_room_isolation(self):
        draft = self.sample_draft()
        other = self.c.post('create', {'title':'Another'}, self.teacher)['room']
        with self.assertRaises(ClassroomError): self.i.action('approve', dict(room=other,id=draft['id'],slides=draft['slides']),self.teacher)
        self.source.write_text(self.source.read_text()+'<!-- new version -->')
        with self.assertRaises(ClassroomError): self.action('approve', id=draft['id'], slides=draft['slides'])
        self.assertEqual(self.dashboard()['drafts'], [])

    def test_rejection_and_room_deletion_remove_artifacts(self):
        draft = self.sample_draft()
        self.action('reject', id=draft['id'])
        with self.assertRaises(ClassroomError): self.action('approve', id=draft['id'], slides=draft['slides'])
        self.c.post('control', {'room':self.room, 'op':'delete'}, self.teacher)
        with self.c.db() as db:
            for table in ('improvement_drafts','improvement_reports','improvement_questions'):
                self.assertEqual(db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0], 0)

    def test_invalid_model_json_and_slide_bounds(self):
        self.i.record(self.room, self.student, self.payload)
        self.generate.return_value = ('not JSON', 'mock')
        with self.assertRaises(ClassroomError): self.action('analyze')
        for slides in [[], [{}], [{'title':'x','bullets':['x']*5,'notes':'x'}]]:
            with self.assertRaises(ClassroomError): validate_slides(slides)

    def test_real_draft_uses_existing_generator_and_omits_question_examples(self):
        self.i.record(self.room, self.student, dict(self.payload, question='Private example text'))
        with self.c.db() as db: qid = db.execute('SELECT id FROM improvement_questions').fetchone()[0]
        self.generate.return_value = (json.dumps({'topics':[{'title':'A concept', 'suggestion':'Explain the concept', 'questionIds':[qid]}]}), 'mock')
        report = self.action('analyze')['report']
        self.generate.return_value = (json.dumps({'slides':[{'title':'Explanation','bullets':['Grounded point'], 'notes':'Check this explanation.'}]}), 'mock')
        result = self.action('draft', report=report['id'], topic=report['topics'][0]['id'])
        self.assertFalse(result['drafts'][0]['sample'])
        self.assertNotIn('Private example text', self.generate.call_args.args[0]['question'])
        self.assertIn('Original lesson', self.generate.call_args.args[0]['slides'][0]['content'])

    def test_http_chat_capture_teacher_auth_and_csrf(self):
        import server
        http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.PresentationHandler)
        thread = threading.Thread(target=http.serve_forever, daemon=True); thread.start()
        base = 'http://127.0.0.1:'+str(http.server_address[1])
        cookie = 'ppt_teacher='+self.teacher
        body = dict(self.payload, slides=[{'number':1,'title':'Lesson','content':'Original lesson'}])
        try:
            with patch.object(server, 'CLASSROOM', self.c), patch.object(server, 'improvements', return_value=self.i):
                headers = {'Origin':base, 'Content-Type':'application/json', 'X-Classroom-Room':self.room, 'X-Classroom-Token':self.student}
                with patch.object(server, 'open_upstream', return_value=io.BytesIO(b'{"output_text":"A mocked answer"}')):
                    with urlopen(Request(base+'/api/chat', data=json.dumps(body).encode(), headers=headers)) as response:
                        self.assertEqual(json.load(response)['answer'], 'A mocked answer')
                self.assertEqual(self.dashboard()['questions'], 1)
                endpoint = base+'/api/classroom/improvement-dashboard?room='+self.room
                with self.assertRaises(HTTPError) as failure: urlopen(endpoint)
                self.assertEqual(failure.exception.code, 401)
                with urlopen(Request(endpoint, headers={'Cookie':cookie})) as response:
                    self.assertEqual(json.load(response)['questions'], 1)
                for origin in ['', 'http://foreign.test']:
                    with self.assertRaises(HTTPError) as failure:
                        urlopen(Request(base+'/api/classroom/improvement-sample', data=b'{}', headers={'Cookie':cookie, 'Origin':origin}))
                    self.assertEqual(failure.exception.code, 403)
                with self.assertRaises(HTTPError) as failure:
                    urlopen(Request(base+'/api/classroom/improvement-sample', data=b'{}', headers={'Origin':base, 'X-Classroom-Token':self.student}))
                self.assertEqual(failure.exception.code, 401)
        finally:
            http.shutdown(); http.server_close(); thread.join()


if __name__ == '__main__':
    unittest.main()
