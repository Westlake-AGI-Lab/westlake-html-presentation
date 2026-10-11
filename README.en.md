# Westlake HTML Presentation

[中文](README.md) | [User guide](docs/user-guide.md)

The October 11 integration combines the animated eigenvector demo and Python package layout with the presentation update. Frontend files, including `presenter.html`, live in `web/`; demo generation copies the presenter and its assets too. `python3 westlake.py test --suite browser` includes the presentation checks. This integration has not been deployed to the internal Diffusion server: SSH host-key verification failed.

## Dual-screen presentation and print fixes (October 7, 2026)

Click Presenter P or press P to open the linked presenter window. Move the original slide window to the external display and press F for fullscreen. The presenter shows the current slide, next slide, notes and timer, with navigation, slide selection, timer pause/reset and playback/pause/replay/mute/seek controls for current-slide media. Video previews use static posters; playback occurs in the audience window. If autoplay is blocked, click Play in that window first. UI language stays synchronized; slide content is not translated. Independently opened HTML files do not pair automatically.

The normal audience window retains its controls. In dual-screen fullscreen, move to the top/bottom, focus a control with the keyboard or click Tools to reveal the toolbar. Closing the presenter restores normal presentation. Students and the teacher console do not offer a local presenter entry. Classroom projection can open a read-only presenter view; the teacher console remains in charge of slide changes. Random session values and window identity validate messages; no server session or AI request is added.

Contents G jumps to a slide. Mark .slide elements with data-backup="true" for backups or data-skip="true" for slides omitted from the brief route; related buttons are hidden when unconfigured. Sequential navigation, next-slide preview and End use the main route. Open backups from contents/thumbnails and use Escape or Return to main slides to restore the previous slide. Printing includes every main slide, excludes backups and is independent of the brief route.

Print finishes editing, pauses media and waits for main-slide images and fonts (up to 20 seconds); failures show a retry notice. Hidden-slide images load eagerly, videos print posters and audio prints a media label. Pages use a uniform 1600×900 canvas in 16:9. Fixes cover the cover ratio, dark section slides, desktop columns, blank animated charts and final-page breaks. Notes, chat, classroom overlays and controls are excluded. The prepared Print button is more reliable than direct Ctrl/Cmd+P. Supply a local poster image for each video.

Editing supports Escape to finish, navigation locks, plain-text paste and visible storage-failure notices. Legacy indexed text remains readable; new saves use slide/element keys and sanitize unsafe HTML. Give slides stable id or data-id values; back up edits and set data-edit-key when rearranging elements within a slide. Browser edits do not modify the source file.

Copy presenter.html and the complete assets folder with the deck, and update the backend static allowlist. Presentation, dual-screen views and printing work offline; AI and classrooms still require the existing Python service. tests/test_presentation_browser.cjs requires Playwright and Chrome and does not call paid AI.

Restored edits preserve equation containers, columns, lists, tables and safe links rather than flattening structural markup. Run `node tests/test_presentation_browser.cjs` for offline windows, media, editing and PDFs; use `PRESENTATION_TEST_URL=http://127.0.0.1:8765/ node tests/test_presentation_served.cjs` for HTTP assets, popup behavior and print-failure recovery (set `PRESENTATION_EXPECT_SLIDES=16` for the example). Playwright and Chrome are required; API calls are mocked without AI charges.

These presentation, printing and editing components were backed up and deployed to the 16-slide 4090 Diffusion example on 2026-10-07. Live linked-window and static-resource checks passed; lecture content, private configuration and classroom data were preserved. This deployment does not establish that unrelated historically pending features are live. See `tests/VERIFICATION.md` for coverage and limits.

## Local linear algebra preview

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
