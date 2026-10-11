# Architecture

```text
pyproject.toml
src/westlake_ppt/
  cli.py                 serve / demo / test / eval / dataset / prompts
  config.py              environment + private JSON configuration
  server/                HTTP orchestration, static inventory, request budgets
  llm/                   validated request construction and model transport
  classroom/             classroom state, improvements, concept practice
  prompts/               named versioned text resources + SHA-256 manifest
  demos/                 isolated determinant and eigenvector runners
  validation.py          shared JSON and field validation
  research.py            consent declarations, dataset schema and agreement metrics
  testing.py             Python-driven test orchestration
web/deck.html            generic ASCII-named presentation
web/assets/              frontend and local vendor bundles
experiments/             one shallow folder per experiment
data/                    ignored except README
results/                 ignored experiment outputs
docs/                    current documentation; history/ holds old snapshots
tests/                   Python checks and existing Node checks
deploy/                  systemd example
```

Root `server.py`, `classroom.py`, `improvements.py`, `learning.py` and demo scripts are compatibility shims, not second implementations. `westlake.py` supports a checkout without installing the console entry point. The frontend remains HTML/JS; URLs such as `/assets/chat.js` are unchanged even though files moved under `web/`.

HTTP handlers enforce access restrictions and invoke domain services. LLM request building validates user input; transport owns Responses requests and bounded streaming. Both classroom practice and lecture improvements share JSON validation. Prompts are loaded through `importlib.resources`; experiments can fingerprint exact bytes. Published prompt hashes deliberately make prompt edits reviewable.

## Contracts And Limits

Classroom and practice accept injected generation callbacks, so their tests do not need a provider. Student catalogues exclude private hints, solutions and criteria. Server-side source revisions and catalogue versions detect stale work. Public files are inventoried explicitly, never exposed by listing an arbitrary directory.

This remains a single-process server with SQLite persistence and memory-only sessions, rate budgets, presence and attempts. Packaging does not make it horizontally scalable or stateless. A multi-worker deployment requires deliberate shared-state and authorization design; no Redis, queue or microservice layer has been added speculatively.

Request logs and experiment manifests provide existing operational evidence without recording chat bodies or credentials. Successful classroom polls are suppressed. Distributed tracing, dashboards and durable cross-worker budgets are not implemented.

## Review Boundaries

The migration can be reviewed as four groups: packaging/configuration/web paths; prompt and validation extraction; test/experiment tooling; documentation/deployment examples. Existing runtime behavior and prompt text are preserved. New research tools operate offline and do not change classroom collection defaults.
