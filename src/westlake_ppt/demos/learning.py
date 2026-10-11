"""Build an isolated determinant demo. --mock is explicitly scripted, never study data."""
import argparse
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil


CONCEPTS = [
    {'id': 'geometry', 'title': 'Determinant zero and lost dimensions', 'page': 1,
     'source': 'A zero determinant collapses area to zero. The image of the unit square lies on a line or a point.',
     'objective': 'Explain why area collapse prevents an inverse.',
     'tasks': [{'id': 'collapse', 'kind': 'explain',
                'question': 'What does a 2 by 2 matrix with determinant zero do to the unit square? Why can it not be inverted?',
                'checks': [{'label': 'Geometry of the image', 'expected': 'The square collapses to a line or point, with area zero.'},
                           {'label': 'Recovering the input', 'expected': 'Distinct inputs share an output, so the map is not one-to-one and has no inverse.'}],
                'hints': ['Consider the area of the transformed square.', 'Can two different points have the same transformed position?'],
                'answer': 'The unit square maps to a line segment or a point. Its area is zero. The transformation loses a dimension: different inputs map to the same output, so an inverse cannot recover a unique input.'}]},
    {'id': 'scaling', 'title': 'Scaling every matrix entry', 'page': 2,
     'source': 'Scaling one row by k multiplies the determinant by k. Scaling all n rows multiplies it by k^n.',
     'objective': 'Distinguish one-row scaling from scaling the whole matrix.',
     'tasks': [{'id': 'scale-three', 'kind': 'apply',
                'question': 'Every entry of a 3 by 3 matrix A is doubled. How does its determinant change? Explain the factors involved.',
                'checks': [{'label': 'Which rows change', 'expected': 'All three rows, not only one, are scaled by two.'},
                           {'label': 'Combining row effects', 'expected': 'The three factors multiply: det(2A) = 2^3 det(A) = 8 det(A).'}],
                'hints': ['How many rows have changed?', 'Apply the one-row scaling rule successively, once per changed row.'],
                'answer': 'All three rows are doubled. Each row contributes a factor of 2, so det(2A) = 2 x 2 x 2 det(A) = 8 det(A). This also holds when det(A) is zero.'},
               {'id': 'scale-transfer', 'kind': 'apply',
                'question': 'Every entry of a 2 by 2 matrix B is tripled. Explain how its determinant changes, without computing individual entries.',
                'checks': [{'label': 'Combining row effects', 'expected': 'Two rows each contribute a factor of three, giving 9 det(B).'}],
                'hints': ['Count the rows being scaled.', 'Separate the two row scaling operations.'],
                'answer': 'Each of the two rows contributes a factor of 3. The determinant is multiplied by 3^2 = 9.'}]},
    {'id': 'sign', 'title': 'Negative determinant and invertibility', 'page': 3,
     'source': 'A square matrix is invertible exactly when its determinant is nonzero. A negative sign indicates orientation reversal, not singularity.',
     'objective': 'Challenge the claim that a negative determinant prevents inversion.',
     'tasks': [{'id': 'negative-counterexample', 'kind': 'counterexample',
                'question': 'Someone claims that a matrix with a negative determinant cannot have an inverse. Give a counterexample and justify it.',
                'checks': [{'label': 'Counterexample validity', 'expected': 'An explicit square matrix has a negative, nonzero determinant, for example diag(-1,1).'},
                           {'label': 'Inverse justification', 'expected': 'Shows an inverse or invokes the nonzero determinant criterion correctly.'}],
                'hints': ['Try a diagonal matrix with one negative diagonal entry.', 'Check whether the determinant is zero, and what happens when you apply the transformation twice.'],
                'answer': 'A = diag(-1,1) has determinant -1. It reflects the plane and A times A is the identity, so A is its own inverse. Nonzero, not positive, is the invertibility condition.'}]}
]


