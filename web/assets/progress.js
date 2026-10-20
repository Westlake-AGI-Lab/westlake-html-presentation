/* Private, browser-local study time. No analytics request or identity service. */
(() => {
  'use strict';
  const KEY='westlake-study-progress-v1', IDLE=60000;
  const dayKey=date=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const empty=()=>({version:1,startedAt:Date.now(),enabled:true,days:{},lectures:{}});
  let storageError=false;
  function read(){
    try{
      const raw=localStorage.getItem(KEY);if(!raw)return empty();const d=JSON.parse(raw);
      const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
      if(d?.version!==1||!object(d.days)||!object(d.lectures))throw Error('Invalid progress');
      const clean={version:1,startedAt:finite(d.startedAt)||Date.now(),enabled:d.enabled!==false,days:{},lectures:{}};
      for(const [date,entry]of Object.entries(d.days)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!object(entry)||!object(entry.courses)){storageError=true;continue;}
        clean.days[date]={courses:Object.fromEntries(Object.entries(entry.courses).map(([id,n])=>[id,finite(n)])),highlights:finite(entry.highlights)};
      }
      for(const [key,entry]of Object.entries(d.lectures)){
        if(!object(entry)||typeof entry.course!=='string'){storageError=true;continue;}
        clean.lectures[key]={...entry,seconds:finite(entry.seconds),updatedAt:finite(entry.updatedAt),highlights:(Array.isArray(entry.highlights)?entry.highlights:[]).filter(h=>object(h)&&Number.isInteger(h.page)&&h.page>0&&((h.type==='text'&&typeof h.text==='string')||(h.type==='region'&&validRect(h.rect))))};
      }
      return clean;
    }catch(_){storageError=true;return empty();}
  }
  function write(data){try{localStorage.setItem(KEY,JSON.stringify(data));storageError=false;}catch(_){storageError=true;}window.dispatchEvent(new Event('study-progress-updated'));}
  const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const $=id=>document.getElementById(id);
  const finite=n=>Number.isFinite(n)&&n>=0?n:0;
  const validRect=r=>Array.isArray(r)&&r.length===4&&r.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&r[0]+r[2]<=1.001&&r[1]+r[3]<=1.001;
  function pdfHighlights(course,lecture){let saved;try{saved=JSON.parse(localStorage.getItem('westlake-source-marks-v1:'+course.title+':'+lecture.title)||'{}');}catch(_){return [];}return Object.entries(saved||{}).flatMap(([page,marks])=>Array.isArray(marks)&&Number.isInteger(Number(page))&&Number(page)>=0&&Number(page)<(lecture.source?.pageCount||lecture.slideCount||0)?marks.filter(validRect).slice(0,200).map(rect=>({page:Number(page)+1,type:'region',rect})):[]);}
  function recordTime(data,key,context,start,end){
    if(!(end>start))return;const lecture=data.lectures[key]||{seconds:0,highlights:[],updatedAt:0};data.lectures[key]=lecture;lecture.course=context.course;lecture.title=context.title;lecture.seconds=finite(lecture.seconds)+(end-start)/1000;lecture.updatedAt=end;lecture.lastPage=(window.PPTDeck?.current?.()||0)+1;
    let cursor=start;while(cursor<end){const next=new Date(cursor);next.setHours(24,0,0,0);const boundary=Math.min(end,next.getTime()),date=dayKey(cursor),d=data.days[date]||{courses:{},highlights:0};data.days[date]=d;d.courses[context.course]=finite(d.courses[context.course])+(boundary-cursor)/1000;cursor=boundary;}
  }
  const source=$('sourceLectureData'),params=new URLSearchParams(location.search),role=params.get('mode')||'solo';
  const context=source?{course:params.get('course'),lecture:params.get('lecture'),title:JSON.parse(source.textContent).title}:document.body.classList.contains('eigen-demo')?{course:'linear-algebra',lecture:'diagonalization',title:'Eigenvectors and diagonalization'}:null;
  if(context&&window.top===window&&['solo','student'].includes(role)&&!window.name.startsWith('westlake-presenter-')){
    const key=context.course+'/'+context.lecture;
    let last=performance.now(),lastInteraction=Date.now(),running=document.visibilityState==='visible'&&document.hasFocus(),lastSnapshot=null;
    function tick(){const now=performance.now(),wall=Date.now(),elapsed=Math.min(5000,Math.max(0,now-last));last=now;const data=read();if(data.enabled!==false&&running){const end=Math.min(wall,lastInteraction+IDLE),start=wall-elapsed;if(end>start){recordTime(data,key,context,start,end);write(data);}}}
    function refreshFocus(event){tick();running=event?.type!=='blur'&&document.visibilityState==='visible'&&document.hasFocus();if(running)lastInteraction=Date.now();}
    for(const event of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(event,()=>{tick();lastInteraction=Date.now();},{passive:true,capture:true});
    addEventListener('focus',refreshFocus);addEventListener('blur',refreshFocus);document.addEventListener('visibilitychange',refreshFocus);addEventListener('pagehide',()=>{tick();running=false;});setInterval(tick,5000);
    addEventListener('storage',e=>{if(e.key===KEY){last=performance.now();lastInteraction=Date.now();}});
    function collectHighlights(){
      let highlights=[];
      if(source&&JSON.parse(source.textContent).isPdf){const info=JSON.parse(source.textContent);highlights=pdfHighlights({title:info.course},{title:info.title,source:{pageCount:info.pages.length}});}
      else if(window.WestlakeHighlights)highlights=window.WestlakeHighlights.list();else return;
      const signature=JSON.stringify(highlights);if(signature===lastSnapshot)return;lastSnapshot=signature;
      const data=read(),entry=data.lectures[key]||{seconds:0,highlights:[]};const previous=new Set((entry.highlights||[]).map(h=>JSON.stringify(h)));const additions=highlights.filter(h=>!previous.has(JSON.stringify(h))).length;
      entry.course=context.course;entry.title=context.title;entry.highlights=highlights;entry.updatedAt=Date.now();data.lectures[key]=entry;
      // Existing highlights are imported without fabricating a historical activity date.
      if(additions&&entry.highlightImported&&data.enabled!==false){const date=dayKey(Date.now());data.days[date]||={courses:{},highlights:0};data.days[date].highlights=finite(data.days[date].highlights)+additions;}
      entry.highlightImported=true;write(data);
    }
    for(const event of ['ppt-highlights-change','ppt-highlights-ready','ppt-source-highlights-change','DOMContentLoaded'])addEventListener(event,collectHighlights);
    collectHighlights();
  }
  if(!$('progressMain'))return;
  let courses=[],period=30,selectedDay=null,showCount=20;
  let language;try{language=localStorage.getItem('westlake-ui-language')||'en';}catch(_){language='en';}
  const L=(en,zh)=>language==='zh'?zh:en;
  const duration=seconds=>{seconds=finite(seconds);if(seconds>0&&seconds<60)return L('<1 min','不足1分钟');const minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);return hours?L(`${hours}h ${minutes%60}m`,`${hours}小时 ${minutes%60}分钟`):L(`${minutes} min`,`${minutes}分钟`);};
  const courseById=id=>courses.find(c=>c.id===id);
  const lectureByKey=key=>{const [id,lid]=key.split('/'),course=courseById(id);return {course,lecture:course?.lectures.find(l=>l.id===lid)};};
  function href(lecture,page){const url=new URL(lecture.href,location.href);if(url.origin!==location.origin)return 'courses.html';url.hash=String(page);return url.pathname+url.search+url.hash;}
  function recentDays(data){const cutoff=new Date();cutoff.setHours(0,0,0,0);if(period)cutoff.setDate(cutoff.getDate()-period+1);return Object.entries(data.days).filter(([date])=>!period||date>=dayKey(cutoff));}
  function importPdf(data){for(const c of courses)for(const l of c.lectures){if(l.source?.format!=='pdf')continue;const key=c.id+'/'+l.id,highlights=pdfHighlights(c,l);if(highlights.length||data.lectures[key]){const entry=data.lectures[key]||{seconds:0};entry.course=c.id;entry.title=l.title;entry.highlights=highlights;entry.highlightImported=true;data.lectures[key]=entry;}}}
  function header(data){
    document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=L('My progress · Learning Workspace','我的学习进度 · Learning Workspace');
    const words={student:L('Student','学生'),courses:L('Courses','课程'),progress:L('My progress','我的进度'),discussions:L('Discussions','讨论'),workspace:L('Your space to understand.','在这里，理解每一个新想法。'),workspaceTitle:L('Learning workspace','学习工作区')};
    document.querySelectorAll('[data-label]').forEach(n=>{if(words[n.dataset.label])n.textContent=words[n.dataset.label];});
    $('progressTitle').textContent=L('My progress','我的学习进度');$('progressIntro').textContent=L('A little progress, every day. See where your study time goes.','每天进步一点，了解自己的学习时间分配。');$('progressLanguage').textContent=L('中文','English');
    $('trackingButton').textContent=data.enabled===false?L('Resume tracking','恢复记录'):L('Pause tracking','暂停记录');$('trackingButton').setAttribute('aria-pressed',String(data.enabled===false));
    $('trackingStatus').textContent=data.enabled===false?L('Tracking paused','记录已暂停'):L('Tracking on this browser','在此浏览器记录');
    $('progressPrivacy').textContent=L('Only active lecture time counts. Pauses after 1 minute without interaction. Stored in this browser; never sent to teachers or a server. Time is activity, not a grade or course completion.','仅记录活跃讲义时间，1分钟无操作后暂停。资料仅存于此浏览器，不发送给教师或服务器。时间表示学习活动，不代表成绩或课程完成。');
    $('storageNotice').hidden=!storageError;$('storageNotice').textContent=L('Browser storage is unavailable or damaged. Progress may not be saved.','浏览器存储不可用或损坏，进度可能无法保存。');
    $('timeLabel').textContent=L('Study time','学习时间');$('daysLabel').textContent=L('Active days','活跃天数');$('highlightsLabel').textContent=L('Saved highlights','已保存标记');
    $('calendarTitle').textContent=L('Your learning activity','学习活动');$('calendarCaption').textContent=L('Past 12 months · darker means more study time','过去12个月 · 颜色越深，学习时间越多');$('calendarLess').textContent=L('Less','少');$('calendarMore').textContent=L('More','多');document.querySelectorAll('.activity-weekdays span').forEach((n,i)=>n.textContent=i%2?L(['','Mon','','Wed','','Fri',''][i],['','一','','三','','五',''][i]):'');
    $('subjectsTitle').textContent=L('Time by subject','各科学习时间');$('savedTitle').textContent=L('Your highlights','我的标记');$('savedCaption').textContent=L('Revisit the ideas you marked. Older text highlights appear after you reopen their lecture.','回顾标记的内容；重新打开讲义后可导入先前的文字高亮。');
    $('clearProgress').textContent=L('Clear time history','清除时间记录');$('clearTitle').textContent=L('Clear your study-time history?','清除学习时间记录？');$('clearDescription').textContent=L('This removes time and activity history from this browser. Your slide highlights and notes stay unchanged.','这会移除此浏览器的时间与活动记录，保留讲义标记和讲稿。');$('cancelClear').textContent=L('Cancel','取消');$('confirmClear').textContent=L('Clear history','清除记录');
    $('highlightCourse').className='progress-select';$('period').className='progress-select';$('period').setAttribute('aria-label',L('Time period','时间范围'));for(const o of $('period').options)o.textContent=o.value==='0'?L('All recorded time','全部已记录时间'):L(`Last ${o.value} days`,`最近${o.value}天`);
    $('highlightCourse').setAttribute('aria-label',L('Filter highlights by course','按课程筛选标记'));const selected=$('highlightCourse').value;$('highlightCourse').replaceChildren(new Option(L('All subjects','全部课程'),''),...courses.map(c=>new Option(c.title,c.id)));$('highlightCourse').value=selected;
  }
  function calendar(data){
    const grid=$('activityGrid');grid.replaceChildren();const today=new Date();today.setHours(0,0,0,0);const start=new Date(today);start.setDate(start.getDate()-364);start.setDate(start.getDate()-start.getDay());const months=$('activityMonths');months.replaceChildren();let lastMonth=-1;
    const cells=[];for(let date=new Date(start);date<=today;date.setDate(date.getDate()+1)){const key=dayKey(date),d=data.days[key]||{courses:{}},seconds=Object.values(d.courses||{}).reduce((a,n)=>a+finite(n),0),marks=finite(d.highlights),active=seconds>0||marks>0,level=!active?0:seconds<300?1:seconds<1200?2:seconds<3600?3:4;
      if(date.getMonth()!==lastMonth){const month=make('span','',date.toLocaleDateString(language==='zh'?'zh-CN':'en',{month:'short'}));month.style.gridColumn=String(Math.floor(cells.length/7)+1);const previous=months.lastElementChild;if(previous&&Number(month.style.gridColumn)-Number(previous.style.gridColumn)<3)previous.remove();months.append(month);lastMonth=date.getMonth();}
      const b=make('button','activity-cell');b.type='button';b.tabIndex=-1;b.dataset.level=level;b.dataset.date=key;const description=key+' · '+duration(seconds)+' · '+marks+L(' highlights added',' 个新标记');b.title=description;b.setAttribute('aria-label',description);b.setAttribute('aria-pressed',String(key===selectedDay));b.onclick=()=>{selectedDay=key;$('calendarSelection').textContent=description;grid.querySelectorAll('button').forEach(n=>{n.setAttribute('aria-pressed',String(n===b));n.tabIndex=n===b?0:-1;});dayDetails(data);};grid.append(b);cells.push(b);
    }
    const focusCell=cells.find(b=>b.dataset.date===selectedDay)||cells.at(-1);if(focusCell)focusCell.tabIndex=0;
    grid.onkeydown=e=>{const i=cells.indexOf(document.activeElement),offset={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1}[e.key];if(i<0||offset===undefined)return;e.preventDefault();const target=cells[Math.max(0,Math.min(cells.length-1,i+offset))];cells[i].tabIndex=-1;target.tabIndex=0;target.focus();target.scrollIntoView({block:'nearest',inline:'nearest'});};
    dayDetails(data);if(!selectedDay){const scroller=grid.parentElement;scroller.scrollLeft=scroller.scrollWidth;}
    $('calendarSelection').textContent=selectedDay?$('activityGrid').querySelector(`[data-date="${selectedDay}"]`)?.title||'':L('Select a day to see its activity.','选择日期查看当天活动。');
  }
  function dayDetails(data){
    const list=$('activityDaySubjects');list.replaceChildren();if(!selectedDay)return;
    const day=data.days[selectedDay];if(!day)return;
    for(const [id,seconds]of Object.entries(day.courses||{}).sort((a,b)=>b[1]-a[1]))if(seconds>0)list.append(make('span','activity-day-subject',(courseById(id)?.title||id)+' · '+duration(seconds)));
  }
  function render(){
    const data=read();importPdf(data);header(data);const totals={};let active=0,total=0;
    for(const [,d]of recentDays(data)){let seconds=0;for(const [id,n]of Object.entries(d.courses||{})){const value=finite(n);totals[id]=(totals[id]||0)+value;seconds+=value;}total+=seconds;if(seconds>0||finite(d.highlights)>0)active++;}
    if(!period){total=0;for(const entry of Object.values(data.lectures)){const n=finite(entry.seconds);total+=n;}for(const c of courses)totals[c.id]=Object.values(data.lectures).filter(e=>e.course===c.id).reduce((a,e)=>a+finite(e.seconds),0);}
    $('totalTime').textContent=duration(total);$('activeDays').textContent=String(active);$('daysHelp').textContent=L('Within your selected period','在所选时间范围内');
    const entries=Object.entries(data.lectures).flatMap(([key,entry])=>{const {course,lecture}=lectureByKey(key);return course&&lecture?((entry.highlights||[]).map(h=>({...h,key,course,lecture}))):[];});
    $('highlightCount').textContent=String(entries.length);$('highlightsHelp').textContent=L('Current saved marks · all time','当前保存的标记 · 不限时间');
    const leader=courses.slice().sort((a,b)=>(totals[b.id]||0)-(totals[a.id]||0))[0];$('topSubject').textContent=leader&&(totals[leader.id]||0)>0?L('Most studied: ','学习最多：')+leader.title:L('Open a lecture to start recording your study time.','打开讲义即可开始记录学习时间。');
    const list=$('subjectList');list.replaceChildren();const max=Math.max(1,...Object.values(totals));for(const course of courses.slice().sort((a,b)=>(totals[b.id]||0)-(totals[a.id]||0))){const row=make('div','subject-time-row'),top=make('div','subject-time-label');const a=make('a','',course.title);a.href=href(course.lectures[0],1);top.append(a,make('span','',duration(totals[course.id]||0)));const track=make('div','subject-time-track');const bar=make('span');bar.style.width=((totals[course.id]||0)/max*100)+'%';track.append(bar);row.append(top,track);list.append(row);}
    const latest=Object.entries(data.lectures).filter(([key,e])=>e.seconds>0&&lectureByKey(key).lecture).sort((a,b)=>b[1].updatedAt-a[1].updatedAt)[0];
    const resume=$('resumeLecture');resume.hidden=!latest;if(latest){const {lecture}=lectureByKey(latest[0]);resume.href=href(lecture,Math.min(lecture.slideCount||1,Math.max(1,latest[1].lastPage||1)));resume.textContent=L('Continue learning: ','继续学习：')+lecture.title+' →';}
    calendar(data);const filtered=entries.filter(e=>!$('highlightCourse').value||e.course.id===$('highlightCourse').value);const highlights=$('highlightList');highlights.replaceChildren();for(const entry of filtered.slice(0,showCount)){
      if(!Number.isInteger(entry.page)||entry.page<1)continue;const a=make('a','progress-highlight');a.href=href(entry.lecture,entry.page);
      if(entry.type==='region'&&validRect(entry.rect)){const picture=make('div','highlight-picture');const img=make('img');img.alt='';img.loading='lazy';img.onload=()=>{if(img.naturalWidth&&img.naturalHeight)picture.style.aspectRatio=img.naturalWidth+'/'+img.naturalHeight;};img.src=entry.lecture.source.file.replace('source.pdf',`thumb-${String(entry.page).padStart(2,'0')}.webp`);const rect=make('span','highlight-region');['left','top','width','height'].forEach((key,i)=>rect.style[key]=entry.rect[i]*100+'%');picture.append(img,rect);a.append(picture);}
      const copy=make('div','highlight-summary');copy.append(make('span','highlight-subject',entry.course.title),make('strong','',entry.lecture.title),make('p','',entry.type==='text'?String(entry.text||'').slice(0,280):L('A region you highlighted on this slide.','你在这一页标记的区域。')),make('span','highlight-page',L('Slide ','第 ')+entry.page+L(' · Open slide →',' 页 · 打开幻灯片 →')));a.append(copy);highlights.append(a);
    }
    $('highlightsEmpty').hidden=filtered.length>0;$('highlightsEmpty').textContent=L('No highlights yet. Mark a passage or a slide region, then find it here.','还没有标记。在讲义中高亮文字或标记区域后，即可在这里回顾。');$('showMoreHighlights').hidden=filtered.length<=showCount;$('showMoreHighlights').textContent=L('Show more highlights','显示更多标记');
    $('progressLoading').hidden=true;$('progressContent').hidden=false;if(!selectedDay){const scroller=$('activityGrid').parentElement;scroller.scrollLeft=scroller.scrollWidth;}
  }
  $('progressLanguage').onclick=()=>{language=language==='en'?'zh':'en';try{localStorage.setItem('westlake-ui-language',language);}catch(_){}render();};
  $('period').onchange=()=>{period=Number($('period').value);render();};$('highlightCourse').onchange=()=>{showCount=20;render();};$('showMoreHighlights').onclick=()=>{showCount+=20;render();};
  $('trackingButton').onclick=()=>{const data=read();data.enabled=data.enabled===false;write(data);render();};
  $('clearProgress').onclick=()=>$('clearProgressDialog').showModal();$('cancelClear').onclick=()=>$('clearProgressDialog').close();$('confirmClear').onclick=()=>{const old=read(),data=empty();data.enabled=old.enabled;for(const [key,entry]of Object.entries(old.lectures))data.lectures[key]={...entry,seconds:0};write(data);selectedDay=null;$('clearProgressDialog').close();render();};
  addEventListener('storage',()=>render());addEventListener('resize',()=>{if(!selectedDay){const scroller=$('activityGrid').parentElement;scroller.scrollLeft=scroller.scrollWidth;}});
  fetch('api/courses').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{courses=data.courses;render();}).catch(()=>{$('progressLoading').textContent=L('Could not load courses. Reload this page to retry.','无法加载课程，请刷新重试。');});
})();
