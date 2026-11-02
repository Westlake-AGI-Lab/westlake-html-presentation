import { motion } from './student-integrations.js';
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const words = {
    student:['Student','学生'],progress:['My progress','我的进度'],discussions:['Discussions','讨论'],
    courses:['Courses','课程'],workspace:['Your space to understand.','在这里，理解每一个新想法。'],workspaceTitle:['Learning workspace','学习工作区'],
    heading:['Your courses','我的课程'],description:['Choose a subject. Find your next idea.','选择一门课程，开始探索新的知识。'],
    all:['All courses','全部课程'],math:['Mathematics','数学'],cs:['Computer science','计算机科学'],loading:['Loading courses…','正在加载课程…'],
    sampleNote:['Course materials & teaching samples · Not an official course catalog','课程资料与教学示例 · 非官方课程目录'],lectureList:['COURSE LECTURES','课程讲义'],
    lectureNote:['Samples open in self-study mode. The existing Linear Algebra demo retains its own practice and class quiz.','示例以自学模式打开。原有线性代数演示保留练习与课堂测验。']
  };
  const paths = {
    cpu:'<rect x="16" y="16" width="32" height="32" rx="5"/><rect x="24" y="24" width="16" height="16" rx="2"/><path d="M24 8v8m16-8v8M24 48v8m16-8v8M8 24h8m-8 16h8m32-16h8m-8 16h8"/>',
    matrix:'<path d="M19 12h-8v40h8m26-40h8v40h-8M25 22h1m12 0h1M25 32h1m12 0h1M25 42h1m12 0h1"/>',
    curve:'<path d="M12 10v43h43M17 45c8 0 10-3 14-14s10-17 23-17M29 50l19-24"/><circle cx="37" cy="36" r="2"/>',
    tree:'<rect x="25" y="8" width="15" height="12" rx="3"/><rect x="7" y="43" width="15" height="12" rx="3"/><rect x="42" y="43" width="15" height="12" rx="3"/><path d="M32.5 20v11m-18 12V31h36v12"/>'
  };
  const icon = name => '<svg viewBox="0 0 64 64" aria-hidden="true">'+paths[name]+'</svg>';
  const arrow = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5"/></svg>';
  const make = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  let lang='en', data, filter='all', selected;
  const cards = new Map();
  let firstCards = true, filterVersion = 0;
  const filterPill = make('span','filter-indicator');
  filterPill.setAttribute('aria-hidden','true');
  document.querySelector('.catalog-filters').prepend(filterPill);
  function movePill(animate = true) {
    const button=document.querySelector('[data-filter][aria-pressed=true]');
    if (!button) return;
    filterPill.style.transitionDuration = animate && motion.canMove() ? '' : '0ms';
    filterPill.style.transform=`translateX(${button.offsetLeft-4}px) scaleX(${button.offsetWidth/160})`;
  }
  addEventListener('resize',()=>movePill(false));
  document.fonts.ready.then(()=>movePill(false));
  try {lang=localStorage.getItem('westlake-ui-language')==='zh'?'zh':'en';} catch (_) {}
  const L=(en,zh)=>lang==='en'?en:zh;
  function courseRecords(course) {
    try {
      const saved=JSON.parse(localStorage.getItem('westlake-study-progress-v1')||'{}');
      const rows=course.lectures.map(l=>saved.lectures?.[course.id+'/'+l.id]).filter(r=>r&&Number.isFinite(r.updatedAt)&&r.updatedAt>0&&r.updatedAt<=Date.now());
      return {count:rows.length,last:rows.length?Math.max(...rows.map(r=>r.updatedAt)):0};
    } catch (_) {return {count:0,last:0};}
  }
  function render() {
    document.documentElement.lang=lang==='en'?'en':'zh-CN';
    document.querySelectorAll('[data-label]').forEach(n=>n.textContent=words[n.dataset.label][lang==='en'?0:1]);
    $('catalogLanguage').textContent=L('中文','English');
    $('courseSearch').placeholder=L('Search courses or lectures','搜索课程或讲义');
    $('courseSearch').setAttribute('aria-label',L('Search courses or lectures','搜索课程或讲义'));
    $('closeLectures').setAttribute('aria-label',L('Close lecture list','关闭讲义列表'));
    movePill();
    if(!data)return;
    const query=$('courseSearch').value.toLocaleLowerCase().trim();
    const courses=data.courses.filter(c=>(filter==='all'||c.category===filter)&&(!query||JSON.stringify(c).toLocaleLowerCase().includes(query)));
    $('courseCount').textContent=L(`${courses.length} courses`,`${courses.length} 门课程`);
    $('catalogStatus').textContent=courses.length?'':L('No matching courses. Try another search.','没有匹配的课程，请尝试其他关键词。');
    $('catalogStatus').hidden=Boolean(courses.length);
    const initial = firstCards;
    if (!initial) for (const {element} of cards.values()) {element.classList.remove('is-revealing');element.style.removeProperty('will-change');}
    data.courses.forEach((course,index)=>{
      const records=courseRecords(course);
      const signature=lang+JSON.stringify(records);
      const cached=cards.get(course.id);
      if (cached?.signature===signature) return;
      const card=cached?.element||make('article','course-card '+course.color);
      card.dataset.courseId=course.id;
      card.replaceChildren();
      const cover=make('div','course-cover');cover.innerHTML=icon(course.icon);
      cover.append(make('span','course-header-count',L(`${course.lectures.length} lectures`,`${course.lectures.length} 份讲义`)));
      const state=make('div','course-state');
      state.append(make('strong','',L(`${records.count}/${course.lectures.length} with study records`,`${records.count}/${course.lectures.length} 份有学习记录`)),make('span','',records.last?L('Last activity: ','最近学习：')+new Intl.DateTimeFormat(lang==='en'?'en-GB':'zh-CN',{month:'short',day:'numeric'}).format(records.last):L('No study activity yet','尚无学习记录')));
      cover.append(state);
      const body=make('div','course-body');body.append(make('p','course-category',course.category==='Mathematics'?L('Mathematics','数学'):course.category==='Computer science'?L('Computer science','计算机科学'):L('Other','其他')));
      const title=make('h2','course-title',course.title);body.append(title,make('p','course-zh',course.zh));
      body.append(make('p','course-code',course.code?course.code+' · '+course.term:L('Introductory teaching samples','入门教学示例')));
      body.append(make('p','course-summary',course.description));
      const bottom=make('div','course-card-footer');bottom.append(make('span','',course.lectures.some(l=>l.source)?L('Course materials','课程资料'):L('Teaching samples','教学示例')));
      const cue=make('span','course-open',L('View lectures','查看讲义'));cue.insertAdjacentHTML('beforeend',arrow);bottom.append(cue);body.append(bottom);
      const action=make('button','course-card-action');action.type='button';action.setAttribute('aria-label',course.title);action.setAttribute('aria-haspopup','dialog');action.onclick=()=>open(course);
      card.append(cover,body,action);cards.set(course.id,{element:card,signature});
    });
    if (initial) {
      const elements=data.courses.map(c=>cards.get(c.id).element);
      $('courseGrid').append(...elements);
      motion.reveal(elements,{stagger:60,duration:300,rise:12});
      firstCards=false;
    }
    updateVisibleCards(courses, initial);
    $('currentPresentation').hidden=data.current.isEigen;
    $('currentPresentation').replaceChildren(document.createTextNode(L('Looking for your existing presentation? ','查看原有演示？ ')));
    const original=make('a','',L('Open current presentation →','打开原有演示 →'));original.href=data.current.href;$('currentPresentation').append(original);
    if(selected)fillLectures(selected);
  }
  function updateVisibleCards(matches, initial) {
    const version=++filterVersion;
    const wanted=new Set(matches.map(c=>c.id));
    const grid=$('courseGrid');
    const showing=[...grid.children];
    // Keep DOM nodes stable: filter changes never replay the entrance.
    for (const {element} of cards.values()) {
      const show=wanted.has(element.dataset.courseId);
      element.inert=!show;
      if (show) {
        if (!element.isConnected) {
          const next=data.courses.slice(data.courses.findIndex(c=>c.id===element.dataset.courseId)+1).map(c=>cards.get(c.id).element).find(el=>el.parentElement===grid);
          grid.insertBefore(element,next||null);
          motion.fade(element,1,150,0);
        } else if (!initial) motion.fade(element,1,150);
      } else if (showing.includes(element)) {
        motion.fade(element,0,150).then(()=>{
          if (version===filterVersion&&!wanted.has(element.dataset.courseId)) element.remove();
        });
      }
    }
  }
  function fillLectures(course) {
    $('lectureDialogTitle').textContent=course.title;
    $('lectureDialogDescription').textContent=course.description;
    const meta=$('lectureCourseMeta');meta.replaceChildren();meta.hidden=!course.code;
    if(course.code){meta.append(make('span','',course.code+' · '+course.term),make('span','',L('Instructor: ','讲师：')+course.instructor));const canvas=make('a','',L('Open in Canvas ↗','在 Canvas 中打开 ↗'));canvas.href=course.canvas;canvas.target='_blank';canvas.rel='noopener noreferrer';meta.append(canvas);}
    $('lectureList').replaceChildren();
    let sampleHeading=false;
    for(const lecture of course.lectures){
      if(!lecture.source&&!lecture.existing&&!sampleHeading&&course.lectures.some(l=>l.source)){$('lectureList').append(make('h3','lecture-section-label',L('Teaching samples','教学示例')));sampleHeading=true;}

      const row=make('a','lecture-row'+(lecture.source?' source-lecture-link':''));row.href=lecture.href;if(lecture.source&&lecture.preview){const preview=make('img','lecture-row-thumbnail');preview.src=lecture.preview;preview.alt=L('Lecture cover','讲义封面');row.append(preview);}
      const copy=make('div','lecture-row-copy');copy.append(make('strong','',lecture.title),make('p','',lecture.summary),make('small','',lecture.source?L(`${lecture.slideCount} source slides · Lecture ${lecture.number}`,`${lecture.slideCount} 页原稿 · 第 ${lecture.number} 讲`):lecture.existing?L('16 slides · Animated demo · Practice & class quiz','16 页 · 动画演示 · 练习与课堂测验'):L(`${lecture.slideCount} slides · Self-study sample`,`${lecture.slideCount} 页 · 自学示例`)));
      row.append(make('span','lecture-row-number',lecture.number),copy,make('span','lecture-row-arrow','↗'));$('lectureList').append(row);
    }
  }
  function open(course) {selected=course;fillLectures(course);$('lectureDialog').showModal();}
  $('closeLectures').onclick=()=>$('lectureDialog').close();
  $('lectureDialog').addEventListener('click',e=>{if(e.target===$('lectureDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  $('lectureDialog').addEventListener('close',()=>{selected=null;});
  $('courseSearch').addEventListener('input',render);
  document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
  $('catalogLanguage').onclick=()=>{lang=lang==='en'?'zh':'en';try{localStorage.setItem('westlake-ui-language',lang);}catch(_){}render();};
  addEventListener('storage',render);
  addEventListener('pageshow',render);
  render();
  fetch('api/courses').then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json();}).then(async result=>{await document.fonts.ready;data=result;render();}).catch(()=>{
    $('catalogStatus').textContent=L('Cannot load courses. Start the local Python server, then reload this page.','课程加载失败。请启动本地 Python 服务后刷新页面。');
  });
})();
