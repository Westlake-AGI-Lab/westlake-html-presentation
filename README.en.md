# Westlake University HTML Presentation · PPT Q&A Agent

[中文](README.md) | English

A lightweight browser-based slide template for teaching, research talks, and meetings in a Westlake University visual style, with an AI sidebar that answers questions about the presentation and the reader's current slide.

## 1. Background

This project combines interactions from an existing HTML presentation with a user-provided Westlake University PowerPoint meeting template. It reuses the supplied logo, navy-blue and orange visual elements, and common presentation layouts to create an editable, extensible HTML template. The goal is to support both presenting information and helping readers understand it.

The current deck has 10 example slides: cover, contents, section divider, body text, key metrics, image/text, roadmap, data, takeaway, and thanks. Text and numbers are placeholders, not research findings.

This is a custom project based on supplied materials, not an official university release or an assertion of authorization. Use and redistribution of logos, images, and other brand assets are subject to university rules and the relevant rights holders' permissions.

## 2. Features and architecture

- 16:9 slides, navigation, progress indicator, fullscreen, speaker notes, and browser printing / PDF.
- In-page text editing saved in the current browser's `localStorage`.
- AI sidebar for slide summaries, concept explanations, cross-slide connections, and follow-up questions.
- Each question includes slide text, speaker notes, the current slide number and title, and recent conversation.
- A server-side proxy calls the OpenAI Responses API or a compatible endpoint; the browser never receives the API key.

```text
HTML: deck text + notes + slide at question time + recent conversation
    ↓ POST /api/chat
Python service: validate input → bound context → compose prompt
    ↓ POST {OPENAI_API_BASE}/responses (server-side API key)
Model response → Python JSON response → sidebar
```

The frontend uses plain HTML / CSS / JavaScript. The backend uses only the Python standard library: no Node.js, npm, or pip dependencies. Content is extracted from the current DOM for every question, so browser edits can be included in the context.

The “Agent” is a presentation-aware Q&A assistant, not an autonomous tool-execution system. “All slides read” means supplying slide text with the request, not training, vector retrieval, or permanent memory. The current implementation does not inspect image pixels, perform OCR, or directly parse uploaded PPTX files. Add important image/chart information to text or notes. Instructions ask the model to cite slide numbers and label outside knowledge as supplementary explanations; answers still require human review. The default response language is Chinese, but users can request another language.

## 3. Quick start

### Slides only, without AI

Open `西湖大学专属HTML演示模板.html` directly, keeping `assets/` in its relative location. Offline presenting does not require an API key. AI Q&A requires the backend.

### Run the full application

Requirements: Python 3.9+, a modern browser, and a provider key and available model supporting the Responses API. From this project's directory, run in a macOS / Linux terminal:

```bash
export OPENAI_API_KEY="YOUR_API_KEY"
export OPENAI_MODEL="YOUR_AVAILABLE_MODEL"
export OPENAI_API_BASE="https://api.openai.com/v1"
python3 server.py
```

Windows PowerShell:

```powershell
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

On macOS, after configuring the key, double-click `启动智能PPT.command`. It uses `/usr/bin/python3` and opens the fixed address `127.0.0.1:8765`. Use the terminal method if that Python is unavailable or you need another host / port. If a health endpoint already responds at that address, the launcher opens the page without starting another server.

| Setting | Code default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | None | Required for Q&A; server-side only |
| `OPENAI_MODEL` | `gpt-5.5` | Explicitly set a model available to your account |
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | `/responses` is appended automatically |
| `HOST` | `127.0.0.1` | Local-only access by default |
| `PORT` | `8765` | Update the browser URL when changed |

`.env.example` is a reference only. The application does not automatically load `.env`; use environment variables or the private JSON file.

## 4. Presenting and editing

| Action | Control |
| --- | --- |
| Navigate | `←` / `→`, `PageUp` / `PageDown`, or navigation buttons |
| Toggle Q&A | `A` or the AI button |
| Edit text | `E` or the edit button; toggle again to finish |
| Toggle speaker notes | `N` |
| Fullscreen | `F` |
| Export PDF | Select Print, then save as PDF in the browser dialog |
| Deep-link to a slide | Append `#6`, e.g. `http://127.0.0.1:8765/#6` |

