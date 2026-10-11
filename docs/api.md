# API Contracts

Routes remain unchanged by packaging.

- `GET /api/health`: availability, model name and configured status; no secret values.
- `POST /api/chat`: question, slide text/notes, current slide, bounded history and optional image attachments. `language` is `zh` or `en`; legacy omission defaults to Chinese. `stream: true` returns NDJSON start/delta/done/error events; otherwise returns JSON.
- `POST /api/personal-slides`: generates up to three draft explanatory slides using current and preceding context, validates citations and omits future slides/history.
- `/api/classroom/*`: anonymous room membership, teacher-authenticated management, reactions and teacher-only questions. Teacher login uses an HttpOnly, SameSite cookie; membership uses classroom headers.
- `/api/classroom/improvement-*`: consented question grouping, teacher-reviewed draft supplements and downloadable approved artifacts.
- `POST /api/learning`: catalogue, start, attempt, hint, explain, forget, share, withdrawal and research actions. Private practice stays in memory. Sharing requires membership and explicit consent.
- `/api/classroom/learning-*`: teacher-only catalogue editing, extraction, publication, summaries and research export.

Requests enforce the existing Host/network/origin rules and size limits. POST bodies are JSON. Structured model output is validated before use; arbitrary model feedback prose is discarded in concept practice. `tests/test_server.py`, `test_learning.py` and `test_improvements.py` are executable examples of contracts and rejection paths.

The former Chinese deck URL is an alias for the configured deck. Neither `/src/`, `/data/`, `/results/`, configuration files nor Python sources are public assets.
