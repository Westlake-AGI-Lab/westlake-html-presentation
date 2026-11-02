#!/usr/bin/env python3
"""Local presentation server: validated multimodal Responses API and NDJSON streams."""
from __future__ import annotations
import ipaddress
import json
import os
import threading
import time
from http.cookies import SimpleCookie
from html.parser import HTMLParser
from westlake_ppt.classroom.state import Classroom, ClassroomError
from westlake_ppt.classroom.improvements import Improvements, parse_json, validate_slides
from westlake_ppt.classroom.learning import Learning
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qsl

from westlake_ppt.teaching import Teaching, TeachingError
from westlake_ppt.auth import Accounts, MESSAGE
from westlake_ppt.config import settings, api_key, LEGACY_DECK
from westlake_ppt.prompts import load_prompt
from westlake_ppt.server.limits import RequestLimits
from westlake_ppt.server.static import public_files
from westlake_ppt.llm import client, university
from westlake_ppt.llm.client import open_upstream
from westlake_ppt.llm.requests import build_request, personal_slide_request, validate_images

_settings = settings()
BASE_DIR = _settings.web_root
HTML_NAME = _settings.deck_name
CONFIG_PATH = _settings.config_path
HOST, PORT = _settings.host, _settings.port
OPENAI_MODEL, OPENAI_API_BASE = _settings.model, _settings.api_base
MAX_OUTPUT_TOKENS = _settings.max_output_tokens
MAX_REQUEST_BYTES = 12 * 1024 * 1024
ALLOWED_NETWORKS = _settings.allowed_networks
ALLOWED_HOSTS = _settings.allowed_hosts

def call_openai(payload, body=None):
    student = university.CURRENT.get()
    if student is not None:
        return university.infer(student, university.chat_body(payload) if body is None else body)
    return client.call_openai(payload, body, transport=open_upstream)

def stream_response(body, emit):
    return client.stream_response(body, emit, transport=open_upstream)

REQUEST_LIMITS = RequestLimits(*_settings.request_limits)
PUBLIC_FILES = public_files(BASE_DIR, HTML_NAME)

ACCOUNTS = None
ACCOUNTS_LOCK = threading.Lock()
def accounts():
    global ACCOUNTS
    with ACCOUNTS_LOCK:
        if ACCOUNTS is None:
            path = Path(os.environ.get('WORKSPACE_AUTH_DB', str(_settings.classroom_directory / 'accounts.sqlite3'))).expanduser().resolve()
            if path.is_relative_to(BASE_DIR.resolve()):
                raise ValueError('WORKSPACE_AUTH_DB must be outside the web root')
            ACCOUNTS = Accounts(path)
        return ACCOUNTS

TEACHING = None
TEACHING_LOCK = threading.Lock()
def teaching():
    global TEACHING
    with TEACHING_LOCK:
        if TEACHING is None: TEACHING = Teaching(accounts(), BASE_DIR)
        return TEACHING

CLASSROOM = None
QUIZ = None
CLASSROOM_LOCK = threading.Lock()
LEARNING = None
LEARNING_LOCK = threading.Lock()
SOCRATIC = None
SOCRATIC_LOCK = threading.Lock()


def resolve_practice_source(data):
    """PDF practice uses registered instructor pixels, never a client-supplied replacement."""
    source = data.get('source')
    if not isinstance(source, dict): return data
    source = dict(source, origin='browser-snapshot')
    data = dict(data, source=source)
    identity = urlsplit(str(source.get('id', '')))
    if identity.scheme or identity.netloc:
        raise ClassroomError(400, 'Use a local slide identifier.')
    if identity.path != '/lecture.html': return data
    from westlake_ppt.courses import catalog
    params = dict(parse_qsl(identity.query))
    course = next((c for c in teaching().catalog() if c['id'] == params.get('course')), None)
    lecture = next((l for l in course['lectures'] if l['id'] == params.get('lecture')), None) if course else None
    if not lecture: raise ClassroomError(404, 'Lecture not found.')
    page = source.get('page')
    if type(page) is not int or not 1 <= page <= len(lecture['slides']):
        raise ClassroomError(400, 'Slide does not belong to the selected lecture.')
    if lecture.get('source', {}).get('format') != 'pdf': return data
    original = lecture['slides'][page-1]
    image_path = original.get('image', '')
    if image_path not in PUBLIC_FILES or not (BASE_DIR/image_path).resolve().is_relative_to(BASE_DIR.resolve()):
        raise ClassroomError(400, 'Slide image is not registered.')
    import base64
    import io
    from PIL import Image
    with Image.open(BASE_DIR/image_path) as picture:
        picture = picture.convert('RGB')
        picture.thumbnail((2048, 2048))
        output = io.BytesIO()
        picture.save(output, format='JPEG', quality=85)
        if len(output.getvalue()) > 1024*1024:
            output = io.BytesIO(); picture.save(output, format='JPEG', quality=55)
        image = {'dataUrl': 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode()}
    return dict(data, source=dict(source, title=original['title'], text=original.get('text', '')+'\n'+original.get('notes', ''),
                                  image=image, origin='instructor-image'))


