"""Named prompt resources; hashes identify the exact text used by a run."""
import hashlib
from importlib.resources import files
import json


def load_prompt(name):
    if '/' in name or '\\' in name or not name.endswith('.txt'):
        raise ValueError('Use a named prompt file')
    return files(__package__).joinpath(name).read_text(encoding='utf-8')


def prompt_manifest():
    names = json.loads(files(__package__).joinpath('manifest.json').read_text())['sha256']
    return {name: hashlib.sha256(load_prompt(name).encode()).hexdigest() for name in sorted(names)}
