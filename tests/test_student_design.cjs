/* Real same-origin authentication against a disposable server; no campus or AI calls. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const root=path.resolve(__dirname,'..');
const studentPassword='FictionalBrowserStudent123!';
const privateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'xiaoxi-student-test-'));
const env={...process.env,PYTHONPATH:path.join(root,'src'),HOST:'127.0.0.1',PORT:'0',
  PPT_WEB_ROOT:path.join(root,'web'),PPT_DECK:'deck.html',PPT_AI_MODE:'operator',
  PPT_CONFIG_PATH:path.join(privateRoot,'absent.json'),CLASSROOM_DATA_DIR:path.join(privateRoot,'classroom'),
  WORKSPACE_AUTH_DB:path.join(privateRoot,'accounts.sqlite3'),
  ALLOWED_HOSTS:'localhost,127.0.0.1,::1',ALLOWED_NETWORKS:'127.0.0.0/8,::1/128',CPP_RUNNER_ENABLED:'0'};
for(const key of Object.keys(env))if(/KEY|TOKEN|PASSWORD|^UNIVERSITY_/i.test(key))delete env[key];
const server=spawn(process.env.PYTHON||'python3',['-u','-B','-c',`
import os
from westlake_ppt.auth import Accounts
from westlake_ppt.teaching import Teaching
accounts=Accounts(os.environ['WORKSPACE_AUTH_DB'])
accounts.seed('${studentPassword}', 'FictionalBrowserInstructor123!')
Teaching(accounts,os.environ['PPT_WEB_ROOT']).seed()
from westlake_ppt.server.app import main
main()
`],{cwd:root,env,stdio:['ignore','pipe','pipe']});
let log='',stderr='';server.stderr.on('data',d=>{stderr+=d;});
const ready=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Test server startup timed out: '+stderr)),15000);
  server.stdout.on('data',d=>{log+=d;const match=log.match(/Westlake HTML presentation: (http:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});
  server.once('error',e=>{clearTimeout(timeout);reject(e);});
  server.once('exit',code=>{clearTimeout(timeout);reject(Error('Test server exited: '+code+' '+stderr));});
});
(async()=>{
 let browser;
 try{
  const base=await ready;
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL?{channel:process.env.PLAYWRIGHT_CHROMIUM_CHANNEL}:{})});
  for(const width of [1440,768,390,360]){
   const context=await browser.newContext({viewport:{width,height:1000}});
   try{
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
     if(new URL(route.request().url()).origin!==base){external.push(route.request().url());return route.abort();}
     return route.continue();
    });
    await page.goto(base+'/student.html');
    assert.equal(await page.inputValue('#studentId'),'');assert.equal(await page.inputValue('#password'),'');
    assert.equal(await page.locator('#fillDemo,.access-badge,.demo-note,#idHelp,#passwordHelp,.login-card .fine').count(),0);
    async function rejected(id,password){
     await page.fill('#studentId',id);await page.fill('#password',password);
     const response=page.waitForResponse(r=>r.url()===base+'/api/auth/login'&&r.request().method()==='POST');
     await page.locator('[type=submit]').click();assert.equal((await response).status(),401);
     await page.waitForFunction(()=>document.querySelector('#loginStatus').textContent==='Incorrect ID or password'&&!document.querySelector('[type=submit]').disabled);
     assert.equal(await page.inputValue('#password'),'');
     assert.equal(await page.getAttribute('#password','type'),'password');
    }
    await rejected('','');await rejected('unknown-'+width,'fictional-wrong');
    await rejected('DEMO2026','fictional-wrong');
    await page.fill('#studentId','DEMO2026');await page.fill('#password',studentPassword);
    await page.click('#togglePassword');assert.equal(await page.getAttribute('#password','type'),'text');
    await page.click('#togglePassword');assert.equal(await page.getAttribute('#password','type'),'password');
    const login=page.waitForResponse(r=>r.url()===base+'/api/auth/login'&&r.request().method()==='POST');
    await page.locator('[type=submit]').press('Enter');assert.equal((await login).status(),200);
    await page.waitForURL(base+'/courses');await page.waitForSelector('.course-card');
    assert.equal(await page.locator('#courseGrid .course-card').count(),4);
    assert.match(await page.locator('.student-profile').innerText(),/Demo Student[\s\S]*DEMO2026/);
    assert.equal(await page.locator('a[href="progress.html"],a[href="discussions.html"]').count(),2);
    await page.reload();await page.waitForSelector('.course-card');
    await page.locator('[data-filter="Mathematics"]').click();await page.waitForFunction(()=>document.querySelectorAll('#courseGrid .course-card').length===2);
    await page.fill('#courseSearch','not-a-real-course');await page.waitForFunction(()=>document.querySelectorAll('#courseGrid .course-card').length===0);
    await page.fill('#courseSearch','');await page.click('[data-filter="all"]');
    await page.getByRole('button',{name:'Linear Algebra',exact:true}).click();await page.waitForSelector('#lectureDialog[open]');
    await page.keyboard.press('Escape');await page.waitForSelector('#lectureDialog[open]',{state:'detached'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const logout=page.waitForResponse(r=>r.url()===base+'/api/auth/logout');
    await page.getByRole('link',{name:'Sign out',exact:true}).click();assert.equal((await logout).status(),200);
    await page.waitForURL(base+'/student.html');
    assert.equal(await page.inputValue('#studentId'),'');assert.equal(await page.inputValue('#password'),'');
    await page.goto(base+'/courses');await page.waitForURL(base+'/student.html');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log(`${width}px: empty login, generic failures, real login/logout, session, courses, filters, dialog and overflow passed`);
   }finally{await context.close();}
  }
 }finally{
  if(browser)await browser.close();
  if(server.exitCode===null){const stopped=once(server,'exit');server.kill('SIGTERM');await stopped;}
  fs.rmSync(privateRoot,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
