"""Server configuration. Environment values take precedence over private JSON."""
from dataclasses import dataclass, field
from functools import lru_cache
import ipaddress
import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LEGACY_DECK = '西湖大学专属HTML演示模板.html'


@dataclass(frozen=True)
class Settings:
    web_root: Path
    deck_name: str
    deck_id: str
    config_path: Path
    host: str
    port: int
    model: str
    api_base: str
    max_output_tokens: int
    allowed_networks: tuple
    allowed_hosts: frozenset
    request_limits: tuple
    classroom_directory: Path
    teacher_password: str = field(repr=False)


@lru_cache(maxsize=1)
def settings():
    config = Path(os.environ.get('PPT_CONFIG_PATH', str(Path.home()/'.config/westlake-ppt-agent/config.json'))).expanduser()
    if config.exists():
        private = json.loads(config.read_text(encoding='utf-8'))
        for name in ('OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_API_BASE', 'TEACHER_PASSWORD', 'CLASSROOM_DATA_DIR'):
            if private.get(name):
                os.environ.setdefault(name, str(private[name]))
    root = PROJECT_ROOT if (PROJECT_ROOT/'web').is_dir() else Path.cwd()
    web = Path(os.environ.get('PPT_WEB_ROOT', str(root/'web'))).expanduser().resolve()
    deck = os.environ.get('PPT_DECK', 'deck.html')
    if Path(deck).name != deck or deck in ('.', '..'):
        raise ValueError('PPT_DECK must be a filename within PPT_WEB_ROOT')
    deck_id=os.environ.get('PPT_DECK_ID',root.name if web == root/'web' else web.name)
    return Settings(web, deck, deck_id, config,
                    os.environ.get('HOST','127.0.0.1'), int(os.environ.get('PORT','8765')),
                    os.environ.get('OPENAI_MODEL','gpt-5.5'), os.environ.get('OPENAI_API_BASE','https://api.openai.com/v1').rstrip('/'),
                    max(1,min(16000,int(os.environ.get('MAX_OUTPUT_TOKENS','3000')))),
                    tuple(ipaddress.ip_network(n.strip()) for n in os.environ.get('ALLOWED_NETWORKS','127.0.0.0/8,::1/128').split(',') if n.strip()),
                    frozenset(os.environ.get('ALLOWED_HOSTS','localhost,127.0.0.1,::1').split(',')),
                    tuple(max(1,int(os.environ.get(name,default))) for name,default in [('CHAT_REQUESTS_PER_HOUR','30'),('CHAT_REQUESTS_PER_DAY','200'),('CHAT_MAX_CONCURRENT','2')]),
                    Path(os.environ.get('CLASSROOM_DATA_DIR',str(Path.home()/'.local/share/westlake-ppt'/deck_id))),
                    os.environ.get('TEACHER_PASSWORD',''))


def api_key():
    return os.environ.get('OPENAI_API_KEY','').strip()


def study_settings():
    ref=os.environ.get('LEARNING_STUDY_APPROVAL','').strip()
    info=os.environ.get('LEARNING_STUDY_INFO','').strip()
    return {'enabled':bool(ref and info.startswith('https://')),'approval':ref,'information':info}
