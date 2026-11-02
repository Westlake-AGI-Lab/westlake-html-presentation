#!/usr/bin/env python3
"""Start the complete localhost workspace with private, generated demo accounts."""
import argparse
import json
import os
from pathlib import Path
import secrets
import sys


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8784)
    parser.add_argument('--data-dir', type=Path,
                        default=Path.home() / '.local/share/westlake-workspace-demo')
    args = parser.parse_args()
    private = args.data_dir.expanduser().resolve()
    if private.is_relative_to(root):
        parser.error('--data-dir must be outside the repository')
    private.mkdir(parents=True, exist_ok=True, mode=0o700)
    access = private / 'demo-access.json'
    if not access.exists():
        values = {'student_password': secrets.token_urlsafe(20),
                  'teacher_password': secrets.token_urlsafe(20)}
        with os.fdopen(os.open(access, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
            json.dump(values, stream)
    credentials = json.loads(access.read_text())
    # Isolate this demo from the operator's existing configuration and credentials.
    os.environ.update(HOST='127.0.0.1', PORT=str(args.port),
                      PPT_CONFIG_PATH=str(private / 'operator-config.json'),
                      PPT_WEB_ROOT=str(root / 'web'), PPT_DECK='deck.html',
                      CLASSROOM_DATA_DIR=str(private / 'classroom'),
                      WORKSPACE_AUTH_DB=str(private / 'accounts.sqlite3'))
    sys.path.insert(0, str(root / 'src'))
    from westlake_ppt.auth import Accounts
    from westlake_ppt.teaching import Teaching
    accounts = Accounts(private / 'accounts.sqlite3')
    accounts.seed(credentials['student_password'], credentials['teacher_password'])
    Teaching(accounts, root / 'web').seed(mock=True)
    print(f'Demo accounts: DEMO2026 (student), 202400000 (teacher). Passwords: {access}', flush=True)
    print(f'Open http://127.0.0.1:{args.port}/courses.html', flush=True)
    from westlake_ppt.server.app import main as serve
    serve()


if __name__ == '__main__':
    main()
