"""Validated model request construction; no HTTP routing or persistence."""
import base64
import binascii
import io
import warnings
import re
from PIL import Image, UnidentifiedImageError
from westlake_ppt.config import settings
from westlake_ppt.prompts import load_prompt
OPENAI_MODEL = settings().model
MAX_OUTPUT_TOKENS = settings().max_output_tokens
MAX_IMAGE_BYTES = 1024 * 1024
MAX_DECK_CHARS = 80000
MAX_HISTORY_CHARS = 20000


def compact_text(value, limit):
    return str(value or "").replace("\x00", " ").encode("utf-8", "replace").decode("utf-8").strip()[:limit]

def build_deck_context(slides):
    chunks, used = [], 0
    for i, slide in enumerate(slides[:80], 1):
        if not isinstance(slide, dict):
            raise ValueError("页面格式错误。")
        try:
            number = max(1, int(slide.get("number", i)))
        except (ValueError, TypeError):
            number = i
        block = f"[第 {number} 页｜{compact_text(slide.get('title'), 200)}]\n正文：{compact_text(slide.get('content'), 10000)}\n讲稿：{compact_text(slide.get('notes'), 5000)}\n"
        remaining = MAX_DECK_CHARS - used
        if remaining <= 0:
            break
        chunks.append(block[:remaining])
        used += len(chunks[-1])
    return "\n".join(chunks)

def validate_images(images, maximum=3):
    if not isinstance(images, list) or len(images) > maximum:
        raise ValueError("每条消息最多 3 张图片，上下文累计最多 6 张。")
    result = []
    for item in images:
        if not isinstance(item, dict):
            raise ValueError("图片格式错误。")
        data = item.get("dataUrl", "")
        if not isinstance(data, str) or len(data) > 4 * ((MAX_IMAGE_BYTES + 2) // 3) + 64:
            raise ValueError("单张发送图片不能超过 1 MiB。")
        match = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)", data)
        if not match:
            raise ValueError("仅接受 PNG、JPEG、WebP Base64 图片，不接受远程图片地址。")
        try:
            raw = base64.b64decode(match[2], validate=True)
            if not raw or len(raw) > MAX_IMAGE_BYTES:
                raise ValueError("图片大小无效。")
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(raw)) as picture:
                    expected = {"image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WEBP"}[match[1]]
                    if picture.format != expected or max(picture.size) > 2048 or getattr(picture, "n_frames", 1) != 1:
                        raise ValueError("图片格式与声明不符、为动画，或尺寸超过 2048 像素。")
                    picture.verify()
                with Image.open(io.BytesIO(raw)) as picture:
                    picture.load()
        except (binascii.Error, OSError, SyntaxError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise ValueError("图片损坏或无法解码。") from exc
        result.append({"type": "input_image", "image_url": data, "detail": "auto"})
    return result

def build_request(payload):
    question = compact_text(payload.get("question"), 4000)
    images = validate_images(payload.get("images", []))
    if not question and not images:
        raise ValueError("请输入问题或附加图片。")
    question = question or "请结合当前 PPT 解释这张图片"
    slides, current = payload.get("slides"), payload.get("currentSlide")
    if not isinstance(slides, list) or not slides or not isinstance(current, dict):
        raise ValueError("缺少演示内容或当前页信息。")
    try:
        number = int(current.get("number", 1))
        if not 1 <= number <= len(slides):
            raise ValueError()
    except (ValueError, TypeError):
        raise ValueError("当前页码无效。")
    history = payload.get("history", [])
    if not isinstance(history, list):
        raise ValueError("历史对话格式错误。")
    messages = [{"role": "user", "content": [{"type": "input_text", "text":
        "<presentation>\n" + build_deck_context(slides) + "\n</presentation>"}]}]
    used, image_count = 0, len(images)
    for item in history[-12:]:
        if not isinstance(item, dict) or item.get("role") not in ("user", "assistant"):
            raise ValueError("历史消息格式错误。")
        role = item["role"]
        attachments = validate_images(item.get("images", []))
        if role == "assistant" and attachments:
            raise ValueError("助手历史不能携带上传图片。")
        image_count += len(attachments)
        if image_count > 6:
            raise ValueError("上下文累计超过 6 张图片，请清空对话后继续。")
        text = compact_text(item.get("text"), min(4000, max(0, MAX_HISTORY_CHARS-used)))
        used += len(text)
        if item.get("status", "complete") != "complete":
            text = "[未完成的回答，不作为完整结论]\n" + text
        if item.get("imageCount", 0) and not attachments:
            text += "\n[历史图片已失效，未提供像素，需要读者重新上传]"
        if text or attachments:
            if role == "assistant":
                messages.append({"role": role, "content": text})
            else:
                messages.append({"role": role, "content": [{"type": "input_text", "text": text or "图片"}] + attachments})
    messages.append({"role": "user", "content": [{"type": "input_text", "text":
        f"读者提问时位于第 {number} 页《{compact_text(current.get('title'), 200)}》。\n问题：{question}"}] + images})
    if not isinstance(payload.get("stream", False), bool):
        raise ValueError("stream 必须是布尔值。")
    language = payload.get("language", "zh")
    if language not in ("zh", "en"):
        raise ValueError("language 必须为 zh 或 en。")
    instructions = load_prompt(f"agent.{language}.v1.txt")
    return {"model": OPENAI_MODEL, "instructions": instructions, "input": messages,
            "max_output_tokens": MAX_OUTPUT_TOKENS, "store": False, "stream": payload.get("stream", False)}

def personal_slide_request(payload):
    slides, current = payload.get('slides'), payload.get('currentSlide')
    if not isinstance(slides, list) or not isinstance(current, dict):
        raise ValueError('Missing slide context / 缺少页面内容')
    number = current.get('number')
    if type(number) is not int or not 1 <= number <= min(len(slides), 80):
        raise ValueError('Invalid current slide / 当前页码无效')
    context = []
    for index, slide in enumerate(slides[:number], 1):
        if not isinstance(slide, dict):
            raise ValueError('Invalid slide / 页面格式错误')
        clean = {'number': index}
        for key, limit in [('title', 200), ('content', 10000), ('notes', 5000)]:
            value = slide.get(key, '')
            if not isinstance(value, str) or len(value) > limit:
                raise ValueError('Slide context too large / 页面内容过长')
            clean[key] = value
        context.append(clean)
    if sum(len(s['title'])+len(s['content'])+len(s['notes'])+100 for s in context) > MAX_DECK_CHARS:
        raise ValueError('Preceding slides exceed the context limit / 前文超出上下文限制')
    question = payload.get('question')
    if not isinstance(question, str) or not question.strip() or len(question) > 4000:
        raise ValueError('Enter a question of at most 4000 characters / 请输入不超过 4000 字的问题')
    clean = dict(payload, slides=context, currentSlide=context[-1], history=[], stream=False)
    body = build_request(clean)
    body['instructions'] += load_prompt("personal-slides.v1.txt")
    return clean, body
