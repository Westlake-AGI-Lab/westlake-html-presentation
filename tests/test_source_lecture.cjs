/* PDF-source lecture UI; AI responses are mocked and no real provider is called. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const base=process.env.SOURCE_LECTURE_TEST_URL||'http://127.0.0.1:8784/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile});
   const page=await context.newPage(),errors=[],failedAssets=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))failedAssets.push(r.url());});
   await page.route('**/api/health',r=>r.fulfill({json:{configured:true,model:'mock'}}));
   await page.goto(base+'courses.html');await page.waitForSelector('.course-card');
   await page.getByRole('button',{name:'Computer Architecture and Parallel Computing',exact:true}).click();
   assert.ok((await page.textContent('#lectureCourseMeta')).includes('2610CST3004'));
   assert.ok((await page.textContent('#lectureCourseMeta')).includes('Huan Wang'));
   assert.equal(await page.locator('.lecture-row').count(),3);
   await page.locator('.source-lecture-link').click();await page.waitForSelector('.source-header');
   assert.equal(await page.locator('.pdf-source-slide').count(),24);
   await page.waitForFunction(()=>[...document.querySelectorAll('.source-page-image')].every(img=>img.complete&&img.naturalWidth===1920));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`/private/tmp/westlake-lecture7-${mobile?'mobile':'desktop'}.png`,fullPage:true});
   if(mobile)await page.click('#sourceOutlineToggle');
   await page.fill('#sourceOutlineSearch','renaming');
   assert.equal(await page.evaluate(()=>PPTDeck.current()),0);
   await page.locator('.source-page-link').filter({hasText:'Renaming at Issue: Names Become Fresh Tags'}).click();
   await page.waitForFunction(()=>PPTDeck.current()===11);
   if(mobile)assert.equal(await page.locator('.source-outline-drawer[open]').count(),0);
   const width=await page.locator('.slide.active .source-page-image').evaluate(img=>img.getBoundingClientRect().width);
   await page.click('#sourceZoomIn');
   assert.ok(await page.locator('.slide.active .source-page-image').evaluate(img=>img.getBoundingClientRect().width)>width);
   await page.click('#sourceFit');
   assert.equal(await page.locator('#sourceTextMode').count(),0);
   await page.click('#sourceNotes');await page.click('#sourceEdit');
   await page.fill('#sourceNoteText','My personal CDB note');
   await page.locator('.slide.active .source-caption').fill('My page annotation');
   await page.click('#sourceEdit');await page.click('#sourceNotes');
   await page.click('#sourceHighlight');await page.getByRole('button',{name:'Highlight center',exact:true}).click();
   assert.equal(await page.locator('.slide.active .source-mark-layer rect').count(),1);
   await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.locator('.slide.active .source-mark-layer rect').count(),0);
   const layer=await page.locator('.slide.active .source-mark-layer').boundingBox();
   await page.mouse.move(layer.x+layer.width*.1,layer.y+layer.height*.2);await page.mouse.down();await page.mouse.move(layer.x+layer.width*.7,layer.y+layer.height*.3);await page.mouse.up();
   assert.equal(await page.locator('.slide.active .source-mark-layer rect').count(),1);
   await page.getByRole('button',{name:'Close highlighter',exact:true}).click();
   await page.reload();await page.waitForSelector('.source-header');
   assert.equal(await page.locator('.slide.active .source-mark-layer rect').count(),1);
   assert.equal(await page.locator('.slide.active .source-caption').innerText(),'My page annotation');
   await page.click('#sourceNotes');assert.equal(await page.inputValue('#sourceNoteText'),'My personal CDB note');await page.click('#sourceNotes');
   await page.fill('#sourcePageJump','24');await page.press('#sourcePageJump','Enter');
   await page.waitForFunction(()=>PPTDeck.current()===23);assert.equal(await page.isDisabled('#sourceNext'),true);
   await page.fill('#sourcePageJump','25');await page.press('#sourcePageJump','Enter');assert.equal(await page.evaluate(()=>PPTDeck.current()),23);
   await page.reload();await page.waitForFunction(()=>window.PPTDeck?.current()===23&&document.querySelector('.source-header'));
   const downloadPromise=page.waitForEvent('download');await page.locator('.source-download').click();const download=await downloadPromise;
   const bytes=fs.readFileSync(await download.path());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
   const meta=await (await page.request.get(base+'api/courses')).json();const expected=meta.courses[0].lectures[0].source.sha256;assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
   await page.fill('#sourcePageJump','13');await page.press('#sourcePageJump','Enter');
   let request;
   await page.route('**/api/chat',async route=>{request=route.request().postDataJSON();await route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'delta',text:'The CDB broadcasts the tag and value to waiting stations.'})+'\n'+JSON.stringify({type:'done'})+'\n'});});
   await page.click('#agentLauncher');await page.fill('#agentInput','Explain how the CDB wakes waiting instructions');await page.click('#agentSend');
   await page.waitForFunction(()=>document.querySelector('#agentConversation').textContent.includes('The CDB broadcasts the tag'));
   assert.equal(request.slides.length,24);assert.equal(request.currentSlide.number,13);assert.ok(request.slides[12].content.includes('Broadcast'));assert.ok(request.slides[11].content.includes('WAR removed'));assert.equal((request.images||[]).length,0);
   const closeRect=await page.locator('#agentClose').boundingBox();assert.ok(closeRect.x+closeRect.width<=(mobile?390:1440));
   if(mobile)await page.screenshot({path:'/private/tmp/westlake-lecture7-chat-mobile.png'});
   await page.click('#agentClose');assert.equal(await page.evaluate(()=>document.activeElement.id),'agentLauncher');
   await page.click('#sourceLanguage');assert.equal(await page.textContent('#sourceNotes span'),'讲稿 N');
   if(!mobile){
    const popupPromise=page.waitForEvent('popup');await page.evaluate(()=>PPTPresenter.open());const popup=await popupPromise;
    const image=popup.frameLocator('#currentPreview iframe').locator('.source-page-image');await image.waitFor();
    await image.evaluate(img=>img.decode());
    assert.ok(await image.evaluate(img=>img.clientWidth>=innerWidth*.95&&img.naturalWidth===1920));
    await popup.click('#presenterNext');await page.waitForFunction(()=>PPTDeck.current()===13);await popup.close();await page.waitForFunction(()=>!PPTPresenter.active);
   }
   await page.emulateMedia({media:'print'});
   assert.equal(await page.locator('.source-header').evaluate(el=>getComputedStyle(el).display),'none');
   assert.equal(await page.locator('.pdf-source-slide').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').length),24);
   await page.emulateMedia({media:'screen'});
   if(mobile){await page.click('#sourceOutlineToggle');await page.keyboard.press('Escape');assert.equal(await page.locator('.source-outline-drawer[open]').count(),0);}
   assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
   await context.close();
  }
  console.log('Lecture 7: desktop/mobile original slides, contents/search, zoom, personal edits/notes/highlights persistence, deep links, PDF hash/download, text-only mocked AI context, focus, bilingual UI, and print styles passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
