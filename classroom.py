"""LAN classroom state. Only explicitly shared AI questions are retained."""
import collections
import contextlib
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import threading
import time


class ClassroomError(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message


class Classroom:
    def __init__(self, directory, password, deck_id, titles):
        directory = Path(directory).expanduser()
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = directory / 'classroom.sqlite3'
        self.password, self.deck_id, self.titles = password, deck_id, titles
        self.lock = threading.RLock()
        self.sessions, self.presence, self.events, self.rates = {}, {}, {}, {}
        self.boot = secrets.token_hex(12)
        with self.db() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, title TEXT, deck TEXT,
                page INTEGER, ended REAL, created REAL, likes INTEGER, danmaku INTEGER,
                version INTEGER, epoch INTEGER);
            CREATE TABLE IF NOT EXISTS members(token TEXT PRIMARY KEY, room TEXT, id TEXT, muted INTEGER);
            CREATE TABLE IF NOT EXISTS feedback(room TEXT, member TEXT, page INTEGER, kind TEXT, at REAL,
                PRIMARY KEY(room,member,page));
            CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY, room TEXT, member TEXT, page INTEGER,
                kind TEXT, text TEXT, at REAL, answered INTEGER, deleted INTEGER);
            CREATE TABLE IF NOT EXISTS likes(room TEXT, page INTEGER, count INTEGER, PRIMARY KEY(room,page));
            CREATE TABLE IF NOT EXISTS requests(room TEXT, member TEXT, id TEXT, at REAL,
                PRIMARY KEY(room,member,id));
            CREATE TABLE IF NOT EXISTS improvement_questions(id TEXT PRIMARY KEY, room TEXT,
                member TEXT, request TEXT, page INTEGER, revision TEXT, text TEXT, at REAL,
                UNIQUE(room,member,request));
            CREATE TABLE IF NOT EXISTS improvement_reports(id TEXT PRIMARY KEY, room TEXT,
                revision TEXT, payload TEXT, created REAL, sample INTEGER);
            CREATE TABLE IF NOT EXISTS improvement_drafts(id TEXT PRIMARY KEY, room TEXT,
                revision TEXT, report TEXT, payload TEXT, status TEXT, html TEXT, created REAL);
            CREATE INDEX IF NOT EXISTS improvement_question_room ON improvement_questions(room,revision,at);
            ''')
            db.execute('UPDATE rooms SET danmaku=0,epoch=epoch+1,version=version+1 WHERE deck=?',(self.deck_id,))
            self.cleanup(db)
        os.chmod(self.path, 0o600)

    @contextlib.contextmanager
    def db(self):
        with self.lock:
            db = sqlite3.connect(self.path, timeout=10)
            db.row_factory = sqlite3.Row
            try:
                with db:
                    yield db
            finally:
                db.close()

    def cleanup(self, db):
        for row in db.execute('SELECT code FROM rooms WHERE ended IS NOT NULL AND ended<?', (time.time()-30*86400,)).fetchall():
            self.delete(db, row['code'])
        db.execute('DELETE FROM requests WHERE at<?', (time.time()-86400,))

    def delete(self, db, code):
        for table in ('feedback','posts','likes','requests','members',
                      'improvement_questions','improvement_reports','improvement_drafts'):
            db.execute(f'DELETE FROM {table} WHERE room=?', (code,))
        db.execute('DELETE FROM rooms WHERE code=?', (code,))
        self.events.pop(code, None)

    def limit(self, key, maximum, seconds):
        now = time.time()
        self.rates = {k:v for k,v in self.rates.items() if v and v[-1]>now-3600}
        queue = self.rates.setdefault(key, collections.deque())
        while queue and queue[0] <= now-seconds:
            queue.popleft()
        if len(queue) >= maximum:
            raise ClassroomError(429, 'Too frequent; please try later / 操作频繁，请稍后重试')
        queue.append(now)

    def teacher(self, token):
        self.sessions = {k:v for k,v in self.sessions.items() if v>time.time()}
        return token in self.sessions

    def require_teacher(self, token):
        if not self.teacher(token):
            raise ClassroomError(401, 'Teacher login required / 请教师登录')

    def member(self, db, token, room):
        member = db.execute('SELECT * FROM members WHERE token=? AND room=?', (hashlib.sha256(token.encode()).hexdigest(),room)).fetchone()
        if not member:
            raise ClassroomError(403, 'Join this classroom first / 请先加入此课堂')
        return member

    def room(self, db, code):
        row = db.execute('SELECT * FROM rooms WHERE code=?', (code,)).fetchone()
        if not row:
            raise ClassroomError(404, 'Classroom not found / 课堂不存在')
        if row['deck'] != self.deck_id:
            raise ClassroomError(409, 'Presentation changed / 稿件已更换')
        return row

    def page(self, value):
        if type(value) is not int or not 1 <= value <= len(self.titles):
            raise ClassroomError(400, 'Invalid slide / 页码无效')
        return value

    def text(self, value, maximum):
        if not isinstance(value,str) or not value.strip() or len(value.strip())>maximum:
            raise ClassroomError(400, f'Text must contain 1–{maximum} characters / 文字长度须为 1–{maximum}')
        return value.strip().replace('\x00','')

    def event(self, code, kind, page, **data):
        stream = self.events.setdefault(code, {'seq':0,'items':collections.deque(maxlen=200)})
        stream['seq'] += 1
        stream['items'].append(dict(id=stream['seq'],kind=kind,page=page,at=time.time(),**data))

    def state(self, db, room, teacher=False, member=None, since=0, boot=''):
        code=room['code']; now=time.time()
        self.presence={k:v for k,v in self.presence.items() if v>now-30}
        stream=self.events.get(code, {'seq':0,'items':[]})
        result=dict(room)
        result.update(titles=self.titles,boot=self.boot,cursor=stream['seq'],online=sum(k[0]==code for k in self.presence),
            likeCounts={str(r['page']):r['count'] for r in db.execute('SELECT * FROM likes WHERE room=?',(code,))},
            events=[e for e in stream['items'] if e['id']>since and e['at']>now-3 and e['page']==room['page']] if boot==self.boot and since>=0 else [])
        if teacher:
            result['feedback']=[dict(r) for r in db.execute('SELECT * FROM feedback WHERE room=?',(code,))]
            for feedback in result['feedback']:
                feedback['online']=(code,feedback['member']) in self.presence
            result['posts']=[dict(r) for r in db.execute('SELECT * FROM posts WHERE room=? AND deleted=0 ORDER BY at DESC LIMIT 300',(code,))]
        elif member:
            result['muted']=bool(member['muted'])
            result['myFeedback']=[dict(r) for r in db.execute('SELECT page,kind,at FROM feedback WHERE room=? AND member=?',(code,member['id']))]
        return result

    def get(self, action, params, teacher_token, member_token):
        with self.db() as db:
            self.cleanup(db)
            if action == 'rooms':
                self.require_teacher(teacher_token)
                return {'rooms':[dict(r) for r in db.execute('SELECT * FROM rooms WHERE deck=? ORDER BY created DESC',(self.deck_id,))], 'titles':self.titles}
            code=params.get('room',''); room=self.room(db,code)
            is_teacher=self.teacher(teacher_token) and params.get('teacher')=='1'
            member=None
            if not is_teacher:
                member=self.member(db,member_token,code)
                if params.get('role')!='project':
                    self.presence[(code,member['id'])]=time.time()
            if action=='export':
                self.require_teacher(teacher_token)
                return {'room':dict(room),'feedback':[dict(r) for r in db.execute('SELECT * FROM feedback WHERE room=?',(code,))],
                    'posts':[dict(r) for r in db.execute('SELECT * FROM posts WHERE room=? AND deleted=0',(code,))],
                    'likes':[dict(r) for r in db.execute('SELECT * FROM likes WHERE room=?',(code,))]}
            if action!='state':
                raise ClassroomError(404,'Unknown endpoint')
            try: since=int(params.get('since','-1'))
            except ValueError: since=-1
            return self.state(db,room,is_teacher,member,since,params.get('boot',''))

    def post(self, action, data, teacher_token='', member_token='', address=''):
        with self.db() as db:
            self.cleanup(db)
            if action=='login':
                self.limit(('login',address),8,300)
                candidate=data.get('password','')
                if not self.password:
                    raise ClassroomError(503,'Teacher password is not configured / 未配置教师口令')
                if not isinstance(candidate,str) or not hmac.compare_digest(candidate.encode(),self.password.encode()):
                    raise ClassroomError(401,'Invalid password / 口令错误')
                token=secrets.token_urlsafe(32);self.sessions[token]=time.time()+12*3600
                return {'ok':True,'_cookie':token}
            if action=='logout':
                self.sessions.pop(teacher_token,None)
                return {'ok':True,'_cookie':''}
            if action=='create':
                self.require_teacher(teacher_token)
                self.limit(('create',teacher_token),10,60)
                code=''.join(secrets.choice('23456789ABCDEFGHJKLMNPQRSTUVWXYZ') for _ in range(6))
                while db.execute('SELECT 1 FROM rooms WHERE code=?',(code,)).fetchone():
                    code=''.join(secrets.choice('23456789ABCDEFGHJKLMNPQRSTUVWXYZ') for _ in range(6))
                title=self.text(data.get('title'),100)
                db.execute('INSERT INTO rooms VALUES(?,?,?,?,?,?,?,?,?,?)',(code,title,self.deck_id,1,None,time.time(),1,0,1,0))
                return {'room':code}
            if action=='join':
                self.limit(('join',address),100,60)
                code=str(data.get('room','')).upper();room=self.room(db,code)
                if room['ended']:
                    raise ClassroomError(409,'Classroom ended / 课堂已结束')
                token=secrets.token_urlsafe(32)
                db.execute('INSERT INTO members VALUES(?,?,?,0)',(hashlib.sha256(token.encode()).hexdigest(),code,secrets.token_hex(8)))
                return {'token':token,'room':code}
            code=str(data.get('room',''));room=self.room(db,code)
            if action=='control':
                self.require_teacher(teacher_token)
                op=data.get('op'); self.limit(('control',teacher_token),120,60)
                if op=='delete':
                    self.delete(db,code);return {'ok':True}
                if room['ended']:
                    raise ClassroomError(409,'Classroom ended / 课堂已结束')
                if op=='page':
                    db.execute('UPDATE rooms SET page=?,epoch=epoch+1 WHERE code=?',(self.page(data.get('page')),code))
                elif op in ('likes','danmaku'):
                    if type(data.get('enabled')) is not bool: raise ClassroomError(400,'Invalid toggle')
                    db.execute(f'UPDATE rooms SET {op}=?,epoch=epoch+1 WHERE code=?',(int(data['enabled']),code))
                elif op=='clear': db.execute('UPDATE rooms SET epoch=epoch+1 WHERE code=?',(code,))
                elif op=='end': db.execute('UPDATE rooms SET ended=?,danmaku=0,likes=0,epoch=epoch+1 WHERE code=?',(time.time(),code))
                elif op in ('answer','remove','mute'):
                    post=db.execute('SELECT * FROM posts WHERE id=? AND room=?',(data.get('id'),code)).fetchone()
                    if not post: raise ClassroomError(404,'Post not found')
                    if op=='answer': db.execute('UPDATE posts SET answered=1 WHERE id=?',(post['id'],))
                    elif op=='remove':
                        db.execute('UPDATE posts SET deleted=1 WHERE id=?',(post['id'],))
                        db.execute('UPDATE rooms SET epoch=epoch+1 WHERE code=?',(code,))
                    else: db.execute('UPDATE members SET muted=1 WHERE room=? AND id=?',(code,post['member']))
                else: raise ClassroomError(400,'Invalid operation')
                db.execute('UPDATE rooms SET version=version+1 WHERE code=?',(code,))
                self.events.pop(code,None)
                return {'ok':True}
            member=self.member(db,member_token,code)
            if room['ended']: raise ClassroomError(409,'Classroom ended / 课堂已结束')
            rid=self.text(data.get('requestId'),100)
            if db.execute('SELECT 1 FROM requests WHERE room=? AND member=? AND id=?',(code,member['id'],rid)).fetchone():
                return {'ok':True,'duplicate':True}
            if action not in ('feedback','like','question','danmaku'): raise ClassroomError(404,'Unknown endpoint')
            self.limit(('interaction',code,member['id']),30,60)
            if action=='feedback':
                page=self.page(data.get('page'));kind=data.get('kind')
                if kind not in ('understood','confused','slower','example',''): raise ClassroomError(400,'Invalid feedback')
                if not kind: db.execute('DELETE FROM feedback WHERE room=? AND member=? AND page=?',(code,member['id'],page))
                else: db.execute('INSERT OR REPLACE INTO feedback VALUES(?,?,?,?,?)',(code,member['id'],page,kind,time.time()))
            elif action=='like':
                if not room['likes']: raise ClassroomError(409,'Likes disabled / 点赞已关闭')
                self.limit(('like',code,member['id']),1,2)
                db.execute('INSERT INTO likes VALUES(?,?,1) ON CONFLICT(room,page) DO UPDATE SET count=count+1',(code,room['page']))
                self.event(code,'like',room['page'])
            else:
                if member['muted']: raise ClassroomError(403,'Posting muted for this class / 本堂课已禁言')
                message=self.text(data.get('text'),60 if action=='danmaku' else 500)
                if action=='danmaku':
                    if not room['danmaku']: raise ClassroomError(409,'Danmaku disabled / 弹幕已关闭')
                    self.limit(('danmaku',code,member['id']),1,10)
                    self.limit(('room-danmaku',code),1,2)
                    self.limit(('danmaku-slots',code),2,8)
                    page=room['page']
                else:
                    self.limit(('question',code,member['id']),5,60)
                    page=self.page(data.get('page'))
                pid=secrets.token_hex(12)
                db.execute('INSERT INTO posts VALUES(?,?,?,?,?,?,?,0,0)',(pid,code,member['id'],page,action,message,time.time()))
                if action=='danmaku': self.event(code,'danmaku',page,text=message,postId=pid)
            db.execute('INSERT INTO requests VALUES(?,?,?,?)',(code,member['id'],rid,time.time()))
            db.execute('UPDATE rooms SET version=version+1 WHERE code=?',(code,))
            return {'ok':True}

    def ai_identity(self, room, token):
        with self.db() as db:
            self.room(db,room)
            return 'class:'+room+':'+self.member(db,token,room)['id']
