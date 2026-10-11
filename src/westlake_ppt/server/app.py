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

from westlake_ppt.config import settings, api_key, LEGACY_DECK
from westlake_ppt.prompts import load_prompt
from westlake_ppt.server.limits import RequestLimits
from westlake_ppt.server.static import public_files
from westlake_ppt.llm import client
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
    return client.call_openai(payload, body, transport=open_upstream)

def stream_response(body, emit):
    return client.stream_response(body, emit, transport=open_upstream)

REQUEST_LIMITS = RequestLimits(*_settings.request_limits)
PUBLIC_FILES = public_files(BASE_DIR, HTML_NAME)

CLASSROOM = None
CLASSROOM_LOCK = threading.Lock()
LEARNING = None
LEARNING_LOCK = threading.Lock()

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
        super().log_request(code, size)
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
        name = unquote(urlsplit(self.path).path).lstrip("/") or HTML_NAME
        if name == LEGACY_DECK:
            name = HTML_NAME
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

    def do_GET(self):
        self.serve_public()

    def do_HEAD(self):
        self.serve_public(True)

    def do_POST(self):
        streaming = False
        acquired = False
        try:
            if not self.allowed_client():
                return
            origin = self.headers.get("Origin")
            if origin and origin != f"http://{self.headers.get('Host')}":
                self.json_response(403, {"error": "不接受跨站请求。"})
                return
            if urlsplit(self.path).path.startswith('/api/classroom/'):
                if origin != f"http://{self.headers.get('Host')}":
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
            if urlsplit(self.path).path == '/api/learning':
                if origin != f"http://{self.headers.get('Host')}":
                    raise ClassroomError(403, 'Same-origin request required')
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16384:
                    raise ClassroomError(413, 'Practice request too large')
                self.connection.settimeout(120)
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict): raise ValueError('Invalid object')
                room, token = self.headers.get('X-Classroom-Room', ''), self.headers.get('X-Classroom-Token', '')
                identity = classroom().ai_identity(room, token) if room else self.client_address[0]
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
            identity = self.client_address[0]
            if self.headers.get('X-Classroom-Room'):
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
            body = build_request(payload)
            if payload.get('shareForImprovement') is True:
                if not self.headers.get('X-Classroom-Room'):
                    raise ClassroomError(403, 'Join a class before sharing / 分享前请加入课堂')
                improvements().record(self.headers['X-Classroom-Room'], self.headers.get('X-Classroom-Token',''), payload)
            if body["stream"]:
                self.send_response(200)
                self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
                self.send_header("X-Accel-Buffering", "no")
                self.send_header("Connection", "close")
                self.end_headers()
                self.close_connection = True
                streaming = True
                stream_response(body, self.emit)
            else:
                answer, model = call_openai(payload)
                self.json_response(200, {"answer": answer, "model": model})
        except (BrokenPipeError, ConnectionResetError):
            return
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
            if acquired:
                REQUEST_LIMITS.release()

    def emit(self, event):
        self.wfile.write((json.dumps(event, ensure_ascii=False) + "\n").encode())
        self.wfile.flush()

def main():
    classroom()
    ThreadingHTTPServer.request_queue_size = 128
    server = ThreadingHTTPServer((HOST, PORT), PresentationHandler)
    print(f"Westlake HTML presentation: http://{HOST}:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
