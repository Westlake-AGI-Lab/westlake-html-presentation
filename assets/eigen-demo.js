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
    rail.querySelectorAll('button').forEach((b,i) => b.setAttribute('aria-current',String(i === current)));
    document.title = slides[current].dataset.title + ' · Linear algebra';
  }
  addEventListener('ppt-slide-change',update); update();
  // Keep sliders and keyboard activation inside the tool from navigating the deck.
  [top,rail,...document.querySelectorAll('.vector-lab')].forEach(el => {
    el.addEventListener('keydown',e => e.stopPropagation());
    el.addEventListener('touchend',e => e.stopPropagation());
  });
  document.querySelectorAll('.vector-lab').forEach(lab => {
    const canvas = lab.querySelector('canvas'), ctx = canvas.getContext('2d'), slider = lab.querySelector('input');
    const matrices = {stretch:[1.6,0,0,.55],identity:[1,0,0,1],projection:[.64,.48,.48,.36],rotation:[0,-1,1,0]};
    const a = matrices[lab.dataset.transform];
    const matrixLabel=document.createElement('p');matrixLabel.className='vector-matrix';
    matrixLabel.textContent=`A = [${a[0]}, ${a[1]}; ${a[2]}, ${a[3]}]`;
    lab.prepend(matrixLabel);
    const point = (x,y) => [340+x*70,240-y*70];
    function line(x1,y1,x2,y2,color,width=1) {
      ctx.beginPath();ctx.moveTo(...point(x1,y1));ctx.lineTo(...point(x2,y2));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    }
    function arrow(x,y,color) {
      const [px,py] = point(x,y), angle = Math.atan2(-y,x);
      line(0,0,x,y,color,5);
      if(Math.hypot(x,y)<1e-8) {ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();return;}
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-17*Math.cos(angle-.4),py-17*Math.sin(angle-.4));ctx.lineTo(px-17*Math.cos(angle+.4),py-17*Math.sin(angle+.4));ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
    function draw() {
      const theta = Number(slider.value)*Math.PI/180, x=2*Math.cos(theta),y=2*Math.sin(theta),u=a[0]*x+a[1]*y,v=a[2]*x+a[3]*y;
      ctx.clearRect(0,0,680,480);
      for(let i=-4;i<=4;i++) {line(i,-3.2,i,3.2,'#e3ebe5');line(-4.6,i,4.6,i,'#e3ebe5');}
      line(-4.6,0,4.6,0,'#a5b8aa',2);line(0,-3.2,0,3.2,'#a5b8aa',2);
      if(lab.dataset.transform === 'projection') line(-4,-3,4,3,'#b6c8ba',3);
      ctx.setLineDash([6,6]);line(-x*1.7,-y*1.7,x*1.7,y*1.7,'#8caaa0',2);ctx.setLineDash([]);
      arrow(x,y,'#167568');arrow(u,v,'#c65750');
      ctx.font='18px Arial';ctx.fillStyle='#64736b';ctx.fillText('x',653,232);ctx.fillText('y',351,22);
      lab.querySelector('output').value=slider.value;
      lab.querySelector('.vector-result').textContent=`v = (${x.toFixed(2)}, ${y.toFixed(2)})   Av = (${u.toFixed(2)}, ${v.toFixed(2)})`;
    }
    slider.addEventListener('input',draw);draw();
  });
  let rendered=false;
  async function typeset() {
    if(rendered || !window.MathJax?.typesetPromise) return;
    rendered=true;
    try {await MathJax.startup.promise;await MathJax.typesetPromise(slides.map(s=>s.querySelector('.eigen-formula')));} catch(e) {console.error(e);rendered=false;}
  }
  addEventListener('ppt-math-ready',typeset);typeset();
})();
