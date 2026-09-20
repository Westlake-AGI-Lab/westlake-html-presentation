/* Region snapshots use the existing chat transport and attachment limits. */
(() => {
  'use strict';
  const copy = {
    select: ['框选提问', 'Ask about an area'], cancel: ['取消', 'Cancel'],
    title: ['选中区域', 'Selected area'], formula: ['解析公式', 'Explain formula'],
    method: ['这是什么方法？', 'Identify method'], explain: ['解释这里', 'Explain this'],
    question: ['询问选中区域…', 'Ask about this area…'], send: ['发送问题', 'Send question'],
    again: ['重新框选', 'Select again'], loading: ['正在截取…', 'Capturing…'],
    failed: ['无法截取此区域，请重新框选或上传截图。', 'Could not capture this area. Select again or upload a screenshot.'],
    small: ['选区太小，请重新框选。', 'The area is too small. Select again.'],
    busy: ['请等待当前操作结束。', 'Wait for the current operation to finish.'],
    limit: ['图片数量已达上限，请先移除附件或清空对话。', 'Image limit reached. Remove attachments or clear the conversation first.'],
    draft: ['请先发送或清空聊天输入框中的草稿。', 'Send or clear your chat draft first.'],
    edit: ['请先结束编辑模式。', 'Finish editing first.'],
    private: ['发送时，选区截图和演示上下文将交给当前 AI 服务商。', 'Sending shares this crop and presentation context with the configured AI provider.'],
    formulaPrompt: ['请解析截图选区中的公式：先准确写出公式，再解释各符号、直观含义、适用条件，并逐步推导或给一个简短例子。看不清的符号请指出，不要猜测。', 'Explain the formula in this selected image: first transcribe it accurately, then explain each symbol, its intuitive meaning and assumptions, followed by a step-by-step derivation or a short example. Flag unreadable symbols instead of guessing.'],
    methodPrompt: ['截图选区展示的是什么方法或算法？请根据可见证据说明名称、核心思路和用途。若无法唯一确定，请说明不确定之处，不要凭空命名。', 'What method or algorithm is shown in this selected image? Explain its name, core idea and purpose using visible evidence. If it cannot be uniquely identified, state the uncertainty rather than inventing a name.'],
    explainPrompt: ['请结合当前幻灯片解释截图选区。若为图表，请解释坐标轴、图例及可得出的结论；若为示意图，请解释各部分及其联系。不要猜测不可见的细节。', 'Explain this selected image in the context of its slide. For a chart, explain the axes, legend and supported conclusions; for a diagram, explain its parts and connections. Do not guess details that are not visible.']
  };
  const t = key => copy[key][window.PPTI18n.language === 'en' ? 1 : 0];
  const el = (tag, cls, parent) => { const node = document.createElement(tag); node.className = cls; parent?.append(node); return node; };
  class WestlakeRegion {
    constructor(chat) {
      this.chat = chat; this.version = 0;
      this.trigger = el('button', 'region-trigger', document.querySelector('.utility-controls'));
      this.trigger.id = 'regionSelect'; this.trigger.type = 'button'; this.trigger.setAttribute('aria-pressed', 'false');
      const icon = el('img', '', this.trigger); icon.src = 'assets/vendor/lucide/scan.svg'; icon.alt = '';
      this.trigger.onclick = () => this.active ? this.close() : this.start();
      this.layer = el('div', 'region-layer', document.body); this.layer.hidden = true; this.layer.tabIndex = -1;
      this.layer.setAttribute('role', 'dialog'); this.layer.setAttribute('aria-modal', 'true');
      this.box = el('div', 'region-box', this.layer); this.box.hidden = true;
      this.cancel = this.button('cancel', 'region-cancel', this.layer, () => this.close());
      this.popup = el('section', 'region-popup', this.layer); this.popup.hidden = true;
      this.heading = el('strong', 'region-heading', this.popup);
      this.preview = el('img', 'region-preview', this.popup); this.preview.hidden = true;
      this.status = el('p', 'region-status', this.popup); this.status.setAttribute('role', 'status');
      this.actions = el('div', 'region-actions', this.popup);
      for (const key of ['formula', 'method', 'explain']) this.button(key, '', this.actions, () => this.send(t(key + 'Prompt')));
      const row = el('form', 'region-question', this.popup);
      this.input = el('textarea', '', row); this.input.rows = 2; this.input.maxLength = 4000;
      this.submit = this.button('send', 'region-send', row, () => this.send(this.input.value.trim()));
      this.submit.textContent = '\u2191';
      row.onsubmit = e => { e.preventDefault(); this.send(this.input.value.trim()); };
      this.input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); this.send(this.input.value.trim()); } });
      this.privacy = el('p', 'region-privacy', this.popup);
      this.button('again', 'region-again', this.popup, () => this.reset());
      this.layer.addEventListener('pointerdown', e => this.down(e));
      this.layer.addEventListener('pointermove', e => this.move(e));
      this.layer.addEventListener('pointerup', e => this.up(e));
      this.layer.addEventListener('pointercancel', () => { if (this.drag) this.reset(); });
      this.layer.addEventListener('keydown', e => e.stopPropagation());
      for (const type of ['touchstart', 'touchend']) this.layer.addEventListener(type, e => e.stopPropagation(), {passive: true});
      document.addEventListener('keydown', e => this.key(e), true);
      window.addEventListener('resize', () => { if (this.active) this.close(); });
      window.addEventListener('ppt-language-change', () => this.localize());
      new MutationObserver(() => {
        if (this.active && (document.querySelector('.slide.active') !== this.slide || document.body.classList.contains('edit-mode'))) this.close();
      }).observe(document.querySelector('.deck'), {subtree: true, attributes: true, attributeFilter: ['class']});
      this.localize();
    }
    button(key, cls, parent, action) {
      const b = el('button', cls, parent); b.type = 'button'; b.dataset.regionLabel = key; b.onclick = action; return b;
    }
    localize() {
      this.trigger.title = t('select'); this.trigger.setAttribute('aria-label', t('select'));
      this.layer.setAttribute('aria-label', t('select'));
      this.layer.querySelectorAll('[data-region-label]').forEach(b => {
        const label = t(b.dataset.regionLabel); if (b !== this.submit) b.textContent = label;
        b.title = label; b.setAttribute('aria-label', label);
      });
      this.heading.textContent = t('title'); this.preview.alt = t('title');
      this.input.placeholder = t('question'); this.input.setAttribute('aria-label', t('question'));
      this.privacy.textContent = t('private');
      if (this.statusKey) this.status.textContent = t(this.statusKey);
    }
    start() {
      let issue = this.chat.busy || this.chat.processing ? 'busy' : document.body.classList.contains('edit-mode') ? 'edit' : null;
      if (this.chat.input.value.trim()) issue = 'draft';
      if (this.chat.pending.length >= 3 || this.chat.messages.slice(-12).reduce((n,m) => n + (m.images?.length || 0), 0) + this.chat.pending.length >= 6) issue = 'limit';
      if (issue) { this.chat.open(); this.chat.notice.textContent = t(issue); return; }
      this.slide = document.querySelector('.slide.active'); if (!this.slide) return;
      this.chat.close(); this.active = true; this.layer.hidden = false;
      this.trigger.setAttribute('aria-pressed', 'true'); document.body.classList.add('region-selecting'); this.reset();
    }
    reset() {
      this.version++; this.drag = null; this.rect = null; this.image = null; this.capturing = false;
      this.popup.hidden = true; this.box.hidden = true; this.preview.hidden = true; this.preview.removeAttribute('src');
      this.input.value = ''; this.layer.focus();
    }
    close() {
      this.active = false; this.reset(); this.layer.hidden = true; this.context = null;
      this.trigger.setAttribute('aria-pressed', 'false'); document.body.classList.remove('region-selecting'); this.trigger.focus();
    }
    point(e) {
      const r = this.slide.getBoundingClientRect();
      return {x: Math.max(Math.max(0,r.left), Math.min(e.clientX, Math.min(innerWidth,r.right))), y: Math.max(Math.max(0,r.top), Math.min(e.clientY, Math.min(innerHeight,r.bottom)))};
    }
    down(e) {
      if (e.target.closest('button,.region-popup') || this.capturing || !this.popup.hidden || !e.isPrimary || e.button !== 0) return;
      e.preventDefault(); this.drag = {start: this.point(e), id: e.pointerId};
      this.layer.setPointerCapture(e.pointerId); this.move(e);
    }
    move(e) {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const p = this.point(e), a = this.drag.start;
      this.rect = {x: Math.min(p.x,a.x), y: Math.min(p.y,a.y), width: Math.abs(p.x-a.x), height: Math.abs(p.y-a.y)};
      this.draw();
    }
    up(e) {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      this.move(e); this.drag = null; this.layer.releasePointerCapture(e.pointerId); this.capture();
    }
    draw() {
      this.box.hidden = false;
      Object.assign(this.box.style, {left: this.rect.x+'px', top: this.rect.y+'px', width: this.rect.width+'px', height: this.rect.height+'px'});
    }
    key(e) {
      if (!this.active) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.close(); return; }
      // Keep slide shortcuts and swipe navigation out of the selection dialog.
      if (e.target.closest('.region-popup,button') && e.key !== 'Tab') return;
      if (e.key === 'Tab') {
        const focusable = [...this.layer.querySelectorAll('button,textarea')].filter(n => n.getClientRects().length && !n.disabled);
        const i = focusable.indexOf(document.activeElement), next = (i + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        e.preventDefault(); e.stopImmediatePropagation(); focusable[next]?.focus(); return;
      }
      if (e.target.closest('.region-popup,button')) return;
      e.stopImmediatePropagation();
      if (this.capturing || !this.popup.hidden) return;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key)) {
        e.preventDefault();
        if (!this.rect) this.rect = {x: innerWidth*.2, y: innerHeight*.3, width: innerWidth*.5, height: innerHeight*.3};
        const dx = e.key === 'ArrowLeft' ? -10 : e.key === 'ArrowRight' ? 10 : 0;
        const dy = e.key === 'ArrowUp' ? -10 : e.key === 'ArrowDown' ? 10 : 0;
        if (e.shiftKey) { this.rect.width = Math.max(24, Math.min(innerWidth-this.rect.x, this.rect.width+dx)); this.rect.height = Math.max(24, Math.min(innerHeight-this.rect.y, this.rect.height+dy)); }
        else { this.rect.x = Math.max(0, Math.min(innerWidth-this.rect.width, this.rect.x+dx)); this.rect.y = Math.max(0, Math.min(innerHeight-this.rect.height, this.rect.y+dy)); }
        this.draw(); if (e.key === 'Enter' || e.key === ' ') this.capture();
      }
    }
    setStatus(key) { this.statusKey = key; this.status.textContent = key ? t(key) : ''; }
    position() {
      const w = this.popup.offsetWidth, h = this.popup.offsetHeight, r = this.rect;
      const right = r.x + r.width + 12, below = r.y + r.height + 12;
      const x = right + w <= innerWidth-12 ? right : Math.min(r.x, innerWidth-w-12);
      const y = below + h <= innerHeight-12 ? below : Math.max(12, r.y-h-12);
      this.popup.style.left = Math.max(12,x)+'px'; this.popup.style.top = Math.max(12,Math.min(y,innerHeight-h-12))+'px';
    }
    enable(ready) { this.actions.querySelectorAll('button').forEach(b => b.disabled = !ready); this.submit.disabled = !ready; this.input.disabled = !ready; }
    async capture() {
      this.popup.hidden = false; this.enable(false); this.setStatus('loading'); this.position();
      if (this.rect.width < 24 || this.rect.height < 24) { this.setStatus('small'); return; }
      const version = ++this.version; this.capturing = true;
      this.context = JSON.parse(JSON.stringify(this.chat.getContext()));
      try {
        await document.fonts.ready;
        if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
        if (!this.active || version !== this.version) return;
        const bounds = this.slide.getBoundingClientRect();
        // Refuse media the DOM renderer would silently omit from the selected crop.
        for (const media of this.slide.querySelectorAll('img,iframe,video')) {
          const r = media.getBoundingClientRect(), a = this.rect;
          if (r.right <= a.x || r.left >= a.x+a.width || r.bottom <= a.y || r.top >= a.y+a.height) continue;
          if (media.tagName !== 'IMG' || !media.complete || !media.naturalWidth) throw Error('unsupported media');
          const url = new URL(media.currentSrc || media.src, location.href);
          if (!['data:','blob:'].includes(url.protocol) && url.origin !== location.origin) throw Error('cross-origin image');
        }
        const canvas = await html2canvas(this.slide, {scale: Math.min(2,4096/Math.max(bounds.width,bounds.height)), logging: false, imageTimeout: 10000, backgroundColor: '#ffffff',
          onclone: doc => { doc.querySelectorAll('.slide').forEach(s => { s.style.transition = 'none'; }); }
        });
        if (!this.active || version !== this.version) return;
        const sx = canvas.width/bounds.width, sy = canvas.height/bounds.height;
        const crop = document.createElement('canvas');
        const size = Math.min(1,2048/Math.max(this.rect.width*sx,this.rect.height*sy));
        crop.width = Math.max(1,Math.round(this.rect.width*sx*size)); crop.height = Math.max(1,Math.round(this.rect.height*sy*size));
        crop.getContext('2d').drawImage(canvas,(this.rect.x-bounds.left)*sx,(this.rect.y-bounds.top)*sy,this.rect.width*sx,this.rect.height*sy,0,0,crop.width,crop.height);
        let blob = await new Promise(resolve => crop.toBlob(resolve,'image/png'));
        if (blob?.size > 5*1024*1024) blob = await new Promise(resolve => crop.toBlob(resolve,'image/jpeg',.85));
        if (!blob) throw Error('capture');
        const ext = blob.type === 'image/jpeg' ? '.jpg' : '.png';
        const image = await this.chat.compress(new File([blob], 'slide-'+this.context.currentSlide.number+'-selection'+ext, {type:blob.type}));
        if (!this.active || version !== this.version) return;
        this.image = image; this.preview.src = image.dataUrl; this.preview.hidden = false;
        this.enable(true); this.setStatus(null); this.position(); this.actions.querySelector('button').focus();
      } catch (_) { if (this.active && version === this.version) this.setStatus('failed'); }
      finally { if (version === this.version) { this.capturing = false; this.position(); } }
    }
    send(question) {
      if (!question || !this.image || this.capturing) return;
      if (this.chat.busy || this.chat.processing) { this.setStatus('busy'); return; }
      if (this.chat.input.value.trim()) { this.setStatus('draft'); return; }
      if (this.chat.pending.length >= 3 || this.chat.messages.slice(-12).reduce((n,m) => n+(m.images?.length||0),0)+this.chat.pending.length >= 6) { this.setStatus('limit'); return; }
      const image = this.image, context = this.context;
      this.chat.pending.push(image); this.chat.drawPending(); this.close(); this.chat.ask(question,context);
    }
  }
  window.WestlakeRegion = WestlakeRegion;
})();
