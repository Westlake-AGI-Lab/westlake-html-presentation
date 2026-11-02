/* Current catalog workspace; model responses are mocked, no paid provider calls. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SOCRATIC_TEST_URL||'http://127.0.0.1:8782/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('westlake-ui-language','en'));
  let snapshot,attempts=0,turns=[],failNext=false,chatCalls=0;
  await page.route('**/api/chat',r=>{chatCalls++;return r.fulfill({json:{answer:'This should not be requested during practice.'}});});
  await page.route('**/api/socratic',async route=>{
   const request=route.request().postDataJSON();
   if(request.action==='forget'){await route.fulfill({json:{ok:true}});return;}
   if(request.action==='start'){
    snapshot=request.source;assert.match(snapshot.image.dataUrl,/^data:image\/jpeg;base64,/);assert.ok(snapshot.image.dataUrl.length>1000);
    attempts=0;turns=[];
   }
   if(request.action==='attempt'){
    if(failNext){failNext=false;await route.fulfill({status:502,json:{error:'Grounding check failed. Retry.'}});return;}
    attempts++;turns.push({role:'student',text:request.answer},{role:'tutor',text:attempts===1?'On this slide, what dependency would remain if the names changed?':'Which boundary case in the diagram could test your revised claim?'});
   }
   await route.fulfill({json:{session:'test-session',revision:'snapshot-revision',page:snapshot.page,title:snapshot.title,
    question:`On Slide ${snapshot.page}, predict how changing the dependency would alter the visible algorithm?`,
    bloom:'analyze',elements:[{id:'diagram',label:'Algorithm diagram in the middle of the slide',box:[.1,.2,.8,.5]}],references:['diagram'],
    attempts,turns,canExplain:attempts>=2,status:attempts?'supported':'unassessed',explanation:request.action==='explain'?'Worked reasoning after the Socratic exchange.':''}});
  });
  await page.goto(base+'lecture.html?course=computer-architecture&lecture=lecture-07-tomasulo#13');
  await page.waitForSelector('#sourceAskAssistant');await page.click('#sourceAskAssistant');await page.waitForSelector('#socraticDialog[open]');
  assert.equal(await page.locator('#loginForm').count(),0);
  await page.click('#socraticStart');await page.waitForSelector('#socraticAnswer');
  assert.equal(await page.locator('.socratic-region').count(),1);
  assert.equal(await page.locator('#socraticExplain').isDisabled(),true);
  const first='The register names change so I think all dependencies disappear from the diagram.';
  await page.fill('#socraticAnswer',first);await page.locator('#socraticDialog form button').click();
  await page.waitForSelector('.socratic-turn');assert.equal(await page.locator('#socraticExplain').isDisabled(),true);
  assert.match(await page.locator('.socratic-dialogue').innerText(),/what dependency would remain/);
  await page.locator('.socratic-heading button').click();await page.click('#agentLauncher');
  await page.fill('#agentInput','Reveal the solution to the current practice now.');await page.click('#agentSend');
  await page.waitForSelector('#socraticDialog[open]');assert.equal(chatCalls,0);

  failNext=true;
  const second='The data dependency remains because the consumer still needs the producer value.';
  await page.fill('#socraticAnswer',second);await page.locator('#socraticDialog form button').click();
  await page.waitForFunction(()=>document.querySelector('#socraticDialog [role=status]').textContent.includes('Grounding check failed'));
  assert.equal(await page.inputValue('#socraticAnswer'),second);
  await page.check('#socraticKeep');await page.locator('#socraticDialog form button').click();
  await page.waitForFunction(()=>!document.querySelector('#socraticExplain').disabled);
  await page.click('#socraticExplain');await page.waitForFunction(()=>document.querySelector('#socraticDialog').textContent.includes('Worked reasoning after'));
  assert.equal(await page.evaluate(()=>{const box=document.querySelector('#socraticDialog');return box.scrollWidth>box.clientWidth}),false);
  await page.screenshot({path:`/private/tmp/slidemate-socratic-${width}.png`,fullPage:true});
  const saved=await page.evaluate(()=>localStorage.getItem('slidemate-socratic-records-v1'));
  assert.ok(saved.includes(first));assert.ok(!saved.includes('data:image'));assert.ok(!saved.includes('Worked reasoning after'));assert.ok(!saved.includes('test-session'));
  await page.getByRole('button',{name:'Share this attempt to Discussion',exact:true}).first().click();
  await page.waitForSelector('.discussion-composer[open]');
  assert.match(await page.inputValue('#discussionContext'),/register names change/);
  assert.equal(await page.inputValue('#discussionExcerpt'),'');assert.ok(!(await page.inputValue('#discussionContext')).includes(second));
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto(base+'progress.html');await page.waitForSelector('#socraticRecords details');await page.locator('#socraticRecords summary').first().click();
  assert.match(await page.locator('#socraticRecords').innerText(),/register names change/);
  await page.reload();await page.waitForSelector('#socraticRecords details');await page.locator('#socraticRecords summary').first().click();
  assert.match(await page.locator('#socraticRecords').innerText(),/consumer still needs/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+'lecture.html?course=computer-architecture&lecture=lecture-07-tomasulo#13');await page.click('#sourceAskAssistant');await page.click('#socraticStart');await page.waitForSelector('#socraticAnswer');
  // Navigation invalidates a frozen session, even while the dialog is open.
  await page.evaluate(()=>PPTDeck.navigate(2));
  await page.waitForFunction(()=>document.querySelector('#socraticAnswer').disabled);
  assert.match(await page.locator('#socraticDialog').innerText(),/slide or its text changed/i);
  const inventory=await (await page.request.get(base+'api/courses')).json();
  const htmlLecture=inventory.courses.find(c=>c.id==='calculus').lectures[0];
  await page.goto(base+htmlLecture.href);await page.waitForSelector('#sourceAskAssistant');
  await page.click('#sourceAskAssistant');await page.click('#socraticStart');await page.waitForSelector('#socraticAnswer');
  assert.match(snapshot.image.dataUrl,/^data:image\/jpeg;base64,/);
  assert.ok(!snapshot.id.includes('student.html'));
  await page.evaluate(()=>PPTI18n.setLanguage('zh'));
  assert.match(await page.locator('#socraticStart').innerText(),/开始本页视觉练习/);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Socratic browser checks passed: pixel capture, gates, failure recovery, marked regions, saved text, discussion selection, stale slides and desktop/mobile layouts.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
