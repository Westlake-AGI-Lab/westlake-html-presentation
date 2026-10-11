"""Isolated, local lecture adaptation of supplied Chapter_7.1-2.pdf."""
import argparse
import html
import importlib.util
import json
import os
from pathlib import Path

from .learning import MainSpan, prepare

# Page order follows the supplied 16-page lecture. Notes remain source context.
SLIDES = [
    ('Eigenvalues & eigenvectors', 'Find the directions a transformation preserves.', r'Av = \lambda v,\qquad v\ne 0', 'An eigenvector stays on its own line. Its eigenvalue tells us how that direction scales. This lecture connects geometry, changes of basis and repeated transformations.', 'stretch'),
    ('Why diagonal matrices?', 'Independent coordinates make repeated transformations simple.', r'D=\operatorname{diag}(-1,0,1,2),\quad D^m=\operatorname{diag}((-1)^m,0,1,2^m)', 'For positive integer m, powers act entry by entry. Here det(D)=0, rank(D)=3 and the kernel is the span of the second coordinate vector.', None),
    ('Untangling dependencies', 'A diagonal basis separates coupled coordinates.', r'\begin{pmatrix}y_1\\y_2\end{pmatrix}=\begin{pmatrix}a&b\\c&d\end{pmatrix}\begin{pmatrix}x_1\\x_2\end{pmatrix}', 'In ordinary coordinates, each output can depend on both inputs. In an eigenbasis, each coordinate evolves independently.', None),
    ('Same map. A different basis.', 'Diagonalization changes coordinates, not the transformation.', r'B=S^{-1}AS,\qquad A=SBS^{-1}', 'S converts eigenbasis coordinates into standard coordinates. S inverse converts back. S must be invertible, and B must be diagonal.', None),
    ('What makes an eigenvector?', 'The vector must be nonzero. The eigenvalue may be zero.', r'Av=\lambda v,\qquad v\ne 0', 'The output can point in the same direction, reverse direction, or be zero. In each case Av remains a scalar multiple of v.', 'stretch'),
    ('One direction, many steps', 'Repeated application becomes a scalar power.', r'A^m v=\lambda^m v', 'Starting with Av=lambda v, apply A again to get A squared v=lambda squared v. Induction gives the result for every positive integer m.', 'stretch'),
    ('An eigenbasis diagonalizes A', 'Put independent eigenvectors into the columns of S.', r'AS=SB,\quad S=[v_1\ \cdots\ v_n],\quad B=\operatorname{diag}(\lambda_1,\ldots,\lambda_n)', 'A square matrix is diagonalizable exactly when it has a basis of eigenvectors. The order of the eigenvalues must match the order of the columns.', None),
    ('Repeated does not mean defective', 'The identity is a useful counterexample.', r'I v=v,\qquad S^{-1}IS=I', 'Every nonzero vector is an eigenvector of the identity with eigenvalue 1. Repeated eigenvalues do not prevent diagonalization: what matters is having enough independent eigenvectors.', 'identity'),
    ('Projection keeps one direction', 'What happens along the line, and perpendicular to it?', r'P=\begin{pmatrix}.64&.48\\.48&.36\end{pmatrix}', 'Projection onto span(4,3) preserves that line and sends its perpendicular direction to zero. The eigenvalues are 1 and 0, with eigenvectors (4,3) and (-3,4). A nonzero vector can be an eigenvector even when its image is zero.', 'projection'),
    ('Rotation has no real eigenline', 'A quarter turn sends each nonzero vector off its line.', r'R=\begin{pmatrix}0&-1\\1&0\end{pmatrix}', 'A 90-degree rotation has no real eigenvectors and cannot be diagonalized over the real numbers. Over the complex numbers the conclusion differs. Compare a half turn: every nonzero real vector then has eigenvalue -1.', 'rotation'),
    ('Zero eigenvalue, lost information', 'A nonzero input disappears into the kernel.', r'0\text{ is an eigenvalue}\iff\ker A\ne\{0\}\iff\det A=0', 'For a square matrix, zero is an eigenvalue exactly when the matrix is not invertible. Do not confuse a zero eigenvalue with the forbidden zero eigenvector.', 'projection'),
    ('A discrete dynamical system', 'Eigenvectors reveal growing and shrinking modes.', r'x_{t+1}=Ax_t,\quad A=\begin{pmatrix}.86&.08\\-.12&1.14\end{pmatrix}', 'This matrix has eigenvalues 1.1 and 0.9. Along their eigenvectors, the state scales by the same factor on each step.', None),
    ('Resolve the initial condition', 'Decompose once, then evolve each mode independently.', r'x_t=2(1.1)^t\begin{pmatrix}100\\300\end{pmatrix}+4(.9)^t\begin{pmatrix}200\\100\end{pmatrix}', 'At t=0 the state is (1000,1000). The growing mode eventually dominates, and the second-to-first component ratio tends to 3. Equivalently, A^t=S B^t S inverse.', None),
    ('Orthogonal maps preserve length', 'Real eigenvalues can only be +1 or -1.', r'\|Av\|=\|v\|=|\lambda|\|v\|\quad\Longrightarrow\quad |\lambda|=1', 'For nonzero real eigenvectors of an orthogonal matrix, length preservation implies lambda is 1 or -1. This does not assert that a real eigenvector exists: the quarter turn is a counterexample.', 'rotation'),
    ('Distinct eigenvalues are sufficient', 'Different eigenvalues give independent eigenvectors.', r'A=\begin{pmatrix}1&2\\4&3\end{pmatrix},\quad A\binom{1}{2}=5\binom{1}{2},\quad A\binom{1}{-1}=-\binom{1}{-1}', 'An n by n real matrix with n distinct real eigenvalues has an eigenbasis. This is sufficient, not necessary: remember the identity matrix.', None),
    ('From geometry to diagonalization', 'Three questions to take away.', r'Av=\lambda v\quad\longrightarrow\quad AS=SB\quad\longrightarrow\quad A^m=SB^mS^{-1}', 'Which directions stay on their line? Do they span the entire space? How does each direction scale under repeated application? Next: finding eigenvalues computationally.', None),
]


