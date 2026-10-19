# Testing

## Local Quiz And Report

`python3 westlake.py test` includes quiz authentication, classroom isolation, review gating, answer-key withholding, first-submission idempotency, input validation, slide-level respondent deduplication, skipped/missing counts, class end, persistence, deletion and sample retention checks. With the eigen demo on port 8783, run `QUIZ_TEST_URL=http://127.0.0.1:8783 node tests/test_quiz_browser.cjs` (Playwright and Chrome required). The browser check creates/deletes its own classrooms and covers teacher publication, mobile answered/remaining progress, in-dialog skipped-answer confirmation, final answer review, report summary, HTML export, separate sample data, 320/390/1440px layouts and page errors. It makes no model calls. Use a disposable demo, not a production classroom.

## Integration Check: 2026-10-11

Merged the presentation update with the package layout and animated eigen demo. All 51 Python tests and seven Node checks passed. The full browser suite passed: offline linked presentation windows and printing, served presentation assets and failure recovery, region selection, highlights, personal slides and lecture improvements. The timer-reset check now waits for the asynchronous linked-window update. Separate Chrome checks covered the 16-slide eigen demo at 1440px and 390px, projection presets, moving animation and nonblank canvas rendering. No paid AI calls or student data were used.

Presentation assets and `presenter.html` are in `web/` and included in generated demos. Internal deployment remains pending because SSH host-key verification failed; the existing remote lecture was not modified.

Use `python3 westlake.py test` or installed `westlake-ppt test`. The default runs all Python `unittest` files plus the existing Node archive, localization and geometry checks. Missing Node is a failure, not a silent skip. `--suite python` explicitly limits the run to Python.

`--suite browser` starts an isolated ephemeral server with a disposable teacher password, no provider key and temporary classroom data, then invokes the existing Node Playwright checks for region selection, highlights, personal slides and improvements. Install Node Playwright and Chrome before using it. `--suite all` runs both groups. Browser tests were retained instead of rewritten so this migration changes fewer test assumptions.

Browser controls can also be checked manually: source navigation, desktop/mobile geometry, play/pause/reset, precise eigenvector presets, direct practice entry and hint gating. Automated tests do not prove real-model accuracy or learning gains.

Research checks cover known kappa cases, abstention coverage, false-understood counts, dataset consent declarations, duplicate identifiers, private output boundaries and prompt hashes. Prompt changes require updating the manifest and reporting the new hash, rather than silently claiming the old version.

For syntax only: `python3 -m compileall -q src tests`. The tests run with isolated private configuration. Do not point browser tests at a production classroom.

## Local Migration Check: 2026-10-05

Before relocation, 44 Python tests and 7 Node checks passed. After relocation and the new research checks, 51 Python tests and the same 7 Node checks passed. Editable package installation and the installed CLI's synthetic agreement experiment also passed. The suite requires permission to bind temporary localhost ports.

The installed eigen demo was checked through the browser at desktop and mobile widths: exact projection presets, animation, opening a slide-linked question, two written attempts, staged hints, and the final explanation. The explanation stayed disabled until the required steps were completed. The full four-script Node browser suite was not executed in this migration session. No real provider assessment, student study or remote deployment was tested.

## Course catalog

`tests/test_courses.py` checks the explicit catalog inventory, sample route validation, GET/HEAD, separate browser-storage keys, absence of main-lecture classroom/practice/quiz integrations in samples, and the opt-in home page. Run `python3 westlake.py demo courses --output /tmp/xiaoxi-course-catalog --port 8782` with an empty output directory, then `COURSES_TEST_URL=http://127.0.0.1:8782/ node tests/test_courses.cjs` with Playwright and Chrome available. AI requests in this browser suite are mocked.

## Supplied PDF lecture

`tests/test_courses.py` also checks source-PDF SHA-256, all registered page/thumbnail assets, explicit public boundaries, 24-page transcript isolation, and read-only source markup. With a running course demo, run `SOURCE_LECTURE_TEST_URL=http://127.0.0.1:8782/ node tests/test_source_lecture.cjs`. Playwright/Chrome checks desktop/mobile source viewing, contents search, zoom, text mode, deep links, download hash, text-only mocked AI context, focus, bilingual controls, and print styles. These tests do not call a real AI provider or establish physical-device/printing behavior.

2026-10-19 unified lecture workspace: 63 Python tests and desktop/390px browser regressions passed. Read text is absent. Verified PDF caption/note and drawn-region persistence, undo, original PDF hash, contents/search, zoom/page entry, mocked text-only AI, presenter navigation, print styles, catalog samples, and existing Linear Algebra features. No paid provider calls or physical-device/printing tests.

Presenter workspace (2026-10-19): `tests/test_presenter_workspace.cjs` checks PDF and editable sample previews at 1360×880, 1024×600 and 390×844, complete preview bounds, audience zoom/size independence, linked navigation/jump, timer, language and ending. Run against the local catalog with `PRESENTER_WORKSPACE_URL=http://127.0.0.1:8782/ NODE_PATH=<playwright-node-modules> node tests/test_presenter_workspace.cjs`. This and the portable presentation browser suite passed; media controls, spoofed-message rejection, print and classroom restrictions remain covered. No real model, physical display or phone tests.
