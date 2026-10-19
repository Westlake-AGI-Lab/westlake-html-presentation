(() => {
  'use strict';
  const node = (tag, text, cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
  const classroom = () => window.PPTClassroom;
  let dialog, content, status, heading, generation=0, observedRoom='', reportOpen=false, reportData;
  async function api(action, data={}) {
    const response=await fetch('/api/classroom/quiz-'+action, {method:'POST',
      headers:{'Content-Type':'application/json',...classroom().headers()},
      body:JSON.stringify({room:classroom().room,...data}), signal:AbortSignal.timeout(15000)});
    const result=await response.json(); if(!response.ok)throw Error(result.error||`HTTP ${response.status}`); return result;
  }
  function button(parent,text,run,cls='') {
    const b=node('button',text,cls); b.type='button'; b.onclick=async()=>{
      b.disabled=true; status.textContent='';
      try { await run(); } catch(e) { status.textContent=e.message; } finally { b.disabled=false; }
    }; parent.append(b);return b;
  }
  function open(title) {
    generation++; reportOpen=false; heading.textContent=title; content.replaceChildren(); status.textContent='';
    if(!dialog.open)dialog.showModal(); return generation;
  }
  function paragraph(parent,text,cls='') {parent.append(node('p',text,cls));}
  function stat(parent,value,label) {
    const item=node('div',undefined,'quiz-stat');item.append(node('strong',String(value)),node('span',label));parent.append(item);return item;
  }
  function link(parent,text,url) {const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener';parent.append(a);return a;}
  function field(parent,title,value,type='text') {
    const label=node('label',undefined,'quiz-field'); label.append(node('span',title));
    const input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;
    label.append(input);parent.append(label);return input;
  }
  function download(data,name,type) {
    const url=URL.createObjectURL(new Blob([data],{type}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function gate() {
    open('Class quiz');
    paragraph(content,'Join a class to take its quiz.');
    const code=field(content,'Class code','');code.maxLength=6;
    button(content,'Join class',()=>{if(!/^[A-Z0-9]{6}$/.test(code.value.trim().toUpperCase()))throw Error('Enter a six-character class code');
      location.href='?mode=student&room='+encodeURIComponent(code.value.trim().toUpperCase());});
    const line=node('p');link(line,'Teacher console','?mode=teacher');content.append(line);
  }
  async function draft() {
    const ticket=open('Create a one-page quiz');
    if(!classroom().room){paragraph(content,'Create or select a class first.');return;}
    const {questions}=await api('bank');if(ticket!==generation)return;
    paragraph(content,'Linear algebra question bank · Teacher review required', 'quiz-muted');
    const title=field(content,'Quiz title','Linear algebra checkpoint');title.maxLength=100;
    const scope=node('div',undefined,'quiz-actions');content.append(scope);
    button(scope,'Select all',()=>{checks.forEach(c=>c.checked=true);updateSelection();});
    button(scope,'Current slide',()=>{
      const page=Number(document.querySelector('#classTeacherControls select')?.value)||PPTDeck.current()+1;
      checks.forEach((c,i)=>c.checked=questions[i].page===page);
      updateSelection();
      if(!checks.some(c=>c.checked))status.textContent='No question in the demo bank for this slide. Select questions from another slide.';
    });
    const selection=node('p',undefined,'quiz-selection-count');content.append(selection);
    const checks=[], editors=[];
    const updateSelection=()=>{const count=checks.filter(c=>c.checked).length;selection.textContent=`${count} of ${questions.length} questions selected · publish 1-5`;};
    questions.forEach((q,index)=>{
      const section=node('section',undefined,'quiz-question');
      const pick=node('label',undefined,'quiz-choice');const selected=node('input');selected.type='checkbox';selected.checked=index<3;
      checks.push(selected);selected.addEventListener('change',updateSelection);pick.append(selected,node('span',`Slide ${q.page} · ${document.querySelectorAll('.eigen-slide')[q.page-1].dataset.title}`));section.append(pick);
      const prompt=field(section,'Question',q.question,'textarea');prompt.maxLength=600;
      const options=q.options.map((value,j)=>{const row=node('label',undefined,'quiz-option-edit');const radio=node('input');radio.type='radio';radio.name='key-'+index;radio.value=j;radio.checked=j===q.correct;radio.setAttribute('aria-label',`Correct option ${j+1} for question ${index+1}`);
        const input=node('input');input.value=value;input.maxLength=300;input.setAttribute('aria-label',`Option ${j+1} for question ${index+1}`);row.append(radio,input);section.append(row);return {radio,input};});
      const explanation=field(section,'Explanation after closing',q.explanation,'textarea');explanation.maxLength=1000;
      editors.push(()=>({page:q.page,question:prompt.value,options:options.map(o=>o.input.value),correct:options.findIndex(o=>o.radio.checked),explanation:explanation.value}));
      content.append(section);
    });
    updateSelection();
    const review=node('label',undefined,'quiz-choice');const reviewed=node('input');reviewed.type='checkbox';review.append(reviewed,node('span','I reviewed the questions, sources and answer key.'));content.append(review);
    button(content,'Publish quiz',async()=>{if(!reviewed.checked)throw Error('Confirm your review before publishing');
      await api('publish',{title:title.value,reviewed:true,questions:editors.filter((_,i)=>checks[i].checked).map(f=>f())});await report();},'quiz-primary');
  }
  async function student() {
    if(classroom().role!=='student'||!classroom().room){gate();return;}
    const ticket=open('Class quiz');const data=await api('list');if(ticket!==generation)return;
    if(!data.quizzes.length){paragraph(content,'No quiz published yet.');button(content,'Refresh',student);return;}
    data.quizzes.forEach(q=>{
      const section=node('section',undefined,'quiz-session');section.append(node('h3',q.title));
      paragraph(section,`${q.questions.length} questions · ${q.closed?'Closed':q.submitted?'Submitted':'Open'}`,'quiz-muted');
      if(!q.enrolled&&!q.closed){
        paragraph(section,'Joining records your participation. Submitted choices are stored for this class; the teacher sees aggregate results. Your private chat is not included.');
        button(section,'Join this quiz',async()=>{await api('enroll',{id:q.id,consent:true});await student();},'quiz-primary');
      } else if(q.enrolled&&!q.closed&&!q.submitted) {
        const progress=node('div',undefined,'quiz-progress');progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');section.append(progress);
        const answers=q.questions.map((question,i)=>{
          const group=node('fieldset',undefined,'quiz-question');group.append(node('legend',`${i+1}. ${question.question}`));
          const source=node('p',undefined,'quiz-muted');link(source,`Slide ${question.page}`,location.origin+location.pathname+'#'+question.page);group.append(source);
          const options=question.options.map((option,j)=>{const label=node('label',undefined,'quiz-choice');const input=node('input');input.type='radio';input.name=q.id+'-'+i;input.value=j;input.addEventListener('change',()=>updateProgress());label.append(input,node('span',option));group.append(label);return input;});
          button(group,'Clear answer',()=>{options.forEach(o=>o.checked=false);updateProgress();},'quiz-clear');section.append(group);return options;
        });
        const updateProgress=()=>{const answered=answers.filter(options=>options.some(o=>o.checked)).length;progress.textContent=`${answered} of ${answers.length} answered · ${answers.length-answered} remaining`;};
        updateProgress();
        paragraph(section,'One submission. Unanswered questions are recorded as skipped. Answers are revealed after the quiz closes.','quiz-muted');
        const submitArea=node('div',undefined,'quiz-submit-area');section.append(submitArea);
        const submit=async()=>{const values=answers.map(options=>{const i=options.findIndex(o=>o.checked);return i<0?null:i;});await api('submit',{id:q.id,answers:values});await student();};
        button(submitArea,'Submit answers',async()=>{
          const unanswered=answers.map((options,i)=>options.some(o=>o.checked)?-1:i).filter(i=>i>=0);
          submitArea.querySelector('.quiz-submit-review')?.remove();
          if(!unanswered.length){await submit();return;}
          const review=node('div',undefined,'quiz-submit-review');review.setAttribute('role','alert');paragraph(review,`${unanswered.length} unanswered ${unanswered.length===1?'question will':'questions will'} be recorded as skipped.`);
          button(review,'Review first unanswered',()=>answers[unanswered[0]][0].closest('fieldset').scrollIntoView({behavior:'smooth',block:'center'}));
          button(review,'Submit with skipped answers',submit,'quiz-primary');submitArea.append(review);
        },'quiz-primary');
      } else if(q.closed) {
        q.questions.forEach((question,i)=>{const item=node('section',undefined,'quiz-question quiz-review');item.append(node('h4',`${i+1}. ${question.question}`));
          const answer=q.answers?.[i],state=!q.answers?'not-submitted':answer===null?'skipped':answer===question.correct?'correct':'incorrect';
          paragraph(item,{correct:'Correct',incorrect:'Incorrect',skipped:'Skipped','not-submitted':'Not submitted'}[state],'quiz-result '+state);
          question.options.forEach((option,j)=>{const row=node('div',undefined,'quiz-review-option'+(j===question.correct?' is-correct':'')+(answer===j?' is-selected':''));row.append(node('span',option));
            if(j===question.correct)row.append(node('b','Correct answer'));else if(answer===j)row.append(node('b','Your answer'));item.append(row);});
          paragraph(item,question.explanation,'quiz-muted');section.append(item);});
      } else paragraph(section,'Your answers have been received.');
      content.append(section);
    });
    button(content,'Refresh',student);
  }
  function renderReport(data) {
    reportData=data;
    content.replaceChildren();content.append(node('h3',data.title));
    paragraph(content,`${data.room} · ${data.ended?'After-class report':'Live results'} · ${new Date(data.generatedAt*1000).toLocaleString()}`,'quiz-muted');
    if(data.sample)paragraph(content,'SAMPLE DATA · 12 fictional participants. These are not student or research results.','quiz-sample');
    const totals=data.quizzes.reduce((sum,q)=>({participants:sum.participants+q.participants,submitted:sum.submitted+q.submitted,notSubmitted:sum.notSubmitted+q.notSubmitted,questions:sum.questions+q.questions.length}),{participants:0,submitted:0,notSubmitted:0,questions:0});
    const summary=node('section',undefined,'quiz-report-summary');summary.setAttribute('aria-label','Report summary');stat(summary,data.quizzes.length,'quizzes');stat(summary,totals.questions,'questions');stat(summary,totals.submitted,'submissions');stat(summary,totals.notSubmitted,'not submitted');content.append(summary);
    const actions=node('div',undefined,'quiz-actions');content.append(actions);
    button(actions,'Refresh report',report);
    button(actions,'Download JSON',()=>download(JSON.stringify(reportData,null,2),`class-${data.room}-report.json`,'application/json'));
    button(actions,'Download report',()=>{
      const doc=document.implementation.createHTMLDocument('Class report');doc.documentElement.lang='en';
      const style=doc.createElement('style');style.textContent='body{font:15px/1.6 Arial;max-width:960px;margin:32px auto;padding:0 20px;color:#202b29}section{border-top:1px solid #ddd;padding:16px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ddd;padding:8px}button{display:none}.quiz-sample{color:#923a24}';doc.head.append(style);
      const copy=content.cloneNode(true);copy.querySelectorAll('button,.quiz-actions').forEach(n=>n.remove());doc.body.append(copy);
      download('<!doctype html>'+doc.documentElement.outerHTML,`class-${data.room}-report.html`,'text/html');
    });
    paragraph(content,'Participants are people who joined a quiz, not everyone in the classroom. Missing submissions are not counted as incorrect.','quiz-muted');
    if(!data.quizzes.length)paragraph(content,'No quizzes yet. Publish a quiz to collect answers.');
    const feedbackPages=new Set([...data.slides.map(s=>s.page),...data.feedback.map(f=>f.page)]);
    if(feedbackPages.size){
      const section=node('section',undefined,'quiz-report-section');section.append(node('h3','Slides to revisit'));
      for(const page of [...feedbackPages].sort((a,b)=>a-b)){
        const slide=data.slides.find(s=>s.page===page), confused=data.feedback.find(f=>f.page===page&&f.kind==='confused')?.count||0;
        const row=node('div',undefined,'quiz-slide-row');link(row,`Slide ${page} · ${data.titles[page-1]}`,location.origin+location.pathname+'#'+page);
        paragraph(row,slide?`${slide.wrong} of ${slide.answered} respondents gave at least one incorrect answer. ${slide.participants} quiz participants.`:'No quiz responses for this slide.');
        paragraph(row,`${confused} marked "Confused". These counts may overlap with quiz respondents.`,'quiz-muted');
        if((slide?.wrong||0)>0||confused>0)paragraph(row,'Suggested follow-up: revisit this slide, explain the answer, then check again with a new question.');
        section.append(row);
      }content.append(section);
    }
    for(const q of data.quizzes){
      const section=node('section',undefined,'quiz-report-section');section.append(node('h3',q.title));
      paragraph(section,`${q.closed?'Closed':'Open'} · ${q.participants} participants · ${q.submitted} submitted · ${q.notSubmitted} not submitted`,'quiz-metrics');
      if(!q.closed)button(section,'Close quiz and reveal answers',async()=>{if(confirm('Close this quiz and reveal the answer key?')){await api('close',{id:q.id});await report();}});
      q.questions.forEach((question,i)=>{
        const block=node('article',undefined,'quiz-question');block.append(node('h4',`${i+1}. ${question.question}`));
        paragraph(block,`Slide ${question.page} · ${question.correctCount} correct · ${question.wrongCount} incorrect · ${question.skipped} skipped · ${q.notSubmitted} not submitted`);
        question.options.forEach((option,j)=>{const row=node('div',undefined,'quiz-distribution'+(j===question.correct?' is-correct':''));row.append(node('span',option+(j===question.correct?' (correct)':'')));
          const bar=node('progress');bar.max=Math.max(1,question.answered);bar.value=question.distribution[j];bar.setAttribute('aria-label',option);const percent=question.answered?Math.round(question.distribution[j]*100/question.answered):0;row.append(bar,node('b',`${question.distribution[j]} · ${percent}%`));block.append(row);});
        paragraph(block,question.explanation,'quiz-muted');section.append(block);
      });content.append(section);
    }
    paragraph(content,'Counts use the first submitted choices and the teacher-approved answer key. Slide counts deduplicate participants. "Confused" is the latest voluntary feedback on each slide; it is not an AI diagnosis.','quiz-muted');
  }
  async function report() {
    const ticket=open('Class report');reportOpen=true;
    if(!classroom().room){paragraph(content,'Create or select a class first, or open the sample report.');return;}
    const data=await api('report');if(ticket!==generation)return;renderReport(data);
  }
  function mount() {
    dialog=node('dialog',undefined,'quiz-dialog');
    const header=node('header',undefined,'quiz-dialog-header');heading=node('h2','Class quiz');heading.id='quizHeading';dialog.setAttribute('aria-labelledby','quizHeading');header.append(heading);
    const close=node('button');close.type='button';close.setAttribute('aria-label','Close quiz window');close.title='Close';const icon=node('img');icon.src='assets/vendor/lucide/x.svg';icon.alt='';close.append(icon);close.onclick=()=>dialog.close();header.append(close);
    content=node('div',undefined,'quiz-content');status=node('p',undefined,'quiz-error');status.setAttribute('role','status');dialog.append(header,status,content);
    dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('touchend',e=>e.stopPropagation());dialog.addEventListener('close',()=>{generation++;reportOpen=false;});document.body.append(dialog);
    if(classroom().role==='teacher'){
      const bar=node('section',undefined,'quiz-teacher-tools');bar.append(node('h2','Class quizzes & reports'));
      const actions=node('div',undefined,'quiz-actions');bar.append(actions);
      button(actions,'Create quiz',draft,'quiz-primary');button(actions,'Class report',report);
      button(actions,'Open sample report',async()=>{open('Sample report');const result=await api('sample');observedRoom=result.room;await classroom().selectRoom(result.room);await report();});
      document.querySelector('.class-status').after(bar);
    } else if(classroom().role!=='project') {
      button(document.querySelector('.eigen-top'),'Quiz',student,'quiz-launch');
    }
    window.addEventListener('classroom-state',event=>{
      if(observedRoom&&observedRoom!==event.detail.room&&dialog.open){dialog.close();}
      observedRoom=event.detail.room;
      if(reportOpen&&dialog.open&&event.detail.ended&&reportData&&!reportData.ended)report().catch(e=>status.textContent=e.message);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
