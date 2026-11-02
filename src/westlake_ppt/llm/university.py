"""University Chat Completions, with process-memory student credentials only.

Protocol evidence: https://hpc.westlake.edu.cn/document/science/soft/more/ai.html
The university documents its OpenAI-compatible campus interface and model IDs.
No Responses, SSE, or image capability is assumed from that label.
"""
from contextvars import ContextVar
from dataclasses import dataclass, field
import ipaddress
import json
import os
import secrets
import socket
import threading
import time
from urllib import request, error
from urllib.parse import urlsplit

from .requests import compact_text, build_request

ENDPOINT = 'https://hpc-api.westlake.edu.cn/v1/chat/completions'
ALIASES = ('deepseek-flash', 'glm-flash', 'Qwen')
CURRENT = ContextVar('university_student', default=None)


class AccessError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message
        super().__init__(message)


def fail(status, code, message):
    raise AccessError(status, code, message)


@dataclass(repr=False)
class Student:
    token: str = field(repr=False)
    model: str
    expires: float
    active: bool = False
    recent: list = field(default_factory=list)


class Sessions:
    def __init__(self, lifetime=7200):
        self.lifetime = lifetime
        self.items = {}
        self.lock = threading.RLock()

    def prune(self):
        with self.lock:
            now = time.time()
            for sid in list(self.items):
                if self.items[sid].expires <= now:
                    self.items.pop(sid).token = ''

    def create(self, token, model):
        with self.lock:
            self.prune()
            if len(self.items) >= 1000:
                fail(503, 'capacity', 'Connections are busy; try later. / 连接繁忙，请稍后重试。')
            sid = secrets.token_urlsafe(32)
            self.items[sid] = Student(token, model, time.time()+self.lifetime)
            return sid

    def get(self, sid):
        with self.lock:
            self.prune()
            student = self.items.get(sid)
            if not student:
                fail(401, 'session_expired', 'Connect your university account again. The SlideMate session is missing, expired, or was cleared by a restart. Your draft is retained. / 请重新连接大学 AI 账号：会话缺失、已过期或服务已重启。草稿已保留。')
            return student

    def remove(self, sid):
        with self.lock:
            student = self.items.pop(sid, None)
            if student:
                student.token = ''

    def acquire(self, sid):
        with self.lock:
            student = self.get(sid)
            student.recent = [t for t in student.recent if t > time.time()-3600]
            maximum = max(1, min(200, int(os.environ.get('UNIVERSITY_REQUESTS_PER_HOUR', '30'))))
            if student.active or len(student.recent) >= maximum:
                fail(429, 'session_limit', 'One request at a time; up to %s per hour. Wait before retrying. / 每次仅一个请求，每小时最多 %s 次，请稍后重试。' % (maximum, maximum))
            student.active = True
            student.recent.append(time.time())
            return student

    def activate_model(self, sid, student, model):
        # The request holds this student's active slot throughout the probe.
        with self.lock:
            if self.get(sid) is not student:
                fail(401, 'session_expired', 'Connection changed; reconnect. / 会话已变化，请重新连接。')
            student.model = model

    def release(self, student):
        with self.lock:
            student.active = False


SESSIONS = Sessions(max(300, min(43200, int(os.environ.get('UNIVERSITY_SESSION_SECONDS', '7200')))))


def _cleanup():
    while True:
        time.sleep(60)
        SESSIONS.prune()


threading.Thread(target=_cleanup, daemon=True, name='student-session-expiry').start()


def models():
    selected = os.environ.get('UNIVERSITY_MODELS', ','.join(ALIASES)).split(',')
    return [m for m in ALIASES if m in {v.strip() for v in selected}]


def enabled(server=None):
    # Catalog workflow always requires students' own tokens, including in legacy deployments.
    return bool(getattr(server, 'catalog_home', False)) or os.environ.get('PPT_AI_MODE', 'university') != 'operator'


