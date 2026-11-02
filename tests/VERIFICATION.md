# Current verification

The current course workspace is tested locally; this document does not establish internal-server deployment or real-model quality.

- Python: 63 tests cover the server, classroom, quiz, practice, course routing, registered source assets, PDF hash and isolated storage/context.
- Unit checks: browser archive handling, bilingual UI and eigenvector geometry have Node tests.
- `tests/test_courses.cjs`: desktop/mobile course cards, search, filters, lecture dialogs, HTML editing/text highlights, navigation, math, isolated mocked AI context, original Linear Algebra lecture/quiz and language persistence.
- `tests/test_source_lecture.cjs`: all 24 original pages, contents/search, zoom/page entry, personal caption/note/region-mark persistence and undo, original PDF SHA-256, mocked text-only AI, focus, language, presenter navigation and print styles.
- `tests/test_presenter_workspace.cjs`: complete PDF/sample preview bounds at 1360×880, 1024×600 and 390×844, independence from audience zoom/size, linked navigation/jump, timer, language and ending the presenter session.
- `tests/test_presentation_browser.cjs`: portable pairing, message validation, editing sanitation, media controls, print preparation, route/backup navigation and classroom permissions.

No paid provider calls, physical-phone/display/printing tests or validated educational outcomes are asserted for this release. Lecture figures, credits and original PDFs are preserved; PDF animations remain static frames. Browser edits do not modify repository source files. Reproduce commands in [testing](../docs/testing.md).

Release checkout check (2026-10-19): the exact staged source was exported to a clean temporary directory. All 63 Python and 7 Node unit checks passed. Catalog, source-lecture, presenter-workspace and quiz/report browser suites passed against a server built from that clean copy. The Quiz layout test explicitly opens /deck.html because / is now the catalog. No provider calls were made. The macOS launcher passed zsh syntax checking; GUI double-click was not exercised.

## 2026-10-27 · 视觉苏格拉底式练习 / Visual Socratic practice

- 当前工作目录：`Documents/ChatGPT/NAACL/westlake-html-presentation`。仅本地实现和模拟验证，无部署、付费调用、提交或推送。 / Work was limited to the current NAACL checkout, local implementation and mocked verification. No deployment, paid calls, commits or pushes.
- Python 77 项运行（2 项跳过），其余全部通过；7 项现有 Node 档案/字典/几何检查通过。 / Python completed 77 tests with two skips and no failures; seven existing Node archive/i18n/geometry checks passed.
- 新增 `test_socratic.py`、`test_socratic.cjs` 覆盖分阶段像素输入、教师原图替换客户端图像、教师原图变化、引用/坐标校验、拒绝记忆型问题、原文证据、非真实作答、先作答与后续修订门槛、私有答案不暴露、Critic 拒绝后状态不推进、来源/过期/同源/限流、桌面与移动布局、HTML/PDF 捕获、失败保留草稿、练习中聊天回到对话、文字保存与刷新读取、讨论仅选定作答及中文切换。 / New backend/browser checks cover pixels at each stage, authoritative instructor images, changed source images, reference/box checks, recall rejection, exact quotes, nonattempts, try-first/revision gates, hidden answers, critic rejection without state advancement, revision/expiry/origin/limits, desktop/mobile layouts, HTML/PDF capture, draft recovery, active-practice chat blocking, saved text/reload, selected-turn discussions and Chinese UI.
- My progress 与 Discussions 现有浏览器回归通过。课程/原稿回归被既有小西浮层挡住高亮关闭/缩放控件；关闭新增脚本后仍可复现原稿缩放失败。本次未改宠物布局。 / Existing progress/discussion regression checks passed. Course/source-lecture checks hit the existing pet overlay intercepting highlighter-close/zoom controls; source zoom still failed with the new scripts disabled. Pet layout was not changed.
- 未验证真实模型质量、视觉定位准确率、学习增益、绝对无答案泄露、实体设备或屏幕阅读器。详情及运行命令见 `docs/testing.md`。 / Real-model quality, visual accuracy, learning gains, formal leakage resistance, physical devices and screen readers remain unvalidated. Commands and details are in docs/testing.md.

## Student course interface — 2026-11-01

Target: the NAACL checkout and its generated local preview at `http://127.0.0.1:8784/courses.html`; other local checkouts were not modified by this update. Passed existing course browser regression (including highlighting, mocked chat context, lecture navigation and bilingual persistence), existing student-login checks, 6 course Python tests and 2 eigen-demo tests. The demo build test now verifies that student.html is copied. New `tests/test_student_design.cjs` passed at 1440/768/390/360px: fictional identity, one whole-card action, modal focus, search/filter counts, language, true local record metadata, login, scripted lab gates, local discussion escaping/reset, touch targets, no external requests and reduced-motion handling. A reviewer found a stale 160px mobile discussion-nav constraint; it was removed and all four widths were recaptured/tested successfully. The catalog and login design inspector each reported 0 FAIL using explicit exceptions for user-requested uppercase eyebrows and floating-card shadows. Text-size and display-title warnings were visually reviewed. Real models, physical-device frame rates and screen readers were not tested. SSH authentication was denied; internal HTTP returned 200, but this version is not synchronized or verified remotely. No remote files or services were changed.

