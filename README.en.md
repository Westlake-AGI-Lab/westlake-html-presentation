# Westlake University HTML Presentation · PPT Q&A Agent

## Teacher-reviewed lecture improvements

GitHub package: the reusable template includes this workflow and its synthetic sample. Private classroom databases, local demo credentials, generated versions and the independent Diffusion deck are not included. Publication of this feature does not automatically publish teacher-approved presentations.

In the teacher console (`/?mode=teacher`), open **Lecture improvements · Top 10**. **Open sample class** creates a separate, ended classroom with 18 synthetic questions from 8 synthetic participants and three prepared themes. Preparing its sample slide does not call an AI model. Sample data and slides are visibly marked; real students cannot join that classroom.

For real classes, students can opt in using the unchecked checkbox in the AI composer. Only subsequent question text and its slide number are retained for the teacher, together with a pseudonymous room-member ID, request ID and source-file SHA-256 revision. Images, answers and conversation history are not copied into analytics. Consent resets on reload; turning it off stops future collection, not deletion of already shared questions. A shared question is counted even when its AI answer fails; retries with the same request ID do not add duplicates. Text may itself contain identifying information, so this is not guaranteed anonymization. Counts represent distinct room memberships, not verified people.

**Analyze themes with AI** sends up to the latest 200 shared questions / 40,000 question characters from the current source revision, plus source-deck text and notes, to the existing configured Responses provider. It groups related questions semantically. The server validates evidence IDs and computes participant/question counts itself; it shows up to 10 themes ranked by distinct participants, then question count. The report includes analyzed and unassigned counts and its timestamp. Refresh retrieves new counts; analysis is explicitly requested, not automatic. Ordinary classroom posts, personal archives and earlier source revisions are not included.

**Prepare slides → Review draft → Edit / Preview → Approve & create version** prepares 1–3 supplementary slides. Teacher review must check factual accuracy, formulas, citations and privacy. Approval persists a separate HTML artifact in the private classroom database, appending slides to the original deck and leaving its page numbers stable. The source file, live classroom and GitHub remain unchanged. Each approved artifact starts from the current server source; separate approvals are not automatically combined. Browser-local edits are not the source. Use **Open new version** or **Download HTML**; a downloaded file requires the matching `assets/` folder, and AI features require local serving. Publish a reviewed artifact separately as the next source version; no automatic commit, push, PR or deployment is performed. This is HTML presentation output, not a `.pptx` export.

No new credentials, dependencies or environment settings are required. `improvements.py` reuses the existing server-side model client and classroom teacher session. SQLite stores opted-in questions, reports, drafts and approved HTML; room deletion and the existing 30-day post-class cleanup remove them together. Back up reviewed artifacts independently. Teacher-only endpoints: GET `/api/classroom/improvement-dashboard?room=...`, GET `/api/classroom/improvement-file?id=...` (add `download=1` to download), POST `/api/classroom/improvement-{sample,analyze,draft,save,approve,reject}`. POST requires same origin and a teacher cookie, allows up to 64 KiB and uses the existing request/concurrency budget. `/api/chat` optionally accepts `shareForImprovement: true` plus `improvementRequestId`, with valid classroom headers; collection is limited to 30 questions/member/hour. Generated content is plain text escaped into HTML. Stale-source drafts cannot be approved; approved artifacts are immutable. No Git credentials or student records are placed into presentation exports automatically.

Verification: `python3 -m unittest discover -s tests -v`; with an isolated local server, Playwright and Chrome, run `IMPROVEMENT_TEST_URL=http://127.0.0.1:8772 IMPROVEMENT_TEST_PASSWORD=YOUR_TEST_PASSWORD node tests/test_improvements.cjs`. The browser test creates sample classes and artifacts in that test database and mocks student AI answers. Real provider output quality still needs teacher review. Internal Diffusion synchronization is pending: the SSH connection was closed on 2026-09-20; no remote files or settings were changed.

