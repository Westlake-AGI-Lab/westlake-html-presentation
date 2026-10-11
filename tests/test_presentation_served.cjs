/* Read-only HTTP smoke checks; browser API requests are mocked to avoid AI charges. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.PRESENTATION_TEST_URL||'http://127.0.0.1:8781/';
const expected=Number(process.env.PRESENTATION_EXPECT_SLIDES||10);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const context=await browser.newContext({viewport:{width:1600,height:900}}),errors=[],checks=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const paths=['presenter.html','assets/presenter.js','assets/presenter-view.js','assets/presenter.css','assets/presentation.js','assets/presentation.css','assets/print.js'];
 for(const p of paths){assert.equal((await context.request.get(new URL(p,base).href)).status(),200);assert.equal((await context.request.head(new URL(p,base).href)).status(),200);}
 for(const p of ['server.py','.env','classroom.py','config.json'])for(const method of ['get','head'])assert.equal((await context.request[method](new URL(p,base).href)).status(),404);
 checks.push('GET/HEAD allowlist and source isolation');
 assert.equal((await context.request.get(new URL('api/health',base).href)).status(),200);
 await context.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/api/health')return r.fulfill({json:{configured:false,model:'test-no-AI'}});if(p==='/api/learning'&&r.request().postDataJSON()?.action==='catalogue')return r.fulfill({json:{concepts:[],version:'test',study:{enabled:false}}});return r.fulfill({status:503,json:{error:'AI calls blocked by smoke test'}});});
 const page=await context.newPage();await page.goto(base);await page.waitForFunction(()=>!!window.PPTPresenter);await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('#deck>.slide').count(),expected);
 const popup=page.waitForEvent('popup');await page.locator('#presenterButton').click();const speaker=await popup;await speaker.waitForFunction(()=>document.getElementById('currentTitle').textContent.startsWith('1.'));
 await speaker.locator('#presenterNext').click();await page.waitForFunction(()=>PPTDeck.current()===1);
 await page.locator('#nextButton').click();await speaker.waitForFunction(()=>document.getElementById('currentTitle').textContent.startsWith('3.'));
 const preview=speaker.locator('#currentPreview iframe');assert(await preview.evaluate(f=>f.contentDocument.querySelector('.slide')));
 assert(await speaker.locator('#speakerNotes').innerText());checks.push('LAN popup pairing, bidirectional navigation, static preview and notes');
 await speaker.locator('#endPresentation').click();await page.waitForFunction(()=>!document.body.classList.contains('audience-mode'));
 await page.evaluate(()=>{window.savedOpen=window.open;window.open=()=>null;});await page.locator('#presenterButton').click();assert(await page.locator('#presenterNotice').isVisible());await page.evaluate(()=>window.open=window.savedOpen);checks.push('blocked popup feedback');
 await page.evaluate(()=>{window.printCalls=0;window.print=()=>window.printCalls++;window.savedCover=document.querySelector('.cover-photo').src;document.querySelector('.cover-photo').src='assets/does-not-exist-test.png';});
 await page.locator('#printButton').click();await page.waitForFunction(()=>document.querySelector('#printNotice')?.hidden===false);assert.equal(await page.evaluate(()=>window.printCalls),0);assert(await page.locator('#printButton').isEnabled());
 await page.evaluate(()=>document.querySelector('.cover-photo').src=window.savedCover);await page.locator('#printButton').click();await page.waitForFunction(()=>window.printCalls===1);checks.push('missing image blocks print, retry restores print');
 await page.locator('#agentLauncher').click();assert(await page.locator('#agentPanel').isVisible());await page.locator('#agentClose').click();await page.waitForTimeout(400);checks.push('existing Q&A panel opens');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>PPTI18n.setLanguage('en'));assert.equal(await page.locator('#presenterButton').innerText(),'Presenter P');const bounds=await page.locator('.utility-controls').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=391);checks.push('390px bilingual toolbar');
 const shot=process.env.PRESENTATION_TEST_SCREENSHOT;if(shot)await page.screenshot({path:shot});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({base,slides:expected,checks,pageErrors:errors,paidAICalls:0},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
