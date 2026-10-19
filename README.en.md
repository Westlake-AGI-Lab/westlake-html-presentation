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
- **Data Structure and Algorithm Design**: search and stacks/queues samples.

The seven introductory samples each have seven slides and are labeled as teaching samples. They do not constitute an official university course catalog. Sample code is displayed, not executed. PDF animation sequences remain static frames.

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
