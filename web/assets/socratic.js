/* SlideMate practice on the current lecture. Pixel snapshots never enter browser storage. */
(() => {
  'use strict';
  const KEY = 'slidemate-socratic-records-v1';
  const strings = new Map();
  const L = (en, zh) => { strings.set(en, [en,zh]); strings.set(zh, [en,zh]); return window.PPTI18n?.language === 'zh' ? zh : en; };
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  window.SlideMatePractice = class {
    constructor(chat) {
      this.chat = chat; this.busy = false; this.records = []; this.guided = false;
      this.dialog = node('dialog', '', 'socratic-dialog'); this.dialog.id = 'socraticDialog';
      this.dialog.setAttribute('aria-labelledby', 'socraticTitle');
      this.dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.close();}});
      this.dialog.addEventListener('touchend', e => e.stopPropagation());
      const heading = node('div', '', 'socratic-heading');
      const title = node('h2', L('Reason with this slide', '结合本页推理')); title.id = 'socraticTitle';
      const close = node('button', L('Close', '关闭'));this.closeButton=close;close.type='button';close.onclick=()=>this.close();
      const tools=node('div','','socratic-tools');tools.append(close);heading.append(title,tools);this.dialog.append(heading);
      this.chat.attachPanelControls(this.dialog,tools,'practice');
      this.context=node('p','','socratic-context');this.dialog.append(this.context);
      this.body=node('div','','socratic-body');this.dialog.append(this.body);
      this.notice = node('p', '', 'socratic-notice'); this.notice.setAttribute('role', 'status'); this.body.append(this.notice);
      const about=node('details','','socratic-about');about.append(node('summary',L('How this practice works','练习说明')));
      about.append(node('p', L('Start sends an image of the current slide and its text to the configured AI provider. The image is a frozen browser snapshot; check the marked regions. AI grounding and feedback may be wrong.', '开始后会将当前幻灯片图像与文字发送至已配置的 AI 服务商。图像是浏览器的冻结快照，请核对标记区域。AI 定位与反馈可能出错。')));this.body.append(about);
      this.start = node('button', L('Start visual practice on this slide', '开始本页视觉练习')); this.start.id = 'socraticStart';
      this.start.onclick = () => this.work(() => this.begin()); this.body.append(this.start);
      const grid = node('div', '', 'socratic-grid');
      this.visual=node('div','','socratic-visual');this.content=node('section');const sourcePreview=node('details','','socratic-source-preview');sourcePreview.append(node('summary',L('Captured slide','幻灯片快照')),this.visual);grid.append(sourcePreview,this.content); this.body.append(grid);this.grid=grid;grid.hidden=true;
      const consent = node('label', '', 'socratic-consent'); this.keep = node('input'); this.keep.type = 'checkbox'; this.keep.id = 'socraticKeep';
      consent.append(this.keep, node('span', L('Save my practice record in this browser (text only)', '在此浏览器保存练习记录（仅文字）')));
      const records=node('details','','socratic-settings');records.append(node('summary',L('Practice records','练习记录')),consent);this.body.append(records);
      this.saveNotice = node('p', '', 'socratic-notice'); this.saveNotice.setAttribute('role', 'status'); records.append(this.saveNotice);
      const erase = node('button', L('Delete saved practice records', '删除已保存练习记录')); erase.type = 'button';
      erase.onclick = () => { if (!confirm(L('Delete only the saved Socratic practice records?', '仅删除已保存的苏格拉底式练习记录？'))) return; try { localStorage.removeItem(KEY); this.records = []; this.keep.checked = false; this.saveNotice.textContent = L('Practice records deleted.', '练习记录已删除。'); } catch (_) { this.saveNotice.textContent = L('Deletion failed.', '删除失败。'); } };
      records.append(erase);document.body.append(this.dialog);
      try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved?.version === 1 && Array.isArray(saved.records)) { this.records = saved.records.slice(-100); this.keep.checked = true; } } catch (_) { this.saveNotice.textContent = L('Saved practice records could not be loaded.', '无法读取已保存的练习记录。'); }
      this.keep.onchange = () => { if (this.keep.checked) this.persist(); else { try { localStorage.removeItem(KEY); this.saveNotice.textContent = L('Saving off; records remain in this page only.', '已关闭保存；记录仅留在当前页面。'); } catch (_) { this.saveNotice.textContent = L('Could not remove saved records.', '无法移除已保存记录。'); } } };
      this.launch = node('button', L('Practice', '练习')); this.launch.type = 'button'; this.launch.id = 'agentPractice';
      this.launch.onclick = () => this.open(); chat.panel.querySelector('.chat-tools').append(this.launch);
      window.addEventListener('ppt-practice-open', () => this.open());
      window.addEventListener('ppt-content-change', () => { if (this.session && this.signature() !== this.sourceSignature) { this.stale = true; this.render(); } });
      window.addEventListener('ppt-slide-change', () => {this.syncContext();this.guardLabels(); if (this.session && this.signature() !== this.sourceSignature) { this.stale = true; this.render(); } });
      window.addEventListener('resize',()=>this.syncPresentationMode());
      this.dialog.addEventListener('close',()=>{if(this.dialog.open)return;document.body.classList.remove('practice-open');this.chat.syncWorkspace();if(this.restoreFocus&&!document.body.classList.contains('agent-open'))(document.querySelector('#sourceAskAssistant')||document.querySelector('#agentLauncher')).focus({preventScroll:true});});
      window.addEventListener('ppt-language-change', () => {
        for (const root of [this.dialog, this.launch]) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const n = walker.currentNode, pair = strings.get(n.textContent);
            if (pair && !n.parentElement.closest('textarea,.socratic-turn,h3')) n.textContent = L(...pair);
          }
        }
        this.syncContext();if(this.session)this.render();
      });
    }
    signature() { const context = this.chat.getContext(); const current = context.slides[context.currentSlide.number-1]; return JSON.stringify([location.pathname, location.search, context.currentSlide, current]); }
    blocks() { return !!(this.guided && this.session && !this.session.explanation && !this.stale); }
    guardLabels() { /* Active practice routes explanation actions back to dialogue; its answer gate is server-side. */ }
    syncContext() {const {currentSlide,slides}=this.chat.getContext();this.context.textContent=`${String(currentSlide.number).padStart(2,'0')} / ${slides.length} · ${currentSlide.title}`;}
    syncPresentationMode() {
      if(!this.dialog.open)return;
      const modal=!this.chat.panelBreakpoint.matches;if(this.dialog.matches(':modal')===modal)return;
      const focused=document.activeElement;this.dialog.close();if(modal)this.dialog.showModal();else this.dialog.show();
      if(this.dialog.contains(focused)&&focused.getBoundingClientRect().width)focused.focus({preventScroll:true});
    }
    open() {
      this.chat.close(false);this.restoreFocus=true;
      if(!this.dialog.open){if(this.chat.panelBreakpoint.matches)this.dialog.show();else this.dialog.showModal();}document.body.classList.add('practice-open');this.chat.syncWorkspace();this.syncContext();
      if(this.session)this.render();
      this.syncAccess();
      this.closeButton.focus({preventScroll:true});
    }
    close(focus=true) {this.restoreFocus=focus;this.chat.finishResize();if(this.dialog.open)this.dialog.close();}

    syncAccess() {
      const blocked=this.chat.access.required&&!this.chat.access.images;
      if(blocked)this.notice.textContent=L('University image input has not been verified. Visual practice is disabled; use Xiaoxi text chat.','大学图片输入尚未验证，视觉练习已禁用，请使用小西文字问答。');
      else if(this.capabilityBlocked)this.notice.textContent='';
      this.capabilityBlocked=blocked;this.disable();
    }
    async api(action, extra = {}) {
      const response = await fetch('/api/socratic', {method: 'POST', headers: {'Content-Type': 'application/json', ...window.PPTClassroom?.headers()},
        body: JSON.stringify({action, language: window.PPTI18n?.language || 'en', session: this.session?.session, revision: this.session?.revision, ...extra}), signal: AbortSignal.timeout(300000)});
      const data = await response.json(); if (!response.ok) throw Error(data.error || `HTTP ${response.status}`); return data;
    }
    async work(fn) {
      if(this.chat.access.required&&!this.chat.access.connected){this.close(false);this.chat.requireConnection();return;}
      if(this.chat.access.required&&!this.chat.access.images){this.notice.textContent=L('University image input has not been verified. Visual practice is disabled; use Xiaoxi text chat.','大学图片输入尚未验证，视觉练习已禁用，请使用小西文字问答。');return;}
      if (this.busy) return; this.busy = true; this.notice.textContent = L('Inspecting the slide and reasoning…', '正在检查幻灯片与推理…'); this.disable();
      try { await fn(); this.notice.textContent = ''; }
      catch (e) { this.notice.textContent = e.name === 'TimeoutError' ? L('Request timed out. Your draft is retained; start again if needed.', '请求超时。草稿已保留，必要时重新开始。') : e.message; }
      finally { this.busy = false; this.disable(); }
    }
    disable() { this.start.disabled=this.busy||(this.chat.access.required&&!this.chat.access.images); this.content.querySelectorAll('button,textarea').forEach(e => e.disabled = this.busy || this.stale); const explain = this.content.querySelector('#socraticExplain'); if (explain) explain.disabled = this.busy || this.stale || !this.session?.canExplain || !!this.session?.explanation; }
    async capture(slide) {
      const image = slide.querySelector('.source-page-image'); let canvas;
      if (image) {
        await image.decode(); canvas = document.createElement('canvas');
        const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.round(image.naturalWidth*scale); canvas.height = Math.round(image.naturalHeight*scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      } else {
        if (!window.html2canvas) throw Error(L('Slide capture is unavailable.', '无法捕获幻灯片。'));
        const rect = slide.getBoundingClientRect();
        canvas = await html2canvas(slide, {scale: Math.min(1, 2048/Math.max(rect.width, rect.height)), backgroundColor: '#fff', logging: false,
          ignoreElements: e => e.matches('.presenter-notes,.socratic-dialog,.agent-panel')});
      }
      let dataUrl = canvas.toDataURL('image/jpeg', .85);
      if (dataUrl.length > 1398000) dataUrl = canvas.toDataURL('image/jpeg', .55);
      if (dataUrl.length > 1398000) throw Error(L('Slide image is too large. Use a simpler slide.', '幻灯片图像过大，请使用更简单的页面。'));
      return {dataUrl};
    }
    async begin() {
      const signature = this.signature(), context = this.chat.getContext();
      const slide = document.querySelectorAll('#deck > .slide')[context.currentSlide.number-1];
      if (!slide) throw Error(L('No current slide.', '没有当前幻灯片。'));
      const image = await this.capture(slide);
      if (this.signature() !== signature) throw Error(L('Slide changed during capture. Start again.', '捕获时幻灯片已变化，请重新开始。'));
      const current = context.slides[context.currentSlide.number-1];
      const session = await this.api('start', {source: {id: location.pathname+location.search, page: context.currentSlide.number,
        title: context.currentSlide.title, text: (current.content || '')+'\n'+(current.notes || ''), image}});
      if (this.signature() !== signature) { await this.api('forget', {session: session.session}).catch(() => {}); throw Error(L('Slide changed. Start again on the selected page.', '幻灯片已变化，请在所选页面重新开始。')); }
      if (this.session) await this.api('forget').catch(() => {});
      this.session = session; this.guided = true; this.recordId = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join(''); this.sourceHref = location.pathname+location.search; this.sourceSignature = signature; this.snapshot = session.snapshot || image.dataUrl; this.stale = false; this.draft = ''; this.render();
    }
    render() {
      const s = this.session; if (!s) return;
      this.stale = this.stale || this.signature() !== this.sourceSignature;
      this.grid.hidden=false;this.visual.replaceChildren(); const frame = node('div', '', 'socratic-snapshot'); const image = node('img'); image.src = this.snapshot; image.alt = L(`Frozen Slide ${s.page}: ${s.title}`, `第 ${s.page} 页冻结快照：${s.title}`); frame.append(image);
      for (const e of s.elements.filter(e => s.references.includes(e.id))) {
        const box = node('span', '', 'socratic-region'); const [x,y,w,h] = e.box;
        Object.assign(box.style, {left: x*100+'%', top: y*100+'%', width: w*100+'%', height: h*100+'%'}); box.title = e.label; box.setAttribute('aria-label', e.label); frame.append(box);
      }
      this.visual.append(frame, node('p', s.sourceKind === 'instructor-image' ? L('Registered instructor image · AI regions need your verification', '已登记的教师原图 · AI 区域仍需核对') : L('Browser snapshot · AI regions need your verification', '浏览器快照 · AI 区域仍需核对')));
      s.elements.filter(e => s.references.includes(e.id)).forEach(e => this.visual.append(node('p', e.label)));
      this.content.replaceChildren(node('p', `Slide ${s.page} · ${s.bloom}`, 'socratic-meta'), node('h3', s.question));
      if (this.stale) this.content.append(node('p', L('The slide or its text changed. Start a new practice session; the previous dialogue is retained below.', '幻灯片或文字已变化，请开始新练习；下方保留先前对话。'), 'socratic-notice'));
      const dialogue = node('div', '', 'socratic-dialogue'); dialogue.setAttribute('role', 'log'); dialogue.setAttribute('aria-live', 'polite');
      for (const turn of s.turns) { const item = node('article', '', 'socratic-turn'); item.append(node('strong', turn.role === 'student' ? L('You', '你') : L('Socratic tutor', '苏格拉底式导师')), node('p', turn.text));
        if (turn.role === 'student') { const share = node('button', L('Share this attempt to Discussion', '将此作答分享到讨论')); share.type = 'button'; share.onclick = () => this.work(async () => { const {openComposer} = await import('./discussion-share.js'); this.close(false);await openComposer({text: `Slide ${s.page} · ${s.title}\n${turn.text}`, role: 'user', course: new URLSearchParams(location.search).get('course') || ''}); }); item.append(share); }
        dialogue.append(item); }
      this.content.append(dialogue);
      const form = node('form'); const label = node('label', L('Your prediction and visual evidence', '你的预测与视觉依据')); label.htmlFor = 'socraticAnswer';
      this.answer = node('textarea'); this.answer.id = 'socraticAnswer'; this.answer.rows = 4; this.answer.maxLength = 4000; this.answer.required = true; this.answer.value = this.draft || ''; this.answer.oninput = () => { this.draft = this.answer.value; };
      const submit = node('button', L('Discuss my reasoning', '讨论我的推理')); submit.type = 'submit';
      form.append(label, this.answer, submit); form.onsubmit = e => { e.preventDefault(); this.work(async () => {
        if (this.stale || this.signature() !== this.sourceSignature) throw Error(L('Slide changed. Start again.', '幻灯片已变化，请重新开始。'));
        this.session = await this.api('attempt', {answer: this.answer.value}); this.draft = ''; this.record(); this.render(); this.answer.focus();
      }); }; this.content.append(form);
      const explain = node('button', L('Compare worked reasoning', '对照完整推理')); explain.id = 'socraticExplain'; explain.type = 'button';
      explain.onclick = () => this.work(async () => { if (this.signature() !== this.sourceSignature) throw Error(L('Slide changed. Start again.', '幻灯片已变化，请重新开始。')); this.session = await this.api('explain'); this.record(); this.render(); });
      this.content.append(explain, node('p', L('Unlocks after a first attempt, a tutor question and a distinct supported revision. These observations are not mastery grades.', '首次作答、导师追问及有依据的不同修订后解锁。这些观察不是掌握程度评分。')));
      if (s.explanation) {const explanation=node('section','','socratic-explanation');explanation.append(node('h4', L('Worked reasoning · AI-generated', '完整推理 · AI 生成')), node('p', s.explanation));this.content.append(explanation);}
      this.disable();
    }
    record() {
      const s = this.session; this.records = this.records.filter(r => r.id !== this.recordId);
      this.records.push({id: this.recordId, at: Date.now(), href: this.sourceHref, page: s.page,
        title: s.title, question: s.question, bloom: s.bloom, revision: s.revision, turns: s.turns,
        attempts: s.attempts, status: s.status, compared: !!s.explanation}); this.records = this.records.slice(-100); this.persist();
    }
    persist() {
      if (!this.keep.checked) { this.saveNotice.textContent = L('Record is in this page only. Enable saving to retain it after reload.', '记录仅在当前页面。启用保存以便刷新后保留。'); return; }
      try { localStorage.setItem(KEY, JSON.stringify({version: 1, records: this.records})); this.saveNotice.textContent = L('Practice text saved in this browser. Slide images are not stored.', '练习文字已保存在此浏览器，未保存幻灯片图像。'); }
      catch (_) { this.saveNotice.textContent = L('Saving failed; keep this page open. Your record is still in memory.', '保存失败，请保持页面打开。记录仍在内存中。'); }
    }
  };
})();
