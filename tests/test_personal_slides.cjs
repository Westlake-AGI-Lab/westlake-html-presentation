/* Run with a local server; all AI calls are mocked. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.PERSONAL_SLIDES_TEST_URL||'http://127.0.0.1:8774/';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const mobile of [false,true]) {
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile});
      const page=await context.newPage(), errors=[], requests=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/api/health',route=>route.fulfill({json:{configured:true,model:'mock'}}));
      let failure=false;
      await page.route('**/api/personal-slides',async route=>{
        requests.push(route.request().postDataJSON());
        await route.fulfill({status:failure?502:200,json:failure?{error:'Mock provider unavailable'}:{currentSlide:5,model:'mock',slides:[
          {title:'A worked explanation',bullets:['Start with $x = 2$.','<img src=x onerror=alert(1)>'],notes:'Additional reasoning; verify assumptions.',sources:[1,5]},
          {title:'Check the result',bullets:['Substitute $x = 2$ into the expression.'],notes:'An illustrative example.',sources:[3]}
        ]}});
      });
      await page.goto(base+'#5');
      await page.waitForFunction(()=>document.querySelectorAll('.slide')[4]?.classList.contains('active'));
      await page.click('#agentLauncher');
      if(mobile)await page.click('#chatLanguageToggle');
      await page.click('#agentCreateSlides');
      assert.equal(requests.length,0);
      await page.fill('#agentInput','Explain the missing step');
      await page.click('#agentCreateSlides');
      await page.waitForSelector('.personal-slides-dialog[open]');
      assert.equal(requests[0].slides.length,5);
      assert.equal(requests[0].currentSlide.number,5);
      assert.equal(requests[0].history,undefined);
      assert.equal(requests[0].language,mobile?'en':'zh');
      assert.equal(await page.locator('.personal-slide img').count(),0);
      await page.waitForSelector('.personal-slide mjx-container');
      const dialog=page.locator('.personal-slides-dialog');
      const overflow=await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1);
      assert.equal(overflow,false);
      await page.screenshot({path:`/tmp/personal-slides-${mobile?'mobile':'desktop'}.png`});
      await dialog.locator('button').filter({hasText:'→'}).click();
      assert.match(await page.locator('.personal-slide h2').textContent(),/Check/);
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('.slide.active').getAttribute('data-title'),requests[0].currentSlide.title);
      const downloadPromise=page.waitForEvent('download');
      await dialog.locator('button').filter({hasText:/下载 HTML|Download HTML/}).click();
      const download=await downloadPromise;
      const html=fs.readFileSync(await download.path(),'utf8');
      assert.match(html,/Check the result/);assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('Explain the missing step'));
      await page.keyboard.press('Escape');
      await page.click('#agentViewSlides');
      await page.locator('.personal-slide-sources button').click();
      assert.equal(await page.locator('.personal-slides-dialog[open]').count(),0);
      await page.click('#agentLauncher');
      failure=true;
      await page.click('#agentCreateSlides');
      await page.waitForFunction(()=>document.querySelector('#agentNotice').textContent.includes('Mock provider unavailable'));
      assert.equal(await page.inputValue('#agentInput'),'Explain the missing step');
      assert.equal(await page.isDisabled('#agentCreateSlides'),false);
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('Personal slides: desktop/mobile generation, math, citations, export, isolation and retry passed.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