## Two-screen student flow — 2026-11-01

At the user's request, the intermediate student workspace, SlideMate lab and integration previews were removed from student.html. Demo validation now clears fields and opens courses.html directly. Login/courses no longer expose Progress/Discussions links. Updated tests/test_student_design.cjs passed at 1440/768/390/360px for validation, direct navigation, fictional identity, course filters/modal, absent removed UI, fresh form fields, no storage or non-GET requests, and no horizontal overflow. JavaScript syntax and diff whitespace checks passed. The generated 8784 preview was refreshed. Internal SSH timed out while HTTP returned 200; no remote synchronization occurred.

### Course banner removal

Removed the catalog mascot/research-identity banner and its empty topbar; moved the existing language switch beside the course title. Desktop (1440px) and mobile (360px) browser checks passed for banner absence, bilingual switching and overflow. Refreshed the 8784 preview. Internal synchronization remains pending: SSH authentication was denied; no remote files or services changed.

### Simplified login card

Removed the user-selected demo badges, callout, autofill button, parenthetical labels, helper text and disclaimer from the login card. Existing fictional values now prefill on load/pageshow; the card retains Student ID, Password, Show/Hide, validation and Open courses. Updated two-screen regression passed at 1440/768/390/360px, including absent removed elements, direct navigation, no storage/non-GET requests and sample-value restoration. JavaScript syntax and whitespace checks passed. Internal synchronization pending: SSH authentication denied; no remote files or services changed.

## Restrained student motion — 2026-11-01

Native CSS/WAAPI only. Shared tokens and .reveal with local --i; login entry group capped at 700ms, course entrances 300ms/60ms stagger, 7s hero float, opacity-only focus/shadow feedback, 180ms button press, single transformed filter indicator, stable cached course nodes and 150ms filter/page-exit fades. Removed badge/autofill control/mascot were not restored. No loop exists on courses. The only loops are three differently phased login hero cards; they pause in a hidden tab. Reduced-motion mode disables all animation and transition.

Passed tests/test_student_design.cjs at 1440/768/390/360px and tests/test_courses.cjs including source lecture highlighting, math, mocked chat context, bilingual persistence and existing eigen demo. New tests/test_student_motion.cjs passed at 1440/360px in normal/reduced-motion modes: animated properties limited to transform/opacity; entrance counts 7 login / 4 courses, zero on reduced motion; no entrance replay after search/filter; rapid reversals retain the latest state; no lingering will-change; no overflow or JS errors. Observed CLS=0 in all eight screen/mode/width cases. Font fallback shifts were corrected by fixed line/footer/count boxes, reserved grid space and using the embedded Inter face before card rendering.

Chrome Performance-importable trace: .impeccable/motion/chrome-performance-trace.json. Measurements: .impeccable/motion/measurements.json. After fonts loaded, median frame interval 16.7ms, p95 16.7–16.8ms, max 16.8ms in this recording (approximately 60fps). Startup intervals reached 33–83ms; this is not an uninterrupted 60fps startup or a physical-device/GPU guarantee. Screen-reader testing was not performed. Screenshots were inspected at desktop and 360px, including fully static reduced motion. JavaScript syntax and git diff whitespace checks passed.

Internal synchronization pending: SSH authentication denied; existing internal HTTP root returned 200. No remote files, Diffusion deck, credentials or services were changed.

## Academic Editorial refinement — 2026-11-01

Changed student.css, courses.css and courses.js; synchronized DESIGN.md, both READMEs and both user guides. Reviewed browser captures at 1440/768/390px plus 360px regression. tests/test_student_design.cjs passed all four widths (validation, Show/Hide, navigation, filters, lecture dialog, no credential storage/transmission). tests/test_student_motion.cjs passed all eight normal/reduced combinations at 1440/360px: CLS 0, static reduced motion, no reveal replay and no lingering will-change. Settled rAF median 16.7ms, p95 16.7–16.8ms; startup intervals reached 66.7ms in the final run. Chrome trace and measurements are under .impeccable/motion. No physical-device or manual DevTools Performance-panel verification was performed. No Python or proxy changes; those suites were not rerun.

Inspector: login 0 failures; courses active-tab contrast finding is a backdrop-inference false positive, manually checked in browser (white text on actual rgb(47,93,78) indicator; indicator fully covers selected button). Large headings, uppercase metadata and pastel covers retain explicit user direction. Final mobile capture has no horizontal overflow.

Deployment pending: SSH BatchMode rejected user@10.21.3.45 with Permission denied (publickey,password). HTTP root returned 200, confirming only that the existing service responds; no remote files, settings, deck or services were modified.

