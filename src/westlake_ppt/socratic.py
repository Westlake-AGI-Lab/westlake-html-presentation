"""Bounded, slide-snapshot-grounded practice. No learner data is written server-side."""
import hashlib
import json
import re
import secrets
import threading
import time

from .classroom.state import ClassroomError
from .llm.requests import validate_images
from .prompts import load_prompt
from .validation import field, parse_json


def fail(message):
    raise ClassroomError(502, message)


def question(value):
    value = field(value, 900)
    if not value.endswith(('?', '？')) or len(value.splitlines()) > 3:
        fail('The tutor did not return a bounded question. Retry; no answer has been exposed.')
    return value


class SocraticPractice:
    def __init__(self, generate, resolve=None):
        self.generate = generate
        self.resolve = resolve
        self.sessions = {}
        self.lock = threading.RLock()

    def model(self, stage, data, image):
        return parse_json(self.generate(load_prompt('socratic-' + stage + '.v1.txt'), data, image))

    @staticmethod
    def source(data):
        source = data.get('source')
        if not isinstance(source, dict):
            raise ClassroomError(400, 'Capture the current slide first.')
        page = source.get('page')
        if type(page) is not int or not 1 <= page <= 500:
            raise ClassroomError(400, 'Invalid slide number.')
        clean = {k: field(source.get(k), limit) for k, limit in [('id', 600), ('title', 200)]}
        clean.update(page=page, text=str(source.get('text', ''))[:10000], language=data.get('language', 'en'),
                     origin='instructor-image' if source.get('origin') == 'instructor-image' else 'browser-snapshot')
        if clean['language'] not in ('en', 'zh'):
            raise ClassroomError(400, 'Unsupported language.')
        image = validate_images([source.get('image')])[0]
        clean['revision'] = hashlib.sha256((json.dumps(clean, sort_keys=True) + image['image_url']).encode()).hexdigest()
        return clean, image

    @staticmethod
    def view(s):
        return {'session': s['id'], 'revision': s['source']['revision'], 'page': s['source']['page'],
                'title': s['source']['title'], 'sourceKind': s['source']['origin'], 'question': s['task']['question'], 'bloom': s['task']['bloom'],
                'elements': [{k: e[k] for k in ('id', 'label', 'box')} for e in s['elements']],
                'references': s['task']['references'], 'turns': s['turns'], 'attempts': len(s['answers']),
                'canExplain': len(s['answers']) >= 2 and s['status'] == 'supported',
                'status': s['status'], 'explanation': s.get('explanation', '')}

    def action(self, data, owner):
        action = data.get('action')
        if action == 'start':
            source, image = self.source(self.resolve(data) if self.resolve else data)
            # Reserve capacity before inference, so parallel starts cannot exceed the bound.
            with self.lock:
                self.sessions = {k: v for k, v in self.sessions.items() if v['busy'] or v['expires'] > time.time()}
                if len(self.sessions) >= 100:
                    raise ClassroomError(429, 'Practice is busy. Try later.')
                sid = secrets.token_urlsafe(32)
                s = {'id': sid, 'owner': owner, 'source': source, 'image': image, 'busy': True,
                     'expires': time.time()+1800, 'answers': [], 'turns': [], 'status': 'unassessed'}
                self.sessions[sid] = s
            try:
                visual = self.model('curator', source, image)
                elements = visual.get('elements')
                if visual.get('usable') is not True or not isinstance(elements, list) or not 1 <= len(elements) <= 12:
                    raise ClassroomError(422, 'No reliable visual elements were identified. Select a clearer slide.')
                ids = set()
                for e in elements:
                    if not isinstance(e, dict): fail('Invalid visual grounding.')
                    eid = field(e.get('id'), 40)
                    field(e.get('label'), 160)
                    box = e.get('box')
                    if (eid in ids or not isinstance(box, list) or len(box) != 4 or
                        any(type(v) not in (int, float) or not 0 <= v <= 1 for v in box) or
                        box[2] <= 0 or box[3] <= 0 or box[0]+box[2] > 1.001 or box[1]+box[3] > 1.001):
                        fail('Invalid visual coordinates. Retry with a clearer slide.')
                    ids.add(eid)
                relations = visual.get('relations', [])
                if not isinstance(relations, list) or len(relations) > 20: fail('Invalid visual relations.')
                for relation in relations:
                    if not isinstance(relation, dict) or relation.get('from') not in ids or relation.get('to') not in ids:
                        fail('A visual relation points to a missing element.')
                    field(relation.get('description'), 300)
                task = self.model('questioner', {'source': source, 'visual': visual}, image)
                question(task.get('question'))
                field(task.get('rubric'), 2500)
                field(task.get('answer'), 3000)
                refs = task.get('references')
                if (task.get('bloom') not in ('apply', 'analyze', 'evaluate', 'create') or
                    not isinstance(refs, list) or not refs or len(refs) > 12 or
                    any(not isinstance(r, str) or r not in ids for r in refs) or len(refs) != len(set(refs))):
                    fail('Question lacks valid slide references or an Apply-or-higher objective.')
                self.review(task['question'], task, source, visual, image)
                with self.lock:
                    s.update(task=task, elements=elements, visual=visual, busy=False)
                    return dict(self.view(s), snapshot=image['image_url'])
            except Exception:
                with self.lock: self.sessions.pop(sid, None)
                raise
        with self.lock:
            s = self.sessions.get(data.get('session'))
            if not s or s['owner'] != owner or s['expires'] <= time.time():
                raise ClassroomError(404, 'Practice expired. Start a new question.')
            if s['busy']: raise ClassroomError(409, 'A practice request is already in progress.')
            if action == 'forget':
                del self.sessions[s['id']]
                return {'ok': True}
            if self.resolve and s['source']['origin'] == 'instructor-image':
                fresh, _ = self.source(self.resolve({'language': s['source']['language'],
                    'source': dict(s['source'], image={'dataUrl': s['image']['image_url']})}))
                if fresh['revision'] != s['source']['revision']:
                    raise ClassroomError(409, 'The instructor slide changed. Start a new question.')
            if data.get('revision') != s['source']['revision']:
                raise ClassroomError(409, 'Slide snapshot changed. Start a new question.')
            if action == 'explain':
                if not self.view(s)['canExplain']:
                    raise ClassroomError(409, 'First attempt, respond to the tutor and demonstrate a supported revision.')
                s['explanation'] = s['task']['answer']
                return self.view(s)
            if action != 'attempt': raise ClassroomError(404, 'Unknown practice action.')
            if len(s['answers']) >= 8: raise ClassroomError(409, 'Eight attempts reached. Start a fresh question.')
            answer = field(data.get('answer'), 4000)
            normalized = ' '.join(answer.casefold().split())
            if len(answer) < 25 or (len(set(re.findall(r'\w+', answer))) < 5 and len(re.findall(r'[\u3400-\u9fff]', answer)) < 15):
                raise ClassroomError(400, 'Explain your prediction and its visual evidence; a short request for the answer is insufficient.')
            if normalized in s['answers']:
                raise ClassroomError(409, 'Reconsider the tutor question and write a different explanation.')
            s['busy'] = True
        try:
            context = {'source': s['source'], 'visual': s['visual'], 'task': s['task'],
                       'dialogue': s['turns'], 'student': answer}
            assessment = self.model('assessor', context, s['image'])
            status = assessment.get('status')
            quote = assessment.get('quote')
            if (status not in ('supported', 'misconception', 'partial', 'uncertain', 'nonattempt') or
                not isinstance(quote, str) or len(quote) > 500 or (quote and quote not in answer) or
                (status in ('supported', 'misconception') and not quote)):
                fail('Assessment evidence did not match the student response. Retry.')
            references = assessment.get('references')
            if (not isinstance(references, list) or not references or len(references) > 12 or
                any(not isinstance(r, str) or r not in s['task']['references'] for r in references)):
                fail('Assessment did not cite the question visual elements. Retry.')
            field(assessment.get('focus'), 600)
            if status == 'nonattempt':
                raise ClassroomError(400, 'Give your own prediction and reason before requesting assistance.')
            tutor = self.model('tutor', dict(context, assessment=assessment), s['image'])
            probe = question(tutor.get('question'))
            self.review(probe, s['task'], s['source'], s['visual'], s['image'], student=answer)
            with self.lock:
                s['answers'].append(normalized)
                s['turns'].extend([{'role': 'student', 'text': answer}, {'role': 'tutor', 'text': probe}])
                s['status'] = status
                s.pop('explanation', None)
                return self.view(s)
        finally:
            with self.lock: s['busy'] = False

    def review(self, candidate, task, source, visual, image, student=''):
        check = self.model('critic', {'candidate': candidate, 'task': task, 'source': source,
                                     'visual': visual, 'student': student}, image)
        if check.get('safe') is not True:
            fail('The generated question failed the grounding/answer-disclosure check. Retry; no solution was exposed.')
