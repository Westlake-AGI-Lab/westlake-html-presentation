(() => {
 const node=document.getElementById('studyContext');if(!node)return;
 window.studyContext=JSON.parse(node.textContent);
 const context=window.studyContext;let last=-1;
 const note=document.createElement('p');note.className='student-shared-note';note.style.cssText='padding:8px 20px;color:var(--ink,#1f3a33);background:var(--surface,#fff)';document.querySelector('.source-footer')?.before(note);
 function update(){const slide=(window.PPTDeck?.current()||0)+1;if(last===slide)return;last=slide;
 note.textContent=context.notes[slide]||'';note.hidden=!note.textContent;
 if(context.preview){parent.postMessage({type:'xiaoxi-slide',slide},location.origin);return;}
 fetch('/api/study/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...context,notes:undefined,slide})}).catch(()=>{});
 }
 new MutationObserver(update).observe(document.getElementById('deck'),{attributes:true,subtree:true,attributeFilter:['class']});update();
 if(context.preview){document.querySelectorAll('[data-editable]').forEach(n=>n.removeAttribute('contenteditable'));document.addEventListener('keydown',e=>{if(['e','n'].includes(e.key.toLowerCase()))e.stopImmediatePropagation();},true);}
})();
