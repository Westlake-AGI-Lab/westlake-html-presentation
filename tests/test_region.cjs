/* Optional browser regression: requires Playwright + Chrome and a local deck server. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.REGION_TEST_URL || 'http://127.0.0.1:8765/';
const out = process.env.REGION_TEST_OUTPUT || '/tmp/westlake-region-checks';
fs.mkdirSync(out, {recursive:true});

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const errors = [];
  try {
    for (const mobile of [false,true]) {
      const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,deviceScaleFactor:mobile?2:1});
      const page = await context.newPage();
      const requests = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/health', route => route.fulfill({json:{ok:true,configured:true,model:'mock',images:true,stream:true}}));
      await page.route('**/api/chat', async route => {
        requests.push(route.request().postDataJSON());
        await route.fulfill({status:200,contentType:'application/x-ndjson',body:'{"type":"delta","text":"Test response: $x_t = 1$."}\n{"type":"done"}\n'});
      });
      await page.goto(base.replace(/#.*$/,'')+'#5');
      await page.waitForFunction(()=>document.querySelectorAll('.slide')[4]?.classList.contains('active'));
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForTimeout(500);
      await page.evaluate(()=>PPTI18n.setLanguage('en'));
      async function select(touch=false) {
        await page.locator('#regionSelect').click();
        const r = await page.locator('.slide.active').evaluate(slide=>{
          const target=slide.querySelector('.equation')||slide.querySelector('h2')||slide;
          const b=target.getBoundingClientRect();
          return {x:Math.max(12,b.x-8),y:Math.max(70,b.y-6),width:Math.min(b.width+12,innerWidth-Math.max(12,b.x-8)-12),height:Math.min(b.height+12,innerHeight-b.y-40)};
        });
        if (touch) {
          const cdp=await context.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width,y:r.y+r.height}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          await cdp.detach();
        } else {
          await page.mouse.move(r.x,r.y);await page.mouse.down();
          await page.mouse.move(r.x+r.width,r.y+r.height,{steps:8});await page.mouse.up();
        }
        await page.waitForFunction(()=>!!document.querySelector('.region-preview').getAttribute('src'));
        assert.equal(await page.locator('.slide.active').evaluate(n=>[...document.querySelectorAll('.slide')].indexOf(n)),4);
        const bounds = await page.locator('.region-popup').boundingBox();
        const viewport = page.viewportSize();
        assert(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=viewport.width && bounds.y+bounds.height<=viewport.height+1);
        const pixels=await page.locator('.region-preview').evaluate(async img=>{
          await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
          const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;
          let dark=0;for(let i=0;i<a.length;i+=4)if(a[i]<180&&a[i+1]<180&&a[i+2]<180)dark++;
          return {width:c.width,height:c.height,dark};
        });
        assert(pixels.width<=2048 && pixels.height<=2048 && pixels.dark>25,'crop must contain visible content');
      }
      await select(mobile);
      await page.screenshot({path:path.join(out,mobile?'mobile-en.png':'desktop-en.png')});
      const crop=await page.locator('.region-preview').getAttribute('src');
      fs.writeFileSync(path.join(out,mobile?'mobile-crop.png':'desktop-crop.png'),Buffer.from(crop.split(',')[1],'base64'));
      await page.locator('[data-region-label="formula"]').click();
      await page.waitForFunction(()=>document.querySelector('.agent-message.assistant')?.textContent.includes('Test response'));
      assert.equal(requests.length,1);assert.equal(requests[0].language,'en');assert.equal(requests[0].currentSlide.number,5);
      assert.equal(requests[0].images.length,1);assert.match(requests[0].question,/transcribe/);
      assert.equal(requests[0].images[0].dataUrl,crop);
      await page.locator('#agentClose').click();
      await page.evaluate(()=>PPTI18n.setLanguage('zh'));
      await select(mobile);
      assert.equal(await page.locator('[data-region-label="formula"]').textContent(),'解析公式');
      await page.locator('.region-question textarea').fill('这个公式中的系数是什么意思？');
      await page.locator('.region-question textarea').press('Enter');
      await page.waitForFunction(()=>document.querySelectorAll('.agent-message.assistant').length===2);
      assert.equal(requests.length,2);assert.equal(requests[1].language,'zh');assert.equal(requests[1].question,'这个公式中的系数是什么意思？');
      await page.locator('#agentClose').click();
      await page.locator('#regionSelect').click();
      await page.keyboard.press('Escape');assert(await page.locator('.region-layer').isHidden());assert.equal(requests.length,2);
      await page.locator('#regionSelect').click();
      await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Enter');
      await page.waitForFunction(()=>!!document.querySelector('.region-preview').getAttribute('src'));
      await page.locator('[data-region-label="again"]').click();
      assert(await page.locator('.region-preview').isHidden());
      await page.keyboard.press('Escape');
      await select(mobile);
      await page.evaluate(()=>{location.hash='#6';});
      await page.waitForFunction(()=>document.querySelector('.region-layer').hidden);
      assert.equal(requests.length,2,'navigation must cancel unsent selection');
      await page.locator('#agentLauncher').click();await page.locator('#agentInput').fill('Keep my draft');await page.locator('#agentClose').click();
      await page.locator('#regionSelect').click();assert(await page.locator('.region-layer').isHidden());
      assert.equal(await page.locator('#agentInput').inputValue(),'Keep my draft');
      await context.close();
      console.log(mobile?'Mobile touch and bilingual checks passed':'Desktop capture and bilingual checks passed');
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
