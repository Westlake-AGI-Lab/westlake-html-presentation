# Testing

Use `python3 westlake.py test` or installed `westlake-ppt test`. The default runs all Python `unittest` files plus the existing Node archive, localization and geometry checks. Missing Node is a failure, not a silent skip. `--suite python` explicitly limits the run to Python.

`--suite browser` starts an isolated ephemeral server with a disposable teacher password, no provider key and temporary classroom data, then invokes the existing Node Playwright checks for region selection, highlights, personal slides and improvements. Install Node Playwright and Chrome before using it. `--suite all` runs both groups. Browser tests were retained instead of rewritten so this migration changes fewer test assumptions.

Browser controls can also be checked manually: source navigation, desktop/mobile geometry, play/pause/reset, precise eigenvector presets, direct practice entry and hint gating. Automated tests do not prove real-model accuracy or learning gains.

Research checks cover known kappa cases, abstention coverage, false-understood counts, dataset consent declarations, duplicate identifiers, private output boundaries and prompt hashes. Prompt changes require updating the manifest and reporting the new hash, rather than silently claiming the old version.

For syntax only: `python3 -m compileall -q src tests`. The tests run with isolated private configuration. Do not point browser tests at a production classroom.

## Local Migration Check: 2026-10-05

Before relocation, 44 Python tests and 7 Node checks passed. After relocation and the new research checks, 51 Python tests and the same 7 Node checks passed. Editable package installation and the installed CLI's synthetic agreement experiment also passed. The suite requires permission to bind temporary localhost ports.

The installed eigen demo was checked through the browser at desktop and mobile widths: exact projection presets, animation, opening a slide-linked question, two written attempts, staged hints, and the final explanation. The explanation stayed disabled until the required steps were completed. The full four-script Node browser suite was not executed in this migration session. No real provider assessment, student study or remote deployment was tested.