## Interactive classrooms and local learning archives

Open `/?mode=teacher`, sign in with the private teacher password, create a class and share the student link or QR code. Open “Projection or preview” separately for the projector. Students join anonymously with a class code, follow the teacher by default, pause following when navigating independently, and can return to the teacher's slide. The teacher dashboard is never projected. Classroom mode uses the original deck rather than solo-mode browser edits.

- Each student's latest feedback per slide replaces their earlier choice and can be withdrawn. Questions allow 500 characters and are teacher-only. Private AI chats are not shared by default; students can preview and confirm a single text excerpt, or explicitly opt in to question-text collection for lecture improvements.
- Likes start enabled, allow one per member every 2 seconds, and count actions, not people, against the teacher's current slide. Danmaku starts disabled; when enabled it appears directly without moderation. Limits: 60 characters, one per member per 10 seconds and one per classroom per 2 seconds, with an additional two-post limit per 8 seconds for lane capacity. Plain text only; teachers can disable, clear, delete or mute. Closing, navigating and reconnecting never replay old animations.
- State polls approximately every 2 seconds. Projection shows slides, edge likes and at most two danmaku lanes. Reduced-motion preferences are respected; overlays are excluded from print and thumbnails. Congestion rejects posts or skips excess animations instead of building a backlog. Target latency is under 3 seconds on a healthy network, not a hard real-time guarantee.
- Open Learning archive in the AI panel. After initial consent, IndexedDB automatically saves text and compressed images, streamed text once per second and final state immediately. Full archives are no longer limited to 20 messages. Create, rename, restore and confirm deletion of conversations. Without consent, only the last 20 text messages are stored temporarily; old images cannot be recovered. AI context still uses the latest 12 messages and at most 6 images; start a new conversation when over the limit.
- Download a complete current-conversation ZIP containing versioned manifest.json, conversations.json and attachments/. Markdown is readable but excludes image bytes. Imports create new conversations, never overwrite existing data, and validate paths, formats, images and compression with limits of 100 MiB and 1,000 entries. Different deck versions warn about slide references. Archives exclude API and teacher credentials.
- Browser clearing, private browsing and storage quotas can cause loss or save failures. Watch the save status and download independent backups. Other users of the same browser may access records. Different origins, localhost addresses and ports do not synchronize automatically.

### Teacher configuration, deployment and interfaces

Initialize private files outside the repository, preserving existing API credentials, model and provider:

```bash
python3 configure_classroom.py --config /absolute/private/config.json --data-dir /absolute/private/classroom-data --access-file /absolute/private/teacher-access.txt
PPT_CONFIG_PATH=/absolute/private/config.json python3 server.py
```

The script generates a random password only if absent, stores it in mode-600 private files and never prints it. Private JSON accepts TEACHER_PASSWORD and CLASSROOM_DATA_DIR; environment variables take precedence. Restart after changes. Never commit or distribute these files or include credentials in student links.

SQLite in CLASSROOM_DATA_DIR stores classes, explicit feedback, danmaku and like statistics, plus opted-in question analytics and reviewed supplements described above; it does not archive entire private AI conversations. Ended classes are retained for 30 days with request-time cleanup; teachers can delete early and export classroom feedback as JSON/CSV. Improvement artifacts have their own HTML download. Restart preserves records but expires teacher sessions, disables danmaku and discards old animations. Allow writes only to that data directory in systemd ReadWritePaths and create it before restarting. Backups/rollbacks must preserve private configuration, data and previous code.

New /api/classroom/ endpoints: POST login/logout/create/join/control/feedback/question/like/danmaku; GET rooms/state/export. Teachers use HttpOnly, SameSite=Strict cookies; students use random membership tokens validated against the classroom. POST requires same origin with a 16 KiB body limit; requestId provides submission deduplication. State accepts room, role, since and boot and returns versions, cursors and incremental events. teacher=1 requires a teacher session. Existing /api/chat remains compatible; classroom requests add X-Classroom-Room and X-Classroom-Token for per-member limits, while solo requests retain IP limits. Existing global defaults of 200 requests/day and 2 concurrent requests are unchanged.

