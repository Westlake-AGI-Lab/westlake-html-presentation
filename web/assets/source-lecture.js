/* Original lecture artwork with source-linked navigation and a unified presentation workspace. */
(() => {
  'use strict';
  const dataNode=document.getElementById('sourceLectureData');
  if(!dataNode)return;
  const info=JSON.parse(dataNode.textContent),slides=[...document.querySelectorAll('#deck > .slide')];
  const $=id=>document.getElementById(id),make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const L=(en,zh)=>window.PPTI18n?.language==='zh'?zh:en;
  const icons={
    grid:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
    menu:'<path d="M4 5h16M4 12h16M4 19h16"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
    minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'
  };
  const svg=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
  const labels=[];
  function label(node,en,zh){labels.push(()=>node.textContent=L(en,zh));node.textContent=L(en,zh);return node;}
  function action(icon,en,zh,fn,cls='source-icon-button'){
    const b=make('button',cls);b.type='button';if(icon)b.innerHTML=svg(icon);
    const text=make('span');label(text,en,zh);b.append(text);b.onclick=fn;labels.push(()=>{b.title=L(en,zh);b.setAttribute('aria-label',L(en,zh));});return b;
  }
  let zoom=1,current=window.PPTDeck.current();
  const header=make('header','source-header');
  const brand=make('a','source-home');brand.href='courses.html';brand.innerHTML=svg('grid');brand.append(label(make('span'),'Courses','课程'));
  const course=make('div','source-course-heading');course.append(make('strong','',info.course),make('span','',[info.code,info.term].filter(Boolean).join(' · ')||L('Teaching sample · Self-study','教学示例 · 自学')));
  const tools=make('div','source-header-tools');
  const download=make('a','source-download');download.href=info.file;download.download='2610CST3004-Lecture07.pdf';download.innerHTML=svg('download');download.append(label(make('span'),'Original PDF','原始 PDF'));
  const language=action(null,'中文','English',()=>PPTI18n.setLanguage(PPTI18n.language==='en'?'zh':'en'),'source-language');language.id='sourceLanguage';
  // Keep the original launcher node and its focus/close behavior, but fit it into the toolbar.
  const ask=$('agentLauncher');ask.classList.add('source-ask');
  if(info.file)tools.append(download);tools.append(language,ask);header.append(brand,course,tools);document.body.append(header);

  const heading=make('section','source-heading');
  const outlineButton=action('menu','Contents','目录',()=>{if(narrow.matches){drawer.showModal();outlineButton.setAttribute('aria-expanded','true');}else{document.body.classList.toggle('source-outline-collapsed');outlineButton.setAttribute('aria-expanded',String(!document.body.classList.contains('source-outline-collapsed')));fit();}});
  outlineButton.id='sourceOutlineToggle';outlineButton.setAttribute('aria-controls','sourceOutline');
  const titleBlock=make('div','source-title-block');titleBlock.append(make('h1','',info.title),make('p','',[L('Lecture ','第 ')+info.number+(L('',' 讲')),info.instructor,info.term].filter(Boolean).join(' · ')));
  const more=make('details','source-more');const summary=make('summary');summary.innerHTML=svg('more');summary.setAttribute('aria-label',L('More presentation tools','更多演示工具'));more.append(summary);
  for(const [id,en,zh]of [['editButton',info.isPdf?'Edit annotations E':'Edit slide E','编辑 E'],['notesButton','Notes N','讲稿 N'],['fullscreenButton','Fullscreen','全屏'],['presenterButton','Presenter view','演讲者视图'],['printButton','Print slides','打印幻灯片']])more.append(action(null,en,zh,()=>{$(id)?.click();more.open=false;syncTools();},'source-menu-action'));
  more.append(action(null,'My progress','我的进度',()=>{location.href='progress.html';},'source-menu-action'));
  more.append(action(null,'Discussions','讨论',()=>{location.href='discussions.html';},'source-menu-action'));
  heading.append(outlineButton,titleBlock,more);document.body.append(heading);

  const sidebar=make('aside','source-sidebar');sidebar.setAttribute('aria-label',L('Lecture contents','讲义目录'));document.body.append(sidebar);
  const drawer=make('dialog','source-outline-drawer');drawer.id='sourceOutline';drawer.setAttribute('aria-label',L('Lecture contents','讲义目录'));document.body.append(drawer);
  const outline=make('div','source-outline-body'),outlineTop=make('div','source-outline-heading');
  outlineTop.append(label(make('h2'),'Lecture contents','讲义目录'),action('close','Close contents','关闭目录',()=>drawer.close()));
  const searchBox=make('label','source-outline-search');searchBox.innerHTML=svg('search');const search=make('input');search.type='search';search.id='sourceOutlineSearch';searchBox.append(search);
  const nav=make('nav','source-page-list');nav.setAttribute('aria-label',L('Source pages','原稿页面'));
  const empty=make('p','source-no-matches');empty.hidden=true;empty.setAttribute('role','status');
  const buttons=[];let group='';
  const groupNames={'Introduction':'导言','Foundations':'基础','Scoreboarding':'记分板','Tomasulo':'Tomasulo','Modern cores':'现代处理器','References & glossary':'参考资料与术语'};
  for(const page of info.pages){
    if(page.group!==group){group=page.group;const h=make('h3','source-outline-group');h.dataset.group=group;label(h,group,groupNames[group]||group);nav.append(h);}
    const b=make('button','source-page-link');b.type='button';b.dataset.group=page.group;
    const thumb=make('img','source-page-thumb');if(page.thumbnail)thumb.src=page.thumbnail;else thumb.hidden=true;thumb.alt='';thumb.loading='lazy';thumb.width=64;thumb.height=36;
    const copy=make('span','source-page-link-copy');copy.append(make('span','source-page-number',String(page.page).padStart(2,'0')),make('span','',page.title));b.append(thumb,copy);b.onclick=()=>{PPTDeck.navigate(page.page-1);if(drawer.open)drawer.close();};buttons.push(b);nav.append(b);
  }
  const sourceNote=make('div','source-outline-credit');sourceNote.append(make('strong','',info.instructor||info.course),make('span','',(info.term?info.term+' · ':'')+info.pages.length+L(info.isPdf?' source slides':' slides',' 页')));
  outline.append(outlineTop,searchBox,empty,nav,sourceNote);sidebar.append(outline);
  search.addEventListener('input',()=>{
    const q=search.value.trim().toLocaleLowerCase();let count=0;
    buttons.forEach((b,i)=>{b.hidden=!((info.pages[i].title+' '+info.pages[i].page+' '+(slides[i].querySelector('.source-transcript')||slides[i]).textContent).toLocaleLowerCase().includes(q));if(!b.hidden)count++;});
    nav.querySelectorAll('h3').forEach(h=>h.hidden=!buttons.some(b=>b.dataset.group===h.dataset.group&&!b.hidden));empty.hidden=count>0;empty.textContent=L('No matching slides. Try another term.','没有匹配页面，请更换关键词。');
  });
  drawer.addEventListener('close',()=>{outlineButton.setAttribute('aria-expanded','false');outlineButton.focus();});
  drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)drawer.close();}});
  const narrow=matchMedia('(max-width: 900px)');
  function responsive(){if(narrow.matches){drawer.append(outline);outlineButton.setAttribute('aria-expanded',String(drawer.open));}else{if(drawer.open)drawer.close();sidebar.append(outline);outlineButton.setAttribute('aria-expanded',String(!document.body.classList.contains('source-outline-collapsed')));}fit();}
  narrow.addEventListener('change',responsive);

  const footer=make('footer','source-footer');
  const progress=$('progressFill').parentElement;footer.append(progress);
  const modes=make('div','source-study-tools');
  const editTool=action(null,'Edit E','编辑 E',()=>{$('editButton').click();syncTools();},'source-mode-button');editTool.id='sourceEdit';
  const notesTool=action(null,'Notes N','讲稿 N',()=>{$('notesButton').click();syncTools();},'source-mode-button');notesTool.id='sourceNotes';
  const highlightTool=action(null,'Highlight','荧光笔',()=>{if(info.isPdf){drawing=!drawing;document.body.classList.toggle('source-marking',drawing);markTools.hidden=!drawing;highlightTool.setAttribute('aria-pressed',String(drawing));}else{$('highlightToggle')?.click();}},'source-mode-button');highlightTool.id='sourceHighlight';labels.push(()=>highlightTool.setAttribute('aria-pressed',String(info.isPdf?drawing:document.body.classList.contains('highlighting'))));
  modes.append(editTool,notesTool,highlightTool);
  const notePanel=make('section','source-notes-panel');notePanel.hidden=true;notePanel.setAttribute('aria-label',L('Slide notes','幻灯片讲稿'));
  const noteHeading=label(make('h2'),'Slide notes','幻灯片讲稿');
  const noteClose=action('close','Close notes','关闭讲稿',()=>{$('notesButton').click();syncTools();notesTool.focus();});
  const noteText=make('textarea');noteText.id='sourceNoteText';noteText.setAttribute('aria-label',L('Notes for this slide','本页讲稿'));noteText.addEventListener('input',()=>{const original=slides[current].querySelector('.presenter-notes');original.textContent=noteText.value;original.dispatchEvent(new Event('input',{bubbles:true}));});
  const noteStatus=label(make('p'),'Changes are saved in this browser.','修改保存在此浏览器。');
  notePanel.append(noteHeading,noteClose,noteText,noteStatus);document.body.append(notePanel);
  function syncTools(){const editing=document.body.classList.contains('edit-mode'),notes=document.body.classList.contains('show-notes');editTool.setAttribute('aria-pressed',String(editing));editTool.querySelector('span').textContent=editing?L('Done E','完成 E'):L('Edit E','编辑 E');notesTool.setAttribute('aria-pressed',String(notes));highlightTool.setAttribute('aria-pressed',String(info.isPdf?drawing:document.body.classList.contains('highlighting')));notePanel.hidden=!notes;noteText.readOnly=!editing;noteText.value=slides[current].querySelector('.presenter-notes')?.textContent||'';noteStatus.textContent=editing?L(info.isPdf?'Personal annotations and notes are saved in this browser; the original PDF stays unchanged.':'Changes are saved in this browser.','修改保存在此浏览器。'):L('Choose Edit to change your notes.','选择编辑以修改讲稿。');previous.disabled=editing||current===0;next.disabled=editing||current===slides.length-1;jump.disabled=editing;}
  const navigation=make('form','source-navigation');navigation.onsubmit=e=>{e.preventDefault();const value=Number(jump.value);if(Number.isInteger(value)&&value>=1&&value<=slides.length){jump.removeAttribute('aria-invalid');PPTDeck.navigate(value-1);}else{jump.setAttribute('aria-invalid','true');jump.value=String(current+1);}};
  const previous=action('left','Previous slide','上一页',()=>PPTDeck.navigate(current-1));previous.id='sourcePrevious';
  const next=action('right','Next slide','下一页',()=>PPTDeck.navigate(current+1));next.id='sourceNext';
  const jumpLabel=make('label','source-jump');const jump=make('input');jump.type='number';jump.min=1;jump.max=slides.length;jump.inputMode='numeric';jump.id='sourcePageJump';
  jumpLabel.append(jump,make('span','',` / ${slides.length}`));navigation.append(previous,jumpLabel,next);
  const zoomTools=make('div','source-zoom');
  const minus=action('minus','Zoom out','缩小',()=>changeZoom(-.25)),plus=action('plus','Zoom in','放大',()=>changeZoom(.25));plus.id='sourceZoomIn';minus.id='sourceZoomOut';
  const fitButton=action('fit','Fit slide','适合窗口',()=>{zoom=1;fit();});fitButton.id='sourceFit';
  const zoomLabel=make('output','source-zoom-value','100%');zoomLabel.setAttribute('aria-live','polite');zoomTools.append(minus,zoomLabel,plus,fitButton);footer.append(modes,navigation,zoomTools);document.body.append(footer);
  const status=make('p','source-reader-status');status.setAttribute('role','status');status.id='sourcePageStatus';document.body.append(status);
  const notice=make('div','source-image-notice');notice.hidden=true;notice.setAttribute('role','status');
  const noticeText=make('span');notice.append(noticeText,action(null,'Retry image','重试图片',()=>{const img=slides[current].querySelector('img');img.src=img.getAttribute('src');notice.hidden=true;},'source-retry'));document.body.append(notice);
  slides.forEach((slide,i)=>{const img=slide.querySelector('.source-page-image');if(!img)return;img.addEventListener('error',()=>{slide.dataset.imageFailed='true';if(i===current)updateNotice();});img.addEventListener('load',()=>{delete slide.dataset.imageFailed;if(i===current)updateNotice();});});
  function updateNotice(){notice.hidden=!slides[current].dataset.imageFailed;noticeText.textContent=L('This slide image did not load. Retry or download the original PDF.','本页图片加载失败，请重试或下载原始 PDF。');}
  function changeZoom(delta){zoom=Math.max(.75,Math.min(3,zoom+delta));fit();}
  function fit(){
    const deck=$('deck'),rect=deck.getBoundingClientRect();
    for(const slide of slides){const image=slide.querySelector('.source-page-image');if(!image){slide.style.setProperty('--sample-zoom',zoom);continue;}const ratio=Number(image.getAttribute('width'))/Number(image.getAttribute('height'));image.style.setProperty('--source-image-width',Math.max(120,Math.min(rect.width-24,(rect.height-24)*ratio))*zoom+'px');}
    if(typeof zoomLabel!=='undefined')zoomLabel.textContent=Math.round(zoom*100)+'%';
    if(typeof minus!=='undefined'){minus.disabled=zoom<=.75;plus.disabled=zoom>=3;}
  }
  function update(){
    current=PPTDeck.current();const page=info.pages[current];buttons.forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));
    jump.value=current+1;previous.disabled=current===0;next.disabled=current===slides.length-1;
    slides[current].scrollTo(0,0);syncTools();
    status.textContent=L('Slide ','第 ')+(current+1)+L(' of ',' / ')+slides.length+': '+page.title;
    document.title=page.title+' · '+info.code;
    if(!search.value)buttons[current].scrollIntoView({block:'nearest'});
    updateNotice();fit();
  }
  function localize(){
    labels.forEach(fn=>fn());language.querySelector('span').textContent=L('中文','English');
    titleBlock.querySelector('p').textContent=[L('Lecture ','第 ')+info.number+(L('',' 讲')),info.instructor,info.term].filter(Boolean).join(' · ');
    search.placeholder=L('Find a slide or concept','搜索页面或概念');search.setAttribute('aria-label',L('Search lecture contents','搜索讲义目录'));jump.setAttribute('aria-label',L('Go to source page','跳转到原稿页码'));
    modes.setAttribute('aria-label',L('Slide tools','幻灯片工具'));syncTools();update();
  }
  // Controls and search must not trigger the presentation's letter/arrow shortcuts.
  for(const node of [header,heading,outline,footer,drawer]){node.addEventListener('keydown',e=>e.stopPropagation());node.addEventListener('touchend',e=>e.stopPropagation());}
  let drawing=false;
  const markTools=make('div','source-mark-tools');markTools.hidden=true;
  const markStatus=make('span');markStatus.setAttribute('role','status');
  const markKey='westlake-source-marks-v1:'+info.course+':'+info.title;
  let marks={};try{const saved=JSON.parse(localStorage.getItem(markKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))marks=saved;}catch(_){markStatus.textContent=L('Saved marks could not be read.','无法读取已保存标记。');}
  const valid=r=>Array.isArray(r)&&r.length===4&&r.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&r[0]+r[2]<=1.001&&r[1]+r[3]<=1.001;
  function currentMarks(){const key=String(current);if(!Array.isArray(marks[key]))marks[key]=[];marks[key]=marks[key].filter(valid).slice(0,200);return marks[key];}
  function saveMarks(){try{localStorage.setItem(markKey,JSON.stringify(marks));markStatus.textContent=L('Saved in this browser','已保存在此浏览器');}catch(_){markStatus.textContent=L('Storage unavailable; marks last only this session.','无法保存，标记仅保留在当前页面。');}paintMarks();window.dispatchEvent(new Event('ppt-source-highlights-change'));}
  const layers=[];
  function paintMarks(){layers.forEach((layer,i)=>{if(!layer)return;layer.replaceChildren();const values=i===current?currentMarks():Array.isArray(marks[i])?marks[i].filter(valid).slice(0,200):[];for(const r of values){const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');['x','y','width','height'].forEach((a,j)=>rect.setAttribute(a,String(r[j]*1000)));layer.append(rect);}});}
  markTools.append(action(null,'Highlight center','标记中央区域',()=>{if(currentMarks().length<200){currentMarks().push([.25,.45,.5,.08]);saveMarks();}},'source-mode-button'),action(null,'Undo','撤销',()=>{currentMarks().pop();saveMarks();},'source-mode-button'),action(null,'Clear page','清除此页',()=>{marks[current]=[];saveMarks();},'source-mode-button'),action('close','Close highlighter','关闭荧光笔',()=>highlightTool.click()),markStatus);document.body.append(markTools);
  if(info.isPdf)slides.forEach((slide,i)=>{
    const image=slide.querySelector('.source-page-image'),frame=make('div','source-image-frame');image.before(frame);frame.append(image);
    const layer=document.createElementNS('http://www.w3.org/2000/svg','svg');layer.setAttribute('viewBox','0 0 1000 1000');layer.setAttribute('preserveAspectRatio','none');layer.setAttribute('aria-hidden','true');layer.classList.add('source-mark-layer');frame.append(layer);layers[i]=layer;
    let start=null,pending=null;
    const point=e=>{const r=layer.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
    layer.addEventListener('pointerdown',e=>{if(!drawing||currentMarks().length>=200)return;e.preventDefault();start=point(e);pending=document.createElementNS('http://www.w3.org/2000/svg','rect');layer.append(pending);layer.setPointerCapture(e.pointerId);});
    layer.addEventListener('pointermove',e=>{if(!start)return;const p=point(e),r=[Math.min(p[0],start[0]),Math.min(p[1],start[1]),Math.abs(p[0]-start[0]),Math.abs(p[1]-start[1])];['x','y','width','height'].forEach((a,j)=>pending.setAttribute(a,r[j]*1000));});
    layer.addEventListener('pointerup',e=>{if(!start)return;const p=point(e),r=[Math.min(p[0],start[0]),Math.min(p[1],start[1]),Math.abs(p[0]-start[0]),Math.abs(p[1]-start[1])];start=null;if(r[2]>.003&&r[3]>.003){currentMarks().push(r);saveMarks();}else paintMarks();});
    layer.addEventListener('pointercancel',()=>{start=null;paintMarks();});
    for(const name of ['touchstart','touchend'])layer.addEventListener(name,e=>{if(drawing)e.stopPropagation();});
  });
  addEventListener('ppt-content-change',syncTools);addEventListener('ppt-slide-change',paintMarks);paintMarks();
  // Route shortcuts to the workspace tools before the hidden legacy chrome sees them.
  document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,[contenteditable=true],#agentPanel,dialog'))return;const k=e.key.toLowerCase();if(k==='g'){e.preventDefault();e.stopImmediatePropagation();outlineButton.click();}if(k==='h'){e.preventDefault();e.stopImmediatePropagation();highlightTool.click();}if(k==='escape'&&drawing){e.preventDefault();e.stopImmediatePropagation();highlightTool.click();} },true);
  addEventListener('resize',fit);addEventListener('ppt-slide-change',()=>{zoom=1;update();});addEventListener('ppt-language-change',localize);
  const observer=new MutationObserver(()=>{if(drawing&&document.body.matches('.edit-mode,.region-selecting,.agent-open')){drawing=false;document.body.classList.remove('source-marking');markTools.hidden=true;}if(!document.body.classList.contains('agent-open'))fit();syncTools();});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  responsive();localize();
})();
