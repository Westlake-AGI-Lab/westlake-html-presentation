(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const words = {
    student:['Student','学生'],
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
  try {lang=localStorage.getItem('westlake-ui-language')==='zh'?'zh':'en';} catch (_) {}
  const L=(en,zh)=>lang==='en'?en:zh;
  function render() {
    document.documentElement.lang=lang==='en'?'en':'zh-CN';
    document.querySelectorAll('[data-label]').forEach(n=>n.textContent=words[n.dataset.label][lang==='en'?0:1]);
    $('catalogLanguage').textContent=L('中文','English');
    $('courseSearch').placeholder=L('Search courses or lectures','搜索课程或讲义');
    $('courseSearch').setAttribute('aria-label',L('Search courses or lectures','搜索课程或讲义'));
    $('closeLectures').setAttribute('aria-label',L('Close lecture list','关闭讲义列表'));
    if(!data)return;
    const query=$('courseSearch').value.toLocaleLowerCase().trim();
    const courses=data.courses.filter(c=>(filter==='all'||c.category===filter)&&(!query||JSON.stringify(c).toLocaleLowerCase().includes(query)));
    $('courseCount').textContent=L(`${courses.length} courses`,`${courses.length} 门课程`);
    $('catalogStatus').textContent=courses.length?'':L('No matching courses. Try another search.','没有匹配的课程，请尝试其他关键词。');
    $('catalogStatus').hidden=Boolean(courses.length);
    $('courseGrid').replaceChildren();
    courses.forEach((course,index)=>{
      const card=make('article','course-card '+course.color);
      const cover=make('button','course-cover');cover.type='button';cover.innerHTML=icon(course.icon);cover.append(make('span','course-number',`0${data.courses.indexOf(course)+1} / ${course.category==='Mathematics'?'MATH':'CS'}`));cover.setAttribute('aria-label',L('Open lectures: ','打开讲义：')+course.title);cover.onclick=()=>open(course);
      const body=make('div','course-body');body.append(make('p','course-category',course.category==='Mathematics'?L('Mathematics','数学'):L('Computer science','计算机科学')));
      const title=make('h2','course-title'),titleButton=make('button','',course.title);titleButton.type='button';titleButton.onclick=()=>open(course);title.append(titleButton);body.append(title,make('p','course-zh',course.zh));if(course.code)body.append(make('p','course-code',course.code+' · '+course.term));body.append(make('p','course-summary',course.description));
      const bottom=make('div','course-card-footer');const count=course.lectures.length;bottom.append(make('span','',L(`${count} ${count===1?'lecture':'lectures'}${course.lectures.some(l=>l.source)?' · Course material':' · Teaching samples'}`,`${count} 份讲义 · ${course.lectures.some(l=>l.source)?'含课程资料':'教学示例'}`)));
      const button=make('button','course-open',L('View lectures','查看讲义'));button.type='button';button.insertAdjacentHTML('beforeend',arrow);button.onclick=()=>open(course);bottom.append(button);body.append(bottom);card.append(cover,body);$('courseGrid').append(card);
    });
    $('currentPresentation').hidden=data.current.isEigen;
    $('currentPresentation').replaceChildren(document.createTextNode(L('Looking for your existing presentation? ','查看原有演示？ ')));
    const original=make('a','',L('Open current presentation →','打开原有演示 →'));original.href=data.current.href;$('currentPresentation').append(original);
    if(selected)fillLectures(selected);
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
  render();
  fetch('api/courses').then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json();}).then(result=>{data=result;render();}).catch(()=>{
    $('catalogStatus').textContent=L('Cannot load courses. Start the local Python server, then reload this page.','课程加载失败。请启动本地 Python 服务后刷新页面。');
  });
})();
