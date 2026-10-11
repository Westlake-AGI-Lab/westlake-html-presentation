# Configuration

`src/westlake_ppt/config.py` owns server settings. Environment values take precedence over the private JSON file selected by `PPT_CONFIG_PATH`; the default is `~/.config/westlake-ppt-agent/config.json`. Only the established API/model/classroom keys are loaded from that JSON. `.env.example` is a reference, not an automatically loaded file.

- Provider: `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.5`), `OPENAI_API_BASE` (Responses-compatible base URL), `MAX_OUTPUT_TOKENS` (default 3000).
- Bind/access: `HOST` (127.0.0.1), `PORT` (8765), `ALLOWED_HOSTS`, `ALLOWED_NETWORKS`. Never rely on forwarded headers for authorization.
- Quotas: `CHAT_REQUESTS_PER_HOUR` (30), `CHAT_REQUESTS_PER_DAY` (200), `CHAT_MAX_CONCURRENT` (2). Process-local; not monetary caps.
- Classroom: `TEACHER_PASSWORD`, `CLASSROOM_DATA_DIR`. Use `configure_classroom.py` to initialize private files without printing credentials.
- Web: `PPT_WEB_ROOT` (checkout `web/`), `PPT_DECK` (`deck.html`), `PPT_DECK_ID`. The deck must be a filename within the selected directory. Keep the former deck ID when relocating persisted classroom data.
- Research: `LEARNING_STUDY_APPROVAL` and HTTPS `LEARNING_STUDY_INFO`. Both are required to expose opt-in research controls; supplying values is not institutional approval.

CLI `serve --web-root`, `--deck`, `--host` and `--port` set the corresponding environment values before importing the server. Configure credentials before startup; restart after changing settings. Never put a real key, password or student response into an example, issue or commit.