Browser edits do not modify the HTML file and will not be included in a GitHub upload. Edit the HTML source to share lasting changes. Chat uses `sessionStorage` for the current browser tab session and can be removed with the clear-conversation button. There is no server-side conversation database.

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
├── 启动智能PPT.command               # macOS launcher
├── 使用说明.md                      # Short Chinese usage guide
├── .env.example                    # Placeholder configuration
├── .gitignore
└── assets/                         # Logo and example images
```

Frontend entry points: `collectDeckContext()` extracts content, `askAgent()` submits questions, `showSlide()` updates the active slide, and `saveEdits()` persists browser edits. Backend entry points: `AGENT_INSTRUCTIONS` defines response guidance, `build_deck_context()` / `build_history()` assemble context, `call_openai()` calls the provider, and `PresentationHandler` handles HTTP.

### API contract

- `GET /api/health` → `{ "ok": true, "configured": true, "model": "..." }`. `configured` only indicates a nonempty key; it is not an upstream connectivity check.
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

Current limits: 512,000-byte request body; up to 80 slides; 10,000 text and 5,000 note characters per slide; approximately 80,000 characters for the deck; the most recent 12 history entries, approximately 20,000 characters total; and 4,000 characters per question. Excess text is truncated. Model output is capped at 1,000 tokens, with a 90-second upstream timeout. Responses are non-streaming plain text; Markdown is not rendered. Longer decks may require retrieval, chunking, or revised limits with a cost review.

### Verification and troubleshooting

```bash
python3 -m py_compile server.py
curl http://127.0.0.1:8765/api/health
```

Manual regression checks: navigation, fullscreen, editing and restoration after refresh, notes, printing, and Q&A on different slides. Confirm the current-slide label and answer references. Check missing/invalid keys and network-failure messages. Real Q&A consumes provider API usage. No automated test suite is currently included.

- Slides work but AI does not: avoid `file://`; check health, key, model, and base URL, then restart after configuration changes.
- `Address already in use`: use the existing service or choose another `PORT`; do not terminate unknown processes indiscriminately.
- 401 / 403 / 429 or model errors: check provider permissions, quota, rate limits, and supported models.
- Answers miss image information: put important information into text or notes; image understanding is not implemented.
- Source edits appear unchanged: saved browser edits may override the source; back up content before clearing relevant local storage.

## 6. Privacy, security, and GitHub sharing

Each question sends extractable deck text, including speaker notes, the current slide, and recent chat to the configured API provider. Confirm that these materials may be shared externally. Requests set `store: false`; this does not guarantee that a provider keeps no logs or retains no data. Review its policies independently.

The server is a local development tool, not a production public service. It lacks login, quotas, rate limiting, and robust multi-user isolation. Existing cross-site checks and GET static-resource restrictions do not replace production security; do not expose it directly to the public internet. Public deployment requires authentication, rate limits, HTTPS, reverse-proxy adaptations including Origin validation, request validation, sanitized logging, and review of all HTTP methods.

Before sharing:

- Commit only this project, not private configuration, real keys, chat records, or personal files.
- Review the staging area and Git history. `.gitignore` cannot remove tracked secrets; revoke and replace any exposed key.
- Confirm redistribution rights for the logo, template, and example images.
- No open-source license is currently included. The publisher should choose a code license and address brand assets separately; unrestricted reuse must not be assumed.

## 7. Maintenance policy

Every change to features, APIs, configuration, startup steps, or known limitations must update both `README.md` and `README.en.md` in the same change. Keep examples consistent with the implementation. Update `使用说明.md` when everyday usage changes and `.env.example` when configuration changes. This policy is also recorded in `AGENTS.md` for future developers and coding assistants.