This is trusted-LAN HTTP, without transport encryption, real-name accounts or verified student identities. Anonymity is not untraceability. Teacher passwords protect management endpoints; hidden notes do not make static slide files confidential. Do not use on the public internet or with sensitive/exam-confidential content.

New vendored dependencies: fflate 0.8.2 for ZIP and qrcode-generator 1.4.4 for QR codes; no runtime CDN. Run node tests/test_archive.cjs and backend tests covering permissions, deduplication, restart, retention and 50-member concurrent reads without paid AI calls.

Deployment status (2026-09-17): the 4090 Diffusion example includes classrooms, likes/danmaku and learning archives. Teacher entry: http://10.21.3.45:8765/?mode=teacher ; the original presentation URL is unchanged. All 21 backend tests pass; live following, likes and image-archive restoration after reload were verified. Campus network or VPN is required. Actual mobile devices, real storage exhaustion and full print output remain untested. The teacher password is in the deployer's private access file, never in student links.

## Slide thumbnail navigation

Click the 44×44 bottom-left icon to open the slide thumbnails and jump to any slide. The current slide is highlighted in orange and stays synchronized with navigation. The panel stays open on desktop and closes after selection on narrow screens (≤600px). Arrow keys and Home / End move thumbnail focus; Enter / Space selects; Escape closes. Controls follow the Chinese/English setting without translating slide content.

Previews scale the actual layout at the current viewport ratio and rebuild on opening or resizing; reopen after editing to refresh. They exclude speaker notes and chat context, do not upload or save screenshots, and are hidden when printing. Deploy shared `assets/thumbnails.js` and `assets/thumbnails.css` together and restart the backend to load the updated static-file allowlist.

[中文](README.md) | English

A lightweight browser-based slide template for teaching, research talks, and meetings in a Westlake University visual style, with an AI sidebar that answers questions about the presentation and the reader's current slide.

## Current status (2026-09-18)

### Area selection and Q&A

The blue scan icon in the presentation toolbar starts a rectangular selection with a mouse or finger. A local crop preview offers **Explain formula**, **Identify method**, **Explain this**, and a custom question. Controls and preset questions follow English / Chinese UI selection; typed questions are preserved. Selecting alone makes no AI request. Choosing a preset or sending a custom question submits the cropped image and the frozen slide context through the existing chat API, with the answer shown in the sidebar.

Cancel with Escape or Cancel, or use Select again. Keyboard users can activate the tool, use arrows to position the initial rectangle, Shift+arrows to resize it, and Enter to capture. Navigation and window resizing dismiss an unsent selection. Finish text editing and send or clear an existing chat draft before starting. Existing image-count limits apply; no automatic retry or extra API endpoint is added.

`assets/region.js` / `assets/region.css` use locally bundled html2canvas 1.4.1 and a Lucide scan icon. Captures are DOM renderings, not a guaranteed pixel-exact screenshot or an OCR transcription. Check the preview, especially for complex formulas/charts. Selected video, iframe, unloaded or cross-origin image elements are rejected; use an uploaded screenshot instead. Other unsupported CSS/media may render differently. Only the current visible rectangular area is attached, up to 2048 px / 1 MiB after compression. The temporary preview stays in memory; after sending, the image follows the existing chat attachment/storage behavior. No API credentials reach the browser; sharing and privacy rules below still apply.

Area selection is included in the reusable GitHub template. AI answers require the local server and a configured image-capable provider. The independent Diffusion deck stays outside this repository and release bundles. Internal deployment is pending: the server SSH connection timed out on 2026-09-20; deployed files and settings were not changed.

Browser regression: with Playwright and Chrome installed, start the local server, then run `REGION_TEST_URL=http://127.0.0.1:8765/ node tests/test_region.cjs`. It mocks AI responses and checks desktop/touch selection, nonblank crops, bilingual requests, cancellation, navigation, and draft preservation. Automated tests do not establish real AI response quality.

