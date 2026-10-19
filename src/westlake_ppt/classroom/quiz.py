"""Teacher-reviewed, single-attempt quizzes and aggregate classroom reports."""
import json
import secrets
import time

from .state import ClassroomError


class Quiz:
    def __init__(self, classroom, bank):
        self.c, self.bank = classroom, bank

    def validate(self, questions):
        if not isinstance(questions, list) or not 1 <= len(questions) <= 5:
            raise ClassroomError(400, 'Choose 1-5 questions')
        result = []
        for q in questions:
            if not isinstance(q, dict):
                raise ClassroomError(400, 'Invalid question')
            page = self.c.page(q.get('page'))
            options = q.get('options')
            if not isinstance(options, list) or len(options) != 4:
                raise ClassroomError(400, 'Each question needs four options')
            options = [self.c.text(v, 300) for v in options]
            if len(set(options)) != 4 or type(q.get('correct')) is not int or q['correct'] not in range(4):
                raise ClassroomError(400, 'Options must be distinct and have one correct answer')
            result.append(dict(page=page, question=self.c.text(q.get('question'), 600), options=options,
                               correct=q['correct'], explanation=self.c.text(q.get('explanation'), 1000)))
        return result

    def row(self, db, room, identifier):
        row = db.execute('SELECT * FROM quizzes WHERE room=? AND id=?', (room, identifier)).fetchone()
        if row is None:
            raise ClassroomError(404, 'Quiz not found in this class')
        return row

    def public(self, row, ended=False):
        closed = bool(row['closed'] or ended)
        questions = json.loads(row['questions'])
        return dict(id=row['id'], title=row['title'], closed=closed, sample=bool(row['sample']),
                    questions=questions if closed else [
                        {k: q[k] for k in ('page', 'question', 'options')} for q in questions])

    def action(self, action, data, teacher='', token=''):
        if action in ('bank', 'publish', 'close', 'report', 'sample'):
            self.c.require_teacher(teacher)
        if action == 'sample':
            with self.c.lock:
                self.c.limit(('quiz-sample', teacher), 3, 60)
                return self.sample(teacher)
        with self.c.db() as db:
            self.c.cleanup(db)
            if action == 'bank':
                return {'questions': self.bank, 'source': 'Prepared demo question bank; teacher review required; no AI generation'}
            room = self.c.room(db, data.get('room', ''))
            code = room['code']
            if action == 'publish':
                if room['ended']:
                    raise ClassroomError(409, 'Class has ended')
                if data.get('reviewed') is not True:
                    raise ClassroomError(400, 'Review the questions and answer key before publishing')
                if db.execute('SELECT 1 FROM quizzes WHERE room=? AND closed IS NULL', (code,)).fetchone():
                    raise ClassroomError(409, 'Close the current quiz first')
                self.c.limit(('quiz-publish', code), 20, 3600)
                identifier = secrets.token_hex(12)
                questions = self.validate(data.get('questions'))
                db.execute('INSERT INTO quizzes VALUES(?,?,?,?,?,NULL,0)',
                           (identifier, code, self.c.text(data.get('title'), 100), json.dumps(questions), time.time()))
                return {'id': identifier}
            if action == 'close':
                self.row(db, code, data.get('id'))
                db.execute('UPDATE quizzes SET closed=COALESCE(closed,?) WHERE room=? AND id=?',
                           (time.time(), code, data['id']))
                return {'ok': True}
            if action == 'report':
                return self.report(db, room)
            member = self.c.member(db, token, code)
            self.c.limit(('quiz-member', code, member['id']), 120, 60)
            if action == 'list':
                rows = db.execute('SELECT * FROM quizzes WHERE room=? ORDER BY created DESC', (code,)).fetchall()
                quizzes = []
                for row in rows:
                    item = self.public(row, room['ended'])
                    entry = db.execute('SELECT answers FROM quiz_entries WHERE room=? AND quiz=? AND member=?',
                                       (code, row['id'], member['id'])).fetchone()
                    item.update(enrolled=entry is not None, submitted=bool(entry and entry['answers'] is not None))
                    if item['closed'] and item['submitted']:
                        item['answers'] = json.loads(entry['answers'])
                    quizzes.append(item)
                return {'quizzes': quizzes}
            row = self.row(db, code, data.get('id'))
            if room['ended'] or row['closed']:
                raise ClassroomError(409, 'Quiz has closed')
            if member['muted']:
                raise ClassroomError(403, 'Participation is muted for this class')
            if action == 'enroll':
                if data.get('consent') is not True:
                    raise ClassroomError(400, 'Confirm participation before joining this quiz')
                db.execute('INSERT OR IGNORE INTO quiz_entries VALUES(?,?,?,?,NULL,NULL)',
                           (row['id'], code, member['id'], time.time()))
                return {'ok': True}
            if action == 'submit':
                entry = db.execute('SELECT * FROM quiz_entries WHERE room=? AND quiz=? AND member=?',
                                   (code, row['id'], member['id'])).fetchone()
                if entry is None:
                    raise ClassroomError(403, 'Join the quiz first')
                answers = data.get('answers')
                questions = json.loads(row['questions'])
                if not isinstance(answers, list) or len(answers) != len(questions) or any(
                        a is not None and (type(a) is not int or a not in range(4)) for a in answers):
                    raise ClassroomError(400, 'Invalid answers')
                if entry['answers'] is not None:
                    if json.loads(entry['answers']) == answers:
                        return {'ok': True, 'duplicate': True}
                    raise ClassroomError(409, 'Your quiz has already been submitted')
                db.execute('UPDATE quiz_entries SET answers=?,submitted=? WHERE room=? AND quiz=? AND member=?',
                           (json.dumps(answers), time.time(), code, row['id'], member['id']))
                return {'ok': True}
            raise ClassroomError(404, 'Unknown quiz operation')

    def report(self, db, room):
        quizzes = []
        pages = {}
        for row in db.execute('SELECT * FROM quizzes WHERE room=? ORDER BY created DESC', (room['code'],)):
            entries = db.execute('SELECT member,answers FROM quiz_entries WHERE room=? AND quiz=?',
                                 (room['code'], row['id'])).fetchall()
            attempts = [json.loads(e['answers']) for e in entries if e['answers'] is not None]
            item = self.public(row, room['ended'])
            item.update(participants=len(entries), submitted=len(attempts), notSubmitted=len(entries)-len(attempts))
            item['questions'] = []
            for i, q in enumerate(json.loads(row['questions'])):
                page = pages.setdefault(q['page'], dict(participants=set(), answered=set(), wrong=set()))
                for entry in entries:
                    page['participants'].add(entry['member'])
                    answer = json.loads(entry['answers'])[i] if entry['answers'] is not None else None
                    if answer is not None:
                        page['answered'].add(entry['member'])
                        if answer != q['correct']:
                            page['wrong'].add(entry['member'])
                counts = [sum(a[i] == choice for a in attempts) for choice in range(4)]
                correct = counts[q['correct']]
                wrong = sum(counts)-correct
                skipped = sum(a[i] is None for a in attempts)
                item['questions'].append(dict(q, correctCount=correct, wrongCount=wrong, skipped=skipped,
                                              answered=correct+wrong, distribution=counts))
            quizzes.append(item)
        feedback = [dict(r) for r in db.execute(
            'SELECT page,kind,COUNT(*) AS count FROM feedback WHERE room=? GROUP BY page,kind', (room['code'],))]
        return dict(room=room['code'], title=room['title'], ended=bool(room['ended']),
                    generatedAt=time.time(), quizzes=quizzes, feedback=feedback, titles=self.c.titles,
                    slides=[dict(page=page, **{k: len(v) for k, v in counts.items()}) for page, counts in sorted(pages.items())],
                    sample=any(q['sample'] for q in quizzes))

    def sample(self, teacher):
        # A separate, ended classroom prevents synthetic records entering live results.
        code = self.c.post('create', {'title': '[SAMPLE] Linear algebra - fictional class'}, teacher)['room']
        questions = self.bank[:3]
        identifier = self.action('publish', dict(room=code, title='Projection and eigenvectors',
                                                questions=questions, reviewed=True), teacher)['id']
        with self.c.db() as db:
            db.execute('UPDATE quizzes SET sample=1 WHERE id=?', (identifier,))
            for i in range(12):
                answers = None if i >= 10 else json.dumps([
                    q['correct'] if i < (8, 4, 6)[j] else (None if i == 9 else (q['correct']+1) % 4)
                    for j, q in enumerate(questions)])
                db.execute('INSERT INTO quiz_entries VALUES(?,?,?,?,?,?)',
                           (identifier, code, 'sample-'+str(i), time.time(), answers, time.time() if answers else None))
                if i < 5:
                    db.execute('INSERT INTO feedback VALUES(?,?,?,?,?)',
                               (code, 'sample-'+str(i), 9, 'confused', time.time()))
            db.execute('UPDATE quizzes SET closed=? WHERE id=?', (time.time(), identifier))
            db.execute('UPDATE rooms SET ended=? WHERE code=?', (time.time(), code))
        return {'room': code}
