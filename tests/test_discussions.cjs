/* Existing course server required. AI calls are intercepted; agents are explicitly scripted. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.DISCUSSIONS_TEST_URL||'http://127.0.0.1:8782/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'courses.html');await page.evaluate(()=>{localStorage.removeItem('xiaoxi-discussions-v1');localStorage.setItem('westlake-ui-language','en')});await page.reload();
assert.deepEqual(await page.locator('.catalog-sidebar nav a').allTextContents(),['My progress','Discussions','▦Courses']);
await page.getByRole('link',{name:'Discussions',exact:true}).click();await page.locator('.discussion-row').first().waitFor();
await page.screenshot({path:'/private/tmp/discussions-change/discussions-desktop.png',fullPage:true});
await page.getByRole('link',{name:'Does register renaming remove every data hazard?',exact:true}).click();
await page.fill('#replyText','My human explanation: renaming does not remove RAW.');await page.getByRole('button',{name:'Post reply',exact:true}).click();
const human=page.locator('#threadReplies article').filter({hasText:'My human explanation:'});await human.getByRole('button',{name:'Mark helpful',exact:true}).click();assert.equal(await page.getByRole('button',{name:'✓ Helpful',exact:true}).count(),1);
await human.getByRole('button',{name:'Reply',exact:true}).click();await page.getByRole('textbox',{name:'Nested reply',exact:true}).fill('A nested clarification');await page.getByRole('button',{name:'Save reply',exact:true}).click();assert.match(await page.locator('#threadReplies').innerText(),/A nested clarification/);
await human.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('textbox',{name:'Edit reply',exact:true}).fill('Edited human explanation');await page.getByRole('button',{name:'Save reply',exact:true}).click();
await page.getByRole('button',{name:'Ask my agent',exact:true}).click();const before=await page.locator('#threadReplies article').count();await page.getByRole('textbox',{name:'Agent draft',exact:true}).fill('Edited AI explanation for review');assert.equal(await page.locator('#threadReplies article').count(),before);await page.getByRole('button',{name:'Review & publish',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();assert.match(await page.locator('#threadReplies').innerText(),/AI-generated · unverified · approved by you/);
await page.getByRole('button',{name:'Start agent discussion',exact:true}).click();await page.getByRole('button',{name:'Activate session',exact:true}).click();await page.waitForTimeout(4000);assert.equal(await page.locator('#agentDrafts article').count(),3);assert.match(await page.locator('#agentSessionStatus').innerText(),/Turn limit reached/);assert.equal(await page.locator('#threadReplies article').count(),before+1);
await page.getByRole('button',{name:'Start agent discussion',exact:true}).click();await page.getByRole('button',{name:'Activate session',exact:true}).click();await page.getByRole('button',{name:'Pause / stop',exact:true}).click();const draftCount=await page.locator('#agentDrafts article').count();await page.waitForTimeout(2300);assert.equal(await page.locator('#agentDrafts article').count(),draftCount);
await page.screenshot({path:'/private/tmp/discussions-change/discussion-thread.png',fullPage:true});
// Sharing from the actual existing lecture chat: only selected content crosses the boundary.
await page.route('**/api/health',route=>route.fulfill({json:{configured:true,model:'mock-test'}}));
await page.route('**/api/chat',route=>route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'delta',text:'Mock tutor answer: RAW requires the producer value.'})+'\n'+JSON.stringify({type:'done'})+'\n'}));
await page.goto(base+'lecture.html?course=computer-architecture&lecture=lecture-07-tomasulo');await page.click('#agentLauncher');await page.fill('#agentInput','PRIVATE PROMPT must never be copied');
await page.locator('#agentSend').click();await page.waitForFunction(()=>[...document.querySelectorAll('.agent-message.assistant')].some(x=>x.textContent.includes('Mock tutor answer')));
const reply=page.locator('.agent-message.assistant').last();await reply.getByRole('button',{name:'Share to Discussion',exact:true}).click();await page.locator('#discussionCourse option').nth(1).waitFor({state:'attached'});
assert.equal(await page.locator('#discussionContext').inputValue(),'');assert.equal(await page.locator('#discussionExcerpt').inputValue(),'Mock tutor answer: RAW requires the producer value.');
await page.fill('#discussionTitle','Shared selected explanation');await page.fill('#discussionContext','My own context, not chat history');await page.fill('#discussionExcerpt','Edited AI excerpt');await page.selectOption('#discussionVisibility','Study group');await page.getByRole('button',{name:'Preview post',exact:true}).click();assert.match(await page.locator('#discussionPreview').innerText(),/Study group/);
await page.check('#discussionReviewed');await page.getByRole('button',{name:'Confirm publication',exact:true}).click();await page.waitForURL('**/discussions.html#*');await page.locator('#discussionBody').waitFor();assert.doesNotMatch(await page.locator('#discussionsApp').innerText(),/PRIVATE PROMPT/);assert.match(await page.locator('#discussionBody').innerText(),/AI-generated/);
await page.getByRole('button',{name:'Edit post',exact:true}).click();await page.selectOption('#discussionVisibility','Only me');await page.check('#discussionReviewed');await page.getByRole('button',{name:'Confirm publication',exact:true}).click();assert.match(await page.locator('.discussion-thread-heading').innerText(),/Only me/);
await page.reload();assert.match(await page.locator('.discussion-thread-heading').innerText(),/Only me/);
await page.getByRole('link',{name:/All discussions/}).click();await page.fill('#discussionSearch','Shared selected');assert.equal(await page.locator('.discussion-row').count(),1);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/private/tmp/discussions-change/discussions-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.click('#discussionsLanguage');assert.equal(await page.locator('.catalog-sidebar nav a').nth(1).innerText(),'讨论');
assert.deepEqual(errors,[]);console.log('PASS: existing navigation, private tutor sharing without prompt leakage, edited post, visibility, preview/confirm, replies/nesting/edit, helpful, agent approval, bounded 3-turn comparison, early stop, search, persistence, mobile overflow, language.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