def concept(cid, page, title, question, expected, hints, kind='explain'):
    return dict(id=cid, page=page, title=title, source=SLIDES[page-1][3],
                objective=title, tasks=[dict(id=cid+'-reason', kind=kind, question=question,
                checks=[dict(label='Conceptual reasoning', expected=expected)],
                hints=hints, answer=expected)])


CONCEPTS = [
    concept('projection', 9, 'Explain the two projection eigenvalues',
            'Why does projection onto a line have eigenvalues 1 and 0? Describe the corresponding directions.',
            'Vectors along the line are unchanged, giving eigenvalue 1. Nonzero perpendicular vectors map to zero, giving eigenvalue 0.',
            ['Consider a vector already on the projection line.', 'Now consider a nonzero vector perpendicular to that line.']),
    concept('rotation', 10, 'Distinguish quarter turns and half turns',
            'Why does a 90-degree rotation have no real eigenvectors? What changes for a 180-degree rotation?',
            'A quarter turn makes every nonzero real vector perpendicular to itself, so the image cannot be a real scalar multiple. A half turn sends v to -v, so every nonzero real vector is an eigenvector with eigenvalue -1.',
            ['An eigenvector and its image must lie on one line through the origin.', 'A negative eigenvalue reverses direction; it does not require the original orientation.']),
    concept('identity', 8, 'Challenge a claim about repeated eigenvalues',
            'A student says repeated eigenvalues make diagonalization impossible. Give a counterexample and explain why it works.',
            'The identity matrix in dimension at least two has only the repeated eigenvalue 1. Every nonzero vector is an eigenvector, so any basis is an eigenbasis and it is already diagonal.',
            ['Try a matrix that leaves every vector unchanged.', 'Diagonalization requires an eigenbasis, not distinct eigenvalues.'], 'counterexample'),
    concept('basis', 4, 'Interpret a change of basis',
            'In B = S inverse A S, does B describe a different transformation? Explain what the three operations do to the coordinates.',
            'It is the same linear transformation in a different basis. S converts the new coordinates to standard coordinates, A applies the map, and S inverse converts the result back.',
            ['Read the product from right to left.', 'Separate changing a vector from changing the coordinates used to describe it.']),
    concept('zero', 11, 'Separate zero eigenvalues from zero vectors',
            'Can a nonzero vector sent to zero be an eigenvector? Explain what this implies about invertibility.',
            'Yes: Av=0=0v, so it is an eigenvector with eigenvalue zero. The kernel contains a nonzero vector, the map loses information, and a square matrix cannot be invertible.',
            ['Substitute lambda=0 into the eigenvector equation.', 'Could an inverse distinguish that vector from the zero input?']),
]


