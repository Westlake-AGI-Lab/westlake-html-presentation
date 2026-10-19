/* Local eigen demo only. No provider calls. Creates and deletes its own classes. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const base=process.env.QUIZ_TEST_URL||'http://127.0.0.1:8783';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'xiaoxi-quiz-browser-'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[],rooms=[];
 const teacher=await browser.newContext({viewport:{width:1440,height:1000}});
 const post=async(action,data)=>{const response=await teacher.request.post(base+'/api/classroom/'+action,{headers:{Origin:base},data});assert(response.ok(),await response.text());return response.json();};
 try {
  const t=await teacher.newPage();t.on('pageerror',e=>errors.push(e.message));
  await t.goto(base+'/?mode=teacher');await t.locator('input[type=password]').fill('local-demo');await t.getByRole('button',{name:'Sign in',exact:true}).click();
  await t.locator('input[type=password]').waitFor({state:'hidden'});
  const {room}=await post('create',{title:'Browser verification'});rooms.push(room);
  await t.evaluate(code=>PPTClassroom.selectRoom(code),room);
  await t.getByRole('button',{name:'Create quiz',exact:true}).click();
  await t.getByLabel('I reviewed the questions, sources and answer key.',{exact:true}).check();
  await t.getByRole('button',{name:'Publish quiz',exact:true}).click();
  await t.getByRole('heading',{name:'Class report',exact:true}).waitFor();
  await t.getByText('Open · 0 participants · 0 submitted · 0 not submitted',{exact:true}).waitFor();
  const student=await browser.newContext({viewport:{width:390,height:844}});
  const s=await student.newPage();s.on('pageerror',e=>errors.push(e.message));
  await s.goto(base+'/?mode=student&room='+room);await s.waitForFunction(()=>!!PPTClassroom.headers()['X-Classroom-Token']);
  await s.getByRole('button',{name:'Quiz',exact:true}).click();await s.getByRole('button',{name:'Join this quiz',exact:true}).click();
  const groups=s.locator('.quiz-dialog fieldset');await groups.nth(2).waitFor();
  await s.getByText('0 of 3 answered · 3 remaining',{exact:true}).waitFor();
  await groups.nth(0).getByRole('radio').nth(0).check();await groups.nth(2).getByRole('radio').nth(2).check();
  await s.getByText('2 of 3 answered · 1 remaining',{exact:true}).waitFor();
  assert(await s.locator('.quiz-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth));
  await s.screenshot({path:path.join(output,'student-mobile.png')});
  await s.getByRole('button',{name:'Submit answers',exact:true}).click();await s.getByText('1 unanswered question will be recorded as skipped.',{exact:true}).waitFor();
  await s.getByRole('button',{name:'Submit with skipped answers',exact:true}).click();await s.getByText('Your answers have been received.',{exact:true}).waitFor();
  await t.getByRole('button',{name:'Refresh report',exact:true}).click();await t.getByText('Open · 1 participants · 1 submitted · 0 not submitted',{exact:true}).waitFor();
  let report=await post('quiz-report',{room});assert.equal(report.slides.find(s=>s.page===9).wrong,0);assert.equal(report.quizzes[0].questions[1].skipped,1);
  await post('control',{room,op:'end'});
  await t.getByRole('button',{name:'Refresh report',exact:true}).click();await t.getByText(/After-class report/).waitFor();
  await s.getByRole('button',{name:'Refresh',exact:true}).click();await s.getByText('Skipped',{exact:true}).waitFor();
  assert.equal(await s.locator('.quiz-review-option.is-correct').count(),3);
  assert.equal(await s.locator('.quiz-review-option.is-selected').count(),2);
  const download=t.waitForEvent('download');await t.getByRole('button',{name:'Download report',exact:true}).click();await (await download).saveAs(path.join(output,'report.html'));
  assert(fs.readFileSync(path.join(output,'report.html'),'utf8').includes('After-class report'));
  await t.screenshot({path:path.join(output,'teacher-report.png')});
  await t.getByRole('button',{name:'Close quiz window',exact:true}).click();
  await t.getByRole('button',{name:'Open sample report',exact:true}).click();await t.getByText('SAMPLE DATA · 12 fictional participants. These are not student or research results.',{exact:true}).waitFor();
  rooms.push(await t.evaluate(()=>PPTClassroom.room));
  await t.getByText('Closed · 12 participants · 10 submitted · 2 not submitted',{exact:true}).waitFor();
  await t.getByLabel('Report summary').getByText('10',{exact:true}).waitFor();
  await t.screenshot({path:path.join(output,'sample-report.png')});
  await t.setViewportSize({width:390,height:844});assert(await t.locator('.quiz-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth));
  await t.screenshot({path:path.join(output,'sample-mobile.png')});
  for(const width of [320,390,1440]){
   const p=await browser.newPage({viewport:{width,height:900}});await p.goto(base+'/deck.html');await p.locator('.quiz-launch').waitFor();
   assert(await p.evaluate(()=>{const pet=document.querySelector('#agentLauncher').getBoundingClientRect();return ![...document.querySelectorAll('.eigen-top button,.eigen-top img')].some(el=>{const r=el.getBoundingClientRect();return pet.left<r.right&&pet.right>r.left&&pet.top<r.bottom&&pet.bottom>r.top;});}));
   await p.close();
  }
  assert.deepEqual(errors,[]);console.log('Quiz publishing, mobile submission, slide counts, class-end report, answer reveal, export, sample isolation and layouts passed. '+output);
 } finally {
  for(const room of rooms)await post('control',{room,op:'delete'}).catch(console.error);
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
