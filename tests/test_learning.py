import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from classroom import Classroom, ClassroomError
from improvements import Improvements
from learning import Learning


def concepts():
    return [{'id': 'scale', 'title': 'Determinant scaling', 'objective': 'Explain scaling all rows', 'page': 1,
             'source': 'Scaling all three rows by two scales the determinant by eight.',
             'tasks': [{'id': 'scale-1', 'kind': 'apply', 'question': 'Double every entry of a 3 by 3 matrix. Explain the determinant change.',
                        'answer': 'Each of three rows contributes a factor of two, giving 2^3 = 8.',
                        'hints': ['Which rows change?', 'Apply the row scaling rule to each changed row.'],
                        'checks': [{'label': 'Row-wise reasoning', 'expected': 'All three rows contribute a factor.'}]}]}]


class LearningTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name)/'deck.html'
        self.source.write_text('<main><section class="slide" data-title="Determinants">'
                               + concepts()[0]['source'] + '</section></main>')
        self.c = Classroom(Path(self.tmp.name)/'data', 'test-password', 'deck', ['Determinants'])
        self.teacher = self.c.post('login', {'password': 'test-password'})['_cookie']
        self.room = self.c.post('create', {'title': 'Learning'}, self.teacher)['room']
        self.token = self.c.post('join', {'room': self.room})['token']
        self.generated = {'checks': [{'index': 0, 'status': 'incorrect', 'quote': 'It doubles'}]}
        self.l = Learning(self.c, Improvements(self.c, self.source, None).deck, lambda *args: json.dumps(self.generated))
        self.publish()

    def publish(self, base=''):
        rev = self.l.public()['revision']
        return self.l.teacher('save', {'revision': rev, 'concepts': concepts(), 'reviewed': True, 'baseVersion': base}, self.teacher)

    def action(self, name, **data):
        return self.l.action(name, data, 'student', self.room, self.token)

    def start(self):
        return self.action('start', concept='scale', task='scale-1')['session']

    def test_published_catalogue_has_no_answers_or_hints(self):
        raw = json.dumps(self.l.public())
        self.assertNotIn('2^3', raw)
        self.assertNotIn('Which rows', raw)
        self.assertNotIn('expected', raw)
        with self.assertRaises(ClassroomError):
            self.l.teacher('catalogue', {}, '')

    def test_review_source_and_concurrent_edit_checks(self):
        version = self.l.public()['version']
        with self.assertRaises(ClassroomError): self.publish()
        bad = concepts(); bad[0]['source'] = 'Invented evidence'
        with self.assertRaises(ClassroomError):
            self.l.teacher('save', {'revision': self.l.public()['revision'], 'baseVersion': version,
                                   'concepts': bad, 'reviewed': True}, self.teacher)
        with self.assertRaises(ClassroomError):
            self.l.teacher('save', {'revision': self.l.public()['revision'], 'baseVersion': version,
                                   'concepts': concepts(), 'reviewed': False}, self.teacher)

    def test_attempt_hint_revision_explanation_and_no_free_model_text(self):
        sid = self.start()
        for action in ('hint', 'explain'):
            with self.assertRaises(ClassroomError): self.action(action, session=sid)
        self.generated['solution'] = 'LEAKED ANSWER'
        result = self.action('attempt', session=sid, answer='It doubles because the entries double.')
        self.assertEqual(result['state'], 'misunderstood')
        self.assertNotIn('LEAKED', json.dumps(result))
        self.assertIsNone(result['answer'])
        self.action('hint', session=sid)
        with self.assertRaises(ClassroomError): self.action('hint', session=sid)
        self.action('attempt', session=sid, answer='It doubles because every row changes.')
        self.action('hint', session=sid)
        self.assertTrue(self.action('explain', session=sid)['exposed'])

    def test_assessment_quote_validation_and_state_is_not_trusted_from_client(self):
        sid = self.start()
        self.generated['checks'][0]['quote'] = 'fabricated words'
        with self.assertRaises(ClassroomError): self.action('attempt', session=sid, answer='It doubles in my opinion.')
        self.assertEqual(self.l.attempts[sid]['attempts'], 0)
        with self.assertRaises(ClassroomError): self.action('share', session=sid, consent=True, state='understood')

    def test_stale_source_and_owner_are_rejected(self):
        sid = self.start()
        with self.assertRaises(ClassroomError): self.l.action('hint', {'session': sid}, 'other', self.room, self.token)
        self.source.write_text(self.source.read_text() + '\n')
        with self.assertRaises(ClassroomError): self.action('attempt', session=sid, answer='It doubles because entries double.')

    def test_correct_partial_and_ambiguous_states(self):
        for status, quote, state in [('correct', 'All rows', 'understood'), ('missing', '', 'partial'),
                                      ('uncertain', '', 'uncertain')]:
            sid = self.start()
            self.generated = {'checks': [{'index': 0, 'status': status, 'quote': quote}]}
            result = self.action('attempt', session=sid, answer='All rows each contribute a factor of two.')
            self.assertEqual(result['state'], state)
            self.assertEqual(result['canExplain'], status == 'correct')
            self.assertIsNone(result['answer'])
        self.generated['checks'][0].update(status='correct', quote='All rows')
        sid = self.start()
        self.action('attempt', session=sid, answer='All rows each contribute a factor of two.')
        self.assertEqual(self.action('share', session=sid, consent=True)['state'], 'first-attempt-in-session')

    def test_http_auth_origin_and_static_boundaries(self):
        from http.client import HTTPConnection
        import threading
        import server
        with patch.object(server, 'CLASSROOM', self.c), patch.object(server, 'LEARNING', self.l):
            http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.PresentationHandler)
            thread = threading.Thread(target=http.serve_forever, daemon=True); thread.start()
            try:
                conn = HTTPConnection('127.0.0.1', http.server_port, timeout=5)
                origin = 'http://127.0.0.1:' + str(http.server_port)
                def post(path, payload, **headers):
                    conn.request('POST', path, json.dumps(payload), {'Content-Type': 'application/json', 'Origin': origin, **headers})
                    response = conn.getresponse(); return response.status, json.loads(response.read())
                self.assertEqual(post('/api/learning', {'action': 'catalogue'}, Origin='https://other.example')[0], 403)
                status, public = post('/api/learning', {'action': 'catalogue'})
                self.assertEqual(status, 200); self.assertNotIn('expected', json.dumps(public))
                self.assertEqual(post('/api/classroom/learning-catalogue', {})[0], 401)
                status, private = post('/api/classroom/learning-catalogue', {}, Cookie='ppt_teacher='+self.teacher)
                self.assertEqual(status, 200); self.assertIn('expected', json.dumps(private))
                for path, expected in [('/assets/learning.js', 200), ('/assets/learning.css', 200), ('/learning.py', 404)]:
                    conn.request('GET', path); response = conn.getresponse(); response.read()
                    self.assertEqual(response.status, expected)
                conn.close()
            finally:
                http.shutdown(); http.server_close(); thread.join()

    def test_optional_summary_excludes_written_answer_and_can_be_withdrawn(self):
        sid = self.start()
        self.action('attempt', session=sid, answer='It doubles because entries double. Private text.')
        self.assertEqual(self.l.teacher('summary', {'room': self.room}, self.teacher)['counts'], [])
        with self.assertRaises(ClassroomError): self.action('share', session=sid, consent=False)
        self.action('share', session=sid, consent=True)
        data = self.l.teacher('summary', {'room': self.room}, self.teacher)
        self.assertEqual(data['counts'][0]['count'], 1)
        self.assertNotIn('Private text', json.dumps(data))
        self.publish(self.l.public()['version'])
        self.assertEqual(self.l.teacher('summary', {'room': self.room}, self.teacher)['counts'], [])
        self.action('withdraw')
        with self.c.db() as db: self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_shares').fetchone()[0], 0)

    def test_research_off_by_default_and_separate_consent_with_deletion(self):
        with patch.dict('os.environ', {'LEARNING_STUDY_APPROVAL': '', 'LEARNING_STUDY_INFO': ''}):
            with self.assertRaises(ClassroomError): self.action('research-consent', consent=True)
        with patch.dict('os.environ', {'LEARNING_STUDY_APPROVAL': 'TEST-ONLY', 'LEARNING_STUDY_INFO': 'https://example.org/study'}):
            sid = self.start()
            with self.c.db() as db: self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_research_events').fetchone()[0], 0)
            self.action('research-consent', consent=True, protocol='TEST-ONLY')
            self.action('attempt', session=sid, answer='It doubles because entries double. PRIVATE_ANSWER')
            records = self.l.teacher('research-export', {'room': self.room}, self.teacher)['events']
            self.assertEqual(len(records), 1)
            self.assertNotIn('PRIVATE_ANSWER', json.dumps(records))
            self.assertTrue(self.action('catalogue')['researchConsent'])
            self.action('research-consent', consent=False)
            self.assertEqual(self.l.teacher('research-export', {'room': self.room}, self.teacher)['events'], [])

    def test_class_deletion_removes_all_shared_learning_data(self):
        sid = self.start()
        self.action('attempt', session=sid, answer='It doubles because entries double.')
        self.action('share', session=sid, consent=True)
        with self.c.db() as db:
            self.c.delete(db, self.room)
            for table in ('learning_shares', 'learning_research_events', 'learning_research_consents'):
                self.assertEqual(db.execute('SELECT COUNT(*) FROM '+table).fetchone()[0], 0)


if __name__ == '__main__': unittest.main()
