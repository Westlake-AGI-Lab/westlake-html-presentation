import json
import tempfile
import time
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch

from classroom import Classroom, ClassroomError
from westlake_ppt.classroom.quiz import Quiz
from westlake_ppt.demos.eigen_quiz import BANK


class QuizTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.c = Classroom(self.tmp.name, 'quiz-test', 'deck', ['Slide'] * 16)
        self.teacher = self.c.post('login', {'password': 'quiz-test'})['_cookie']
        self.room = self.c.post('create', {'title': 'Quiz class'}, self.teacher)['room']
        self.quiz = Quiz(self.c, BANK)
        self.token = self.c.post('join', {'room': self.room})['token']
        self.identifier = self.publish()

    def publish(self):
        return self.quiz.action('publish', dict(room=self.room, title='Quiz', reviewed=True,
                                                questions=BANK[:3]), self.teacher)['id']

    def student(self, action, token=None, **data):
        return self.quiz.action(action, dict(room=self.room, id=self.identifier, **data), token=token or self.token)

    def report(self):
        return self.quiz.action('report', {'room': self.room}, self.teacher)

    def test_access_review_and_answer_key(self):
        for action in ('bank', 'report', 'publish', 'close', 'sample'):
            with self.assertRaises(ClassroomError):
                self.student(action)
        with self.assertRaises(ClassroomError):
            self.quiz.action('publish', dict(room=self.room, title='Unreviewed', questions=BANK[:1]), self.teacher)
        public = self.student('list')['quizzes'][0]
        self.assertNotIn('correct', public['questions'][0])
        self.assertNotIn('explanation', public['questions'][0])
        with self.assertRaises(ClassroomError):
            self.student('submit', answers=[0, 1, 2])
        with self.assertRaises(ClassroomError):
            self.student('enroll')
        other = self.c.post('create', {'title': 'Other'}, self.teacher)['room']
        with self.assertRaises(ClassroomError):
            self.quiz.action('list', {'room': other}, token=self.token)
        with self.assertRaises(ClassroomError):
            self.quiz.action('close', {'room': other, 'id': self.identifier}, self.teacher)

    def test_counts_deduplicate_skips_and_non_submissions(self):
        second = self.c.post('join', {'room': self.room})['token']
        third = self.c.post('join', {'room': self.room})['token']
        for token in (self.token, second, third):
            self.student('enroll', token=token, consent=True)
        self.student('submit', answers=[0, 0, 0])
        self.student('submit', token=second, answers=[0, 1, None])
        self.assertTrue(self.student('submit', answers=[0, 0, 0])['duplicate'])
        with self.assertRaises(ClassroomError):
            self.student('submit', answers=[0, 1, 2])
        self.c.post('feedback', dict(room=self.room, requestId='feedback', page=9, kind='confused'), member_token=self.token)
        report = self.report()
        q = report['quizzes'][0]
        self.assertEqual((q['participants'], q['submitted'], q['notSubmitted']), (3, 2, 1))
        self.assertEqual((q['questions'][2]['wrongCount'], q['questions'][2]['skipped']), (1, 1))
        self.assertEqual(next(s for s in report['slides'] if s['page'] == 9),
                         dict(page=9, participants=3, answered=2, wrong=1))
        self.assertEqual(report['feedback'][0]['count'], 1)
        self.assertNotIn('member', json.dumps(report))
        self.assertNotIn(self.token, json.dumps(report))

    def test_close_end_persistence_and_delete(self):
        self.student('enroll', consent=True)
        self.student('submit', answers=[0, 1, 2])
        self.quiz.action('close', dict(room=self.room, id=self.identifier), self.teacher)
        closed = self.student('list')['quizzes'][0]
        self.assertEqual(closed['answers'], [0, 1, 2])
        self.assertEqual(closed['questions'][0]['correct'], 0)
        with self.assertRaises(ClassroomError):
            self.student('submit', answers=[0, 1, 2])
        fresh = Classroom(self.tmp.name, 'quiz-test', 'deck', ['Slide'] * 16)
        self.assertTrue(Quiz(fresh, BANK).action('list', {'room': self.room}, token=self.token)['quizzes'][0]['submitted'])
        self.identifier = self.publish()
        self.student('enroll', consent=True)
        self.c.post('control', dict(room=self.room, op='end'), self.teacher)
        self.assertTrue(self.report()['ended'])
        self.assertTrue(self.student('list')['quizzes'][0]['closed'])
        with self.assertRaises(ClassroomError):
            self.student('submit', answers=[0, 1, 2])
        self.c.post('control', dict(room=self.room, op='delete'), self.teacher)
        with self.c.db() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM quizzes').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM quiz_entries').fetchone()[0], 0)

    def test_sample_is_separate_and_expires(self):
        sample = self.quiz.action('sample', {}, self.teacher)['room']
        report = self.quiz.action('report', {'room': sample}, self.teacher)
        self.assertTrue(report['sample'])
        self.assertTrue(report['ended'])
        self.assertEqual(report['quizzes'][0]['participants'], 12)
        self.assertEqual(report['quizzes'][0]['submitted'], 10)
        self.assertFalse(self.report()['sample'])
        self.assertEqual(self.report()['quizzes'][0]['participants'], 0)
        with self.c.db() as db:
            db.execute('UPDATE rooms SET ended=? WHERE code=?', (time.time()-31*86400, sample))
            self.c.cleanup(db)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM quiz_entries WHERE room=?', (sample,)).fetchone()[0], 0)

    def test_validation_and_muting(self):
        for answers in ([True, 1, 2], [0], [4, 1, 2], '012'):
            self.student('enroll', consent=True)
            with self.assertRaises(ClassroomError):
                self.student('submit', answers=answers)
        for questions in ([], [{**BANK[0], 'correct': True}], [{**BANK[0], 'page': 17}],
                          [{**BANK[0], 'options': ['same']*4}]):
            with self.assertRaises(ClassroomError):
                self.quiz.validate(questions)
        with self.c.db() as db:
            db.execute('UPDATE members SET muted=1 WHERE room=?', (self.room,))
        with self.assertRaises(ClassroomError):
            self.student('submit', answers=[0, 1, 2])

    def test_http_auth_origin_and_disabled_deck(self):
        from westlake_ppt.server import app
        server = ThreadingHTTPServer(('127.0.0.1', 0), app.PresentationHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = 'http://127.0.0.1:' + str(server.server_port)
        def request(action, headers):
            req = Request(base+'/api/classroom/quiz-'+action,
                          data=json.dumps({'room': self.room}).encode(),
                          headers={'Content-Type': 'application/json', **headers})
            try:
                with urlopen(req) as response:
                    return response.status, json.load(response)
            except HTTPError as error:
                with error:
                    return error.code, json.load(error)
        try:
            with patch.object(app, 'QUIZ', self.quiz):
                self.assertEqual(request('report', {'Origin': base})[0], 401)
                self.assertEqual(request('report', {'Origin': 'http://foreign.example', 'Cookie': 'ppt_teacher='+self.teacher})[0], 403)
                self.assertEqual(request('report', {'Origin': base, 'Cookie': 'ppt_teacher='+self.teacher})[0], 200)
                status, data = request('list', {'Origin': base, 'X-Classroom-Token': self.token})
                self.assertEqual(status, 200)
                self.assertNotIn('correct', data['quizzes'][0]['questions'][0])
            with patch.object(app, 'QUIZ', None):
                self.assertEqual(request('list', {'Origin': base, 'X-Classroom-Token': self.token})[0], 404)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()