def socratic():
    global SOCRATIC
    with SOCRATIC_LOCK:
        if SOCRATIC is None:
            from westlake_ppt.socratic import SocraticPractice
            def generate(instructions, data, image):
                body = {'model': OPENAI_MODEL, 'instructions': instructions,
                        'input': [{'role': 'user', 'content': [
                            {'type': 'input_text', 'text': json.dumps(data, ensure_ascii=False)}, image]}],
                        'max_output_tokens': MAX_OUTPUT_TOKENS, 'store': False, 'stream': False}
                return call_openai({}, body)[0]
            SOCRATIC = SocraticPractice(generate, resolve_practice_source)
        return SOCRATIC

def learning():
    global LEARNING
    with LEARNING_LOCK:
        if LEARNING is None:
            def generate(prompt, slides, language):
                if language not in ('en', 'zh'):
                    raise ValueError('Invalid language')
                body = {'model': OPENAI_MODEL, 'instructions': load_prompt("learning-system.v1.txt").replace("$language", language),
                        'input': [{'role': 'user', 'content': prompt},
                                  {'role': 'user', 'content': json.dumps(slides, ensure_ascii=False)}],
                        'max_output_tokens': MAX_OUTPUT_TOKENS, 'store': False, 'stream': False}
                return call_openai({}, body)[0]
            LEARNING = Learning(classroom(), improvements().deck, generate)
        return LEARNING
def classroom():
    global CLASSROOM
    with CLASSROOM_LOCK:
        if CLASSROOM is None:
            class Slides(HTMLParser):
                def __init__(self):
                    super().__init__(); self.titles = []
                def handle_starttag(self, tag, attrs):
                    attrs = dict(attrs)
                    if tag == 'section' and 'slide' in attrs.get('class','').split():
                        self.titles.append(attrs.get('data-title', str(len(self.titles)+1)))
            parser = Slides(); parser.feed((BASE_DIR / HTML_NAME).read_text())
            CLASSROOM = Classroom(_settings.classroom_directory,
                _settings.teacher_password, _settings.deck_id, parser.titles)
        return CLASSROOM


def personal_slides(payload):
    if university.CURRENT.get() is not None:
        university.no_images(payload)
        clean = dict(payload)
        body = university.chat_body(payload)
        body['instructions'] += load_prompt('personal-slides.v1.txt')
    else:
        clean, body = personal_slide_request(payload)
    answer, model = call_openai(clean, body)
    raw = parse_json(answer).get('slides')
    slides = validate_slides(raw)
    for slide, original in zip(slides, raw):
        sources = original.get('sources')
        if (not isinstance(sources, list) or not 1 <= len(sources) <= 8
                or any(type(n) is not int or not 1 <= n <= len(clean['slides']) for n in sources)
                or len(set(sources)) != len(sources)):
            raise RuntimeError('Invalid source references; retry / 来源页码无效，请重试')
        slide['sources'] = sources
    return {'slides': slides, 'model': model, 'currentSlide': clean['currentSlide']['number']}


def improvements():
    def generate(payload):
        body = build_request(dict(payload, question='Prepare a teacher-reviewed lecture improvement.'))
        body['instructions'] += load_prompt("improvement-system.v1.txt")
        body['input'][-1]['content'] = [{'type':'input_text', 'text':payload['question']}]
        return call_openai(payload, body)
    return Improvements(classroom(), BASE_DIR / HTML_NAME, generate)


