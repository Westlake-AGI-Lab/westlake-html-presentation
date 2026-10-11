"""Test orchestration; existing Node browser checks remain intact."""
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen

from .config import PROJECT_ROOT
from .cli import child_environment


def run_tests(suite):
    root=PROJECT_ROOT
    if not (root/'tests').is_dir():raise ValueError('Run tests from an editable source checkout')
    env=child_environment()
    if suite in ('unit','python','all'):
        # A test run must not load the user's private model configuration.
        with tempfile.TemporaryDirectory(prefix='westlake-tests-') as tmp:
            env.update(PPT_CONFIG_PATH=str(Path(tmp)/'absent.json'),CLASSROOM_DATA_DIR=str(Path(tmp)/'classroom'),
                       PPT_WEB_ROOT=str(root/'web'),PPT_DECK='deck.html',HOST='127.0.0.1',
                       ALLOWED_HOSTS='localhost,127.0.0.1,::1',ALLOWED_NETWORKS='127.0.0.0/8,::1/128')
            env.pop('OPENAI_API_KEY',None)
            code=subprocess.call([sys.executable,'-m','unittest','discover','-s','tests','-p','test_*.py'],cwd=root,env=env)
        if code:return code
    if suite=='python':return 0
    node=shutil.which('node')
    if not node:raise ValueError('Node.js is required for the existing frontend checks; use --suite python for Python only')
    if suite in ('unit','all'):
        code=subprocess.call([node,'--test','tests/test_archive.cjs','tests/test_i18n.cjs','tests/test_eigen_geometry.cjs'],cwd=root,env=env)
        if code:return code
    if suite in ('browser','all'):
        return run_browser_tests(node,env)
    return 0


def run_browser_tests(node,env):
    root=PROJECT_ROOT
    with tempfile.TemporaryDirectory(prefix='westlake-browser-') as tmp:
        env=env.copy();password=secrets.token_urlsafe(24)
        env.update(PPT_CONFIG_PATH=str(Path(tmp)/'absent.json'),CLASSROOM_DATA_DIR=str(Path(tmp)/'classroom'),
                   PPT_WEB_ROOT=str(root/'web'),PPT_DECK='deck.html',TEACHER_PASSWORD=password,
                   HOST='127.0.0.1',PORT='0',ALLOWED_HOSTS='localhost,127.0.0.1,::1',ALLOWED_NETWORKS='127.0.0.0/8,::1/128')
        env.pop('OPENAI_API_KEY',None)
        log_path=Path(tmp)/'server.log'
        with log_path.open('w') as log:
            server=subprocess.Popen([sys.executable,'-m','westlake_ppt','serve'],cwd=root,env=env,stdout=log,stderr=log)
            try:
                base=None
                for _ in range(100):
                    if server.poll() is not None:raise ValueError('Isolated browser-test server did not start')
                    for line in log_path.read_text().splitlines():
                        if line.startswith('Westlake HTML presentation: '):base=line.split(': ',1)[1]
                    if base:break
                    time.sleep(.05)
                if not base:raise ValueError('Timed out starting browser-test server')
                with urlopen(base+'/api/health',timeout=5) as response:response.read()
                for prefix,name in [('REGION','region'),('HIGHLIGHTS','highlights'),('PERSONAL_SLIDES','personal_slides'),('IMPROVEMENT','improvements')]:
                    env[prefix+'_TEST_URL']=base+'/' if prefix in ('REGION','PERSONAL_SLIDES') else base
                    env[prefix+'_TEST_OUTPUT']=str(root/'results/browser'/name)
                env['IMPROVEMENT_TEST_PASSWORD']=password
                for name in ('region','highlights','personal_slides','improvements'):
                    code=subprocess.call([node,f'tests/test_{name}.cjs'],cwd=root,env=env)
                    if code:return code
                return 0
            finally:
                server.terminate()
                try:server.wait(timeout=5)
                except subprocess.TimeoutExpired:server.kill();server.wait()
