#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if /usr/bin/curl --silent --fail http://127.0.0.1:8782/api/health >/dev/null; then
  open http://127.0.0.1:8782/courses.html
  exit 0
fi
workspace_output=$(mktemp -d "${TMPDIR:-/tmp}/xiaoxi-workspace.XXXXXX") || exit 1
print -- "Workspace output and isolated classroom data: $workspace_output"
(sleep 1; open http://127.0.0.1:8782/) &
if [[ -x .venv/bin/python ]]; then
  .venv/bin/python westlake.py demo courses --output "$workspace_output" --port 8782
else
  python3 westlake.py demo courses --output "$workspace_output" --port 8782
fi
