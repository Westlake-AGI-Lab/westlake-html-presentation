(() => {
  const slides=[...document.querySelectorAll('.course-slide')];
  function update(){const n=window.PPTDeck?.current()||0;slides.forEach((s,i)=>s.inert=i!==n);document.title=slides[n].dataset.title+' · Xiaoxi courses';}
  window.addEventListener('ppt-slide-change',update);update();
  let done=false;
  async function typeset(){if(done||!window.MathJax?.typesetPromise)return;done=true;try{await MathJax.startup.promise;await MathJax.typesetPromise(slides.map(s=>s.querySelector('.course-formula')).filter(Boolean));}catch(_){done=false;}}
  window.addEventListener('ppt-math-ready',typeset);typeset();
})();
