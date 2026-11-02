/* Chrome motion/performance regression. Trace imports into DevTools Performance. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=(process.env.STUDENT_DESIGN_URL||'http://127.0.0.1:8784').replace(/\/$/,'');
const out=process.env.MOTION_TEST_OUTPUT||'/tmp/xiaoxi-motion';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const width of [1440,360])for(const reduce of [false,true]){
const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:reduce?'reduce':'no-preference'});
await context.addInitScript(()=>{
 window.motionStats={cls:0,entrances:0,frames:[],startupFrames:[],keyframes:[],shifts:[]};
 new PerformanceObserver(list=>{for(const e of list.getEntries()){window.motionStats.shifts.push({value:e.value,recent:e.hadRecentInput});if(!e.hadRecentInput)window.motionStats.cls+=e.value}}).observe({type:'layout-shift',buffered:true});
 document.addEventListener('animationstart',e=>{if(e.animationName==='student-reveal')window.motionStats.entrances++});
 let last,readyLast;const start=performance.now();function frame(now){if(last)window.motionStats.startupFrames.push(now-last);last=now;const ready=document.readyState==='complete'&&document.fonts.status==='loaded';if(ready){if(readyLast)window.motionStats.frames.push(now-readyLast);readyLast=now;}else readyLast=undefined;if(now-start<1600)requestAnimationFrame(frame)}requestAnimationFrame(frame);
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const session=await context.newCDPSession(page);let traceReady;
if(width===1440&&!reduce){traceReady=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));await session.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame',transferMode:'ReturnAsStream'});}
for(const screen of ['student','courses']){
 await page.goto(`${base}/${screen}.html`);if(screen==='courses')await page.waitForSelector('.course-card');await page.evaluate(()=>document.fonts.ready);
 // Capture only animated CSS properties, excluding timing metadata.
 const props=await page.evaluate(()=>document.getAnimations().flatMap(a=>a.effect?.getKeyframes().flatMap(f=>Object.keys(f).filter(k=>!['offset','computedOffset','easing','composite'].includes(k)))||[]));
 assert.deepEqual([...new Set(props)].filter(k=>!['transform','opacity'].includes(k)),[]);
 await page.waitForTimeout(1700);
 const snapshot=await page.evaluate(()=>({stats:window.motionStats,running:document.getAnimations().filter(a=>a.playState==='running').map(a=>({name:a.animationName,iterations:a.effect.getTiming().iterations})),willChange:[...document.querySelectorAll('[style*="will-change"]')].map(e=>e.className),overflow:document.documentElement.scrollWidth>innerWidth}));
 console.log('CLS',screen,width,reduce,snapshot.stats.cls);assert.equal(snapshot.stats.cls,0,`${screen} ${width} reduced=${reduce} CLS must be zero`);assert.deepEqual(snapshot.willChange,[]);assert.equal(snapshot.overflow,false);
 if(reduce){assert.equal(snapshot.stats.entrances,0);assert.deepEqual(snapshot.running,[]);assert.equal(await page.locator('.page-surface').evaluate(e=>getComputedStyle(e).opacity),'1');}
 else if(screen==='student'){assert.equal(snapshot.stats.entrances,7);assert.equal(snapshot.running.length,3);assert.ok(snapshot.running.every(a=>a.name==='hero-float'));}
 else assert.equal(snapshot.stats.entrances,4);
 if(screen==='courses'){
  const before=snapshot.stats.entrances;
  await page.locator('[data-filter="Mathematics"]').click();await page.waitForFunction(()=>document.querySelectorAll('.course-card').length===2);
  await page.locator('[data-filter="all"]').click();await page.waitForFunction(()=>document.querySelectorAll('.course-card').length===4);
  await page.fill('#courseSearch','线性');await page.waitForFunction(()=>document.querySelectorAll('.course-card').length===1);
  await page.fill('#courseSearch','');await page.waitForFunction(()=>document.querySelectorAll('.course-card').length===4);
  // Stress reversal while exits are pending: the latest selection must win.
  await page.locator('[data-filter="Computer science"]').click();await page.locator('[data-filter="all"]').click();await page.waitForTimeout(200);
  assert.equal(await page.locator('.course-card').count(),4);
  assert.equal(await page.evaluate(()=>window.motionStats.entrances),before);
  if(reduce)assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  assert.deepEqual(await page.locator('.catalog-mascot').count(),0);
 }
 const frames=snapshot.stats.frames.filter(n=>n>0).sort((a,b)=>a-b),percentile=n=>Number(frames[Math.min(frames.length-1,Math.floor(frames.length*n))]?.toFixed(2));
 results.push({screen,width,reducedMotion:reduce,cls:snapshot.stats.cls,medianFrameMs:percentile(.5),p95FrameMs:percentile(.95),maxFrameMs:percentile(.999),startupMaxFrameMs:Number(Math.max(...snapshot.stats.startupFrames).toFixed(2)),entrances:snapshot.stats.entrances});
 await page.screenshot({path:`${out}/${screen}-${width}-${reduce?'static':'motion'}.png`,fullPage:true,animations:'disabled'});
}
if(traceReady){await session.send('Tracing.end');const {stream}=await traceReady;let trace='';for(;;){const chunk=await session.send('IO.read',{handle:stream});trace+=chunk.data;if(chunk.eof)break;}await session.send('IO.close',{handle:stream});fs.writeFileSync(`${out}/chrome-performance-trace.json`,trace);}
assert.deepEqual(errors,[]);await context.close();
}
fs.writeFileSync(`${out}/measurements.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
