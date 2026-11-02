# API Contracts

Packaging retains the existing routes; visual Socratic practice adds the route below.

- `GET /api/health`: availability, model name and configured status; no secret values.
- `POST /api/chat`: question, slide text/notes, current slide, bounded history and optional image attachments. `language` is `zh` or `en`; legacy omission defaults to Chinese. `stream: true` returns NDJSON start/delta/done/error events; otherwise returns JSON.
- `POST /api/personal-slides`: generates up to three draft explanatory slides using current and preceding context, validates citations and omits future slides/history.
- `/api/classroom/*`: anonymous room membership, teacher-authenticated management, reactions and teacher-only questions. Teacher login uses an HttpOnly, SameSite cookie; membership uses classroom headers.
- `/api/classroom/improvement-*`: consented question grouping, teacher-reviewed draft supplements and downloadable approved artifacts.
- `POST /api/learning`: catalogue, start, attempt, hint, explain, forget, share, withdrawal and research actions. Private practice stays in memory. Sharing requires membership and explicit consent.
- `/api/classroom/learning-*`: teacher-only catalogue editing, extraction, publication, summaries and research export.

Requests enforce the existing Host/network/origin rules and size limits. POST bodies are JSON. Structured model output is validated before use; arbitrary model feedback prose is discarded in concept practice. `tests/test_server.py`, `test_learning.py` and `test_improvements.py` are executable examples of contracts and rejection paths.

The former Chinese deck URL is an alias for the configured deck. Neither `/src/`, `/data/`, `/results/`, configuration files nor Python sources are public assets.

## Visual Socratic practice
`POST /api/socratic` accepts `start`, `attempt`, `explain`, `forget`. Start takes `language` (`en`/`zh`) and `source` (`id`, `page`, `title`, `text`, `image.dataUrl`); later actions use the returned `session` and `revision`, with `answer` for attempts. Limits: same-origin and existing Host/network/request/concurrency rules, 2 MiB body, one validated image (PNG/JPEG/WebP, ≤2048 pixels and ≤1 MiB), 100 in-memory sessions, 30-minute expiry, 8 accepted attempts/session, 4,000 characters/attempt, 100 saved browser records. Start and each accepted attempt use three sequential model calls; the existing request budget counts the HTTP transaction, not those individual model calls. No extra model credentials or configuration keys are added. Configure a vision-capable provider to use the feature; the isolated preview does not load the private provider config file, but retains explicitly supplied environment credentials. Legacy reviewed-bank `/api/learning` remains for compatibility and teacher tools; its static hints are not used by the new student Practice entry.


Every displayed question passes a separate prompted model check; this is not a guarantee against model error or answer disclosure. No source is fetched from a remote URL. Registered PDF pixels are selected by catalog identifiers, while HTML practice uses explicitly labeled browser snapshots.


### University model switching

`POST /api/university/model` accepts `{"model":"Qwen"}` (or configured `deepseek-flash` / `glm-flash`) with the existing HttpOnly student session and same-origin JSON requirements. No Private Token is accepted or returned by this action. The server reuses the session credential for a completed non-streaming inference probe (`max_tokens: 16`), then updates only that session's active model. Success returns connected/model/expiresAt without rotating the cookie or extending expiry. Validation failure leaves the previous model unchanged; expired/disconnected sessions cannot activate a model. Student and global request limits apply; overlapping requests are rejected.
