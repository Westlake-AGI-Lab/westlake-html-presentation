"""Small, explicit teaching catalog; additional lectures use solo study only."""
import html
import json
import re
from pathlib import Path

from .demos.learning import MainSpan


def catalog(web_root):
    return json.loads((Path(web_root) / 'assets/courses.json').read_text(encoding='utf-8'))


def render_source_slide(slide, lecture):
    """Keep original PDF artwork and a separate exact text source for the assistant."""
    esc = html.escape
    page = slide['sourcePage']
    return (f'<section class="slide course-slide pdf-source-slide" data-id="{esc(lecture["id"])}-{page}" '
            f'data-title="{esc(slide["title"])}" data-source-page="{page}">'
            f'<div class="source-page-canvas"><img class="source-page-image" src="{esc(slide["image"])}" '
            f'width="{slide["width"]}" height="{slide["height"]}" loading="eager" '
            f'alt="Source slide {page}: {esc(slide["title"])}"></div>'
            f'<div class="source-caption" data-editable data-edit-key="caption-{page}" data-placeholder="Add your own annotation…"></div>'
            f'<div class="source-transcript" hidden>{esc(slide["text"])}</div>'
            f'<aside class="presenter-notes" data-editable data-edit-key="notes-{page}">{esc(slide["notes"])}</aside></section>')


def render_lecture(source, course, lecture):
    """Reuse presentation controls, with independent storage and no main-deck classroom."""
    span = MainSpan(source)
    if span.start is None or span.end is None:
        raise ValueError('Cannot locate presentation layout')
    esc = html.escape
    sections = []
    is_pdf = lecture.get('source', {}).get('format') == 'pdf'
    for i, slide in enumerate(lecture['slides'], 1):
        if is_pdf:
            sections.append(render_source_slide(slide, lecture))
            continue
        bullets = ''.join('<li data-editable>' + esc(line) + '</li>' for line in slide.get('bullets', []))
        formula = '<div class="course-formula">\\[' + esc(slide['formula']) + '\\]</div>' if slide.get('formula') else ''
        code = '<pre><code>' + esc(slide['code']) + '</code></pre>' if slide.get('code') else ''
        sections.append(f'<section class="slide course-slide" data-id="{esc(lecture["id"])}-{i}" data-title="{esc(slide["title"])}">'
                        f'<header class="brand-header"><img class="brand-logo" src="assets/westlake-logo.png" alt="Westlake University">'
                        f'<div class="brand-context"><b>{esc(course["title"])}</b><span>Illustrative teaching sample · Self-study</span></div></header>'
                        f'<div class="slide-body"><div class="eyebrow">LECTURE {esc(lecture["number"])} / {i:02d}</div>'
                        f'<h2 data-editable>{esc(slide["title"])}</h2><p class="course-lead" data-editable>{esc(slide["lead"])}</p>'
                        f'{formula}{code}<ul>{bullets}</ul></div>'
                        f'<footer class="slide-footer"><span>{esc(lecture["title"])}</span><span>{i:02d} / {len(lecture["slides"]):02d}</span></footer>'
                        f'<aside class="presenter-notes" data-editable>{esc(slide.get("notes", ""))}</aside></section>')
    source = source[:span.start] + '<main class="deck" id="deck" aria-live="polite">' + ''.join(sections) + '</main>' + source[span.end:]
    # The parent might be the eigen demo or a standalone lecture. These integrations
    # refer to its classroom/quiz/learning bank, so never attach them to a sample.
    source = re.sub(r'<script\b[^>]*src="assets/(?:eigen-[^"]+|quiz|learning|classroom|improvements)\.js"[^>]*>\s*</script>', '', source)
    source = re.sub(r'<link\b[^>]*href="assets/(?:eigen-demo|quiz|learning|classroom|improvements)\.css"[^>]*>', '', source)
    classes = 'course-player pdf-lecture' + ('' if is_pdf else ' html-lecture')
    source = re.sub(r'<body[^>]*>', '<body class="' + classes + '"><script>window.PPTClassroom={role:"solo",headers:()=>({})};</script>', source, count=1)
    key = 'westlake-course-' + course['id'] + '-' + lecture['id']
    source = re.sub(r"const storageKey = '[^']+';", "const storageKey = '" + key + "-edits-v1';", source)
    source = re.sub(r"const agentSessionKey = '[^']+';", "const agentSessionKey = '" + key + "-agent-v1';", source)
    source = source.replace('</head>', '<link rel="stylesheet" href="assets/course-player.css"></head>')
    source = source.replace('</body>', '<script src="assets/course-player.js"></script></body>')
    info = dict(course=course['title'], code=course.get('code', ''), term=course.get('term', ''),
                instructor=course.get('instructor', ''), canvas=course.get('canvas', ''),
                title=lecture['title'], number=lecture['number'], file=lecture.get('source', {}).get('file', ''), isPdf=is_pdf,
                pages=[dict(title=s['title'], page=s.get('sourcePage', i), group=s.get('group', 'Lecture'), thumbnail=s.get('thumbnail', '')) for i,s in enumerate(lecture['slides'], 1)])
    data = json.dumps(info, ensure_ascii=False).replace('<', '\\u003c')
    source = source.replace('</head>', '<link rel="stylesheet" href="assets/source-lecture.css"></head>')
    source = source.replace('</body>', '<script id="sourceLectureData" type="application/json">' + data +
                            '</script><script src="assets/source-lecture.js"></script></body>')
    return source
