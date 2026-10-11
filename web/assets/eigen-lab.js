(() => {
  'use strict';
  const G = window.EigenGeometry;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const make = (tag, cls, text) => {
    const el = document.createElement(tag); el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const fmt = n => (Math.abs(n)<.0005 ? 0 : n).toFixed(2);
  const iconButton = (name, label) => {
    const b = make('button','lab-icon'); b.type='button'; b.title=label; b.setAttribute('aria-label',label);
    const img = make('img',''); img.src=`assets/vendor/lucide/${name}.svg`; img.alt=''; b.append(img); return b;
  };
  function mount(lab) {
    const mode = lab.dataset.transform, slide = lab.closest('.slide');
    let angle=30, targetAngle=30, phase=1, turn=90, playing=false, frame=0, previous=0, dragging=false;
    let showSquare=true, showGrid=false;
    lab.replaceChildren();
    const header=make('div','lab-header');
    const heading=make('strong','', {stretch:'Directional scaling',identity:'Identity map',projection:'Projection onto span(4, 3)',rotation:'Rotation in the real plane'}[mode]);header.append(heading);
    const status=make('span','lab-status','Ready'); header.append(status);lab.append(header);
    if(mode==='rotation') {
      const segments=make('div','lab-segments'); segments.setAttribute('role','group');segments.setAttribute('aria-label','Rotation angle');
      [90,180].forEach(value=>{
        const b=make('button','',`${value}\u00b0`); b.type='button';b.setAttribute('aria-pressed',String(value===turn));
        b.onclick=()=>{stop();turn=value;phase=1;segments.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));sync();render();};
        segments.append(b);
      }); header.insertBefore(segments,status);
    }
    const canvas=make('canvas','lab-canvas');canvas.width=680;canvas.height=340;
    canvas.setAttribute('aria-label','Input vector and its transformed image on coordinate axes');
    lab.append(canvas); const ctx=canvas.getContext('2d');
    const legend=make('div','vector-legend');legend.append(make('span','','Input v'),make('span','','Image A(t)v'));lab.append(legend);
    const conclusion=make('div','lab-conclusion');conclusion.setAttribute('role','status');lab.append(conclusion);
    const presets=make('label','lab-presets','Direction');
    const select=make('select','');select.setAttribute('aria-label','Vector direction');
    const choices=mode==='projection' ? [['Free angle',null],['Along the line',G.projectionAngle],['Perpendicular to the line',G.projectionAngle+90]] : [['Free angle',null],['Horizontal axis',0],['Vertical axis',90]];
    choices.forEach(([label,value])=>{const o=make('option','',label);o.value=value===null?'free':String(value);select.append(o);});presets.append(select);lab.append(presets);
    const angleLabel=make('label','lab-range');const angleHeading=make('span','lab-range-heading','Vector angle');
    const angleOut=make('output','','30.0\u00b0');angleHeading.append(angleOut);angleLabel.append(angleHeading);
    const slider=make('input','');slider.type='range';slider.min='0';slider.max='360';slider.step='any';slider.value='30';slider.setAttribute('aria-label','Vector angle');angleLabel.append(slider);lab.append(angleLabel);
    const transport=make('div','lab-transport'),play=iconButton('play','Animate transformation'),reset=iconButton('undo-2','Reset transformation');
    const progressLabel=make('label','lab-range');const progressHeading=make('span','lab-range-heading','Transformation');
    const progressOut=make('output','','100%');progressHeading.append(progressOut);progressLabel.append(progressHeading);
    const progress=make('input','');progress.type='range';progress.min='0';progress.max='1';progress.step='.001';progress.value='1';progress.setAttribute('aria-label','Transformation progress');progressLabel.append(progress);
    transport.append(play,reset,progressLabel);lab.append(transport);
    const options=make('div','lab-options');
    [['Unit square',true,v=>{showSquare=v;}],['Transform grid',false,v=>{showGrid=v;}]].forEach(([label,checked,change])=>{
      const l=make('label',''),input=make('input','');input.type='checkbox';input.checked=checked;
      input.onchange=()=>{change(input.checked);render();};l.append(input,document.createTextNode(label));options.append(l);
    });lab.append(options);
    const details=make('details','lab-values');details.append(make('summary','','Coordinates & matrix'));
    const values=make('p','vector-result');details.append(values);lab.append(details);
    function sync() {
      slider.value=String(targetAngle);angleOut.value=`${targetAngle.toFixed(1)}\u00b0`;
      progress.value=String(phase);progressOut.value=`${Math.round(phase*100)}%`;
      play.title=playing?'Pause transformation':reduced.matches?'Apply transformation':'Animate transformation';play.setAttribute('aria-label',play.title);
      play.querySelector('img').src=`assets/vendor/lucide/${playing?'pause':'play'}.svg`;
      status.textContent=playing?'Running':phase===1?'Complete':phase===0?'Input':'Paused';
      if(mode==='rotation')heading.textContent=`Rotation \u00b7 ${turn}\u00b0`;
      conclusion.setAttribute('aria-live',playing?'off':'polite');
    }
    function stop() {playing=false;sync();}
    function request() {if(!frame) {previous=0;frame=requestAnimationFrame(tick);}}
    function tick(now) {
      frame=0;
      const dt=previous ? Math.min((now-previous)/1000,.05) : 0;previous=now;
      if(reduced.matches) {angle=targetAngle;if(playing) phase=1;playing=false;}
      else {
        const delta=((targetAngle-angle)%360+540)%360-180;
        angle=(angle+delta*(1-Math.exp(-dt*18))+360)%360;
        if(Math.abs(delta)<.001) angle=targetAngle;
        if(playing) {phase=Math.min(1,phase+dt/1.8);if(phase===1) playing=false;}
      }
      sync();render();
      if(playing || angle!==targetAngle) frame=requestAnimationFrame(tick);
    }
    function setAngle(value, smooth=true) {
      targetAngle=Math.max(0,Math.min(360,value));
      if(!smooth || reduced.matches) angle=targetAngle;
      sync();request();
    }
    select.onchange=()=>{if(select.value!=='free')setAngle(Number(select.value));};
    slider.oninput=()=>{select.value='free';setAngle(Number(slider.value));};
    // Native range keyboard steps with step=any vary by browser, so keep a stable one-degree step.
    slider.addEventListener('keydown',e=>{
      const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];
      if(delta) {e.preventDefault();select.value='free';setAngle(targetAngle+delta);}
    });
    progress.oninput=()=>{const value=Number(progress.value);stop();phase=value;sync();render();};
    play.onclick=()=>{
      if(playing) {stop();return;}
      if(reduced.matches) {phase=1;sync();render();return;}
      if(phase>=1) phase=0;playing=true;sync();request();
    };
    reset.onclick=()=>{stop();phase=0;sync();render();};
    const pointerAngle=e=>{
      const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*680-340,y=170-(e.clientY-r.top)/r.height*340;
      if(Math.hypot(x,y)<8)return;
      select.value='free';setAngle((Math.atan2(y,x)*180/Math.PI+360)%360,false);
    };
    canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);pointerAngle(e);});
    canvas.addEventListener('pointermove',e=>{if(dragging)pointerAngle(e);});
    canvas.addEventListener('pointerup',()=>{dragging=false;});canvas.addEventListener('pointercancel',()=>{dragging=false;});
    const point=([x,y])=>[340+x*58,170-y*58];
    function line(p,q,color,width=1) {ctx.beginPath();ctx.moveTo(...point(p));ctx.lineTo(...point(q));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    function polygon(points,color,fill) {ctx.beginPath();points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...point(p)));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
    function arrow(v,color,dashed=false) {
      const [x,y]=point(v),theta=Math.atan2(-v[1],v[0]);
      ctx.setLineDash(dashed?[7,5]:[]);line([0,0],v,color,dashed?3:4);ctx.setLineDash([]);
      if(Math.hypot(...v)<1e-8) {ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();return;}
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-14*Math.cos(theta-.45),y-14*Math.sin(theta-.45));ctx.lineTo(x-14*Math.cos(theta+.45),y-14*Math.sin(theta+.45));ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
    function render() {
      const ratio=canvas.width/680;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,680,340);
      const a=G.matrix(mode,phase,turn),v=G.vector(angle),w=G.apply(a,v);
      for(let i=-5;i<=5;i++) {line([i,-3],[i,3],'#e7ede9');line([-5,i],[5,i],'#e7ede9');}
      if(showGrid) {
        for(let i=-5;i<=5;i++) {line(G.apply(a,[i,-5]),G.apply(a,[i,5]),'#b8d4cd');line(G.apply(a,[-5,i]),G.apply(a,[5,i]),'#b8d4cd');}
      }
      line([-5,0],[5,0],'#b6c4ba',1.4);line([0,-3],[0,3],'#b6c4ba',1.4);
      if(mode==='projection')line([-4,-3],[4,3],'#c2b894',2);
      if(showSquare) {
        const square=[[0,0],[1,0],[1,1],[0,1]];
        polygon(square,'#97b2a3','#dcebe333');polygon(square.map(p=>G.apply(a,p)),'#ba8841','#e9c78233');
      }
      ctx.setLineDash([4,7]);line(v.map(n=>-n*2.7),v.map(n=>n*2.7),'#8aafa2',1.5);ctx.setLineDash([]);
      arrow(v,'#167568',true);arrow(w,'#c35351');
      // An input marker remains visible when input and output overlap exactly.
      ctx.beginPath();ctx.arc(...point(v),8,0,Math.PI*2);ctx.strokeStyle='#167568';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#6b7c70';ctx.font='15px Arial';ctx.fillText('x',655,160);ctx.fillText('y',351,18);
      [-2,-1,1,2].forEach(n=>ctx.fillText(String(n),point([n,0])[0]-4,189));
      const check=G.evidence(G.matrix(mode,1,turn),v),finished=phase===1&&angle===targetAngle;
      let message=phase<1 ? `A(t)v at t = ${phase.toFixed(2)}` : !finished ? 'Changing direction' : check.aligned ? `Same line \u00b7 eigenvalue ${fmt(check.eigenvalue)}` : 'Different line \u00b7 not an eigenvector';
      if(finished && check.aligned && Math.abs(check.eigenvalue)<1e-8) message='Av = 0 \u00b7 eigenvalue 0';
      if(conclusion.textContent!==message)conclusion.textContent=message;
      conclusion.dataset.aligned=String(finished&&check.aligned);
      values.textContent=`v = (${v.map(fmt).join(', ')})\nA(t)v = (${w.map(fmt).join(', ')})\nA(t) = [${a.slice(0,2).map(fmt).join(', ')}; ${a.slice(2).map(fmt).join(', ')}]`;
      lab.dataset.phase=String(phase);lab.dataset.angle=String(angle);
    }
    function resize() {
      const width=canvas.getBoundingClientRect().width;if(!width)return;
      const ratio=Math.min(devicePixelRatio||1,2)*width/680;
      canvas.width=Math.round(680*ratio);canvas.height=Math.round(340*ratio);render();
    }
    const observer=new ResizeObserver(resize);observer.observe(canvas);
    const suspend=()=>{
      if(document.hidden||!slide.classList.contains('active')) {stop();cancelAnimationFrame(frame);frame=0;angle=targetAngle;render();}
    };
    document.addEventListener('visibilitychange',suspend);window.addEventListener('ppt-slide-change',suspend);
    reduced.addEventListener('change',()=>{if(reduced.matches){stop();angle=targetAngle;render();}});
    lab.addEventListener('keydown',e=>e.stopPropagation());lab.addEventListener('touchend',e=>e.stopPropagation());
    sync();resize();
  }
  document.querySelectorAll('.vector-lab').forEach(mount);
})();
