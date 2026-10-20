"""Optional local C++ via a pinned Runno WASI toolchain; never execute native student binaries."""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import threading
import time

_LOCK = threading.BoundedSemaphore(1)
_RECENT = []
_GATE = threading.Lock()
ROOT = Path(__file__).resolve().parents[2]


def status():
    node = os.environ.get('CPP_RUNNER_NODE') or shutil.which('node')
    script = ROOT / 'tools/cpp-runner/runner.mjs'
    package = script.parent / 'node_modules/@runno/sandbox/package.json'
    enabled = os.environ.get('CPP_RUNNER_ENABLED') == '1'
    return dict(enabled=bool(enabled and node and script.is_file() and package.is_file()),
                engine='Local Clang / WebAssembly', external=False)


def run(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get('code'), str):
        raise ValueError('A C++ program is required.')
    code, stdin = payload['code'], payload.get('stdin', '')
    if not 1 <= len(code.encode()) <= 24000 or not isinstance(stdin, str) or len(stdin.encode()) > 4000:
        raise ValueError('Limit: 24 KB of source and 4 KB of input.')
    if not status()['enabled']:
        return 503, dict(error='Local C++ is not enabled. Install the optional runner and set CPP_RUNNER_ENABLED=1.')
    with _GATE:
        now = time.monotonic()
        _RECENT[:] = [t for t in _RECENT if now - t < 60]
        if len(_RECENT) >= 12:
            return 429, dict(error='Please wait a minute before running more programs.')
        _RECENT.append(now)
    if not _LOCK.acquire(blocking=False):
        return 429, dict(error='The compiler is busy. Try again shortly.')
    try:
        node = os.environ.get('CPP_RUNNER_NODE') or shutil.which('node')
        # No API keys, home path, server credentials, host files or network capabilities are
        # supplied to the WASI guest. Only the program and stdin enter its virtual filesystem.
        env = {'PATH': '/usr/bin:/bin', 'NODE_NO_WARNINGS': '1'}
        script = ROOT / 'tools/cpp-runner/runner.mjs'
        with subprocess.Popen([node, '--max-old-space-size=384', '--wasm-max-mem-pages=4096', str(script)],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                              env=env, cwd=script.parent, start_new_session=True) as proc:
            try:
                output, _ = proc.communicate(json.dumps(dict(code=code, stdin=stdin)).encode(), timeout=18)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.communicate()
                return 200, dict(kind='timeout', stdout='', stderr='Compilation or execution exceeded the time limit.')
            if proc.returncode or len(output) > 100000:
                return 200, dict(kind='error', stdout='', stderr='The program exceeded compiler resources or the compiler stopped.')
            result = json.loads(output)
            return 200, {k: result[k] for k in ('kind', 'stdout', 'stderr', 'exitCode') if k in result}
    finally:
        _LOCK.release()
