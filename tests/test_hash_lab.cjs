/* Public original course lab with actual local WASI compilation. No AI or online compiler. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.HASH_LAB_URL||'http://127.0.0.1:8792/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'courses.html');await page.getByRole('button',{name:'Data Structure and Algorithm Design',exact:true}).click();await page.getByRole('link').filter({hasText:'Hash functions · Interactive lab'}).click();await page.waitForSelector('.hash-actions');
 assert.equal(await page.locator('.course-slide').count(),10);
 await page.getByRole('button',{name:'Visualize',exact:true}).click();await page.selectOption('#hashExample','collision');assert.ok(await page.locator('#hashStage').innerText().then(s=>s.includes('form')));
 await page.getByRole('button',{name:'Next step',exact:true}).click();await page.getByRole('button',{name:'Next step',exact:true}).click();assert.ok((await page.locator('#hashStage').innerText()).includes('436 / 436'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/private/tmp/hash-work/visual-${mobile?'mobile':'desktop'}.png`,fullPage:true});
 await page.getByRole('button',{name:'Try C++',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#hashRun').disabled);
 await page.getByRole('button',{name:'Load inputs',exact:true}).click();await page.click('#hashRun');await page.waitForFunction(()=>document.querySelector('#hashRunStatus').textContent.startsWith('Finished'),{timeout:25000});assert.equal((await page.locator('#hashOutput').innerText()).trim(),'436\n436');
 await page.selectOption('#hashExample','horner');await page.click('#hashRun');await page.waitForFunction(()=>document.querySelector('#hashRunStatus').textContent.startsWith('Finished'),{timeout:25000});const expected=await page.evaluate(()=>HashLabMath.trace('form').at(-1).after);assert.equal((await page.locator('#hashOutput').innerText()).trim(),String(expected));
 await page.screenshot({path:`/private/tmp/hash-work/code-${mobile?'mobile':'desktop'}.png`,fullPage:true});
 if(!mobile){
  await page.selectOption('#hashExample','rational');await page.click('#hashRun');await page.waitForFunction(()=>document.querySelector('#hashRunStatus').textContent.startsWith('Finished'),{timeout:25000});assert.ok((await page.locator('#hashOutput').innerText()).includes('2 -> 858993503'));
  await page.fill('#hashCode','#include <iostream>\nint main(){std::cout << 123 << "\\n";}');await page.click('#hashRun');await page.waitForFunction(()=>document.querySelector('#hashRunStatus').textContent.startsWith('Finished'),{timeout:25000});assert.equal((await page.locator('#hashOutput').innerText()).trim(),'123');
  await page.fill('#hashCode','int main(){invalid code;}');await page.click('#hashRun');await page.waitForFunction(()=>document.querySelector('#hashRunStatus').textContent.includes('error.'),{timeout:25000});assert.ok((await page.locator('#hashOutput').innerText()).includes('error:'));
  await page.fill('#hashCode','int main(){while(true){}}');await page.click('#hashRun');await page.waitForFunction(()=>document.querySelector('#hashRunStatus').textContent.includes('Time limit'),{timeout:25000});
 }
 await page.getByRole('button',{name:'Close lab',exact:true}).click();assert.equal(await page.locator('#hashLab').isVisible(),false);await page.click('#sourceNext');assert.equal(await page.evaluate(()=>PPTDeck.current()),1);
 await page.reload();await page.waitForSelector('.hash-actions');await page.getByRole('button',{name:'Try C++',exact:true}).click();await page.selectOption('#hashExample','collision');assert.ok((await page.inputValue('#hashCode')).includes('std::uint32_t'));
 assert.deepEqual(errors,[]);await context.close();
}
console.log('Hash lab: original 10-slide catalog, desktop/mobile visual steps, real byte-sum/Horner/rational compilation, edited code, diagnostics, timeout, drafts and navigation passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
