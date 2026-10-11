"""Shared structured-output validation, independent of model transport."""
import json
import re
from westlake_ppt.classroom.state import ClassroomError

def field(value, limit):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ClassroomError(400, 'Invalid draft content / 草稿内容无效')
    return value.strip()

def parse_json(answer):
    try:
        text = answer.strip()
        if text.startswith('```'):
            text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text)
        result = json.loads(text)
        if not isinstance(result, dict):
            raise ValueError()
        return result
    except (ValueError, TypeError, AttributeError):
        raise ClassroomError(502, 'AI returned an invalid draft; please retry / AI 草稿格式无效，请重试') from None
