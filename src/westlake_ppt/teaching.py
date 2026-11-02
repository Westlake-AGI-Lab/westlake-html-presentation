"""Owned teaching catalog, publishing and anonymized slide activity (schema v2)."""
import base64
from datetime import datetime
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import tempfile
import time
import zipfile

class TeachingError(Exception):
    def __init__(self, code, message): self.code, self.message = code, message

def clean(value, limit=1000):
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', str(value or ''))[:limit]

class Teaching:
    def __init__(self, accounts, web):
        self.accounts, self.web = accounts, Path(web)
        self.files = accounts.path.parent / 'lecture-files'
        self.files.mkdir(mode=0o700, exist_ok=True)
        if self.files.resolve().is_relative_to(self.web.resolve()): raise ValueError('Lecture files must be outside web root')
        self.maximum = max(1,int(os.environ.get('LECTURE_UPLOAD_MB','40')))*1024*1024
        self.anonymized = os.environ.get('TEACHING_ANONYMIZED','1') != '0'
        with accounts.connect() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS teaching_courses(id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS course_owners(teacher TEXT NOT NULL, course TEXT NOT NULL, PRIMARY KEY(teacher,course));
            CREATE TABLE IF NOT EXISTS teaching_lectures(course TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',publish_at REAL,position INTEGER NOT NULL,PRIMARY KEY(course,id));
            CREATE TABLE IF NOT EXISTS slide_notes(course TEXT,lecture TEXT,slide INTEGER,note TEXT,PRIMARY KEY(course,lecture,slide));
            CREATE TABLE IF NOT EXISTS study_events(id TEXT PRIMARY KEY,student TEXT NOT NULL,course TEXT NOT NULL,lecture TEXT NOT NULL,slide INTEGER NOT NULL,action TEXT NOT NULL,at REAL NOT NULL,question TEXT NOT NULL DEFAULT '',answer TEXT NOT NULL DEFAULT '',mock INTEGER NOT NULL DEFAULT 0);
            CREATE INDEX IF NOT EXISTS study_events_lookup ON study_events(course,lecture,slide,at);
            CREATE TABLE IF NOT EXISTS lecture_versions(id TEXT PRIMARY KEY,course TEXT,lecture TEXT,at REAL,data TEXT);
            CREATE TABLE IF NOT EXISTS answer_flags(id TEXT PRIMARY KEY,event TEXT NOT NULL,teacher TEXT NOT NULL,reason TEXT NOT NULL,at REAL NOT NULL);
            PRAGMA user_version=2;
            ''')

    def seed(self, teacher='202400000', mock=False):
        from .courses import catalog
        with self.accounts.connect() as db:
            if not db.execute('SELECT 1 FROM accounts WHERE id=? AND is_teacher=1',(teacher,)).fetchone(): raise ValueError('Seed teacher account first')
            for course in catalog(self.web):
                data={k:v for k,v in course.items() if k!='lectures'}
                db.execute('INSERT OR IGNORE INTO teaching_courses VALUES (?,?)',(course['id'],json.dumps(data)))
                db.execute('INSERT OR IGNORE INTO course_owners VALUES (?,?)',(teacher,course['id']))
                for i,lecture in enumerate(course['lectures']):
                    db.execute('INSERT OR IGNORE INTO teaching_lectures VALUES (?,?,?,\'published\',NULL,?)',(course['id'],lecture['id'],json.dumps(lecture),i))
                    if mock:
                        for j in range(min(3,len(lecture['slides']))):
                            for k in range(1+(i+j)%4):
                                event=f'mock-{course["id"]}-{lecture["id"]}-{j}-{k}'
                                db.execute('INSERT OR IGNORE INTO study_events VALUES (?,?,?,?,?,?,?,?,?,1)',(event,'DEMO2026',course['id'],lecture['id'],j+1,'question',time.time()-j*3600-i*600-k*240,'How does this idea connect to the example on this slide?','Compare the two representations and identify which quantity stays fixed. This is fictional development activity.'))
                        db.execute('INSERT OR IGNORE INTO study_events VALUES (?,?,?,?,?,?,?,?,?,1)',('mock-open-'+course['id']+'-'+lecture['id'],'20243841001',course['id'],lecture['id'],1,'opened',time.time()-i*250,'',''))

    def own(self, teacher, course):
        with self.accounts.connect() as db:
            if not db.execute('SELECT 1 FROM course_owners WHERE teacher=? AND course=?',(teacher,course)).fetchone(): raise TeachingError(404,'Not found / 未找到')

    def catalog(self, teacher=None):
        now=time.time()
        with self.accounts.connect() as db:
            db.execute("UPDATE teaching_lectures SET status='published',publish_at=NULL WHERE publish_at IS NOT NULL AND publish_at<=?",(now,))
            rows=db.execute('SELECT c.* FROM teaching_courses c '+('JOIN course_owners o ON o.course=c.id WHERE o.teacher=?' if teacher else ''),(teacher,) if teacher else ()).fetchall()
            result=[]
            for row in rows:
                course=json.loads(row['data']);course['id']=row['id'];course['lectures']=[]
                for lecture in db.execute('SELECT * FROM teaching_lectures WHERE course=? ORDER BY position,id',(row['id'],)):
                    if not teacher and lecture['status']!='published': continue
                    item=json.loads(lecture['data']);item.update(status=lecture['status'],publish_at=lecture['publish_at'],position=lecture['position'])
                    stats=db.execute("SELECT COUNT(CASE WHEN action='question' THEN 1 END),MAX(at) FROM study_events WHERE course=? AND lecture=?",(row['id'],lecture['id'])).fetchone()
                    item.update(questions=stats[0],lastActivity=stats[1]);course['lectures'].append(item)
                course['activeWeek']=db.execute('SELECT COUNT(DISTINCT student) FROM study_events WHERE course=? AND at>?',(row['id'],now-7*86400)).fetchone()[0]
                course['lastActivity']=db.execute('SELECT MAX(at) FROM study_events WHERE course=?',(row['id'],)).fetchone()[0]
                result.append(course)
            return result

    def lecture(self, course, lecture, teacher=None):
        if teacher: self.own(teacher,course)
        found=next((c for c in self.catalog(teacher) if c['id']==course),None)
        item=next((l for l in found['lectures'] if l['id']==lecture),None) if found else None
        if not item: raise TeachingError(404,'Not found / 未找到')
        return found,item

    def detail(self, teacher, course, lecture):
        c,l=self.lecture(course,lecture,teacher)
        with self.accounts.connect() as db:
            events=[dict(e) for e in db.execute("SELECT id,slide,at,question,answer,mock,student FROM study_events WHERE course=? AND lecture=? AND action='question' ORDER BY at DESC LIMIT 500",(course,lecture))]
            counts={r[0]:r[1] for r in db.execute("SELECT slide,COUNT(*) FROM study_events WHERE course=? AND lecture=? AND action='question' GROUP BY slide",(course,lecture))}
            notes={r[0]:r[1] for r in db.execute('SELECT slide,note FROM slide_notes WHERE course=? AND lecture=?',(course,lecture))}
            flagged={r[0] for r in db.execute('SELECT event FROM answer_flags WHERE teacher=?',(teacher,))}
        for e in events:
            identity=e.pop('student')
            if not self.anonymized:e['identity']=identity
            e['flagged']=e['id'] in flagged
        return dict(course={k:v for k,v in c.items() if k!='lectures'},lecture=l,events=events,counts=counts,notes=notes)

    def summaries(self, teacher):
        courses=self.catalog(teacher)
        for course in courses:
            for lecture in course['lectures']:lecture['slideCount']=len(lecture.pop('slides'))
        return courses

    def today(self, teacher):
        courses=self.summaries(teacher)
        with self.accounts.connect() as db:
            rows=[dict(r) for r in db.execute('SELECT e.id,e.course,e.lecture,e.slide,e.action,e.at,e.mock,e.student FROM study_events e JOIN course_owners o ON o.course=e.course WHERE o.teacher=? ORDER BY e.at DESC LIMIT 10',(teacher,))]
            top=[dict(r) for r in db.execute("SELECT e.course,e.lecture,e.slide,COUNT(*) count FROM study_events e JOIN course_owners o ON o.course=e.course WHERE o.teacher=? AND e.action='question' AND e.at>? GROUP BY e.course,e.lecture,e.slide ORDER BY count DESC LIMIT 5",(teacher,time.time()-14*86400))]
            mock=db.execute('SELECT 1 FROM study_events e JOIN course_owners o ON o.course=e.course WHERE o.teacher=? AND e.mock=1 LIMIT 1',(teacher,)).fetchone() is not None
        for r in rows:
            identity=r.pop('student')
            if not self.anonymized:r['identity']=identity
        for r in top:
            c,l=self.lecture(r['course'],r['lecture'],teacher);r.update(title=l['slides'][r['slide']-1]['title'],courseTitle=c['title'])
        return dict(courses=courses,top=top,recent=rows,mock=mock)

    def event(self, account, data, question='', answer=''):
        if not account or account['is_teacher']: return
        course,lecture=clean(data.get('course'),100),clean(data.get('lecture'),100)
        _,l=self.lecture(course,lecture)
        slide=data.get('slide');action='question' if question else data.get('action')
        if type(slide)!=int or not 1<=slide<=len(l['slides']) or action not in ('opened','question'): raise TeachingError(400,'Invalid event / 无效记录')
        event_id=secrets.token_hex(16)
        with self.accounts.connect() as db:
            db.execute('INSERT INTO study_events VALUES (?,?,?,?,?,?,?,?,?,0)',(event_id,account['id'],course,lecture,slide,action,time.time(),clean(question,8000),clean(answer,40000)))
        return event_id

    def complete_answer(self, event_id, answer):
        if not event_id:return
        with self.accounts.connect() as db:
            db.execute('UPDATE study_events SET answer=? WHERE id=?',(clean(answer,40000),event_id))

    def notes(self, course, lecture):
        with self.accounts.connect() as db:
            return {r[0]:r[1] for r in db.execute('SELECT slide,note FROM slide_notes WHERE course=? AND lecture=?',(course,lecture))}

    def mutate(self, teacher, action, data):
        course=clean(data.get('course'),100);lecture=clean(data.get('lecture'),100)
        if action=='new-course':
            course=secrets.token_hex(8)
            item={k:clean(data.get(k),1000) for k in ['title','zh','code','term','description','category']}
            if not all(item[k].strip() for k in ['title','zh','code','term','category']): raise TeachingError(400,'Complete the required fields / 请填写必填项')
            if item['category'] not in ('Mathematics','Computer science','Other'): raise TeachingError(400,'Invalid subject / 无效学科')
            item.update(id=course,color='green',icon='matrix')
            with self.accounts.connect() as db:
                db.execute('INSERT INTO teaching_courses VALUES (?,?)',(course,json.dumps(item)))
                db.execute('INSERT INTO course_owners VALUES (?,?)',(teacher,course))
            return {'id':course}
        self.own(teacher,course)
        if action=='reorder':
            ids=[l['id'] for c in self.catalog(teacher) if c['id']==course for l in c['lectures']]
            order=data.get('order')
            if not isinstance(order,list) or len(order)!=len(ids) or set(order)!=set(ids): raise TeachingError(400,'Invalid order / 无效顺序')
            with self.accounts.connect() as db:
                for i,lid in enumerate(order):
                    value=json.loads(db.execute('SELECT data FROM teaching_lectures WHERE course=? AND id=?',(course,lid)).fetchone()[0]);value['number']=str(i+1).zfill(2)
                    db.execute('UPDATE teaching_lectures SET position=?,data=? WHERE course=? AND id=?',(i,json.dumps(value),course,lid))
            return {'ok':True}
        _,item=self.lecture(course,lecture,teacher)
        with self.accounts.connect() as db:
            if action=='status':
                state=data.get('status')
                if state not in ('draft','published','hidden'): raise TeachingError(400,'Invalid status / 无效状态')
                at=data.get('publish_at')
                if at:
                    try: at=datetime.fromisoformat(at.replace('Z','+00:00')).timestamp()
                    except (ValueError,TypeError): raise TeachingError(400,'Invalid date / 无效日期')
                    if at<=time.time(): raise TeachingError(400,'Choose a future date / 请选择未来时间')
                    state='draft'
                db.execute('UPDATE teaching_lectures SET status=?,publish_at=? WHERE course=? AND id=?',(state,at or None,course,lecture))
            elif action=='rename':
                title=clean(data.get('title'),300).strip()
                if not title: raise TeachingError(400,'Title required / 请输入标题')
                item['title']=title;db.execute('UPDATE teaching_lectures SET data=? WHERE course=? AND id=?',(json.dumps(item),course,lecture))
            elif action=='delete':
                db.execute('DELETE FROM answer_flags WHERE event IN (SELECT id FROM study_events WHERE course=? AND lecture=?)',(course,lecture))
                for table in ('study_events','slide_notes'): db.execute(f'DELETE FROM {table} WHERE course=? AND lecture=?',(course,lecture))
                db.execute('DELETE FROM teaching_lectures WHERE course=? AND id=?',(course,lecture))
                if item.get('fileToken'):shutil.rmtree(self.files/item['fileToken'],ignore_errors=True)
            elif action=='note':
                slide=data.get('slide')
                if type(slide)!=int or not 1<=slide<=len(item['slides']): raise TeachingError(400,'Invalid slide / 无效页面')
                db.execute('INSERT OR REPLACE INTO slide_notes VALUES (?,?,?,?)',(course,lecture,slide,clean(data.get('note'),5000)))
            elif action=='flag':
                event=db.execute('SELECT id FROM study_events WHERE id=? AND course=? AND lecture=? AND action=\'question\'',(data.get('event'),course,lecture)).fetchone()
                if not event: raise TeachingError(404,'Not found / 未找到')
                db.execute('INSERT INTO answer_flags VALUES (?,?,?,?,?)',(secrets.token_hex(12),event[0],teacher,clean(data.get('reason'),1000),time.time()))
            else: raise TeachingError(404,'Not found / 未找到')
        return {'ok':True}

    def upload(self, teacher, course, filename, raw, replace=None):
        self.own(teacher,course)
        if replace: self.lecture(course,replace,teacher)
        suffix=Path(filename).suffix.lower()
        if suffix not in ('.pdf','.pptx') or not raw or len(raw)>self.maximum: raise TeachingError(400,'Choose a PDF or PPTX within the upload limit / 请选择大小限制内的 PDF 或 PPTX')
        if suffix=='.pdf' and not raw.startswith(b'%PDF-'): raise TeachingError(400,'Invalid PDF / PDF 无效')
        token=secrets.token_hex(16);directory=self.files/token;directory.mkdir(mode=0o700)
        try:
            original=directory/('original'+suffix);original.write_bytes(raw)
            pdf=original
            if suffix=='.pptx':
                with zipfile.ZipFile(original) as archive:
                    if 'ppt/presentation.xml' not in archive.namelist() or sum(i.file_size for i in archive.infolist())>200*1024*1024: raise ValueError('Invalid PPTX')
                binary=os.environ.get('LIBREOFFICE_BIN','soffice')
                with tempfile.TemporaryDirectory() as profile:
                    subprocess.run([binary,'-env:UserInstallation='+Path(profile).as_uri(),'--headless','--convert-to','pdf','--outdir',str(directory),str(original)],check=True,timeout=90,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                pdf=directory/'original.pdf'
            import pymupdf as fitz
            slides=[]
            with fitz.open(pdf) as document:
                if document.is_encrypted or not 0<len(document)<=200: raise ValueError('Encrypted or too many slides')
                for i,page in enumerate(document):
                    text=clean(page.get_text(),20000);title=next((line.strip() for line in text.splitlines() if line.strip()),f'Slide {i+1}')[:200]
                    image=f'{i+1}.webp';thumb=f'thumb-{i+1}.webp'
                    pix=page.get_pixmap(matrix=fitz.Matrix(min(1.5,1600/max(page.rect.width,page.rect.height)),min(1.5,1600/max(page.rect.width,page.rect.height))));pix.pil_save(directory/image,format='WEBP')
                    page.get_pixmap(matrix=fitz.Matrix(240/max(page.rect.width,page.rect.height),240/max(page.rect.width,page.rect.height))).pil_save(directory/thumb,format='WEBP')
                    slides.append(dict(title=title,text=text,notes='',sourcePage=i+1,width=pix.width,height=pix.height,image=f'/api/lecture-file/{token}/{image}',thumbnail=f'/api/lecture-file/{token}/{thumb}'))
            lecture=replace or secrets.token_hex(8)
            item=dict(id=lecture,title=clean(Path(filename).stem,300),number='01',summary='',minutes=0,source={'format':'pdf','file':f'/api/lecture-file/{token}/original.pdf'},slides=slides,author='',date='',fileToken=token)
            with self.accounts.connect() as db:
                position=db.execute('SELECT COALESCE(MAX(position),-1)+1 FROM teaching_lectures WHERE course=?',(course,)).fetchone()[0]
                item['number']=str(position+1).zfill(2)
                if replace:
                    old=db.execute('SELECT data FROM teaching_lectures WHERE course=? AND id=?',(course,replace)).fetchone()[0]
                    item['number']=json.loads(old).get('number','01')
                    archive={'lecture':json.loads(old),'notes':[dict(r) for r in db.execute('SELECT * FROM slide_notes WHERE course=? AND lecture=?',(course,replace))],'events':[dict(r) for r in db.execute('SELECT * FROM study_events WHERE course=? AND lecture=?',(course,replace))],'flags':[dict(r) for r in db.execute('SELECT * FROM answer_flags WHERE event IN (SELECT id FROM study_events WHERE course=? AND lecture=?)',(course,replace))]}
                    db.execute('INSERT INTO lecture_versions VALUES (?,?,?,?,?)',(secrets.token_hex(16),course,replace,time.time(),json.dumps(archive)))
                    db.execute('UPDATE teaching_lectures SET data=?,status=\'draft\',publish_at=NULL WHERE course=? AND id=?',(json.dumps(item),course,replace))
                    db.execute('DELETE FROM answer_flags WHERE event IN (SELECT id FROM study_events WHERE course=? AND lecture=?)',(course,replace))
                    for table in ('study_events','slide_notes'): db.execute(f'DELETE FROM {table} WHERE course=? AND lecture=?',(course,replace))
                else: db.execute('INSERT INTO teaching_lectures VALUES (?,?,?,\'draft\',NULL,?)',(course,lecture,json.dumps(item),position))
            return {'id':lecture}
        except Exception as exc:
            shutil.rmtree(directory,ignore_errors=True)
            raise TeachingError(422,'Processing failed. Check the file and retry. PPTX requires LibreOffice; scanned PDFs have no extractable text. / 处理失败，请检查文件后重试。PPTX 需要 LibreOffice；扫描 PDF 无可提取文字。') from exc

    def file(self, token, name, account):
        if not account: raise TeachingError(403,'Forbidden')
        if not re.fullmatch('[a-f0-9]{32}',token) or not re.fullmatch(r'(?:original\.pdf|(?:thumb-)?[0-9]+\.webp)',name): raise TeachingError(404,'Not found')
        for course in self.catalog(account['id'] if account['is_teacher'] else None):
            for lecture in course['lectures']:
                if lecture.get('fileToken')==token:
                    path=self.files/token/name
                    if path.is_file(): return path
        raise TeachingError(404,'Not found')

def main():
    import argparse
    from .auth import Accounts
    parser=argparse.ArgumentParser(description='Migrate teaching schema and explicitly seed demo ownership/events')
    parser.add_argument('--db',required=True);parser.add_argument('--web',required=True);parser.add_argument('--seed-demo',action='store_true');parser.add_argument('--mock-events',action='store_true')
    args=parser.parse_args();store=Teaching(Accounts(args.db),args.web)
    if args.seed_demo:store.seed(mock=args.mock_events)

if __name__=='__main__':main()