### One-click Chinese / English UI

Use `English / 中文` in the presentation toolbar or chat header. Chat controls, statuses, errors, upload/preview notices, copy/export, editing, notes, fullscreen, print, navigation and quick questions switch together. The choice is saved in this site's browser storage and survives reloads. Slide content, speaker notes, slide titles and existing messages are not automatically translated; switching does not incur a translation API call.

Each question freezes `language: "zh" | "en"` (omitted legacy requests default to Chinese). English mode requests English explanations and quiz feedback. Switching during generation changes the UI only; the running response and retries keep the original request language. English `Slide N` / `Page N` citations are clickable. Markdown export labels follow the current UI language without altering raw messages. The dictionary and UI adapter live in `assets/i18n.js`; run `node tests/test_i18n.cjs` alongside the Python tests.

- **This GitHub repository** contains the reusable 10-slide Westlake template, shared chat components, Python backend, deployment example, and tests.
- **Internal demo**: [Diffusion theory introduction](http://10.21.3.45:8765/) serves a 16-slide teaching example, not the blank template. It requires campus networking or a VPN that can reach the server; it is not a public-internet URL.
- **Publication boundary**: the Diffusion deck is maintained outside this repository and deployed separately, excluded from the generic release bundle. Browser edits are not automatically published to other readers.
- **Verified**: thumbnails, bilingual controls, interactive classrooms and learning archives are deployed. All 21 backend tests, archive validation and bilingual tests pass. Live streaming Q&A and math rendering were verified previously. See [verification coverage and remaining checks](tests/VERIFICATION.md).
- **Security**: API credentials remain in a private server directory. Teacher management requires a private password; students join anonymously. There are no real-name accounts or HTTPS. Shared chat consumes the operator's API quota. Share only with trusted readers and avoid sensitive material.

## 1. Background

### Internal-network sharing

`deploy/westlake-ppt.service` runs an isolated Python virtual environment in `~/apps/westlake-ppt` as a systemd user service on port 8765. Deploy the chosen HTML deck, its assets, server.py, classroom.py and requirements.txt (plus configure_classroom.py for initial setup), keeping the entry filename `西湖大学专属HTML演示模板.html`. The server currently substitutes the separately maintained Diffusion deck; GitHub retains the reusable template. Do not commit the Diffusion deck, conversations or credentials. Set `PPT_CONFIG_PATH` to private credentials outside the source tree (the example uses `~/.config/westlake-ppt/config.json`, mode 600).

Install dependencies, place the service in `~/.config/systemd/user/`, adjust `ALLOWED_HOSTS` and `ALLOWED_NETWORKS`, then run `systemctl --user daemon-reload` and `systemctl --user enable --now westlake-ppt`. User linger is needed to keep it running after SSH logout. Restart with `systemctl --user restart westlake-ppt`; inspect logs with `journalctl --user -u westlake-ppt`. Other applications remain untouched.

The default allows localhost only; the LAN example explicitly permits private networks and validates Host, without trusting client-supplied forwarding headers. Chat limits default to 30 requests per hour per IP in solo mode or per participant in classroom mode, 200 requests globally per UTC day, and 2 concurrent requests. Configure `CHAT_REQUESTS_PER_HOUR`, `CHAT_REQUESTS_PER_DAY`, and `CHAT_MAX_CONCURRENT`. Counts are in memory, reset on restart, and include failed attempts. These are not monetary spending caps; set a provider-side budget separately.

LAN HTTP is unencrypted and has no account authentication. Use only within a trusted campus network/VPN, avoid sensitive uploads, and do not expose the port publicly. Screenshot paste is browser-permission-dependent; use the upload button if unavailable. Client IDs use `crypto.getRandomValues` for LAN HTTP compatibility. Public hosting requires HTTPS, authentication, and durable rate limiting.

This project combines interactions from an existing HTML presentation with a user-provided Westlake University PowerPoint meeting template. It reuses the supplied logo, navy-blue and orange visual elements, and common presentation layouts to create an editable, extensible HTML template. The goal is to support both presenting information and helping readers understand it.

The current deck has 10 example slides: cover, contents, section divider, body text, key metrics, image/text, roadmap, data, takeaway, and thanks. Text and numbers are placeholders, not research findings.

This is a custom project based on supplied materials, not an official university release or an assertion of authorization. Use and redistribution of logos, images, and other brand assets are subject to university rules and the relevant rights holders' permissions.

## 2. Features and architecture

- 16:9 slides, navigation, progress indicator, fullscreen, speaker notes, and browser printing / PDF.
- In-page text editing saved in the current browser's `localStorage`.
- AI sidebar for slide summaries, concept explanations, cross-slide connections, and follow-up questions.
- A pet launcher uses the supplied character artwork: it gently moves, blinks, and briefly switches to a walking pose. Hover or keyboard focus shows its magnifying glass; clicking or tapping opens Q&A, and `A` still toggles the panel. System reduced-motion settings disable idle animations. Pet assets work offline and are hidden when printing.
- Each question includes slide text, speaker notes, the current slide number and title, and recent conversation.
- A server-side proxy calls the OpenAI Responses API or a compatible endpoint; the browser never receives the API key.

```text
HTML: deck text + notes + slide at question time + recent conversation + attached images
    ↓ POST /api/chat
Python service: validate input → bound context → compose prompt
    ↓ POST {OPENAI_API_BASE}/responses (server-side API key)
Model response → Python NDJSON stream (or legacy JSON) → Markdown / math sidebar
```

The frontend uses plain HTML / CSS / JavaScript. The backend uses the Python standard library plus Pillow for image validation. Install `requirements.txt` first. Browser libraries are vendored locally; no Node.js or npm runtime is required. Content is extracted from the current DOM for every question, so browser edits can be included in the context.

The “Agent” is a presentation-aware Q&A assistant, not an autonomous tool-execution system. “All slides read” means supplying slide text with the request, not training, vector retrieval, or permanent memory. Explicitly attached images are sent for model vision. Images embedded in slides are not automatically sent, and uploaded PPTX parsing is not implemented. Put unsubmitted image/chart information into text or notes. Instructions ask the model to cite slide numbers and label outside knowledge as supplementary explanations; answers still require human review. The default response language is Chinese, but users can request another language.

## 3. Quick start

### Slides only, without AI

Open `西湖大学专属HTML演示模板.html` directly, keeping `assets/` in its relative location. Offline presenting does not require an API key. AI Q&A requires the backend.

### Run the full application

Requirements: Python 3.10+ (local Python 3.9 with existing Pillow 11.3 was also verified), a modern browser, and a provider key and available model supporting the Responses API. From this project's directory, run in a macOS / Linux terminal:

```bash
python3 -m pip install -r requirements.txt
export OPENAI_API_KEY="YOUR_API_KEY"
export OPENAI_MODEL="YOUR_AVAILABLE_MODEL"
export OPENAI_API_BASE="https://api.openai.com/v1"
python3 server.py
```

Windows PowerShell:

```powershell
python -m pip install -r requirements.txt
$env:OPENAI_API_KEY="YOUR_API_KEY"
$env:OPENAI_MODEL="YOUR_AVAILABLE_MODEL"
$env:OPENAI_API_BASE="https://api.openai.com/v1"
python server.py
```

Open <http://127.0.0.1:8765> and select the AI button on the right. Keep the server running; use `Ctrl+C` to stop a foreground server. The server can also run without a key for slide viewing only.

Compatible-provider example, previously tested locally with a real Q&A request:

```bash
export OPENAI_API_BASE="https://www.apiwharf.com/v1"
export OPENAI_MODEL="gpt-6-astra"
```

APIWharf is a third-party service, not an official OpenAI domain. Model availability depends on the provider and account. These settings apply only to this application; no Codex configuration changes are required.

### Private configuration and macOS launcher

The server automatically reads `~/.config/westlake-ppt-agent/config.json`. You may create this file outside the repository using this structure (placeholders only):

```json
{
  "OPENAI_API_KEY": "YOUR_API_KEY",
  "OPENAI_MODEL": "YOUR_AVAILABLE_MODEL",
  "OPENAI_API_BASE": "https://api.openai.com/v1"
}
```

On macOS / Linux, recommended permissions are `700` for the configuration directory and `600` for the file. Environment variables take precedence over private configuration; restart the server after changes. Only the three fields above are loaded from the private file.

On macOS, after configuring the key and installing dependencies, double-click `启动智能PPT.command`. It prefers `.venv/bin/python`, falls back to `/usr/bin/python3`, and opens `127.0.0.1:8765`. Use the terminal method for another host / port. If a health endpoint already responds, the launcher opens the page without starting another server.

| Setting | Code default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | None | Required for Q&A; server-side only |
| `OPENAI_MODEL` | `gpt-5.5` | Explicitly set a model available to your account |
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | `/responses` is appended automatically |
| `HOST` | `127.0.0.1` | Local-only access by default |
| `PORT` | `8765` | Update the browser URL when changed |
| `MAX_OUTPUT_TOKENS` | `3000` | Output cap, 1–16000, subject to provider limits |

`.env.example` is a reference only. The application does not automatically load `.env`; use environment variables or the private JSON file.

## 4. Presenting and editing

Xiaoxi displays one greeting in the language selected by the existing English / Chinese UI toggle. The pet label and tooltip follow the same setting; slide content is not translated. The speech bubble follows dragging, stays within the window, and hides with the pet when Q&A opens or the deck is printed. It is a local greeting, not an AI-generated reply.

Drag the pet with a mouse or finger to reposition it within the browser window. Its position is saved in this browser's `localStorage` and kept within the visible window after resizing. A drag does not open Q&A; a normal click or tap still does. This is a webpage pet, not a desktop-wide companion.

| Action | Control |
| --- | --- |
| Navigate | `←` / `→`, `PageUp` / `PageDown`, or navigation buttons |
| Toggle Q&A | `A` or the AI button |
| Edit text | `E` or the edit button; toggle again to finish |
| Toggle speaker notes | `N` |
| Fullscreen | `F` |
| Export PDF | Select Print, then save as PDF in the browser dialog |
| Deep-link to a slide | Append `#6`, e.g. `http://127.0.0.1:8765/#6` |

Browser edits do not modify the HTML file and will not be included in a GitHub upload. Edit the HTML source to share lasting changes. With learning archives enabled, text and images persist in IndexedDB; otherwise sessionStorage temporarily retains text only. The server does not archive AI chats; classroom feedback is stored separately in SQLite.

Copy the project for a new presentation. Edit `.slide` elements and their `data-title`; editable text uses `data-editable`, and notes use `.presenter-notes`. Check hard-coded footer page numbers when adding or removing slides. Brand colors are in CSS `:root`; update both chart `--value` and displayed numbers when changing data.

For multiple decks on the same browser origin, give each deck distinct `storageKey` and `agentSessionKey` values to avoid collisions. Saved edits are indexed by element order, so rearranging elements can misapply old edits. Back up content before clearing site storage or changing the keys.

## 5. Structure and development

```text
.
├── README.md                       # Chinese documentation
├── README.en.md                    # English documentation
├── AGENTS.md                       # Development and documentation rules
├── 西湖大学专属HTML演示模板.html       # Slides, styles, and browser logic
├── server.py                       # Static server and AI proxy
├── classroom.py                    # Classroom authorization, SQLite and interaction events
├── configure_classroom.py          # Initialize private teacher configuration outside the repo
├── tests/                          # Backend, archive and bilingual regression tests
├── deploy/                         # LAN systemd service example
├── 启动智能PPT.command               # macOS launcher
├── 使用说明.md                      # Short Chinese usage guide
├── .env.example                    # Placeholder configuration
├── .gitignore
└── assets/                         # Brand images, chat, classroom, archives, thumbnails and vendored dependencies
```

Frontend entry points: `collectDeckContext()` extracts content, `WestlakeChat.ask()` in `assets/chat.js` submits questions, `showSlide()` updates the active slide, and `saveEdits()` persists browser edits. Backend entry points: `AGENT_INSTRUCTIONS` defines response guidance, `build_deck_context()` / `build_request()` assemble context, `call_openai()` calls the provider, and `PresentationHandler` handles HTTP.

### API contract

- `GET /api/health` → `{ "ok": true, "configured": true, "model": "...", "stream": true, "images": true }`. `configured` only indicates a nonempty key; it is not an upstream connectivity check.
- `POST /api/chat` accepts the JSON below. Success returns `{ "answer": "...", "model": "..." }`; failures return `{ "error": "..." }` with a non-2xx status.

```json
{
  "question": "Explain the main concept on this slide in English",
  "currentSlide": { "number": 1, "title": "Cover" },
  "slides": [
    { "number": 1, "title": "Cover", "content": "Slide text", "notes": "Speaker notes" }
  ],
  "history": [
    { "role": "user", "text": "Previous question" },
    { "role": "assistant", "text": "Previous answer" }
  ]
}
```

Current limits: 12 MiB request body; up to 80 slides; 10,000 text and 5,000 note characters per slide; approximately 80,000 characters for the deck; the most recent 12 history entries, approximately 20,000 characters total; and 4,000 characters per question. Excess text is truncated. Model output defaults to 3,000 tokens (configurable), with a 90-second upstream read timeout and a 180-second browser deadline. Streaming Markdown / LaTeX is supported, while the legacy non-streaming API remains available. Longer decks may require retrieval, chunking, or revised limits with a cost review.

### Verification and troubleshooting

```bash
python3 -m py_compile server.py classroom.py configure_classroom.py
python3 -m unittest discover -s tests -v
node tests/test_archive.cjs
node tests/test_i18n.cjs
curl http://127.0.0.1:8765/api/health
```

Manual regression checks: navigation, fullscreen, editing and restoration after refresh, notes, printing, and Q&A on different slides. Confirm the current-slide label and answer references. Check missing/invalid keys and network-failure messages. Real Q&A consumes provider API usage. Run `python3 -m unittest discover -s tests -v` for mocked backend tests without paid API calls.

- Slides work but AI does not: avoid `file://`; check health, key, model, and base URL, then restart after configuration changes.
- `Address already in use`: use the existing service or choose another `PORT`; do not terminate unknown processes indiscriminately.
- 401 / 403 / 429 or model errors: check provider permissions, quota, rate limits, and supported models.
- Answers miss image information: put important information into text or notes; upload the relevant image for vision; the model cannot see images that were not submitted.
- Source edits appear unchanged: saved browser edits may override the source; back up content before clearing relevant local storage.

## 6. Privacy, security, and GitHub sharing

Each question sends extractable deck text, including speaker notes, the current slide, and recent chat to the configured API provider. Confirm that these materials may be shared externally. Requests set `store: false`; this does not guarantee that a provider keeps no logs or retains no data. Review its policies independently.

The server targets a trusted LAN, not the public internet. It includes teacher-password authentication, classroom membership isolation, rate limits, cross-site checks and static allowlists, but no HTTPS or real-name identity system. Public deployment still requires stronger authentication, HTTPS, proxy adaptation and security review.

Before sharing:

- Commit only this project, not private configuration, real keys, chat records, or personal files.
- Review the staging area and Git history. `.gitignore` cannot remove tracked secrets; revoke and replace any exposed key.
- Confirm redistribution rights for the logo, template, and example images.
- No open-source license is currently included. The publisher should choose a code license and address brand assets separately; unrestricted reuse must not be assumed.

## 7. Maintenance policy

After every update, synchronize applicable changes to the existing server-hosted **Diffusion example** at the internal URL `http://10.21.3.45:8765/` and verify the deployed result. Preserve the Diffusion content: never replace it with the generic template. Preserve private configuration, security limits, and unrelated services. The Diffusion example must remain outside the GitHub repository and release bundle. If the server is unreachable or verification fails, explicitly report deployment as pending rather than successful. This policy does not authorize automatic Git commits or pushes.

Every change to features, APIs, configuration, startup steps, or known limitations must update both `README.md` and `README.en.md` in the same change. Keep examples consistent with the implementation. Update `使用说明.md` when everyday usage changes and `.env.example` when configuration changes. This policy is also recorded in `AGENTS.md` for future developers and coding assistants.

## Enhanced chat

The draggable Xiaoxi pet opens chat. Click it or press A. Its animation, greeting, and drag behavior are shared through `assets/pet.css` and `assets/pet.js`.

- Add PNG/JPEG/WebP images with the file picker, drag/drop, or clipboard paste. Up to 3 images per message, originals ≤5 MiB each; the browser resizes to a maximum edge of 2048 pixels and ≤1 MiB per sent image. Preview or remove before sending. Image-only questions get a default explanation prompt.
- The latest 12 context messages may contain up to 6 images total; start or clear a conversation when over the limit. With archives enabled, images persist locally in IndexedDB and survive reload. Otherwise images remain in page memory and expire on reload. The server does not archive uploaded images.
- Markdown headings, lists, quotes, tables, code, and `$…$`, `$$…$$`, `\\(...\\)`, `\\[...\\]` math are rendered locally. Wide content scrolls horizontally. Invalid math remains readable source. Raw HTML is escaped, remote Markdown images do not load, and unsafe links are removed.
- Streaming supports Stop. Partial answers remain visibly incomplete after cancellation, timeouts, or failures. Retry regenerates only the latest failed/stopped request using its frozen page and attachments, without duplicating the user message. No automatic continuation or paid retries.
- Copy raw Markdown or code, export the conversation without image bytes, expand the reading panel, pause automatic scrolling while reading older content, return to latest, and click valid slide citations. Citations are model-generated, not independently verified.
- Context is frozen at send time even if the reader navigates during generation. Offline slides still work; chat needs the backend. Browser renderers are vendored, with no runtime CDN.
- Stop aborts the browser connection; the backend closes the upstream transport after detecting disconnection. Connecting requests or provider-side work may continue temporarily; immediate billing cancellation is not guaranteed. Upstream image/SSE compatibility requires real testing, with no silent model/provider substitution.

### API additions

Legacy `POST /api/chat` JSON requests remain valid. Optional fields: `images: [{dataUrl:"data:image/png;base64,...",name:"example.png"}]` and `stream:true`. History items may include images in the same format, `imageCount`, and `status` (complete / stopped / error). Browser image IDs are internal; the server receives actual image blocks, not local URLs.

Streaming returns `application/x-ndjson`: `start` (model), `delta` (text), `ping`, `done` (model), or `error` (error), one JSON object per line. Only done marks success. Health images/stream flags describe proxy support, not proven upstream capability.

### Files and testing

Shared components: `assets/chat.js` and `assets/chat.css`. Vendored dependencies: marked 18.0.13, DOMPurify 3.4.15, MathJax 3.2.2, with licenses in `assets/vendor/`. Python image validation requirements are in `requirements.txt`; use a virtual environment. The launcher prefers the project's `.venv/bin/python`.

Run `python3 -m unittest discover -s tests -v` for backend tests. Browser checks should cover all math delimiters, matrices, code, XSS, image preview/removal/expiry, stop/retry, citations, and narrow screens. The Diffusion example stays outside the repository and release bundle.
