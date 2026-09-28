/* Run against an isolated local server with Playwright + Chrome. No model calls. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.HIGHLIGHTS_TEST_URL || 'http://127.0.0.1:8776';
const selector = '.slide.active .slide-body p[data-editable]';
async function select(page, start = 0, end = 12) {
  await page.evaluate(({selector, start, end}) => {
    const node = document.querySelector(selector).firstChild;
    const range = document.createRange(); range.setStart(node, start); range.setEnd(node, end);
    getSelection().removeAllRanges(); getSelection().addRange(range);
  }, {selector, start, end});
  await page.waitForFunction(() => !document.querySelector('[data-color=yellow]').disabled);
}
async function marks(page, color) { return page.evaluate(c => CSS.highlights.get('ppt-' + c)?.size || 0, color); }
(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({viewport: mobile ? {width:390, height:844} : {width:1440, height:1000}, hasTouch:mobile});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/api/health', r => r.fulfill({json:{configured:false, model:'mock'}}));
      await page.route('**/api/classroom/join', r => r.fulfill({json:{token:'mock-member'}}));
      await page.route('**/api/classroom/state?*', r => r.fulfill({json:{
        page:4, title:'Test class', titles:Array(10).fill('Slide'), epoch:1, boot:'test', cursor:0,
        ended:false, likes:true, danmaku:false, muted:false, events:[]
      }}));
      await page.goto(base + '/?mode=student&room=TEST#4');
      await page.waitForSelector('#highlightToggle');
      const original = await page.locator('.slide.active').innerHTML();
      await page.evaluate(() => PPTI18n.setLanguage('en'));
      await page.click('#highlightToggle');
      if (!mobile) {
        const rect = await page.evaluate(selector => {
          const node = document.querySelector(selector).firstChild, range = document.createRange();
          range.setStart(node,0); range.setEnd(node,12); const r = range.getBoundingClientRect();
          return {x:r.x, y:r.y+r.height/2, end:r.right};
        }, selector);
        await page.mouse.move(rect.x, rect.y); await page.mouse.down();
        await page.mouse.move(rect.end, rect.y, {steps:12}); await page.mouse.up();
        await page.waitForFunction(() => !document.querySelector('[data-color=yellow]').disabled);
      } else await select(page);
      await page.waitForTimeout(2300); // One classroom poll must preserve native text selection.
      assert.equal(await page.locator('[data-color=yellow]').isEnabled(), true);
      await page.click('[data-color=yellow]');
      assert.equal(await marks(page, 'yellow'), 1);
      assert.equal(await page.locator('.slide.active').innerHTML(), original, 'slide HTML must stay untouched');
      await select(page, 4, 8); await page.click('[data-color=green]');
      assert.equal(await marks(page, 'yellow'), 2); assert.equal(await marks(page, 'green'), 1);
      await page.click('[data-highlight-label=undo]');
      assert.equal(await marks(page, 'yellow'), 1); assert.equal(await marks(page, 'green'), 0);
      await select(page); await page.click('[data-highlight-label=erase]');
      assert.equal(await marks(page, 'yellow'), 0);
      await page.click('[data-highlight-label=undo]');
      await page.reload(); await page.waitForSelector('#highlightToggle');
      assert.equal(await marks(page, 'yellow'), 1, 'reload restores highlights');
      await page.click('#highlightToggle');
      await select(page, 14, 20); await page.click('[data-color=pink]');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.slide.active')).opacity === '1');
      await page.screenshot({path:`/tmp/westlake-highlights-${mobile?'mobile':'desktop'}.png`});
      const bounds = await page.locator('#highlightToolbar').boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width);
      const utility = await page.locator('.utility-controls').boundingBox();
      assert(bounds.y >= utility.y + utility.height, 'toolbar must not cover utility controls');
      if (mobile) {
        await page.evaluate(() => {
          const target = document.querySelector('.slide.active');
          const touch = x => new Touch({identifier:1, target, clientX:x, clientY:300});
          target.dispatchEvent(new TouchEvent('touchstart', {bubbles:true, changedTouches:[touch(300)]}));
          target.dispatchEvent(new TouchEvent('touchend', {bubbles:true, changedTouches:[touch(80)]}));
        });
        assert.equal(await page.evaluate(() => PPTDeck.current()), 3, 'selection must not swipe to another slide');
      }
      await page.click('#nextButton');
      assert.equal(await page.evaluate(() => PPTDeck.current()), 4);
      await page.click('#prevButton'); assert.equal(await marks(page, 'yellow'), 1);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#highlightToolbar').isVisible(), false);
      await page.click('#highlightToggle'); await select(page, 25, 30);
      await page.evaluate(() => { Storage.prototype.setItem = () => {throw new DOMException('Quota exceeded', 'QuotaExceededError');}; });
      await page.click('[data-color=green]');
      assert.match(await page.locator('.highlight-status').textContent(), /Save failed/);
      await page.reload(); await page.waitForSelector('#highlightToggle');
      assert.equal(await marks(page, 'green'), 0, 'failed save is not claimed as durable');
      await page.evaluate(() => {
        document.querySelector('.slide.active .slide-body p[data-editable]').firstChild.data = 'Changed source text';
        window.dispatchEvent(new Event('ppt-slide-change'));
      });
      assert.equal(await marks(page, 'yellow'), 0, 'old marks must not attach to changed text');
      assert.deepEqual(errors, []);
      await context.close();
    }
    for (const role of ['teacher','project']) {
      const page = await browser.newPage(); await page.goto(base + '/?mode=' + role);
      assert.equal(await page.locator('#highlightToggle').count(), 0); await page.close();
    }
    console.log('Highlights: desktop/mobile, colors, recolor, erase, undo, reload, navigation, storage failure, source isolation and roles passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
