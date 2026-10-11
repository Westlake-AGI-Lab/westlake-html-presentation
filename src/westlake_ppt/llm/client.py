"""Responses transport and bounded streaming; injected transport supports tests."""
import json
import os
import queue
import socket
import threading
from urllib import request as urlrequest, error as urlerror
from westlake_ppt.config import settings, api_key
from .requests import build_request
OPENAI_MODEL = settings().model
OPENAI_API_BASE = settings().api_base


def open_upstream(body):
    key = api_key()
    if not key:
        raise RuntimeError("服务端尚未配置 OPENAI_API_KEY。")
    req = urlrequest.Request(OPENAI_API_BASE + "/responses",
        data=json.dumps(body, ensure_ascii=False).encode(), method="POST",
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json",
                 "Accept": "text/event-stream" if body["stream"] else "application/json"})
    try:
        return urlrequest.urlopen(req, timeout=90)
    except urlerror.HTTPError as exc:
        # Do not relay provider error bodies: some gateways echo authorization or input.
        raise RuntimeError(f"上游接口 HTTP {exc.code}，请检查密钥、额度及模型图片/流式支持。") from exc
    except (urlerror.URLError, TimeoutError) as exc:
        raise RuntimeError("上游连接失败或超时，请检查网络与接口配置。") from exc

def extract_output_text(data):
    if isinstance(data.get("output_text"), str):
        return data["output_text"].strip()
    return "\n".join(c.get("text", c.get("refusal", "")) for item in data.get("output", [])
        if item.get("type") == "message" for c in item.get("content", [])
        if c.get("type") in ("output_text", "refusal")).strip()

def call_openai(payload, body=None, *, transport=None):
    body = build_request(payload) if body is None else body
    body["stream"] = False
    with (transport or open_upstream)(body) as response:
        data = json.load(response)
    if data.get("status") in ("incomplete", "failed"):
        raise RuntimeError("上游回答未完成，请重试或调整输出额度。")
    answer = extract_output_text(data)
    if not answer:
        raise RuntimeError("上游未返回可显示文字。")
    return answer, data.get("model", OPENAI_MODEL)

def sse_events(response):
    lines, size = [], 0
    for raw in response:
        line = raw.decode("utf-8").rstrip("\r\n")
        if not line:
            if lines:
                data = "\n".join(lines)
                if data == "[DONE]":
                    return
                yield json.loads(data)
                lines, size = [], 0
        elif line.startswith("data:"):
            size += len(line)
            if size > 2 * 1024 * 1024:
                raise RuntimeError("上游事件过大。")
            lines.append(line[5:].lstrip())
    if lines:
        data = "\n".join(lines)
        if data != "[DONE]":
            yield json.loads(data)

def stream_response(body, emit, *, transport=None):
    events = queue.Queue(maxsize=32)
    stopped = threading.Event()
    holder = []
    def put(value):
        while not stopped.is_set():
            try:
                events.put(value, timeout=.2)
                return
            except queue.Full:
                pass
    def worker():
        try:
            with (transport or open_upstream)(body) as response:
                holder.append(response)
                if stopped.is_set():
                    return
                if "text/event-stream" not in response.headers.get("Content-Type", ""):
                    raise RuntimeError("上游没有返回流式响应，请确认接口支持 Responses SSE。")
                for event in sse_events(response):
                    if stopped.is_set():
                        return
                    put(event)
        except Exception as exc:
            put({"type": "_error", "message": str(exc) if isinstance(exc, RuntimeError) else "上游流式数据异常或超时。"})
        finally:
            put(None)
    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    try:
        emit({"type": "start", "model": OPENAI_MODEL})
        has_text = False
        while True:
            try:
                event = events.get(timeout=1)
            except queue.Empty:
                emit({"type": "ping"})
                continue
            if event is None:
                raise RuntimeError("上游连接中断，回答未完成。")
            kind = event.get("type")
            if kind in ("response.output_text.delta", "response.refusal.delta"):
                delta = event.get("delta", "")
                if isinstance(delta, str) and delta:
                    has_text = True
                    emit({"type": "delta", "text": delta})
            elif kind == "response.completed":
                if not has_text:
                    text = extract_output_text(event.get("response", {}))
                    if not text:
                        raise RuntimeError("上游未返回可显示文字。")
                    emit({"type": "delta", "text": text})
                emit({"type": "done", "model": event.get("response", {}).get("model", OPENAI_MODEL)})
                return
            elif kind in ("response.incomplete", "response.failed", "error", "_error"):
                message = event.get("message") if kind == "_error" else "上游生成未完成（额度、输出上限或接口错误），已保留部分内容。"
                raise RuntimeError(message)
    finally:
        stopped.set()
        # Shut down the transport to unblock a worker waiting for the next SSE line.
        for response in holder:
            try:
                response.fp.raw._sock.shutdown(socket.SHUT_RDWR)
            except (AttributeError, OSError):
                pass
        thread.join(timeout=.2)