## Restored workspace navigation — 2026-11-01
Courses sidebar again links to existing My Progress and Discussions pages with matching outline icons, translated labels and 46px mobile targets. Existing page behavior/data untouched. Student design regression passed 1440/768/390/360px. Browser navigation checks passed Courses → Progress → Courses → Discussions → Courses at 1440/360px, with correct active destinations, >=44px link heights and no horizontal overflow. Mobile screenshot reviewed. No data-changing discussion actions or real APIs tested. Both READMEs and user guides synchronized.
Deployment pending: SSH authentication rejected (publickey,password); remote HTTP root returned 200 but no remote update was performed.

## Static workspace navigation — 2026-11-01
Shared sidebar markup/order and geometry across courses/progress/discussions; sidebar anchors bypass navigation fade. Browser checks at 1440px and 360px confirm identical bounding boxes for all three links across all three destinations and no active nav animations. Existing content/data untouched. Both READMEs/user guides updated. Deployment pending: SSH authentication rejected; remote files not changed.


## Workspace authentication — 2026-11-01

Changes target the app actually serving port 8784: `/Users/sholpanamankeldy/Documents/ChatGPT/NAACL/westlake-html-presentation`, with web root `/tmp/westlake-demo-8784-persistent`. The older Desktop checkout was inspected and left untouched. Login HTML and both shared stylesheets are unchanged. Argon2id dependency is declared in requirements/pyproject. The live demo uses a private, mode-600 seed file and SQLite database under `/tmp/westlake-workspace-auth`; these are outside the repository/web root, and should be moved to durable private storage for long-term use. The local launcher preserves the existing standalone deck, model setup and rehearsal behavior.

Five HTTP authentication test methods pass, including DB-only routing with reversed ID lengths, generic failure equality, live role demotion, all protected API verbs, direct HTML protection, cookie flags, logout/expiry, CSRF and persistent per-ID/IP lockouts. Six existing course regression tests pass. CUA browser checks passed for both account destinations, unchanged form controls, generic wrong-password error, teacher auto-redirect from login, student silent page denial, sign-out, empty state navigation and language switching. Desktop visual inspection confirms reuse of course sidebar/colors/components. No external model calls, public deployment, real-device or screen-reader tests were performed. Existing demo-only browser tests that assert prefilled credentials/no POST are historical and incompatible with the new server authentication flow.

Assumptions: `/login` and `/login.html` are aliases; anonymous protected pages return to sign-in; direct lecture resources retain their existing access policy; account management/password reset and per-account separation of browser-local learning records are outside this change; legacy classroom password and university Private Token authentication remain independent.

Diffusion synchronization was attempted using BatchMode SSH and rejected authentication (`Permission denied (publickey,password)`). Deployment and verification at `http://10.21.3.45:8765/` remain pending. No remote deck, credentials, settings or services changed. No commits or pushes.

## Teaching workspace v1 — 2026-11-02

Changes are in the Documents/ChatGPT/NAACL checkout that serves port 8784. The older Desktop checkout and unrelated existing edits were preserved. Login HTML and shared student stylesheets remain unchanged. Models/API/migration/seed details and limits are in `docs/teaching-workspace.md`.

Passed: 12 teaching service/HTTP tests, five existing authentication tests and six existing course regression tests (23 total). Coverage includes ownership for pages/APIs/files and direct student reader/catalog access by another instructor, published-only student visibility, publish/unpublish/hide, counts, notes, flags, accepted questions with failed inference, successful streamed/non-streamed mocked answers, scheduling, reorder, replacement archives, PDF upload validation/rendering, idempotent development seed and preview exclusion. Python compilation and `git diff --check` passed. Real PPTX → PDF → text/WebP conversion passed using a disposable generated fixture and the installed LibreOffice headless binary. No real model inference or provider billing was used.

Browser checks: teacher Today/course catalog/lecture list, shared course card visuals, heat-strip navigation with synchronized reader/panel, PDF file picker → processing → Draft → rendered page, publishing, saved student-visible note, the same published PDF/note in a student session, sign-out, EN/中文 and a 390px responsive layout including bottom language/sign-out controls. The disposable uploaded PDF, its notes and its student-open event were removed afterward; existing courses/materials were not removed. No real-device or screen-reader validation; actual drag gestures and upload rendering fidelity for arbitrary real-world PPTX decks remain untested. Keyboard reorder is backed by the same tested ordering mutation.

The previous temporary demo server/data were absent when this session began. A local server was started against the current source web root, and private demo account/teaching data is now in durable `~/.local/share/xiaoxi-workspace/`. Passwords remain in its private mode-600 seed file, outside this repository and the web root. No existing provider credentials/configuration were overwritten.

Required Diffusion deployment was attempted via BatchMode SSH to `user@10.21.3.45`; the connection timed out. Synchronization and deployed-result verification remain pending. No remote files, standalone deck, credentials, model settings or services were changed. No commits or pushes.
