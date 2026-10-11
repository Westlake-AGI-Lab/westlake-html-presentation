# Westlake HTML Presentation

[中文](README.md) | [User guide](docs/user-guide.md)

An HTML lecture workspace with source-grounded conceptual practice: teacher-reviewed questions, written attempts, staged hints and optional concept summaries. It also supports presentation Q&A, classroom interaction and a browser-local learning archive. Model judgments are not grades or validated mastery scores.

## Quick Start

Python 3.10+ is required. From this checkout:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/westlake-ppt serve
```

Open `http://127.0.0.1:8765`. Configure provider credentials server-side for AI calls; see [configuration](docs/configuration.md). The default is localhost only. The repository's `web/` directory contains the generic deck and frontend; an installed package used elsewhere needs `serve --web-root /path/to/web`. macOS: `launch.command`. Former Python entry points and the Chinese launcher remain compatible.

## Demo And Development

```sh
python3 westlake.py demo eigen --output /tmp/xiaoxi-eigen-demo --port 8782
python3 westlake.py test
python3 westlake.py eval assessment_agreement --smoke
python3 westlake.py prompts
```

The demo output directory must be empty. It contains 16 English linear-algebra slides, animated vector geometry and five practice concepts. Its offline assessor always returns `uncertain`; it does not evaluate a real model. Teacher demo password: `local-demo`. The test command runs Python and Node unit checks; optional browser checks require Node Playwright and Chrome. Synthetic experiment smoke results are not research findings.

## Documentation

- [Architecture and layout](docs/architecture.md), [API](docs/api.md), [configuration](docs/configuration.md)
- [Classroom and practice](docs/classroom.md), [privacy and security](docs/privacy.md)
- [Testing](docs/testing.md), [deployment and compatibility](docs/deployment.md), [deployment log](docs/deployment-log.md)
- [Research requirements and status](docs/research.md), [experiments](experiments/README.md), [demo readiness](docs/DEMO_READINESS.md)

Private data, results, credentials and the separately maintained Diffusion deck do not belong in Git. Research collection and public data release need their own consent and applicable ethics approval/exemption. No study results, acceptance, award or official university authorization are claimed. Supplied brand assets remain subject to their owners' permissions. Maintenance rules are in [AGENTS.md](AGENTS.md).