def secure_origin(handler):
    """HTTPS proxy requires an explicit public origin and a loopback trusted proxy.

    Never trust arbitrary X-Forwarded-Proto; direct HTTP LAN token entry is disabled.
    """
    configured = os.environ.get('UNIVERSITY_PUBLIC_ORIGIN', '').rstrip('/')
    host = handler.headers.get('Host', '')
    try:
        peer_local = ipaddress.ip_address(handler.client_address[0]).is_loopback
        host_local = urlsplit('//'+host).hostname in ('localhost', '127.0.0.1', '::1')
    except ValueError:
        return None
    if isinstance(handler.connection, __import__('ssl').SSLSocket):
        return 'https://'+host
    if configured and peer_local and configured == 'https://'+host:
        return configured
    if peer_local and host_local:
        return 'http://'+host
    return None


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def upstream(student, body, *, opener=None):
    token = student.token
    if not token:
        fail(401, 'session_expired', 'Reconnect your university account. / 请重新连接大学账号。')
    req = request.Request(ENDPOINT, method='POST', data=json.dumps(body, ensure_ascii=False).encode(),
                          headers={'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        start = time.monotonic()
        with (opener or request.build_opener(NoRedirect()).open)(req, timeout=45) as response:
            # Bound output and total read time as well as socket inactivity.
            chunks, size = [], 0
            while True:
                if time.monotonic()-start > 60:
                    raise TimeoutError()
                chunk = response.read1(65536)
                if not chunk:
                    break
                size += len(chunk)
                if size > 2*1024*1024:
                    fail(502, 'provider_response', 'University response too large. / 大学服务响应过大。')
                chunks.append(chunk)
            data = json.loads(b''.join(chunks))
        choice = data['choices'][0]
        if choice.get('finish_reason') not in ('stop',):
            fail(502, 'incomplete', 'The university response was interrupted or reached its output limit. Retry explicitly. / 大学回答中断或达到输出上限，请手动重试。')
        answer = choice['message']['content']
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError()
        # Gateways must never echo a credential into chat archives or the UI.
        if not student.token or student.expires <= time.time():
            fail(401, 'session_expired', 'Connection expired or disconnected; reconnect. / 会话已过期或断开，请重新连接。')
        return answer.replace(token, '[redacted]').strip(), student.model
    except error.HTTPError as exc:
        status = exc.code
        exc.close()  # Never read/relay a provider error body or redirect Location.
        if status == 401:
            fail(401, 'token_invalid', 'Private Token is invalid or expired. Disconnect and connect a new token. / Private Token 无效或已过期，请断开后重新连接。')
        if status in (403, 404):
            fail(403, 'model_unavailable', 'Model unavailable or not authorized. Check your university model permissions and reconnect with another listed model. / 模型不可用或未授权，请检查大学服务权限并重新选择模型连接。')
        if status in (402, 429):
            fail(429, 'quota', 'University quota or rate limit reached. Check your account quota and wait before retrying. / 大学额度或频率受限，请检查账号额度并稍后重试。')
        if status in (400, 415, 422):
            fail(502, 'schema', 'The university rejected this request format. Contact the operator; images are not enabled. / 大学服务拒绝该请求格式，请联系维护者；图片尚未启用。')
        fail(502, 'provider_unavailable', 'University service unavailable or redirected. Try later; credentials were not forwarded. / 大学服务不可用或重定向，请稍后重试；未转发凭据。')
    except (TimeoutError, socket.timeout):
        fail(504, 'timeout', 'University request timed out. Your draft is retained; retry explicitly. / 大学服务超时，草稿已保留，请手动重试。')
    except error.URLError:
        fail(502, 'network', 'Cannot reach the university service. Check campus network/VPN on the SlideMate server. / 无法连接大学服务，请检查 SlideMate 服务器的校园网或 VPN。')
    except (ValueError, KeyError, IndexError, TypeError, OSError):
        fail(502, 'provider_response', 'University response incomplete or incompatible. Retry explicitly or contact the operator. / 大学响应不完整或格式不兼容，请手动重试或联系维护者。')


def no_images(payload):
    if payload.get('images') or any(isinstance(h, dict) and h.get('images') for h in payload.get('history', [])):
        fail(422, 'images_unverified', 'Image input has not been verified for the university interface. Remove attached images; Xiaoxi can use slide text only. / 大学接口图片输入尚未验证，请移除图片；小西目前仅理解幻灯片文字。')


def chat_body(payload):
    no_images(payload)
    current, slides = payload.get('currentSlide'), payload.get('slides')
    if not isinstance(current, dict) or not isinstance(slides, list):
        raise ValueError('Missing current slide / 缺少当前页')
    n = current.get('number')
    if type(n) is not int or not 1 <= n <= len(slides) or not isinstance(slides[n-1], dict):
        raise ValueError('Invalid current slide / 当前页无效')
    # Validate with the established builder, but send only the current slide.
    selected = dict(slides[n-1], number=n)
    clean = dict(payload, slides=[selected], currentSlide=dict(selected, number=1), stream=False)
    body = build_request(clean)
    body['input'][-1]['content'][0]['text'] = f'Current slide / 当前页: {n} · {compact_text(selected.get("title"),200)}\nQuestion / 问题: {compact_text(payload.get("question"),4000)}'
    body['instructions'] += '\nOnly supplied slide text and selected conversation are available. No slide pixels are supplied. Never claim to see an image. / 仅提供当前页文字与所选对话，无图像像素，不得声称看到了图片。'
    # Keep the context cap of the existing builder, including per-field truncation.
    from .requests import build_deck_context
    body['input'][0]['content'][0]['text'] = '<current_slide>\n'+build_deck_context([selected])+'\n</current_slide>'
    return body


def infer(student, body):
    messages = [{'role': 'system', 'content': body.get('instructions', '')}]
    for item in body.get('input', []):
        content = item['content']
        if isinstance(content, list):
            if any(c.get('type') != 'input_text' for c in content):
                fail(422, 'images_unverified', 'Image requests are disabled until separately verified. / 图片请求尚未单独验证，已禁用。')
            content = '\n'.join(c['text'] for c in content)
        messages.append({'role': item['role'], 'content': content})
    return upstream(student, {'model': student.model, 'messages': messages, 'stream': False})


def probe(token, model):
    if model not in models():
        fail(400, 'model_unavailable', 'Choose a configured university model. / 请选择已配置的大学模型。')
    if not isinstance(token, str) or not 1 <= len(token) <= 4096 or any(ord(c)<33 or ord(c)>126 for c in token):
        fail(400, 'token_format', 'Paste a valid Private Token without whitespace. / 请粘贴不含空白的 Private Token。')
    # A real completed inference, never a model list or local success, gates connection.
    upstream(Student(token, model, time.time()+60), {'model': model, 'messages': [{'role':'user','content':'Reply with OK.'}], 'max_tokens': 16, 'stream': False})
