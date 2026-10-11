(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.eigen-slide')];
  const top = document.createElement('header'); top.className = 'eigen-top';
  top.innerHTML = '<img src="assets/westlake-logo.png" alt="Westlake"><strong>Linear algebra</strong><small>Local preview · Offline assessment</small><button type="button">Practice</button>';
  top.querySelector('button').onclick = () => document.getElementById('agentPractice')?.click();
  document.body.append(top);
  const rail = document.createElement('nav'); rail.className = 'eigen-rail'; rail.setAttribute('aria-label','Lecture contents');
  rail.innerHTML = '<h2>7.1 / DIAGONALIZATION</h2>';
  slides.forEach((slide,i) => {
    const b = document.createElement('button'); b.type = 'button';
    const num = document.createElement('span'); num.textContent = String(i+1).padStart(2,'0');
    b.append(num,document.createTextNode(slide.dataset.title)); b.onclick = () => PPTDeck.navigate(i); rail.append(b);
  });
  document.body.append(rail);
  function moveClassMenu() {
    const entry=document.querySelector('.class-entry');
    if(!entry) return;
    const menu=document.createElement('details');menu.className='eigen-class-menu';
    const summary=document.createElement('summary');summary.textContent='Class';
    menu.append(summary,entry);document.body.append(menu);
    menu.addEventListener('keydown',e=>e.stopPropagation());
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',moveClassMenu); else moveClassMenu();
  function update() {
    const current = PPTDeck.current();
    rail.querySelectorAll('button').forEach((b,i) => {
      b.setAttribute('aria-current',String(i === current));
      if(i===current)b.scrollIntoView({block:'nearest'});
    });
    slides.forEach((slide,i)=>{slide.inert=i!==current;});
    document.title = slides[current].dataset.title + ' · Linear algebra';
  }
  addEventListener('ppt-slide-change',update); update();
  // Keep sliders and keyboard activation inside the tool from navigating the deck.
  [top,rail,...document.querySelectorAll('.vector-lab')].forEach(el => {
    el.addEventListener('keydown',e => e.stopPropagation());
    el.addEventListener('touchend',e => e.stopPropagation());
  });
  document.querySelectorAll('[data-practice-concept]').forEach(button=>{
    button.onclick=()=>window.dispatchEvent(new CustomEvent('ppt-practice-open',{detail:{concept:button.dataset.practiceConcept}}));
    button.addEventListener('keydown',event=>event.stopPropagation());
  });
  let rendered=false;
  async function typeset() {
    if(rendered || !window.MathJax?.typesetPromise) return;
    rendered=true;
    try {await MathJax.startup.promise;await MathJax.typesetPromise(slides.map(s=>s.querySelector('.eigen-formula')));} catch(e) {console.error(e);rendered=false;}
  }
  addEventListener('ppt-math-ready',typeset);typeset();
})();
