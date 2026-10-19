/* Presenter fitting, layout and linked commands; no AI requests. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.PRESENTER_WORKSPACE_URL||'http://127.0.0.1:8782/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});
try{const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
for(const course of ['computer-architecture&lecture=lecture-07-tomasulo','calculus&lecture=derivatives']){
 const audience=await context.newPage();await audience.goto(base+'lecture.html?course='+course);await audience.waitForSelector('.source-header');
 await audience.click('#sourceZoomIn');await audience.setViewportSize({width:390,height:844});
 const opened=audience.waitForEvent('popup');await audience.evaluate(()=>PPTPresenter.open());const speaker=await opened;await speaker.waitForFunction(()=>document.querySelector('#currentTitle').textContent.startsWith('1.'));
 for(const [width,height] of [[1360,880],[1024,600],[390,844]]){
  await speaker.setViewportSize({width,height});await speaker.waitForTimeout(150);
  await speaker.waitForFunction(()=>{const host=document.querySelector('#currentPreview'),frame=host.querySelector('iframe');if(!frame?.contentDocument?.querySelector('.slide'))return false;const a=host.getBoundingClientRect(),b=frame.getBoundingClientRect();return b.width>0&&b.height>0&&b.left>=a.left-.5&&b.top>=a.top-.5&&b.right<=a.right+1&&b.bottom<=a.bottom+1;});
  assert.equal(await speaker.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const frame=speaker.frameLocator('#currentPreview iframe');
  if(course.startsWith('computer')){
   const img=frame.locator('.source-page-image');await img.evaluate(im=>im.decode());
   assert.ok(await img.evaluate(im=>{const r=im.getBoundingClientRect();return im.naturalWidth===1920&&r.left>=-.5&&r.top>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5&&Math.abs(r.width/r.height-16/9)<.01;}));
  }else{assert.ok(await frame.locator('.slide-body').evaluate(el=>el.scrollHeight<=el.clientHeight+1));assert.equal(await frame.locator('.brand-header').evaluate(el=>getComputedStyle(el).display),'none');}
  if(width>800){for(const id of ['#currentPreview','#nextPreview','.notes-section','.presenter-controls']){const r=await speaker.locator(id).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=height+1,id+' fits');}}
  await speaker.screenshot({path:`/private/tmp/presenter-refresh/${course.startsWith('computer')?'pdf':'sample'}-${width}.png`,fullPage:true});
 }
 await speaker.setViewportSize({width:1360,height:880});await speaker.click('#presenterNext');await audience.waitForFunction(()=>PPTDeck.current()===1);await speaker.waitForFunction(()=>document.querySelector('#currentTitle').textContent.startsWith('2.'));
 await speaker.selectOption('#jumpSelect','3');await audience.waitForFunction(()=>PPTDeck.current()===3);
 await speaker.click('#pauseTimer');await speaker.waitForTimeout(350);const time=await speaker.textContent('#elapsed');await speaker.waitForTimeout(350);assert.equal(await speaker.textContent('#elapsed'),time);
 await speaker.click('#resetTimer');await speaker.waitForFunction(()=>document.querySelector('#elapsed').textContent==='00:00:00');
 await speaker.click('#languageButton');await speaker.waitForFunction(()=>document.querySelector('#currentLabel').textContent==='当前正在展示');
 await speaker.click('#endPresentation');await audience.waitForFunction(()=>!PPTPresenter.active);await audience.close();
}
assert.deepEqual(errors,[]);await context.close();console.log('Presenter workspace: PDF and HTML fit completely at desktop/short laptop/mobile sizes; zoom isolation, notes, linked navigation, jump, timer, language and ending passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
