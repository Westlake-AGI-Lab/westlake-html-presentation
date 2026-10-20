# Learning Workspace

[中文](README.md) · [User guide](docs/user-guide.md)

A local course workspace with lecture navigation, Xiaoxi assistance and a matching presenter view. This repository contains the current course catalog and lecture interfaces.

## Start the current workspace

Python 3.10+ is required. Run from the repository root:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/python westlake.py demo courses --output /tmp/xiaoxi-workspace --port 8782
```

Open **http://127.0.0.1:8782/**. The output directory must be new or empty; use another directory for a new preview rather than deleting saved classroom data. This command reproduces the current local catalog, including the animated Linear Algebra lecture. `serve` alone opens the internal generic template; it is not the catalog startup command. The template remains in the source because lecture generation uses its shared controls.

The preview binds only to localhost. Its teacher password `local-demo` is for isolated demonstrations. The output directory holds its separate classroom data; do not use the demo password for a shared service. Changing local files or pushing to GitHub does not deploy the internal server. See [deployment](docs/deployment.md).

## Courses and materials

- **Computer Architecture and Parallel Computing**: `2610CST3004`, Fall 2026. Lecture 07, *Out-of-Order Execution & Tomasulo (ILP-2)*, preserves all 24 pages of the supplied PDF, including figures, credits and page numbers. Two introductory teaching samples are also available. [Canvas course](https://canvas.westlake.edu.cn/courses/2042) may require university login.
- **Linear Algebra**: the existing 16-slide eigenvector/diagonalization lecture with animated geometry, practice and classroom quizzes, plus a vectors sample.
- **Calculus**: derivatives and integrals samples.
- **Data Structure and Algorithm Design**: search and stacks/queues samples, plus the original hash-function lab.

The seven introductory samples each have seven slides and are labeled as teaching samples. They do not constitute an official university course catalog. Code in the seven introductory samples is displayed, not executed; the separate hash lab has optional execution. PDF animation sequences remain static frames.

## Catalog and lecture interface

The catalog offers course cards, search, subject filters and English/Chinese UI. Its sidebar shows the transparent university logo, Learning Workspace label and the user-supplied display profile **Sholpan Amankeldi · ID 20243841001**. This profile is static, without sign-in or identity verification.

Source lectures and catalog samples use a light interface with searchable contents, page entry, zoom/fit, notes, highlighting, printing and original-file download where available. Read text has been removed; hidden transcripts still support search and assistant context. PDF editing adds personal captions and edits notes, while highlighting marks regions with undo/clear and a keyboard alternative. Original PDF artwork and downloads remain unchanged. HTML samples support direct text editing and text highlights. Edits and marks persist in this browser; they do not modify repository files.

Presenter view gives the current slide the main area, with next-slide preview and scrollable notes at right. It fits the whole slide by width and height. PDF/sample previews use a stable 1600×900 canvas, independent of audience zoom or window size. Linked navigation, slide selection, timer pause/reset, fullscreen, language, media and configured brief/backup routes remain available. Narrow windows use a vertical layout. Open the view from the lecture; independent presenter pages do not pair automatically.

## Assistant, practice and classroom limits

AI requires server-side provider configuration. Keep API keys outside Git and HTML; see [configuration](docs/configuration.md). Questions use lecture text and page references. Embedded slide images are not automatically sent to the model; explicit attachments or region capture can supply images. Text context does not imply image understanding. UI language changes do not translate lecture content.

Catalog samples and the supplied architecture lecture use self-study mode with separate browser storage per lecture. They do not reuse the main Linear Algebra classroom, practice or quiz banks. The Linear Algebra demo retains written attempts, staged hints, optional explanations, teacher-reviewed bank-based quizzes and aggregate class reports. Quiz assembly is not AI question generation. The offline practice assessor always returns `uncertain`; its output is not grading or a validated mastery estimate. Sample reports use explicitly fictional participants in a separate classroom.

Browser archives, classroom participation, voluntary sharing and research collection have separate controls. Private chats are not teacher reports. No research result, formal accessibility conformance or official university authorization is claimed. Supplied brand and lecture assets retain their owners' rights.

## Development and verification

```sh
python3 westlake.py test
python3 westlake.py test --suite browser
```

The first command runs Python and Node unit checks. Browser checks require Playwright and Chrome. Additional catalog, source-lecture and presenter regression commands are documented in [testing](docs/testing.md). Checks cover desktop/mobile layouts, original PDF integrity, isolated mocked AI context, browser editing/notes/highlights, presenter fitting and classroom permissions. They do not establish real-model quality, physical-device behavior or successful server deployment.

Runtime dependencies are declared in `pyproject.toml`. PDF extraction/rendering was performed during asset preparation; it adds no PDF runtime dependency. Credentials, `.env`, classroom data, results, generated previews and local editor/agent setup are excluded from commits.

## Project layout

- `src/westlake_ppt/`: Python server, catalog rendering, classroom and demos.
- `web/`: shared frontend, catalog, presenter and registered lecture assets.
- `tests/`: unit and browser checks.
- `docs/`: architecture, configuration, workflows and deployment status.
- `experiments/`: optional research tooling; it is not part of the student interface.

[Architecture](docs/architecture.md) · [API](docs/api.md) · [Privacy](docs/privacy.md) · [Classroom](docs/classroom.md) · [Verification](tests/VERIFICATION.md)

On macOS, `launch.command` or `启动智能PPT.command` opens the course workspace on port 8782, reusing a running local server or creating a fresh isolated preview directory.

## My progress

The sidebar now includes My progress and Discussions above Courses. My progress records active study time by subject, a daily activity calendar, and actual text/PDF highlights. Idle/background time is excluded. Tracking can be paused across tabs; clearing time history retains source highlights and notes. These are browser-local activity records, not grades, mastery estimates, rankings or research reports. Storage is shared by users of the same browser profile and does not sync across devices.

## Discussions — local prototype

Discussions supports course/topic search and filters, recent/unanswered/my-post views, nested human replies, editing/deleting your own posts and replies, and helpful marks. Fictional sample participants illustrate instructor-pinned threads and instructor-verified explanations; helpful marks never verify AI output. Markdown, code and math use the existing bundled renderer.

In a lecture chat, choose Share to Discussion on one completed question or answer. Edit the title, student context and selected AI excerpt; choose course/category/visibility; preview; check review confirmation; then confirm publication. Only the selected message is passed to the editor: full conversation history, attachments and hidden context are not attached. AI excerpts retain their AI-generated/unverified label after editing. Cancel creates no post. Existing private tutoring keeps its server-side provider configuration.

Ask my agent creates an editable, unpublished scripted draft. Start agent discussion requires explicit activation, is capped at two or three turns, compares fixed explanations/counterexamples, and supports pause/stop. Every contribution needs separate review and confirmation before publication. The peer agent is simulated; no real classmate or LLM agent is contacted.

This prototype stores posts in browser localStorage (`xiaoxi-discussions-v1`). It does not deliver messages to other students or implement accounts, moderation or membership permissions. Course members / Study group / Only me are visibility previews, not enforced access controls; shared-browser users can read stored content. Pending agent drafts remain only in page memory. Real multi-user discussions and live agents require a backend and authentication.

## Hash-table lab

In Data Structure and Algorithm Design, open Hash functions · Interactive lab. The public release adds ten original HTML teaching slides, independent of private source PDFs. Visualize steps through fraction normalization, byte-sum collisions, 32-bit Horner hashing and byte sampling. Change the example inputs and inspect each step. Try C++ provides editable runnable examples; its guided visualization follows the input fields, not arbitrary edits to code. Neither example hashing nor this visualization is a cryptographic guarantee.

C++ execution is optional and disabled by default. It uses local Clang/WebAssembly through a pinned Runno dependency, never native student binaries or an online compiler. Install Node.js 22+ and run:

```sh
(cd tools/cpp-runner && npm ci --ignore-scripts)
CPP_RUNNER_ENABLED=1 python3 westlake.py demo courses --output /tmp/xiaoxi-with-cpp --port 8782
```

Use a new output directory. `CPP_RUNNER_NODE` can select an absolute Node executable. `/api/cpp/status` reports availability. `/api/cpp/run` accepts JSON `code` and optional `stdin`, requires same-origin localhost requests, and limits source/input size, concurrency, rate, output, time and WebAssembly memory. No provider credentials or host filesystem capabilities are passed to the guest. Compiler/runtime failures are shown in the output panel. Private lecture inventories, PDFs, generated data and dependencies remain outside the release. No new license or official university authorization is claimed.

Validation on 2026-10-20: the unit command passed 68 Python tests (two optional compiler tests skipped there) and 10 JavaScript tests. A separate compiler-enabled run passed all four C++ boundary/isolation tests. Chrome passed the My progress, Discussions and public hash-lab suites at desktop/mobile widths, including active/idle time, storage errors, selected-message privacy, review/approval, bounded agents, actual C++ output, diagnostics and timeout. Chat responses were mocked; no paid model request, real peer delivery or production authorization was tested. Internal Diffusion sync is pending: SSH was closed by the remote host; remote deck, configuration and credentials were not changed.