class MainSpan(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.text = text; self.offsets = [0]
        for line in text.splitlines(keepends=True): self.offsets.append(self.offsets[-1]+len(line))
        self.start = self.end = None
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        if tag == 'main': self.start = self.offsets[self.getpos()[0]-1] + self.getpos()[1]
    def handle_endtag(self, tag):
        if tag == 'main': self.end = self.offsets[self.getpos()[0]-1] + self.getpos()[1] + len('</main>')


def prepare(destination, mock):
    base = Path(__file__).resolve().parents[3]; destination.mkdir(parents=True, exist_ok=True)
    if any(destination.iterdir()): raise SystemExit('Choose an empty isolated demo directory')
    shutil.copytree(base/'web/assets', destination/'assets')
    shutil.copy2(base/'web/presenter.html', destination/'presenter.html')
    name = 'deck.html'
    text = (base/'web'/name).read_text(); span = MainSpan(text)
    if span.start is None or span.end is None: raise SystemExit('Cannot locate the template deck')
    sections = []
    examples = [
        'Example: diag(1,0) maps (x,y) to (x,0). Both (0,0) and (0,1) map to (0,0).',
        'For a 3 by 3 matrix, det(kA) = k^3 det(A). Think of scaling three independent directions.',
        'Example: diag(-1,1) reflects across the vertical axis. Applying it twice returns every point to its start.'
    ]
    for c, example in zip(CONCEPTS, examples):
        sections.append('<section class="slide" data-title="'+html.escape(c['title'])+'">'
                        '<header class="brand-header"><img class="brand-logo" src="assets/westlake-logo.png" alt="Westlake">'
                        '<div class="brand-context"><b>Xiaoxi</b><span>Linear algebra practice</span></div></header>'
                        '<div class="slide-body"><div class="eyebrow">DETERMINANTS</div>'
                        '<h2>'+html.escape(c['title'])+'</h2><p>'+html.escape(c['source'])+'</p><p>'+html.escape(example)+'</p></div>'
                        '<footer class="slide-footer"><span>'+('Scripted assessment rehearsal. Not AI evaluation.' if mock else 'Demonstration material. Independent educational review pending.')+'</span></footer>'
                        '<aside class="presenter-notes">'+html.escape(c['objective'])+' '+html.escape(example)+'</aside></section>')
    text = text[:span.start] + '<main class="deck" id="deck">' + '\n'.join(sections) + '</main>' + text[span.end:]
    (destination/name).write_text(text)
    (destination/'demo-concepts.json').write_text(json.dumps(CONCEPTS, indent=2))
    return destination


def main():
    p = argparse.ArgumentParser(); p.add_argument('--output', type=Path, required=True); p.add_argument('--mock', action='store_true'); p.add_argument('--port', type=int, default=8780)
    args = p.parse_args(); destination = prepare(args.output.resolve(), args.mock)
    # These are deliberately local demonstration credentials, never a production account.
    import os
    os.environ.update(PPT_CONFIG_PATH=str(destination/'unconfigured.json'), CLASSROOM_DATA_DIR=str(destination/'private-data'),
                      PPT_WEB_ROOT=str(destination), PPT_DECK='deck.html', TEACHER_PASSWORD='local-demo', HOST='127.0.0.1', PORT=str(args.port))
    from westlake_ppt.server import app as server
    learning = server.learning(); c = server.classroom()
    teacher = c.post('login', {'password': 'local-demo'})['_cookie']
    learning.teacher('save', {'concepts': CONCEPTS, 'revision': learning.public()['revision'], 'reviewed': True}, teacher)
    if args.mock:
        learning.demo_mock = True
        def scripted(prompt, slides, language):
            if slides: return json.dumps({'concepts': CONCEPTS})
            data = json.loads(prompt.split('\n', 1)[1]); text = data['student']; lower = text.lower()
            ok = any(x in lower for x in ('eight', '8', 'nine', '9', 'line', 'point', 'nonzero', 'non-zero', 'diag'))
            return json.dumps({'checks': [{'index': i, 'status': 'correct' if ok else 'incorrect', 'quote': text[:100]} for i in range(len(data['criteria']))]})
        learning.generate = scripted
    print('Isolated demo; teacher password: local-demo; assessment: '+('SCRIPTED MOCK' if args.mock else 'configured provider'), flush=True)
    server.main()


if __name__ == '__main__': main()