def build(destination):
    prepare(destination, True)
    name = 'deck.html'
    text = (destination/name).read_text(); span = MainSpan(text)
    sections = []
    for i, (title, subtitle, formula, notes, diagram) in enumerate(SLIDES, 1):
        lab = f'<div class="vector-lab" data-transform="{diagram}"></div>' if diagram else ''
        practice = next((c for c in CONCEPTS if c['page'] == i), None)
        checkpoint = (f'<div class="eigen-checkpoint"><span>CONCEPT CHECK</span><p>{html.escape(practice["title"])}</p>'
                      f'<button type="button" data-practice-concept="{practice["id"]}">Try this question <span aria-hidden="true">&#8594;</span></button></div>') if practice else ''
        sections.append(f'<section class="slide eigen-slide" data-title="{html.escape(title)}"><div class="slide-body">'
                        f'<div class="eyebrow">LINEAR ALGEBRA / 7.1 / {i:02d}</div><h1>{html.escape(title)}</h1>'
                        f'<p class="eigen-subtitle">{html.escape(subtitle)}</p><div class="eigen-content {"with-lab" if diagram else ""}">'
                        f'<div class="eigen-reading"><div class="eigen-formula">\\[{html.escape(formula)}\\]</div><p class="eigen-explanation">{html.escape(notes)}</p>{checkpoint}</div>{lab}</div></div>'
                        f'<footer class="slide-footer"><span>Adapted from Chapter 7.1–2 · source p. {i}</span><span>Section 7.1 · Diagonalization</span></footer>'
                        f'<aside class="presenter-notes">{html.escape(notes)}</aside></section>')
    text = text[:span.start]+'<main class="deck" id="deck">'+''.join(sections)+'</main>'+text[span.end:]
    text = text.replace('</head>', '<link rel="stylesheet" href="assets/eigen-demo.css"></head>')
    text = text.replace('<body>', '<body class="eigen-demo"><script>try {localStorage.setItem("westlake-ui-language","en")} catch (_) {}</script>')
    text = text.replace('</body>', '<script src="assets/eigen-demo.js"></script><script src="assets/eigen-geometry.js"></script><script src="assets/eigen-lab.js"></script></body>')
    (destination/name).write_text(text)
    (destination/'demo-concepts.json').write_text(json.dumps(CONCEPTS, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--port', type=int, default=8782)
    args = parser.parse_args(); destination = args.output.resolve(); build(destination)
    os.environ.update(PPT_CONFIG_PATH=str(destination/'unconfigured.json'), CLASSROOM_DATA_DIR=str(destination/'private-data'),
                      PPT_WEB_ROOT=str(destination), PPT_DECK='deck.html', TEACHER_PASSWORD='local-demo', HOST='127.0.0.1', PORT=str(args.port))
    from westlake_ppt.server import app as server
    server.PUBLIC_FILES.update({'assets/eigen-demo.css', 'assets/eigen-demo.js', 'assets/eigen-geometry.js',
                                'assets/eigen-lab.js', 'assets/vendor/lucide/play.svg', 'assets/vendor/lucide/pause.svg'})
    learning = server.learning(); teacher = server.classroom().post('login', {'password': 'local-demo'})['_cookie']
    learning.teacher('save', {'concepts': CONCEPTS, 'revision': learning.public()['revision'], 'reviewed': True}, teacher)
    learning.demo_mock = True
    def rehearsal(prompt, slides, language):
        if slides: return json.dumps({'concepts': CONCEPTS})
        data = json.loads(prompt.split('\n', 1)[1])
        # Offline rehearsal never infers understanding from keywords or claims AI grading.
        return json.dumps({'checks': [dict(index=i, status='uncertain', quote='') for i in range(len(data['criteria']))]})
    learning.generate = rehearsal
    print('LOCAL eigenvector demo. Offline assessment always uncertain. Teacher password: local-demo', flush=True)
    server.main()


if __name__ == '__main__':
    main()
