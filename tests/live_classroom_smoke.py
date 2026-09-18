"""Authorized LAN smoke test; reads the private password without printing it. No AI calls."""
import argparse
import concurrent.futures
import http.cookiejar
import json
from pathlib import Path
import time
from urllib.request import Request,build_opener,HTTPCookieProcessor,urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError
import uuid

p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--base',default='http://127.0.0.1:8765');p.add_argument('--keep-room',action='store_true');p.add_argument('--cleanup-room');a=p.parse_args()
teacher=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(action,data=None,token='',query=None,admin=False):
    headers={'Origin':a.base,'Content-Type':'application/json'}
    if token:headers['X-Classroom-Token']=token
    req=Request(a.base+'/api/classroom/'+action+('?' + urlencode(query) if query else ''),data=json.dumps(data).encode() if data is not None else None,headers=headers)
    with (teacher.open(req,timeout=15) if admin else urlopen(req,timeout=15)) as r:return json.load(r)
password=json.loads(Path(a.config).read_text())['TEACHER_PASSWORD']
call('login',{'password':password},admin=True);del password
if a.cleanup_room:
    state=call('state',query={'room':a.cleanup_room,'teacher':'1'},admin=True)
    assert state['title']=='Deployment verification / 部署验证'
    call('control',{'room':a.cleanup_room,'op':'delete'},admin=True)
    print('Disposable verification classroom removed.');raise SystemExit
room=call('create',{'title':'Deployment verification / 部署验证'},admin=True)['room']
def control(op,**data):return call('control',dict(room=room,op=op,**data),admin=True)
try:
    tokens=[call('join',{'room':room})['token'] for _ in range(50)]
    token=tokens[0]
    data={'room':room,'requestId':str(uuid.uuid4())}
    call('like',data,token);assert call('like',data,token)['duplicate']
    try:call('control',dict(room=room,op='end'),token)
    except HTTPError as e:assert e.code==401
    else:raise AssertionError('Student escalated privileges')
    control('danmaku',enabled=True)
    call('danmaku',dict(room=room,requestId=str(uuid.uuid4()),text='Live test / 实时测试'),token)
    control('page',page=2)
    def poll(t):
        for _ in range(3):assert call('state',token=t,query={'room':room})['page']==2
    started=time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:list(pool.map(poll,tokens))
    elapsed=time.monotonic()-started
    state=call('state',query={'room':room,'teacher':'1'},admin=True)
    assert state['online']==50 and state['likeCounts']['1']==1
    control('danmaku',enabled=False)
    assert not call('state',token=token,query={'room':room})['danmaku']
    control('danmaku',enabled=True)
    print(json.dumps({'ok':True,'room':room,'members':50,'http_polls':150,'seconds':round(elapsed,3),'ai_calls':0}))
finally:
    if not a.keep_room:control('delete')
