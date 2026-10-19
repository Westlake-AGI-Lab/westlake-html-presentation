/* Run against demo courses. No real AI calls. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.COURSES_TEST_URL||'http://127.0.0.1:8782/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.waitForSelector('.course-card');
   assert.equal(await page.locator('.course-card').count(),4);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`/private/tmp/westlake-courses-${mobile?'mobile':'desktop'}.png`,fullPage:true});
   await page.locator('[data-filter="Mathematics"]').click();assert.equal(await page.locator('.course-card').count(),2);
   await page.fill('#courseSearch','xxxx-not-a-course');assert.equal(await page.locator('.course-card').count(),0);
   await page.fill('#courseSearch','');await page.locator('[data-filter="all"]').click();
   await page.fill('#courseSearch','线性');assert.equal(await page.locator('.course-card').count(),1);await page.fill('#courseSearch','');
   await page.getByRole('button',{name:'Linear Algebra',exact:true}).click();
   assert.equal(await page.locator('#lectureDialog[open] .lecture-row').count(),2);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#lectureDialog[open]').count(),0);
   await page.getByRole('button',{name:'Calculus',exact:true}).click();await page.locator('.lecture-row').filter({hasText:'The derivative as a rate of change'}).click();
   await page.waitForFunction(()=>window.PPTDeck&&document.querySelectorAll('.course-slide').length===7);
   assert.equal(await page.locator('.class-entry').count(),0);
   assert.equal(await page.locator('.eigen-top').count(),0);
   assert.equal(await page.locator('#agentPractice').count(),0);
   await page.click('#sourceNext');assert.equal(await page.locator('.slide.active').getAttribute('data-title'),'Start with an average rate');
   await page.waitForSelector('.course-formula mjx-container');
   await page.click('#sourceEdit');
   await page.locator('.slide.active h2').fill('My average-rate slide');
   assert.equal(await page.isDisabled('#sourceNext'),true);
   await page.click('#sourceEdit');
   await page.click('#sourceHighlight');await page.waitForSelector('#highlightToolbar:not([hidden])');
   await page.evaluate(()=>{const n=document.querySelector('.slide.active .course-lead').firstChild,r=document.createRange();r.setStart(n,0);r.setEnd(n,8);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);document.dispatchEvent(new Event('selectionchange'));});
   await page.locator('[data-color="yellow"]').click();
   assert.ok(await page.evaluate(()=>CSS.highlights.get('ppt-yellow').size)>0);
   await page.locator('[data-highlight-label="close"]').click();

   await page.waitForTimeout(500);
   await page.screenshot({path:`/private/tmp/westlake-course-lecture-${mobile?'mobile':'desktop'}.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.reload();await page.waitForFunction(()=>window.PPTDeck?.current()===1);assert.equal(await page.locator('.slide.active h2').innerText(),'My average-rate slide');
   await page.click('#agentLauncher');await page.waitForSelector('body.agent-open');
   await page.fill('#agentInput','Explain the derivative');
   let request;
   await page.route('**/api/chat',async route=>{request=route.request().postDataJSON();await route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'delta',text:'The derivative is a local rate of change.'})+'\n'+JSON.stringify({type:'done'})+'\n'});});
   await page.click('#agentSend');await page.waitForFunction(()=>document.querySelector('#agentConversation').textContent.includes('The derivative is a local rate'));
   assert.equal(request.slides.length,7);assert.ok(JSON.stringify(request.slides).includes('difference quotient'));assert.ok(!JSON.stringify(request.slides).includes('eigenvalue'));
   await page.click('#agentClose');await page.locator('.source-home').click();await page.waitForSelector('.course-card');
   await page.getByRole('button',{name:'Linear Algebra',exact:true}).click();await page.getByRole('link').filter({hasText:'Eigenvectors and diagonalization'}).click();
   await page.waitForSelector('.eigen-top');assert.equal(await page.locator('.eigen-slide').count(),16);assert.ok(await page.locator('.vector-lab').count()>0);assert.equal(await page.locator('.quiz-launch').count(),1);
   await page.locator('.catalog-return').click();await page.waitForSelector('.course-card');await page.click('#catalogLanguage');assert.equal(await page.textContent('h1'),'我的课程');await page.reload();await page.waitForSelector('.course-card');assert.equal(await page.textContent('h1'),'我的课程');
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('Course catalog: desktop/mobile cards, search, filters, modal, lecture navigation, math, AI context, original eigen demo, and bilingual persistence passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
