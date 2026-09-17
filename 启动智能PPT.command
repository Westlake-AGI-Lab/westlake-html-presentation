#!/bin/zsh
cd -- "${0:A:h}"
if /usr/bin/curl --silent --fail http://127.0.0.1:8765/api/health >/dev/null; then
  open http://127.0.0.1:8765
  exit 0
fi
(sleep 1; open http://127.0.0.1:8765) &
if [[ -x .venv/bin/python ]]; then
  .venv/bin/python server.py
else
  /usr/bin/python3 server.py
fi
