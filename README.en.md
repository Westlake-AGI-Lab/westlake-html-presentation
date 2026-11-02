# Learning Workspace

## Run the complete course demo from GitHub

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python tools/run_demo.py --port 8784
```

Open http://127.0.0.1:8784/courses.html and sign in as `DEMO2026` (student) or `202400000` (teacher). The terminal prints the path to a private `demo-access.json` containing generated passwords; no credentials are shipped in Git. Accounts, classroom state and uploads stay outside the repository in `~/.local/share/westlake-workspace-demo`; override with `--data-dir /absolute/private/path`. Use `--port 8785` for a side-by-side comparison. The script seeds the four-course, nine-lecture catalog and fictional teacher activity without copying existing user history. Existing accounts are preserved on subsequent starts. Browser-local progress and discussions are not copied between origins.

The shared catalog includes the supplied Tomasulo and Hash Functions lecture PDFs, slide images and original attribution to reproduce the local demo, at the owner's publishing request. No new redistribution license or university authorization is asserted. AI requires a separately entered university token; no token or API key is bundled. Optional C++ execution requires Node >=22, `npm ci --prefix tools/cpp-runner`, and `CPP_RUNNER_ENABLED=1`; PPTX uploads require LibreOffice. The server remains localhost-only.


## Teacher workspace v1 (2026-11-02)

The previous empty shell is replaced by Today, Courses, Students and Discussions. Today shows the signed-in name, top five slides by questions in 14 days, ten anonymous recent actions and owned course cards. Courses supports search, subject filters, creation, lecture uploads (PDF/PPTX), publish/unpublish/hide, rename, replacement, confirmed deletion, keyboard/drag reordering and optional scheduled publishing. The lecture view reuses the student reader and adds question heat bars, anonymized questions/collapsible AI answers, saved incorrect-answer flags and student-visible slide notes. Students and Discussions, plus course Insights / AI / Practice / Students tabs, remain Coming soon. No settings, question bank, grading, moderation, exports or full analytics are implemented.

Schema v2 adds ownership, lecture state/schedule/order, notes, question/open events, flags and replacement archives alongside existing accounts. Every course-specific page/API and file checks ownership or Published visibility server-side. Accepted student questions and completed AI answers are logged server-side; preview is read-only and logs no activity. Student identities are omitted by default (`TEACHING_ANONYMIZED=1`); `0` permits account IDs in question responses, never student names. Original files and rendered images live outside the public root. Replacement archives prior slide data and resets to Draft. Existing browser-local history is not imported.

Install updated dependencies (PyMuPDF) and LibreOffice (`soffice`, or `LIBREOFFICE_BIN`). Upload processing is synchronous with retry feedback: default 40 MiB (`LECTURE_UPLOAD_MB`), at most 200 slides, bounded WebP renders/240px thumbnails, first text line as title, no OCR, static PDF conversion of PPTX. Schedules are applied on the next catalog/access request. Missing course code/semester/speaker/date is shown honestly. Existing JSON content/brand assets and separate classroom/university-token authentication are preserved. Import explicitly with `PYTHONPATH=src python3 -m westlake_ppt.teaching --db /absolute/private/accounts.sqlite3 --web /absolute/project/web --seed-demo`; add `--mock-events` only in development. Use the same `WORKSPACE_AUTH_DB` at server startup. Migration is idempotent and preserves accounts; back up the private database and lecture-files directory together.

See [setup, models, APIs, privacy and verification](docs/teaching-workspace.md). The current demo is served from this Documents/ChatGPT/NAACL checkout and uses durable private data under `~/.local/share/xiaoxi-workspace/`; the earlier Desktop checkout is separate. Diffusion synchronization is pending: the SSH connection timed out; remote deck, credentials and services were not changed. Earlier descriptions of the placeholder workspace are superseded by this section.


## Workspace accounts (2026-11-01)

The existing Student ID + Password form is unchanged visually. It now sends credentials to same-origin `POST /api/auth/login`; every failure displays exactly `Incorrect ID or password`. No role picker, badge, ID-format heuristic or password in frontend code is used. Database `is_teacher` selects `/teacher` or `/courses`; signed-in visits to `/`, `/login`, `/login.html` and `/student.html` redirect automatically. `/teacher/*`, `/teacher.html` and `/api/teacher/*` check the live SQLite record, including role changes/deletions. Students are redirected to `/courses` for pages and receive 403 for APIs; anonymous page requests go to sign-in. `GET /api/auth/session` returns only account name, ID and destination; `POST /api/auth/logout` revokes the session. Cookies last 12 hours, are HttpOnly / SameSite=Strict, and add Secure under configured HTTPS. Passwords use Argon2id. Sessions store token hashes. Failed logins persist in SQLite: five per ID or twenty per direct client IP in a rolling 15-minute window cause temporary lockout, with the same generic failure. Forwarded IP headers are ignored.

Install the updated dependencies (`python3 -m pip install -r requirements.txt`). Set `WORKSPACE_AUTH_DB` to an absolute private path outside the web root (default: `CLASSROOM_DATA_DIR/accounts.sqlite3`). SQLite schema v1 initializes automatically; there is no previous account database to migrate. Create a private JSON outside the repository with `student_password` and `teacher_password` (each at least 12 characters), then run:

```sh
PYTHONPATH=src python3 -m westlake_ppt.auth --db /absolute/private/accounts.sqlite3 --password-file /absolute/private/workspace-seed.json
```

Use that same DB path in the server environment and restart the app. The idempotent seed preserves existing accounts/passwords and creates DEMO2026, 202400000 (Demo Teacher), and 20243841001–20243841003. Normal server startup does not seed accounts; the explicit `tools/run_demo.py` launcher seeds its private demo state. There is no account/password editing UI. Protect the seed file with mode 600. The workspace reuses the course sidebar and CSS: Today shows recent activity and frequently questioned slides; Courses supports course creation, lecture uploads, publishing/hiding, renaming, replacement, deletion, ordering and scheduling. Lecture views show question heat, anonymized Q&A, answer flags and student-visible notes. Students and Discussions, plus course Insights / AI / Practice / Students tabs, remain Coming soon; AI settings, full analytics and moderation are not implemented. Sign out and EN / 中文 work. Legacy presentation classroom authentication and university Private Token connections remain separate. Direct lecture resources retain their existing access policy; this is local/internal authentication, not a public deployment security design. Browser-local learning records remain browser-local and are not isolated by account.

Verification: `PYTHONPATH=src python3 -m unittest discover -s tests -p test_workspace_auth.py -v` covers routing, reversed ID lengths, generic failures, page/API protection, live role changes, logout/expiry, CSRF and persistent ID/IP lockout. Historical student-demo behavior described below is superseded by this section. Internal Diffusion deployment is pending: SSH authentication was rejected; remote files, deck, credentials, models and services were not changed.


## University Private Token access (2026-11-01)

The course workspace requires a local account; direct slides retain their existing access policy. Xiaoxi defaults to each student's university-issued Private Token. Open Xiaoxi, follow **Connect your university AI account**, choose a documented model, and Connect. The panel links to https://hpc.westlake.edu.cn/#/ai-campus; log in there with your campus account, open **Model Service / API**, apply for a Private Token, and paste only that token into Xiaoxi. SlideMate never asks for campus usernames/passwords. A successful, completed real inference is required before “Connected” appears. Connecting never submits a draft question; press Send yourself. Expand the connection summary and choose **Disconnect and delete token** to invalidate the connection. Questions survive connection errors and failed requests.

Provider evidence: [University HPC manual](https://hpc.westlake.edu.cn/document/science/soft/more/ai.html) documents the campus OpenAI-compatible base `https://hpc-api.westlake.edu.cn/v1` and aliases `deepseek-flash`, `glm-flash`, `Qwen` (case preserved). The backend uses the fixed full endpoint `https://hpc-api.westlake.edu.cn/v1/chat/completions`, `Authorization: Bearer <Private Token>`, and JSON `model`, `messages` (system/user/assistant text), `stream: false`. It does not use OpenAI's hosted API, SDK, Responses, tools, or a guessed `/v1`. Offline aliases are excluded. The documented endpoint was reachable and returned HTTP 401 without credentials. This confirms reachability/authentication gating, **not** live token/model compatibility. No authorized real credential was supplied; real text inference remains pending. No inference was billed or tested using operator credentials.

Xiaoxi sends the current slide text/notes, question and selected recent conversation (at most 12 turns / 20,000 history characters), rather than an entire course. Browser chat requests omit other slides' text; the backend also independently restricts upstream context to the current page. Earlier conversation may refer to earlier slides. Text context is not image understanding. Although university materials advertise images, live image request compatibility has not been verified: image uploads, region/image requests and visual Socratic practice are blocked in university mode, including their backend paths. Create slides uses the student session with current-page text only. The university path honestly returns a complete non-streaming response; legacy operator SSE remains available in its separate mode. Provider errors distinguish invalid/expired token, model authorization/availability, quota/rate limits, campus-network/VPN failure, timeout and incomplete/incompatible output; no automatic retries occur.

Tokens go only to a same-origin POST and the fixed university endpoint. They remain in server-process memory, isolated by a random 256-bit session ID in an HttpOnly, SameSite=Strict cookie scoped to `/api/`. Tokens are never returned or written to browser storage, database, config, archives, exports or logs. Provider errors never relay response bodies; exact credential echoes in successful answers are redacted. Disconnect, expiry and restart invalidate connections. Default absolute lifetime: **7,200 seconds (2 hours)**, not refreshed by chat; expired entries are removed on access and every 60 seconds. In-flight provider work can continue until its timeout after browser Stop/disconnect, but disconnected/expired credentials cannot authorize new calls. One active request/student; default 30 requests/hour/student plus existing server budgets. Connection attempts use the existing IP/global budgets. Maximum 1,000 sessions; connect body 8 KiB, chat body 12 MiB, upstream response 2 MiB, socket timeout 45 seconds and bounded reads. Redirects are refused, including to another host. Host/network restrictions and localhost defaults remain.

Configuration is server-controlled (restart after changes): `UNIVERSITY_MODELS` is a subset of the three documented aliases, `UNIVERSITY_SESSION_SECONDS` is 300–43,200, and `UNIVERSITY_REQUESTS_PER_HOUR` is 1–200. There is no browser-supplied upstream URL or token config file. Default `PPT_AI_MODE=university` never falls back to `OPENAI_API_KEY`; teacher/operator credentials and model settings are preserved. Explicit `PPT_AI_MODE=operator` retains the earlier standalone Responses workflow; the catalog demo always enforces university mode even with that setting. Do not use operator mode to serve student courses. Teacher administration remains on the separate operator integration.

Remote Private Token entry requires HTTPS. Plain LAN HTTP, including `http://10.21.3.45:8765/`, cannot accept tokens; loopback HTTP remains suitable for local development. An HTTPS reverse proxy is **not installed by this change**. `UNIVERSITY_PUBLIC_ORIGIN=https://slides.example.edu` may be set only after a separate security design: a trusted proxy must terminate TLS, preserve the exact Host, connect over loopback, and prevent direct remote access to the Python listener. The backend ignores arbitrary forwarded-protocol headers and sets Secure cookies for configured HTTPS. Keep the server on loopback; changing its bind address is not public deployment. Campus/VPN access must be available from the SlideMate server, not only the student's browser.

Verification: `PYTHONPATH=src PPT_AI_MODE=operator python3 -m unittest discover -s tests -p 'test_*.py'` checks existing legacy behavior and the new suite, whose HTTP fixtures explicitly enforce university mode. New tests cover two parallel student sessions, missing/expired/disconnected sessions, no shared-key fallback, upstream Bearer/model/schema, redaction, current-page context, rate/concurrency, provider failures, image rejection and secure cookies. Browser QA on the actual port-8784 demo used an explicitly mocked university transport, never a real token: courses → lecture → failed connect/draft retained → keyboard Show/Hide → connect/no automatic send → question/response → slide 2/follow-up without reconnect → disconnect; 390px mobile layout checked. Real text and image inference remain separately unverified; image features remain disabled. Internal synchronization is pending: SSH authentication was denied; HTTP responded 200, but no remote files/settings/services were changed or deployment claimed. The standalone Diffusion deck was preserved.


## Student interface (2026-11-01)

My Progress and Discussions are restored in the courses sidebar. They open the existing progress and discussion pages, preserving browser-local records and existing limitations. The intermediate student workspace and lab remain removed.

Visual refinement: Academic Editorial direction retains the pinned green/pastel palette and offline Inter. The login has a clearer display/form hierarchy and 50px fields/actions. Courses use compact 128px desktop covers, 15px descriptions, aligned count/search/filters, and compact phone navigation. Card footers distinguish course materials from teaching samples; study-record counts remain based on local activity. No dependencies, routes or authentication capabilities were added.

Motion verification: CLS measured 0 at 1440px and 360px in normal/reduced-motion modes; reduced motion had no running animations. Chrome recording after font loading measured a 16.7ms median and 16.7–16.8ms 95th-percentile frame interval, approximately 60fps. Initial font/resource startup still included 33–100ms intervals. These measurements do not establish frame rates on physical devices or every GPU.

Motion: login and course cards enter only once per page load, with each group finishing within 700ms; only the login illustration cards have a continuous seven-second ambient float. Filtering reuses card nodes and fades over 150ms without replaying entrances; the selected filter background slides via transform. Focus borders and hover shadows use opacity overlays rather than animating color or shadow properties. Primary press/arrow feedback uses 180ms. Reduced-motion mode is fully static. Previously removed badges, autofill control and mascot remain absent; login fields start empty and values are cleared after sign-out. Native CSS and minimal JavaScript add no dependencies.

The login card now contains its heading, Student ID, Password, Show/Hide and “Open courses”. In-card demo badges, callouts, helper copy and the autofill button were removed. Fields start empty; credentials are submitted only to same-origin server authentication, which selects the workspace from the database role.

The courses page omits the mascot and “Research demo · Fictional identity” banner; its language switch sits beside the course title.

The current student entry is `/student.html` → authenticated `/courses`. The sidebar also links to My progress and Discussions; learning records and discussions remain browser-local. Search, filters and lecture selection remain available. The profile comes from the signed-in account. The former intermediate workspace, SlideMate lab and integration previews are not separate entry screens.

Inter, local brand assets, pastel course cards and demo warnings remain, with no external font requests. Internal deployment is pending: this SSH connection timed out; remote files and services were not modified.


## SlideMate visual Socratic practice

Legacy operator mode only. University mode disables these image-dependent actions pending separate image verification.

Use the existing lecture **Practice** control, then **Start visual practice on this slide**. Starting sends the selected slide image and its text to the configured server-side model provider. There is no added sign-in, course, sample deck or replacement dashboard. PDF practice resolves the course/lecture/page against the local catalog and uses the registered original instructor image, replacing client-supplied pixels and text. HTML practice captures the current rendered slide in the browser; it is a browser snapshot, not a verified instructor original. Personal PDF captions/highlights are not part of the original image. Media, complex CSS and animated states may not capture faithfully; inspect the snapshot.

Separate Curator and Questioner calls identify visible elements, normalized bounding boxes and spatial/topological relationships, then generate an Apply/Analyze/Evaluate/Create question referencing those elements. The private rubric and worked reasoning remain on the server. Number, slide identity, text and image are bound to a SHA-256 snapshot revision. Questions with missing visual references, invalid boxes or unreliable visuals are rejected rather than silently generated from text. Marked regions are AI-generated and must be checked; coordinate/schema validation does not establish that the visual interpretation is correct.

Each substantive attempt invokes an Assessor, then a Socratic Tutor, then a separate model Critic. The assessor must quote the student's actual wording and reference the question's visual elements. Misconceptions receive a targeted counter-question or counterexample, not a stored hint or immediate correction. The critic screens questions for grounding and answer disclosure before they reach the browser. Model checks can still make mistakes; no formal leakage guarantee or superiority over another product is claimed. No real-model quality evaluation has been performed in this change.

**Compare worked reasoning** unlocks only after at least two distinct accepted attempts, a tutor question and a supported latest revision. A correct first attempt still receives a question. Empty/short/repeated responses, model-classified nonattempts, stale revisions and premature explanation requests cannot advance the server gate. Effort thresholds and model assessment cannot prove authentic human reasoning. During an active practice session, ordinary assistant/send and Create slides actions return to the dialogue until worked reasoning has been opened. This UI guard is not authentication or exam access control. Failed requests retain the input draft and do not record a scored attempt. Changing the selected page or its text requires a new session; registered PDF changes are also checked server-side before subsequent actions; old dialogue remains visible while the page is open.

Practice text saving is opt-in. Enabled records appear in existing **My progress → Socratic practice records**, including student attempts and tutor questions; they are activity/evidence records, not grades or mastery. Records stay in this browser/origin and can be deleted in the practice dialog. Images, private rubrics and worked answers are excluded. Reload preserves opted-in text records but does not resume an expired/in-memory tutoring session. Existing study-time, highlights, chat archives and discussion records are unchanged. **Share this attempt to Discussion** opens the existing editor with only that selected student turn and slide label; posting still needs review and explicit confirmation. No automatic peer delivery is added.

`POST /api/socratic` accepts `start`, `attempt`, `explain`, `forget`. Start takes `language` (`en`/`zh`) and `source` (`id`, `page`, `title`, `text`, `image.dataUrl`); later actions use the returned `session` and `revision`, with `answer` for attempts. Limits: same-origin and existing Host/network/request/concurrency rules, 2 MiB body, one validated image (PNG/JPEG/WebP, ≤2048 pixels and ≤1 MiB), 100 in-memory sessions, 30-minute expiry, 8 accepted attempts/session, 4,000 characters/attempt, 100 saved browser records. Start and each accepted attempt use three sequential model calls; the existing request budget counts the HTTP transaction, not those individual model calls. No extra model credentials or configuration keys are added. Configure a vision-capable provider to use the feature; the isolated preview does not load the private provider config file, but retains explicitly supplied environment credentials. Legacy reviewed-bank `/api/learning` remains for compatibility and teacher tools; its static hints are not used by the new student Practice entry.

Local-only implementation: deployment, paid provider calls, commits and pushes were excluded from this approval.

## Xiaoxi pet and learning entry points

Verification (2026-10-19): JavaScript syntax and diff whitespace checks passed. Browser checks covered desktop and 390×844 layout, English/Chinese labels, pet opening/drag/reload, Practice draft and draft preservation. Main-deck Quiz/Practice and personal-slide controls remain present; full quiz and AI generation were not rerun. No real model calls. Internal synchronization is pending: SSH was closed and HTTP returned an empty reply; remote files and settings were not changed.

Lecture pages retain a draggable Xiaoxi pet: click it to open the AI panel. The toolbar's Practice button opens the visual Socratic practice dialog; nothing is sent until Start visual practice is selected. Existing typed questions are preserved. Its position is saved in this browser and restored on reload; dragging does not open chat. The compact pet illustration is 66 × 83 px on desktop and 52 × 66 px on mobile; its clickable area stays larger. It is hidden in print and respects reduced motion. The panel uses a Xiaoxi avatar, light green surfaces, a clearer source bar and wrapping tools. Existing practice, personal slides, archives, uploads, exports and stop/retry actions remain available. This interface update does not change model configuration or claim improved AI accuracy.

The teacher workspace and class quiz still open from the existing main deck (teacher access still requires login); this change does not add portal switching. Class quizzes and teacher-reviewed lecture improvements belong to that classroom; separate lectures do not implicitly join it or reuse another lecture's quiz. Personal Auto-slides remains under Create slides in the lecture AI panel; the teacher approval workflow remains in the teacher workspace.

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

The workspace provides a course catalog, interactive teaching samples and a PDF lecture viewer. Teaching samples do not constitute an official university course catalog. Sample code is displayed, not executed; PDF animation sequences remain static frames.

## Catalog and lecture interface

The catalog offers course cards, search, subject filters and English/Chinese UI. Its sidebar shows the transparent university logo, Learning Workspace label and the user-supplied display profile **Sholpan Amankeldi · ID 20243841001**. This profile is static, without sign-in or identity verification.

Source lectures and catalog samples use a light interface with searchable contents, page entry, zoom/fit, notes, highlighting, printing and original-file download where available. Read text has been removed; hidden transcripts still support search and assistant context. PDF editing adds personal captions and edits notes, while highlighting marks regions with undo/clear and a keyboard alternative. Original PDF artwork and downloads remain unchanged. HTML samples support direct text editing and text highlights. Edits and marks persist in this browser; they do not modify repository files.

Presenter view gives the current slide the main area, with next-slide preview and scrollable notes at right. It fits the whole slide by width and height. PDF/sample previews use a stable 1600×900 canvas, independent of audience zoom or window size. Linked navigation, slide selection, timer pause/reset, fullscreen, language, media and configured brief/backup routes remain available. Narrow windows use a vertical layout. Open the view from the lecture; independent presenter pages do not pair automatically.

## Assistant, practice and classroom limits

Student Xiaoxi uses the university Private Token workflow above and current-slide text. Explicit uploads, region capture and visual practice are disabled until university image requests are verified. The following image/Responses descriptions apply to the separate legacy operator mode. Keep operator API keys outside Git and HTML; see [configuration](docs/configuration.md). UI language changes do not translate lecture content.

Catalog samples and the supplied architecture lecture use self-study mode with separate browser storage per lecture. They do not reuse the main Linear Algebra classroom, practice or quiz banks. The Linear Algebra lecture retains teacher-reviewed bank-based quizzes and aggregate class reports; its student Practice entry now uses visual Socratic dialogue. Legacy reviewed-bank APIs still support their earlier written-attempt/hint workflow. Quiz assembly is not AI question generation. The legacy offline reviewed-bank assessor always returns `uncertain`; its output is not grading or a validated mastery estimate. Sample reports use explicitly fictional participants in a separate classroom.

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

My progress, below the student profile, shows browser-local active study time by subject, the most-studied course, saved text/region highlights linked to slides, and a daily activity calendar. Time counts only while a lecture tab is visible and focused and pauses after one minute without interaction. Statistics begin when this feature is used; past study time is not reconstructed. Existing PDF marks are imported; older text marks appear after reopening their lecture. Use 7/30-day or all-recorded-time filters, pause/resume tracking, or clear time history without deleting slide notes/highlights. This is local activity, not grades, completion or a cross-device account; no analytics is sent to the server or teacher. Moving to another browser/origin or clearing browser storage does not preserve it automatically.

## Private local lectures

The default shared catalog now contains the complete local demo materials. An optional ignored `web/assets/courses.local.json` remains available for machine-specific overrides; the registered files under `web/assets/private-lectures/` are included in Git for reproducibility. The catalog JSON itself is not served over HTTP.

## Hash-function interactive lab

The bundled Hash functions lecture contains 20 selected original slides credited to Douglas Wilhelm Harder / University of Waterloo. The selected PDF and rendered images are included at the owner’s publishing request, retaining original credits without asserting a new license. Visualize provides controllable steps for fraction normalization, byte-sum collisions, Horner hashing and sampling. Try C++ provides editable examples, Run, Reset code and real output. Guided animations follow example inputs, not arbitrary editor changes. Original typos and incomplete snippets are corrected in separate lab examples using UTF-8 bytes and explicit unsigned 32-bit arithmetic.

Run is OFF by default. Install Node.js 22+, run `npm ci --prefix tools/cpp-runner`, and set `CPP_RUNNER_ENABLED=1` before the usual startup command; `CPP_RUNNER_NODE` optionally selects Node. Dependency installation needs the network; compilation works without an online service once installed. Runno 0.10.2 executes the compiler and program as WebAssembly with a virtual filesystem; student code is never executed natively or uploaded, and is not given host files or network interfaces. This supports small standard-library examples, not a full system C++ environment. Only same-origin localhost requests are accepted: one job at a time, 12 per minute, 24 KB source, 4 KB stdin, 12,000 returned characters per output channel, a 256 MiB limit per WebAssembly memory, a 384 MiB Node heap limit, a 3-second program timeout and 18-second overall timeout. `GET /api/cpp/status` reports availability; `POST /api/cpp/run` takes `{"code":"…","stdin":"…"}`. Server credentials are not passed to the runner process.

The My progress calendar supports arrow-key navigation and per-subject time for a selected day. Continue learning returns to the last recorded lecture page. Programmatic scrolling does not extend active study time. PDF highlights support both 4:3 and 16:9 originals; imports do not invent historical activity dates, and malformed browser records do not crash the page. Statistics begin when tracking is enabled and do not represent mastery.

## Course Discussions (local interaction prototype)
The existing course workspace now includes **Discussions immediately below My progress** in both `courses.html` and `progress.html`. `discussions.html` inherits the same university identity, student profile, course catalog, green palette, and responsive shell; it is part of this workspace, not a replacement dashboard. The lecture’s existing menu also links to Discussions.

From any completed text message in the existing lecture AI chat, choose **Share to Discussion**. Only that selected question or answer is passed to a modal editor. Add a title and your own context, select course/category and visibility, edit the AI excerpt, preview, check the review confirmation, and explicitly confirm publication. No full prompt, conversation history, attachments, credential, or hidden context is attached. A selected user question is student-written; a selected AI response retains its AI-generated/unverified label after editing. Cancel leaves the discussion store unchanged. The original private tutor still uses its existing configured service; the sharing feature does not make an additional LLM request.

The board supports course/topic filters, text search, recent/unanswered/my-post views, nested replies, editing/deleting your own posts and human replies, and helpful toggles. Deleting a reply removes its descendants after confirmation. Fictional sample participants illustrate pinned threads and instructor-verified explanations; they do not claim real instructor endorsement. Markdown, code, and math reuse the bundled marked/DOMPurify/MathJax stack.

**Ask my agent** prepares an editable, unpublished scripted example. **Start agent discussion** requires explicit activation and a 2- or 3-turn cap; it compares an explanation, a counterexample, and (at three turns) a reflection prompt. The peer agent is simulated; no classmate or real agent is contacted. Pause/stop cancels future turns, navigation also stops the session, and every draft needs a separate review and publication confirmation. AI contributions stay labeled unverified; marking helpful never grants instructor verification.

Boundary: this is a browser-local prototype using `xiaoxi-discussions-v1` in localStorage, not an authenticated discussion backend. Course members / Study group / Only me are visibility metadata for demonstrating the flow, not access permissions. New content is not delivered to peers. Shared-device users can access browser storage. Pending agent drafts exist only in page memory. A production version needs accounts, course/group membership enforcement, server persistence, moderation, live updates, and an explicitly authorized agent service. No new environment configuration is required. The modules `discussion-service.js`, `discussion-share.js`, and `discussions.js` separate storage/demo responses, publication UI, and the board for future integration.

Verification (2026-10-19): six existing Python course tests passed; `tests/test_discussions.cjs` passed in Chrome against the existing local preview (default `http://127.0.0.1:8782/`, override `DISCUSSIONS_TEST_URL`). It tests actual lecture-chat sharing with a mocked NDJSON response, no private-prompt leakage, editing and visibility preview/confirmation, nested replies, helpful marking, agent review, the three-turn bound and early stop, search, persistence, mobile overflow and language switching. Real provider calls, peer delivery and real authorization were not tested because these are not implemented by the prototype. Internal Diffusion synchronization remains pending: the remote host closed SSH on 2026-10-19. Remote content, configuration and credentials were not modified.

Student login uses same-origin server authentication and the seeded SQLite accounts. Use the generated private passwords described above; sign out invalidates the session. Campus/Canvas previews are fictional and do not connect to those services.

The student entry now shares the catalog stylesheet, forest-green palette, university rail, compact sans-serif typography and geometric course-cover language. Mobile prioritizes the demo form; keyboard focus uses the existing gold accent. Demo authentication and disconnected integration previews remain unchanged.

Design verification (2026-10-22): Chrome desktop/mobile demo checks passed; rendered login, catalog and integration previews were visually inspected. Keyboard entry, 320/768/1024-pixel layouts and 200% zoom checks passed. Screen-reader and real-device testing remain outstanding. Internal deployment pending: SSH rejected authentication; no remote changes.


Workspace navigation is static: Courses, My Progress and Discussions keep identical order and sidebar geometry. Sidebar links use immediate navigation without a fade.

## Chat interface refinement (2026-11-01)

The existing Xiaoxi drawer now uses right-aligned soft-green reader bubbles and plain assistant replies, with sender labels, existing message timestamps, 1.6 line height and a 70ch maximum. The growing textarea and inset send control stay at the bottom. Chat and practice controls share solid-green primary, outlined secondary and text-only ghost styles (44px minimum; round icon controls 40px). Hints, feedback and worked explanations use separate calm surfaces. Existing DESIGN.md colors and spacing are reused; motion is limited to 180ms transform/opacity with reduced-motion support. Checked at 1440px and 360px with a labeled visual fixture, without model calls. Copy, routes, provider/session handling, storage, consent and action handlers are preserved; the fixture is not shipped. Internal Diffusion synchronization remains subject to the existing deployment requirement and is reported separately.

## Presentation and adjustable assistant (2026-11-01)

On viewports wider than900px, Xiaoxi now starts at400px and reserves matching space beside the presentation. The lecture remains visible and interactive; the background is not dimmed. Drag the divider, use its Left/Right arrow keys (Home=min, End=max), or open **Width** and adjust the slider. Width is bounded to320–720px while leaving at least520px of the viewport for the lecture frame, and is shared by chat and practice for the current page; it is not stored with tokens or archives. Narrower screens retain a full-width panel with an explicit Close control.

Opening **Reason with this slide** automatically closes Xiaoxi chat. Practice is now a nonmodal side panel with current-slide context, collapsible instructions, captured-slide preview and record controls. Slides can be changed while it is open; the existing stale-snapshot guard still requires a new practice session after a slide change. Closing practice leaves chat closed and restores the presentation; opening chat closes practice. Drafts and in-memory practice state are retained. No timer closes a student's work. Provider/session authorization and image limitations remain in force; university visual practice stays disabled until image requests are separately verified.

The Xiaoxi chat header now uses tighter spacing and a smaller mascot; desktop toolbar buttons and the current-slide strip are more compact, leaving more room for messages. Mobile toolbar touch targets remain 44px.

Internal Diffusion synchronization for this header adjustment is pending: SSH authentication was denied; remote files and services were not changed.


Connected students can open Xiaoxi’s connection panel and switch between `deepseek-flash`, `glm-flash`, and `Qwen` (subject to the configured allowlist). `POST /api/university/model` accepts only a model selection and reuses the HttpOnly session’s server-held token. A real, non-streaming “Reply with OK.” inference with a 16-token output cap must complete before the model is activated. Failed validation retains the prior model and session; no provider error body or token is returned. Switching shares student/global request limits, is disabled during requests, and leaves history, drafts and current-slide context intact. The active model is shown in the chat header and connection panel and applies to subsequent requests. Server restarts still expire in-memory connections.

The chat composer gives more space to message history with tighter padding and desktop action buttons. The university workflow no longer repeats the text-only disclaimer beneath the input; image limits remain in the connection panel. The inactive archive reminder is removed; archive consent, save status and storage errors remain available.

The chat header no longer displays the secondary toolbar (language, width menu, export, learning archive and practice), freeing its row for the conversation. Desktop panel resizing remains available through the divider. These toolbar actions are not available from the chat header.


Future confirmed lecture deletions remove that lecture’s replacement archives and unshared uploaded versions after committing database changes. Invalid metadata/unsafe paths stop deletion; shared uploads and bundled course assets remain. Cleanup failures are reported explicitly. No startup sweep or retroactive orphan cleanup runs.


Student browser regression: `npm ci`, `npx playwright install chromium`, then `npm run test:student` (Python dependencies must be installed). The check starts its own temporary localhost server/database and fictional accounts, exercises real authentication at 1440/768/390/360px, and removes only its temporary state. Set `PYTHON` to your virtualenv interpreter if needed. It never uses the running demo or real credentials.


GitHub Actions **Application tests** runs on every push and pull request with Python 3.12 and Node 22. It installs locked browser dependencies and Chromium, runs `PYTHONPATH=src PPT_AI_MODE=operator python -m westlake_ppt test --suite unit` (all discovered Python tests and Node checks), then `npm run test:student`. Provider calls are mocked and optional C++ execution tests remain opt-in. Tests use temporary private databases and do not require repository secrets.
