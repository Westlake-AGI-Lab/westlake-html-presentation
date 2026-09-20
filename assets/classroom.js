(() => {
  'use strict';
  const params=new URLSearchParams(location.search), role=params.get('mode')||'solo';
  const L=(zh,en)=>window.PPTI18n?.language==='en'?en:zh;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const labels=[];
  function label(node,zh,en){labels.push(()=>node.textContent=L(zh,en));node.textContent=L(zh,en);return node;}
  function button(parent,zh,en,fn){const b=label(el('button'),zh,en);b.type='button';b.onclick=async()=>{try{await fn();}catch(e){notice(e.message);}};parent.append(b);return b;}
  let app, status, room=params.get('room')||'', token='', state, cursor=-1, boot='', follow=true, applying=false, disconnected=true;
  let teacherList, posts, summary, pageSelect, filters, toggleLike, toggleDanmaku, followButton, studentText, danText, likeButton, danButton, overlay, likedCount;
  function notice(text){if(status)status.textContent=text;}
  function headers(){return room&&token?{'X-Classroom-Room':room,'X-Classroom-Token':token}:{};}
  async function api(action,data,query={}){
    const response=await fetch('/api/classroom/'+action+(data?'':'?'+new URLSearchParams(query)),{
      method:data?'POST':'GET',headers:{'Content-Type':'application/json',...headers()},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(12000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||`HTTP ${response.status}`);return result;
  }
  function href(mode,code){return location.pathname+'?'+new URLSearchParams({mode,room:code});}
  function showDataDownload(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function join(code){
    code=code.trim().toUpperCase();const key='ppt-member:'+code+':'+role;
    token=sessionStorage.getItem(key)||'';room=code;
    if(token){try{await api('state',null,{room,role});return;}catch(_){token='';}}
    const result=await api('join',{room});token=result.token;sessionStorage.setItem(key,token);
  }
  function trackControls(node){node.addEventListener('keydown',e=>e.stopPropagation());node.addEventListener('touchend',e=>e.stopPropagation());}
  function mount(){
    document.body.dataset.classRole=role;
    app=el('section','class-app');trackControls(app);document.body.append(app);
    status=el('p','class-status');status.setAttribute('role','status');
    const bar=el('div','class-bar');app.append(bar,status);
    button(bar,'中文 / English','中文 / English',()=>PPTI18n.setLanguage(PPTI18n.language==='en'?'zh':'en'));
    if(role==='teacher'){teacher(bar);return;}
    if(role==='solo'){
      app.classList.add('class-entry');
      button(bar,'教师课堂','Teach',()=>location.href=href('teacher',''));
      const code=el('input');code.placeholder='课堂码 / Class code';code.maxLength=6;bar.append(code);
      button(bar,'加入课堂','Join class',()=>{if(code.value.trim())location.href=href('student',code.value.trim().toUpperCase());});return;
    }
    if(!['student','project'].includes(role)){notice('Invalid mode');return;}
    overlay=el('div','class-overlay');overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
    likedCount=el('div','class-like-count');overlay.append(likedCount);
    if(role==='project'){app.classList.add('class-project-status');bar.hidden=true;}
    else{
      const switcher=button(document.body,'课堂互动','Class interaction',()=>{app.hidden=!app.hidden;});switcher.className='class-launcher';app.hidden=true;
      button(bar,'收起','Close',()=>{app.hidden=true;});
      followButton=button(bar,'回到老师当前页','Follow teacher',()=>{follow=true;applyPage();});
      const reactions=el('div','class-buttons');app.append(reactions);
      likeButton=button(reactions,'👍 点赞','👍 Like',()=>submit('like'));
      const choices=[['understood','听懂了','Understood'],['confused','没听懂','Confused'],['slower','慢一点','Slower'],['example','想看例子','Example please'],['','撤回状态','Withdraw']];
      for(const [kind,zh,en]of choices)button(reactions,zh,en,()=>submit('feedback',{kind,page:PPTDeck.current()+1}));
      app.append(label(el('p'),'文字问题仅教师可见；不进入投影弹幕。','Questions go to the teacher, not the projection.'));
      studentText=el('textarea');studentText.maxLength=500;studentText.setAttribute('aria-label','课堂问题 / Question');app.append(studentText);
      button(app,'提交问题','Send question',async()=>{await submit('question',{text:studentText.value,page:PPTDeck.current()+1});studentText.value='';});
      app.append(label(el('p'),'弹幕发送后会显示在全班投影上（最多 60 字）。','Danmaku is public on the class projection (60 characters).'));
      danText=el('input');danText.maxLength=60;danText.setAttribute('aria-label','公开弹幕 / Public danmaku');app.append(danText);
      danButton=button(app,'发送弹幕','Send danmaku',async()=>{await submit('danmaku',{text:danText.value});danText.value='';});
      app.append(label(el('p'),'匿名加入，不代表网络层不可识别。AI 私聊不会自动分享给教师。','Anonymous participation is not network anonymity. AI chats are not automatically shared.'));
    }
    join(room).then(()=>{window.dispatchEvent(new Event('classroom-ready'));poll();}).catch(e=>{app.hidden=false;notice(e.message);});
  }
  async function submit(action,data={}){
    await api(action,{room,requestId:id(),...data});notice(L('已送达','Delivered'));
  }
  async function control(op,data={}){await api('control',{room,op,...data});await refresh();}
  function applyPage(){if(!state||(!follow&&role!=='project'))return;applying=true;PPTDeck.navigate(state.page-1);applying=false;}
  function clearAnimations(){overlay?.querySelectorAll('.class-float,.class-danmaku').forEach(n=>n.remove());}
  function animate(events){
    if(role!=='project'||!state||document.hidden)return;
    const likes=state.likes?events.filter(e=>e.kind==='like').length:0;
    if(likes){const n=el('div','class-float','👍 +'+likes);if(overlay.querySelectorAll('.class-float').length>=3)overlay.querySelector('.class-float').remove();overlay.append(n);setTimeout(()=>n.remove(),2000);}
    if(state.danmaku)for(const event of events.filter(e=>e.kind==='danmaku')){
      const active=[...overlay.querySelectorAll('.class-danmaku')];if(active.length>=2)continue;
      const lane=active.some(n=>n.dataset.lane==='0')?1:0;
      const n=el('div','class-danmaku',event.text);n.dataset.lane=String(lane);n.style.top=`calc(var(--header-h, 70px) + ${12+lane*42}px)`;overlay.append(n);setTimeout(()=>n.remove(),8000);
    }
  }
  async function refresh(){
    if(!room)return;
    const next=await api('state',null,{room,role,teacher:role==='teacher'?'1':'0',since:disconnected?-1:cursor,boot});
    const changed=!state||state.epoch!==next.epoch||state.boot!==next.boot||state.page!==next.page;
    if(changed||disconnected)clearAnimations();
    const play=!changed&&!disconnected;
    state=next;cursor=next.cursor;boot=next.boot;disconnected=false;
    window.dispatchEvent(new CustomEvent('classroom-state',{detail:{room,ended:!!state.ended}}));
    if(role==='teacher')renderTeacher();else{
      applyPage();
      notice(state.ended?L('课堂已结束；学习记录仍在本机。','Class ended; local learning records remain available.'):
        `${state.title} · ${L('老师在第','Teacher: slide')} ${state.page} / ${state.titles.length} · ${follow?L('跟随中','Following'):L('自由翻页','Browsing freely')}`);
      if(role==='project')likedCount.textContent=state.likes?'👍 '+(state.likeCounts[state.page]||0):'';
      if(likeButton)likeButton.disabled=!state.likes||!!state.ended;
      if(danButton)danButton.disabled=!state.danmaku||!!state.ended||state.muted;
      if(danText)danText.placeholder=state.danmaku?L('公开弹幕','Public message'):L('老师已关闭弹幕','Danmaku disabled by teacher');
      if(play)animate(next.events);
    }
  }
  async function poll(){try{await refresh();}catch(e){disconnected=true;clearAnimations();notice(L('连接中断：','Disconnected: ')+e.message);}setTimeout(poll,2000);}
  function teacher(bar){
    app.append(label(el('h1'),'教师控制台','Teacher console'));
    const login=el('form','class-bar');const password=el('input');password.type='password';password.autocomplete='current-password';password.placeholder='教师口令 / Teacher password';login.append(password);
    const enter=label(el('button'),'登录','Sign in');enter.type='submit';login.append(enter);app.append(login);
    login.onsubmit=async e=>{e.preventDefault();try{await api('login',{password:password.value});password.value='';login.hidden=true;await loadRooms();}catch(err){notice(err.message);}};
    button(bar,'退出登录','Sign out',async()=>{await api('logout',{});location.reload();});
    const create=el('div','class-bar');const title=el('input');title.maxLength=100;title.placeholder='课堂名称 / Class title';create.append(title);
    button(create,'创建课堂','Create class',async()=>{const result=await api('create',{title:title.value});room=result.room;await loadRooms();await refresh();});app.append(create);
    teacherList=el('div','class-bar');app.append(teacherList);
    const links=el('div','class-links');links.id='classLinks';app.append(links);
    const controls=el('div','class-bar');controls.id='classTeacherControls';app.append(controls);
    pageSelect=el('select');pageSelect.setAttribute('aria-label','教师页码 / Teacher slide');pageSelect.onchange=()=>control('page',{page:Number(pageSelect.value)}).catch(e=>notice(e.message));controls.append(pageSelect);
    button(controls,'上一页','Previous',()=>control('page',{page:Math.max(1,state.page-1)}));
    button(controls,'下一页','Next',()=>control('page',{page:Math.min(state.titles.length,state.page+1)}));
    toggleLike=button(controls,'点赞','Likes',()=>control('likes',{enabled:!state.likes}));
    toggleDanmaku=button(controls,'弹幕','Danmaku',()=>control('danmaku',{enabled:!state.danmaku}));
    button(controls,'清屏','Clear projection',()=>control('clear'));
    button(controls,'结束课堂','End class',async()=>{if(confirm(L('结束后不再接收反馈，确定？','End this class and stop receiving feedback?')))await control('end');});
    button(controls,'删除课堂','Delete class',async()=>{if(confirm(L('永久删除本课堂反馈和统计？','Permanently delete this class and its feedback?'))){await control('delete');room='';state=null;await loadRooms();}});
    button(controls,'导出 JSON','Export JSON',()=>exportClass(false));button(controls,'导出 CSV','Export CSV',()=>exportClass(true));
    controls.querySelectorAll('button,select').forEach(node=>node.disabled=true);
    summary=el('div','class-summary');app.append(summary);
    filters=el('select');filters.setAttribute('aria-label','按页筛选 / Filter slides');filters.onchange=renderTeacher;app.append(filters);
    posts=el('div','class-posts');app.append(posts);
    window.PPTImprovements?.mount(app);
    loadRooms().then(()=>{login.hidden=true;teacher.started=true;poll();}).catch(()=>notice(L('请使用教师口令登录；仅可信内网使用。','Sign in with the teacher password; trusted LAN only.')));
    // Start polling after a login as well, without creating duplicate timers.
    login.addEventListener('submit',()=>{if(!teacher.started){teacher.started=true;setTimeout(poll,2000);}});
  }
  async function loadRooms(){
    const data=await api('rooms',null);teacherList.replaceChildren();
    for(const item of data.rooms){const b=el('button','',`${item.code} · ${item.title}${item.ended?' ✓':''}`);b.onclick=()=>{room=item.code;state=null;disconnected=true;refresh().catch(e=>notice(e.message));};teacherList.append(b);}
    if(!room&&data.rooms.length)room=data.rooms[0].code;
    if(!room)notice(L('已登录，请创建课堂。','Signed in. Create a classroom to begin.'));
  }
  function renderTeacher(){
    if(!state)return;
    document.getElementById('classTeacherControls').querySelectorAll('button,select').forEach(node=>node.disabled=false);
    notice(`${state.title} · ${room} · ${state.ended?L('已结束','Ended'):L('进行中','Live')} · ${L('在线学生','Online students')}: ${state.online}`);
    const links=document.getElementById('classLinks');
    if(links.dataset.room!==room){
      links.dataset.room=room;links.replaceChildren();
      for(const [mode,name]of [['student','学生 / Student'],['project','投影或预览 / Projection or preview']]){const a=el('a','',name);a.href=href(mode,room);a.target='_blank';a.rel='noopener';links.append(a);}
      const code=el('strong','',room);links.append(code);
      const joinURL=location.origin+href('student',room);links.append(el('code','',joinURL));
      const qr=qrcode(0,'M');qr.addData(joinURL);qr.make();const svg=el('div','class-qr');svg.innerHTML=qr.createSvgTag({cellSize:3,margin:4,scalable:true});links.append(svg);
      pageSelect.replaceChildren();filters.replaceChildren(new Option(L('所有页','All slides'),''));
      state.titles.forEach((title,i)=>{pageSelect.add(new Option(`${i+1} · ${title}`,i+1));filters.add(new Option(`${i+1} · ${title}`,i+1));});
    }
    pageSelect.value=state.page;
    toggleLike.textContent=state.likes?L('关闭点赞','Disable likes'):L('开启点赞','Enable likes');
    toggleDanmaku.textContent=state.danmaku?L('关闭弹幕','Disable danmaku'):L('开启弹幕','Enable danmaku');
    const selected=Number(filters.value)||state.page;
    const feedback=state.feedback.filter(x=>x.page===selected), now=Date.now()/1000;
    const kinds=[['understood','听懂','Understood'],['confused','困惑','Confused'],['slower','慢一点','Slower'],['example','例子','Examples']];
    summary.replaceChildren(el('p','',`${L('第','Slide')} ${selected} · 👍 ${state.likeCounts[selected]||0} · ${L('全课点赞次数','Total likes (not people)')}: ${Object.values(state.likeCounts).reduce((a,b)=>a+b,0)}`));
    for(const [kind,zh,en]of kinds){const active=feedback.filter(x=>x.kind===kind&&x.online&&now-x.at<=120).length;const old=feedback.filter(x=>x.kind===kind&&(!x.online||now-x.at>120)).length;summary.append(el('span','class-stat',`${L(zh,en)}: ${active} (${state.online?Math.round(active/state.online*100):0}%) · ${L('较早/离线','Older/offline')}: ${old}`));}
    const signature=JSON.stringify([state.posts,filters.value,PPTI18n.language]);if(posts.dataset.signature===signature)return;posts.dataset.signature=signature;
    posts.replaceChildren();for(const post of state.posts.filter(x=>!filters.value||x.page===Number(filters.value))){
      const card=el('article','class-post');card.append(el('small','',`${post.kind==='danmaku'?L('弹幕','Danmaku'):L('问题','Question')} · ${post.page} · ${new Date(post.at*1000).toLocaleTimeString()} · ${post.member.slice(0,6)}${post.answered?' ✓':''}`),el('p','',post.text));
      button(card,'已回应','Mark answered',()=>control('answer',{id:post.id}));button(card,'删除','Remove',()=>control('remove',{id:post.id}));button(card,'禁言本堂课','Mute for class',()=>control('mute',{id:post.id}));posts.append(card);
    }
  }
  async function exportClass(csv){
    const data=await api('export',null,{room,teacher:'1'});
    if(!csv){showDataDownload(JSON.stringify(data,null,2),`class-${room}.json`,'application/json');return;}
    const rows=[['kind','page','member','text / count','time','answered'],...data.posts.map(p=>[p.kind,p.page,p.member,p.text,p.at,p.answered]),...data.feedback.map(p=>['feedback',p.page,p.member,p.kind,p.at,'']),...data.likes.map(p=>['likes',p.page,'',p.count,'',''])];
    const safe=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    showDataDownload('\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n'),`class-${room}.csv`,'text/csv');
  }
  window.PPTClassroom={role, get room(){return room;},headers, async selectRoom(code){room=code;state=null;await loadRooms();await refresh();}, async share(message){
    if(role!=='student'||!token)throw Error(L('请先加入学生课堂','Join a class as a student first'));
    const text=prompt(L('仅发送以下片段给老师（最多 500 字），确认后提交：','Only this excerpt will be shared with the teacher (500 characters):'),message.text.slice(0,500));
    if(text!==null)await submit('question',{text,page:message.page?.number||PPTDeck.current()+1});
  }};
  window.addEventListener('ppt-slide-change',()=>{if(state&&!applying&&role==='student')follow=false;});
  window.addEventListener('ppt-language-change',()=>{
    labels.forEach(fn=>fn());
    const pairs=[['请使用教师口令登录；仅可信内网使用。','Sign in with the teacher password; trusted LAN only.'],['已登录，请创建课堂。','Signed in. Create a classroom to begin.'],['已送达','Delivered']];
    for(const pair of pairs)if(status&&pair.includes(status.textContent))status.textContent=L(...pair);
    if(role==='teacher')renderTeacher();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){disconnected=true;clearAnimations();}});
  window.addEventListener('offline',()=>{disconnected=true;clearAnimations();});
  document.addEventListener('DOMContentLoaded',mount);
})();
