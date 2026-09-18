#!/usr/bin/env python3
"""Initialize private classroom settings without printing credentials or changing API settings."""
import argparse
import json
import os
from pathlib import Path
import secrets

parser=argparse.ArgumentParser()
parser.add_argument('--config',required=True)
parser.add_argument('--data-dir',required=True)
parser.add_argument('--access-file',required=True)
args=parser.parse_args()
config=Path(args.config).expanduser();config.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
data=json.loads(config.read_text()) if config.exists() else {}
if not data.get('TEACHER_PASSWORD'):data['TEACHER_PASSWORD']=secrets.token_urlsafe(24)
data['CLASSROOM_DATA_DIR']=str(Path(args.data_dir).expanduser().resolve())
Path(data['CLASSROOM_DATA_DIR']).mkdir(parents=True,exist_ok=True,mode=0o700)
for path,content in [(config,json.dumps(data,ensure_ascii=False,indent=2)),(Path(args.access_file).expanduser(),'Teacher password / 教师口令:\n'+data['TEACHER_PASSWORD']+'\nKeep private. Do not share with students. / 请勿向学生分享。\n')]:
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    with os.fdopen(fd,'w') as f:f.write(content)
    os.chmod(path,0o600)
print('Private classroom configuration initialized; credentials were not printed.')
