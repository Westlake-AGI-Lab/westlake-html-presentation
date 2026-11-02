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

`tests/test_courses.py` checks the public catalog in a clean checkout. PDF-specific tests are skipped unless optional local lecture materials are installed. With local materials, it also checks source-PDF SHA-256, all registered page/thumbnail assets, explicit public boundaries, 24-page transcript isolation, and read-only source markup. With a running course demo, run `SOURCE_LECTURE_TEST_URL=http://127.0.0.1:8782/ node tests/test_source_lecture.cjs`. Playwright/Chrome checks desktop/mobile source viewing, contents search, zoom, text mode, deep links, download hash, text-only mocked AI context, focus, bilingual controls, and print styles. These tests do not call a real AI provider or establish physical-device/printing behavior.

2026-10-19 unified lecture workspace: 63 Python tests and desktop/390px browser regressions passed. Read text is absent. Verified PDF caption/note and drawn-region persistence, undo, original PDF hash, contents/search, zoom/page entry, mocked text-only AI, presenter navigation, print styles, catalog samples, and existing Linear Algebra features. No paid provider calls or physical-device/printing tests.

Presenter workspace (2026-10-19): `tests/test_presenter_workspace.cjs` checks PDF and editable sample previews at 1360×880, 1024×600 and 390×844, complete preview bounds, audience zoom/size independence, linked navigation/jump, timer, language and ending. Run against the local catalog with `PRESENTER_WORKSPACE_URL=http://127.0.0.1:8782/ NODE_PATH=<playwright-node-modules> node tests/test_presenter_workspace.cjs`. This and the portable presentation browser suite passed; media controls, spoofed-message rejection, print and classroom restrictions remain covered. No real model, physical display or phone tests.

## Hash-function lab

`python3 westlake.py test` includes disabled-runner, request-origin and payload-boundary checks. Run `node --test tests/test_hash_model.cjs` for fraction equality, 32-bit wraparound, UTF-8 hashing, collisions and sampled positions. With the optional toolchain installed, `CPP_RUNNER_ENABLED=1 PYTHONPATH=src python3 -m unittest discover -s tests -p test_cpp_runner.py` additionally verifies that a real compiled WASI program cannot read a host file or a server environment sentinel. Against a local private course demo, `HASH_LAB_URL=http://127.0.0.1:8792/ NODE_PATH=<playwright-node-modules> node tests/test_hash_lab.cjs` exercises the 20-slide catalog, guided steps, actual C++ output, edited code, diagnostics, timeout and desktop/mobile layout. This suite does not call AI or an online compiler. Original deck redistribution permission is not asserted.


## Xiaoxi companion interface — 2026-10-19

Verification (2026-10-19): JavaScript syntax and diff whitespace checks passed. Browser checks covered desktop and 390×844 layout, English/Chinese labels, pet opening/drag/reload, Practice draft and draft preservation. Main-deck Quiz/Practice and personal-slide controls remain present; full quiz and AI generation were not rerun. No real model calls. Internal synchronization is pending: SSH was closed and HTTP returned an empty reply; remote files and settings were not changed.

验证（2026-10-19）：JavaScript 语法与差异空白检查通过。浏览器验证桌面及 390×844 视口、中英文、小西点击/拖动/刷新恢复、练习提问草稿与已有输入保留。主稿的 Quiz/Practice 和个人讲解页入口仍存在，未重新执行完整测验或 AI 生成，未调用真实模型。内网同步待完成：SSH 连接关闭，HTTP 返回空响应；未修改远端文件或设置。

## My progress

Against a local course demo with private PDF fixtures, run `PROGRESS_TEST_URL=http://127.0.0.1:8782/ NODE_PATH=<playwright-node-modules> node tests/test_progress.cjs`. Controlled browser clocks and explicit focus/blur events verify active time, the idle cutoff, cross-tab pause/resume and midnight boundaries. Other checks cover actual PDF/text marks, per-subject totals, the activity calendar, current 4:3 source thumbnails, filters, clearing only time history, desktop/mobile layouts, bilingual labels, and blocked or malformed storage. Screenshot data is isolated test data, never a fabricated student history. This does not establish cross-device syncing or learning outcomes.

## Visual Socratic practice — 2026-10-27

From the current NAACL checkout, run `python3 westlake.py test --suite python` and `node tests/test_socratic.cjs` against the current local catalog (`SOCRATIC_TEST_URL`, default `http://127.0.0.1:8782/`). Browser checks require Playwright and Chrome. API responses in the browser test are mocked; backend stage fixtures and the model adapter test also make no provider requests.

Verification: the Python run completed 77 tests with two skips; all remaining tests passed. Seven existing archive/i18n/geometry Node unit checks passed. The new desktop/mobile Chrome checks passed for PDF image capture, HTML slide rendering capture, visual region overlays, first-attempt gates, distinct revision unlock, active-practice chat blocking, retained drafts on failed checks, stale-slide rejection, opt-in text persistence and reloading it in My progress, selected-turn discussion sharing, Chinese UI switching and layout overflow. Backend tests cover instructor-image replacement of client pixels, changed registered instructor images, invalid boxes/references, recall-level rejection, exact student quotations, nonattempts, ownership/expiry/revision guards, critic rejection, same-origin and request limits. JavaScript syntax and Git whitespace checks passed. Screenshots were reviewed.

Existing My progress and Discussions browser regression scripts passed. The course/source-lecture regression scripts remain blocked by the existing floating pet intercepting highlighter-close/zoom controls. The source-lecture zoom failure was reproduced with the new Socratic scripts disabled. The pet layout was left outside this approved change. These failures must not be represented as passing full UI regression coverage.

No real provider quality, visual interpretation accuracy, comparative learning gain, formal answer-leakage resistance, physical-device or screen-reader evaluation was performed. This approval excluded deployment, paid model calls, commits and pushes; no internal Diffusion synchronization was attempted.


## Application CI

`.github/workflows/tests.yml` runs on push and pull_request. Python 3.12 / Node 22 install requirements and locked Playwright dependencies, then run the full Python discovery plus Node unit checks and the isolated student browser regression. The Python total grows with regression coverage (the original 109 includes two opt-in skips; seven lecture-deletion regressions bring it to 116). Browser checks cover empty credentials, generic failures, real same-origin sessions, sign-out, filters and course dialogs at four widths. No running demo, credentials, real provider, real course deletion, or paid API call is used.


HEAD regression checks inspect the original response without following redirects: anonymous `/courses.html` must return a body-free 303 to `/student.html`, while public routes return body-free 200. This avoids Python-version-specific urllib redirect-to-GET behavior without changing application routing.