class PresentationHandler(SimpleHTTPRequestHandler):
    def log_request(self, code='-', size='-'):
        # Successful 2-second polls are intentionally omitted; no message bodies or tokens are logged.
        if self.path.startswith('/api/classroom/state?') and str(code) == '200':
            return
        # Do not log arbitrary API query strings (credentials must never enter URLs).
        if self.path.startswith('/api/'):
            self.log_message('%s %s', urlsplit(self.path).path, str(code))
            return
        super().log_request(code, size)
    def workspace_token(self):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie', ''))
        except Exception: pass
        return cookie['workspace_session'].value if 'workspace_session' in cookie else ''

    def redirect(self, target):
        self.send_response(303)
        self.send_header('Location', target)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def workspace_response(self, data, token):
        body = json.dumps(data).encode()
        self.send_response(200)
        secure = (university.secure_origin(self) or '').startswith('https://')
        self.send_header('Set-Cookie', f'workspace_session={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={43200 if token else 0}' + ('; Secure' if secure else ''))
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def workspace_get(self, route, head):
        # DB join on every request also handles deletions and role changes immediately.
        account = accounts().account(self.workspace_token())
        if route in ('/', '/login', '/login/', '/login.html', '/student.html') and account:
            self.redirect(accounts().home(account)); return True
        if route in ('/login', '/login/', '/login.html'):
            self.redirect('/student.html'); return True
        teacher_page = route == '/teacher' or route.startswith('/teacher/') or route == '/teacher.html'
        teacher_api = route == '/api/teacher' or route.startswith('/api/teacher/')
        if teacher_page or teacher_api:
            if not account or not account['is_teacher']:
                if teacher_api:self.json_response(403,{'error':'Forbidden'},head)
                else:self.redirect('/courses' if account else '/student.html')
                return True
            try:
                parts=route.strip('/').split('/')
                if teacher_page and len(parts)>2 and parts[1]=='courses':
                    teaching().own(account['id'],parts[2])
                    if len(parts)>4: teaching().lecture(parts[2],parts[4],account['id'])
                if teacher_api:
                    params=dict(parse_qsl(urlsplit(self.path).query))
                    endpoint=route.rsplit('/',1)[-1]
                    if endpoint=='workspace': result={'ok':True}
                    elif endpoint=='today': result=teaching().today(account['id'])
                    elif endpoint=='courses': result={'courses':teaching().summaries(account['id']),'uploadLimit':teaching().maximum}
                    elif endpoint=='lecture': result=teaching().detail(account['id'],params.get('course'),params.get('lecture'))
                    else: raise TeachingError(404,'Not found')
                    self.json_response(200,result,head);return True
            except TeachingError as exc:
                self.json_response(exc.code,{'error':exc.message},head);return True
            body = (BASE_DIR / 'teacher.html').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if not head: self.wfile.write(body)
            return True
        if route.startswith('/api/lecture-file/'):
            try:
                _,_,token,name=route.strip('/').split('/')
                path=teaching().file(token,name,account)
                body=path.read_bytes();self.send_response(200)
                self.send_header('Content-Type','application/pdf' if name.endswith('.pdf') else 'image/webp')
                self.send_header('Content-Length',str(len(body)));self.end_headers()
                if not head:self.wfile.write(body)
            except (TeachingError,ValueError) as exc:
                self.json_response(exc.code if isinstance(exc,TeachingError) else 404,{'error':'Not found'},head)
            return True
        if route.startswith('/assets/lectures/') or route.startswith('/assets/private-lectures/'):
            # Even registered old source files must not bypass Draft/Hidden status.
            all_courses=teaching().catalog(account['id'] if account and account['is_teacher'] else None)
            visible={p for c in all_courses for l in c['lectures'] for p in [l.get('source',{}).get('file','')]+[x.get(k,'') for x in l['slides'] for k in ('image','thumbnail')]}
            if route.lstrip('/') not in visible:
                self.json_response(404,{'error':'Not found'},head);return True
        if route in ('/courses', '/courses/', '/courses.html'):
            if not account: self.redirect('/student.html'); return True
            if account['is_teacher']: self.redirect('/teacher'); return True
            if route == '/courses/': self.redirect('/courses'); return True
            self.path = '/courses.html'
        if route == '/api/auth/session':
            self.json_response(200, {'authenticated': bool(account),
                'name': account['name'] if account else '', 'id': account['id'] if account else '',
                'redirect': accounts().home(account) if account else '/student.html'}, head)
            return True
        return False

    def workspace_post(self, route, origin, expected_origin):
        if not (route.startswith('/api/auth/') or route == '/api/study/open' or route == '/api/teacher' or route.startswith('/api/teacher/')):
            return False
        if route == '/api/study/open' or route == '/api/teacher' or route.startswith('/api/teacher/'):
            account=accounts().account(self.workspace_token())
            if not account or (route!='/api/study/open' and not account['is_teacher']):
                self.json_response(403,{'error':'Forbidden'});return True
            if origin!=expected_origin:
                self.json_response(403,{'error':'Same-origin required'});return True
            try:
                length=int(self.headers.get('Content-Length','0'))
                maximum=teaching().maximum if route.endswith('/upload') else 65536
                if not 0<length<=maximum: raise TeachingError(413,'Upload too large / 文件太大')
                self.connection.settimeout(120)
                if route.endswith('/upload'):
                    params=dict(parse_qsl(urlsplit(self.path).query))
                    result=teaching().upload(account['id'],params.get('course'),unquote(self.headers.get('X-Filename','lecture.pdf')),self.rfile.read(length),params.get('replace'))
                else:
                    data=json.loads(self.rfile.read(length))
                    if not isinstance(data,dict):raise TeachingError(400,'Invalid request')
                    if route=='/api/study/open':
                        teaching().event(account,dict(data,action='opened'));result={'ok':True}
                    else: result=teaching().mutate(account['id'],route.rsplit('/',1)[-1],data)
                self.json_response(200,result)
            except TeachingError as exc:self.json_response(exc.code,{'error':exc.message})
            except (ValueError,TypeError):self.json_response(400,{'error':'Invalid request / 无效请求'})
            return True
        if origin != expected_origin or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            self.json_response(403, {'error': MESSAGE}); return True
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096: raise ValueError()
            self.connection.settimeout(15)
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict): raise ValueError()
        except (ValueError, TimeoutError):
            self.close_connection = True
            self.json_response(401, {'error': MESSAGE}); return True
        if route == '/api/auth/login':
            result = accounts().login(data.get('id'), data.get('password'), self.client_address[0])
            if result: self.workspace_response({'redirect': result[1]}, result[0])
            else: self.json_response(401, {'error': MESSAGE})
        elif route == '/api/auth/logout':
            accounts().logout(self.workspace_token())
            self.workspace_response({'redirect': '/student.html'}, '')
        else: self.json_response(404, {'error': 'Not found'})
        return True

    def student_sid(self):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie', ''))
        except Exception: pass
        return cookie['slidemate_student'].value if 'slidemate_student' in cookie else ''

    def student_cookie(self, sid):
        secure = (university.secure_origin(self) or '').startswith('https://')
        self.send_header('Set-Cookie', f'slidemate_student={sid}; Path=/api/; HttpOnly; SameSite=Strict; Max-Age={university.SESSIONS.lifetime if sid else 0}' + ('; Secure' if secure else ''))

    def student_response(self, data, sid):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(200)
        self.student_cookie(sid)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def student_access(self):
        if not university.secure_origin(self):
            university.fail(403, 'https_required', 'Remote token entry requires HTTPS. LAN HTTP is disabled. Use localhost or contact the operator. / 远程连接必须使用 HTTPS，内网 HTTP 已禁用。请使用本机地址或联系维护者。')

    def credentials(self):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie',''))
        except Exception: pass
        teacher = cookie['ppt_teacher'].value if 'ppt_teacher' in cookie else ''
        return teacher, self.headers.get('X-Classroom-Token','')

    def classroom_response(self, data):
        token = data.pop('_cookie', None)
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(200)
        if token is not None:
            self.send_header('Set-Cookie', f'ppt_teacher={token}; Path=/api/classroom/; HttpOnly; SameSite=Strict; Max-Age={43200 if token else 0}')
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store" if self.path.startswith("/api/") else "no-cache")
        super().end_headers()

    def json_response(self, status, data, head=False):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def allowed_client(self, head=False):
        try:
            address = ipaddress.ip_address(self.client_address[0])
            hostname = urlsplit("//" + self.headers.get("Host", "")).hostname
            allowed = hostname in ALLOWED_HOSTS and any(address in network for network in ALLOWED_NETWORKS)
        except ValueError:
            allowed = False
        if not allowed:
            self.close_connection = True
            self.json_response(403, {"error": "仅允许指定内网地址访问。"}, head)
        return allowed

    def serve_public(self, head=False):
        if not self.allowed_client(head):
            return
        if self.workspace_get(unquote(urlsplit(self.path).path), head):
            return
        name = unquote(urlsplit(self.path).path).lstrip("/") or HTML_NAME
        if name == LEGACY_DECK:
            name = HTML_NAME
        params = dict(parse_qsl(urlsplit(self.path).query))
        if getattr(self.server, 'catalog_home', False) and urlsplit(self.path).path == '/' and not params:
            name = 'courses.html'
        if name == 'api/courses':
            from ..courses import catalog
            source = (BASE_DIR / HTML_NAME).read_text(encoding='utf-8')
            is_eigen = 'class="eigen-demo"' in source
            catalog_account=accounts().account(self.workspace_token())
            courses = teaching().catalog(catalog_account['id'] if catalog_account and catalog_account['is_teacher'] else None)
            for course in courses:course['lectures']=[l for l in course['lectures'] if l['status']=='published']
            for course in courses:
                for lecture in course['lectures']:
                    if lecture.get('source'):
                        lecture['preview'] = lecture['slides'][0].get('thumbnail', '')
                    lecture['slideCount'] = len(lecture.pop('slides'))
                    lecture['href'] = 'lecture.html?course=' + course['id'] + '&lecture=' + lecture['id']
                if is_eigen and course['id'] == 'linear-algebra':
                    course['lectures'].append(dict(id='diagonalization', number='7.1', title='Eigenvectors and diagonalization',
                        summary='The existing interactive Linear Algebra demo, with animated geometry, practice, and classroom quiz.',
                        existing=True, slideCount=16, href=HTML_NAME))
            self.json_response(200, {'courses':courses, 'current':{'isEigen':is_eigen, 'href':HTML_NAME}}, head)
            return
        if name == 'lecture.html':
            from ..courses import catalog, render_lecture
            # Sample lectures cannot silently join the main deck's classroom or quiz.
            if params.get('mode', 'solo') != 'solo' or params.get('room'):
                self.json_response(400, {'error':'Sample lectures support self-study only.'}, head)
                return
            account=accounts().account(self.workspace_token())
            preview=params.get('preview')=='1'
            if preview and (not account or not account['is_teacher']):
                self.json_response(403,{'error':'Forbidden'},head);return
            if account and account['is_teacher']:
                try: teaching().own(account['id'],params.get('course'))
                except TeachingError:self.json_response(404,{'error':'Not found'},head);return
            course = next((c for c in teaching().catalog(account['id'] if preview else None) if c['id'] == params.get('course')), None)
            lecture = next((l for l in course['lectures'] if l['id'] == params.get('lecture')), None) if course else None
            if lecture is None:
                self.send_error(404)
                return
            source = render_lecture((BASE_DIR / HTML_NAME).read_text(encoding='utf-8'), course, lecture)
            context=json.dumps(dict(course=course['id'],lecture=lecture['id'],preview=preview,notes=teaching().notes(course['id'],lecture['id']))).replace('<','\\u003c')
            source=source.replace('</body>','<script id="studyContext" type="application/json">'+context+'</script><script src="/assets/study-events.js"></script></body>')
            if preview:
                source=source.replace('</head>','<style>#agentPanel,#agentLauncher,#agentScrim,#sourceAskAssistant,.source-study-tools,#sourceEdit,#sourceNotes,.source-header-tools .source-mode-button{display:none!important}</style></head>')
            body=source.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if not head:
                self.wfile.write(body)
            return
        if name.startswith('api/classroom/'):
            if head:
                self.json_response(405, {'error':'GET required'}, True); return
            try:
                teacher, member = self.credentials()
                if name == 'api/classroom/improvement-file':
                    params = dict(parse_qsl(urlsplit(self.path).query))
                    source = improvements().artifact(params.get('id', ''), teacher)
                    download = params.get('download') == '1'
                    if not download:
                        source = source.replace('<head>', '<head><base href="/">', 1)
                    body = source.encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(body)))
                    if download:
                        self.send_header('Content-Disposition', 'attachment; filename="reviewed-presentation.html"')
                    self.end_headers(); self.wfile.write(body)
                    return
                if name == 'api/classroom/improvement-dashboard':
                    params = dict(parse_qsl(urlsplit(self.path).query))
                    self.json_response(200, improvements().dashboard(params.get('room', ''), teacher))
                    return
                result = classroom().get(name.rsplit('/',1)[-1], dict(parse_qsl(urlsplit(self.path).query)), teacher, member)
                self.json_response(200,result)
            except ClassroomError as exc: self.json_response(exc.code,{'error':exc.message})
            except Exception: self.json_response(500,{'error':'Classroom unavailable / 课堂暂不可用'})
            return
        if name == 'api/cpp/status':
            from ..cpp_runner import status
            data = status()
            if not ipaddress.ip_address(self.client_address[0]).is_loopback:
                data['enabled'] = False
            self.json_response(200, data, head)
            return
        if name == 'api/university/status':
            student = None
            try: student = university.SESSIONS.get(self.student_sid())
            except university.AccessError: pass
            self.json_response(200, {'required': university.enabled(self.server),
                'available': bool(university.secure_origin(self)), 'connected': student is not None,
                'models': university.models(), 'model': student.model if student else None,
                'expiresAt': student.expires if student else None, 'lifetime': university.SESSIONS.lifetime,
                'images': False, 'stream': False}, head)
            return
        if name == "api/health":
            self.json_response(200, {"ok": True, "configured": bool(api_key()),
                "model": OPENAI_MODEL, "stream": True, "images": True}, head)
            return
        path = BASE_DIR / name
        if name not in PUBLIC_FILES or path.is_symlink() or not path.is_file() or BASE_DIR not in path.resolve().parents:
            self.send_error(404)
            return
        self.path = "/" + name
        if head:
            super().do_HEAD()
        else:
            super().do_GET()

    def workspace_other_method(self):
        if not self.allowed_client(): return
        route = unquote(urlsplit(self.path).path)
        if route == '/api/teacher' or route.startswith('/api/teacher/'):
            account = accounts().account(self.workspace_token())
            self.json_response(405 if account and account['is_teacher'] else 403, {'error': 'Method not allowed' if account and account['is_teacher'] else 'Forbidden'})
        elif route == '/teacher' or route.startswith('/teacher/'):
            account = accounts().account(self.workspace_token())
            if not account or not account['is_teacher']:
                self.redirect('/courses' if account else '/student.html')
            else: self.json_response(405, {'error': 'Method not allowed'})
        else: self.json_response(405, {'error': 'Method not allowed'})

    do_PUT = do_PATCH = do_DELETE = do_OPTIONS = workspace_other_method

    def do_GET(self):
        self.serve_public()

    def do_HEAD(self):
        self.serve_public(True)

    def do_POST(self):
        streaming = False
        acquired = False
        student = None
        binding = None
        try:
            if not self.allowed_client():
                return
            origin = self.headers.get("Origin")
            expected_origin = university.secure_origin(self) or f"http://{self.headers.get('Host')}"
            route = unquote(urlsplit(self.path).path)
            if self.workspace_post(route, origin, expected_origin):
                return
            if origin and origin != expected_origin:
                self.json_response(403, {"error": "不接受跨站请求。"})
                return
            if route.startswith('/api/university/'):
                self.student_access()
                if origin != expected_origin or self.headers.get('Sec-Fetch-Site') == 'cross-site':
                    university.fail(403, 'origin', 'Same-origin request required. / 仅接受同源请求。')
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    raise ValueError('JSON required')
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 8192:
                    university.fail(413, 'size', 'Connection request too large. / 连接请求过大。')
                self.connection.settimeout(15)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict): raise ValueError('Invalid object')
                if route == '/api/university/disconnect':
                    university.SESSIONS.remove(self.student_sid())
                    self.student_response({'connected': False}, '')
                    return
                if route == '/api/university/model':
                    sid = self.student_sid()
                    student = university.SESSIONS.acquire(sid)
                    limited = REQUEST_LIMITS.acquire('university-model:'+self.client_address[0])
                    if limited:
                        university.fail(429, 'switch_limit', 'Too many requests; wait before switching. / 请求过多，请稍后切换。')
                    acquired = True
                    self.connection.settimeout(90)
                    # Only the model comes from the browser; credentials stay in this session.
                    model = data.get('model')
                    university.probe(student.token, model)
                    university.SESSIONS.activate_model(sid, student, model)
                    self.json_response(200, {'connected': True, 'model': student.model,
                        'expiresAt': student.expires})
                    return
                if route != '/api/university/connect':
                    self.json_response(404, {'error':'Unknown connection action'}); return
                limited = REQUEST_LIMITS.acquire('university-connect:'+self.client_address[0])
                if limited: university.fail(429, 'connect_limit', 'Too many connection attempts; wait before retrying. / 连接尝试过多，请稍后重试。')
                acquired = True
                self.connection.settimeout(90)
                university.probe(data.get('token'), data.get('model'))
                sid = university.SESSIONS.create(data['token'], data['model'])
                university.SESSIONS.remove(self.student_sid())
                self.student_response({'connected': True, 'model': data['model'],
                    'expiresAt': university.SESSIONS.get(sid).expires}, sid)
                return
            if route in ('/api/chat', '/api/personal-slides', '/api/socratic', '/api/learning') and university.enabled(self.server):
                self.student_access()
                if origin != expected_origin:
                    university.fail(403, 'origin', 'Same-origin request required. / 仅接受同源请求。')
                student = university.SESSIONS.acquire(self.student_sid())
                binding = university.CURRENT.set(student)
                if route == '/api/socratic':
                    university.fail(422, 'images_unverified', 'Visual practice is disabled: university image requests have not been verified. Use text chat. / 大学图片请求尚未验证，视觉练习已禁用，请使用文字问答。')
            if urlsplit(self.path).path == '/api/cpp/run':
                if origin != expected_origin or not ipaddress.ip_address(self.client_address[0]).is_loopback:
                    self.json_response(403, {'error':'C++ requires a same-origin localhost request.'}); return
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 32768:
                    self.json_response(413, {'error':'C++ request too large.'}); return
                self.connection.settimeout(25)
                from ..cpp_runner import run
                code, result = run(json.loads(self.rfile.read(length)))
                self.json_response(code, result)
                return
            if urlsplit(self.path).path.startswith('/api/classroom/'):
                if origin != expected_origin:
                    self.json_response(403,{'error':'Same-origin request required'}); return
                length = int(self.headers.get('Content-Length','0'))
                maximum = 131072 if urlsplit(self.path).path.startswith('/api/classroom/learning-') else (
                    65536 if urlsplit(self.path).path.startswith('/api/classroom/improvement-') else 16384)
                if not 0 < length <= maximum:
                    self.json_response(413,{'error':'Classroom request too large'}); return
                self.connection.settimeout(15)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data,dict): raise ValueError('Invalid object')
                teacher, member = self.credentials()
                action = urlsplit(self.path).path.rsplit('/',1)[-1]
                if action.startswith('quiz-'):
                    if QUIZ is None:
                        raise ClassroomError(404, 'Class quizzes are not enabled for this deck')
                    self.json_response(200, QUIZ.action(action.removeprefix('quiz-'), data, teacher, member))
                    return
                if action.startswith('learning-'):
                    classroom().require_teacher(teacher)
                    if action == 'learning-extract':
                        limited = REQUEST_LIMITS.acquire('teacher-learning:'+teacher)
                        if limited: raise ClassroomError(429, limited)
                        acquired = True
                    self.connection.settimeout(120)
                    self.json_response(200, learning().teacher(action.removeprefix('learning-'), data, teacher))
                    return
                if action.startswith('improvement-'):
                    classroom().require_teacher(teacher)
                    limited = REQUEST_LIMITS.acquire('teacher-improvements:'+teacher)
                    if limited:
                        raise ClassroomError(429, limited)
                    acquired = True
                    self.connection.settimeout(120)
                    self.json_response(200, improvements().action(action.removeprefix('improvement-'), data, teacher))
                    return
                self.classroom_response(classroom().post(urlsplit(self.path).path.rsplit('/',1)[-1],data,teacher,member,self.client_address[0]))
                return
            if urlsplit(self.path).path == '/api/socratic':
                if origin != expected_origin:
                    raise ClassroomError(403, 'Same-origin request required')
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 2 * 1024 * 1024:
                    raise ClassroomError(413, 'Practice request too large')
                self.connection.settimeout(120)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict): raise ValueError('Invalid object')
                room = self.headers.get('X-Classroom-Room', '')
                identity = classroom().ai_identity(room, self.headers.get('X-Classroom-Token', '')) if room else self.client_address[0]
                limited = REQUEST_LIMITS.acquire(identity)
                if limited: raise ClassroomError(429, limited)
                acquired = True
                self.json_response(200, socratic().action(data, identity))
                return
            if urlsplit(self.path).path == '/api/learning':
                if origin != expected_origin:
                    raise ClassroomError(403, 'Same-origin request required')
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16384:
                    raise ClassroomError(413, 'Practice request too large')
                self.connection.settimeout(120)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict): raise ValueError('Invalid object')
                room, token = self.headers.get('X-Classroom-Room', ''), self.headers.get('X-Classroom-Token', '')
                identity = self.student_sid() if student else (classroom().ai_identity(room, token) if room else self.client_address[0])
                action = data.get('action')
                if action == 'attempt':
                    limited = REQUEST_LIMITS.acquire(identity)
                    if limited: raise ClassroomError(429, limited)
                    acquired = True
                else:
                    with classroom().lock: classroom().limit(('learning', identity), 180, 60)
                self.json_response(200, learning().action(action, data, identity, room, token))
                return
            if urlsplit(self.path).path not in ("/api/chat", "/api/personal-slides"):
                self.json_response(404, {"error": "接口不存在。"})
                return
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_REQUEST_BYTES:
                self.json_response(413, {"error": "请求为空或超过 12 MiB。"})
                return
            identity = self.student_sid() if student else self.client_address[0]
            if not student and self.headers.get('X-Classroom-Room'):
                identity = classroom().ai_identity(self.headers['X-Classroom-Room'], self.headers.get('X-Classroom-Token',''))
            limited = REQUEST_LIMITS.acquire(identity)
            if limited:
                self.close_connection = True
                self.json_response(429, {"error": limited})
                return
            acquired = True
            self.connection.settimeout(120)
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("请求格式错误。")
            if urlsplit(self.path).path == '/api/personal-slides':
                self.json_response(200, personal_slides(payload))
                return
            study_account=accounts().account(self.workspace_token())
            study_context=payload.get('studyContext')
            if study_context:
                if not isinstance(study_context,dict):raise TeachingError(400,'Invalid study context')
                if not study_account:raise TeachingError(403,'Sign in required')
                if not study_account['is_teacher']:
                    _,study_lecture=teaching().lecture(study_context.get('course'),study_context.get('lecture'))
                    slide=study_context.get('slide')
                    if type(slide)!=int or not 1<=slide<=len(study_lecture['slides']):raise TeachingError(400,'Invalid slide')
            body = university.chat_body(payload) if student else build_request(payload)
            question_event=teaching().event(study_account,study_context,payload.get('question',''),'') if study_context else None
            if payload.get('shareForImprovement') is True:
                if not self.headers.get('X-Classroom-Room'):
                    raise ClassroomError(403, 'Join a class before sharing / 分享前请加入课堂')
                improvements().record(self.headers['X-Classroom-Room'], self.headers.get('X-Classroom-Token',''), payload)
            if student:
                answer, model = university.infer(student, body)
                if question_event: teaching().complete_answer(question_event,answer)
                self.json_response(200, {'answer': answer, 'model': model, 'grounding': 'current-slide-text', 'stream': False})
            elif body["stream"]:
                self.send_response(200)
                self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
                self.send_header("X-Accel-Buffering", "no")
                self.send_header("Connection", "close")
                self.end_headers()
                self.close_connection = True
                streaming = True
                collected=[]
                def capture(event):
                    if event.get('type')=='delta':collected.append(event.get('text',''))
                    if event.get('type')=='done' and question_event:teaching().complete_answer(question_event,''.join(collected))
                    self.emit(event)
                stream_response(body, capture)
            else:
                answer, model = call_openai(payload)
                if question_event: teaching().complete_answer(question_event,answer)
                self.json_response(200, {"answer": answer, "model": model})
        except (BrokenPipeError, ConnectionResetError):
            return
        except TeachingError as exc:
            self.json_response(exc.code,{'error':exc.message})
        except university.AccessError as exc:
            if exc.code == 'token_invalid' and urlsplit(self.path).path != '/api/university/model':
                university.SESSIONS.remove(self.student_sid())
            self.json_response(exc.status, {'error':exc.message, 'code':exc.code})
        except ClassroomError as exc:
            self.json_response(exc.code, {'error':exc.message})
        except Exception as exc:
            message = str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "服务请求失败或超时。"
            try:
                if streaming:
                    self.emit({"type": "error", "error": message})
                else:
                    self.json_response(400 if isinstance(exc, ValueError) else 502, {"error": message})
            except (BrokenPipeError, ConnectionResetError):
                pass
        finally:
            if binding is not None:
                university.CURRENT.reset(binding)
            if student is not None:
                university.SESSIONS.release(student)
            if acquired:
                REQUEST_LIMITS.release()

    def emit(self, event):
        self.wfile.write((json.dumps(event, ensure_ascii=False) + "\n").encode())
        self.wfile.flush()

def main():
    classroom()
    ThreadingHTTPServer.request_queue_size = 128
    server = ThreadingHTTPServer((HOST, PORT), PresentationHandler)
    server.catalog_home = globals().get('CATALOG_HOME', False)
    print(f"Westlake HTML presentation: http://{HOST}:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
