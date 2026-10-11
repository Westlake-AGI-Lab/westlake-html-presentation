/* Linked local windows; authenticate commands by window identity and a random session. */
(() => {
  'use strict';
  const deck = window.WestlakePresentation, api = window.PPTDeck;
  if (!deck || !api) return;
  const role = () => window.PPTClassroom?.role || 'solo';
  const label = (zh, en) => window.PPTI18n?.language === 'en' ? en : zh;
  let viewer = null, session = '', interval, toolsTimer, ready = false, start = 0, elapsed = 0, paused = false;
  const button = document.createElement('button'); button.id = 'presenterButton'; button.type = 'button'; button.className = 'utility-button';
  document.querySelector('.utility-controls').append(button);
  const tools = document.createElement('button'); tools.id = 'audienceTools'; tools.type = 'button'; tools.hidden = true; document.body.append(tools);
  const controls = '.utility-controls,.deck-controls,.thumb-launcher,#audienceTools';
  function reveal() {
    clearTimeout(toolsTimer); document.body.classList.add('audience-tools-visible');
    toolsTimer = setTimeout(() => {
      const busy = document.body.classList.contains('edit-mode') || document.body.classList.contains('show-notes') || document.querySelector('#presentationCatalog')?.open || document.querySelector('#thumbnailPanel')?.hidden === false || document.querySelector(':is(' + controls + '):hover') || (document.activeElement?.matches(':focus-visible') && document.activeElement?.closest(controls));
      if (busy) reveal(); else document.body.classList.remove('audience-tools-visible');
    }, 3000);
  }
  function updateTools() {
    button.hidden = !['solo', 'project'].includes(role()); button.textContent = label('演讲者 P', 'Presenter P'); button.title = label('打开双屏演讲者视图（P）', 'Open dual-screen presenter view (P)'); button.setAttribute('aria-pressed', String(!!viewer));
    tools.hidden = !(viewer && document.fullscreenElement); tools.textContent = label('演示工具', 'Tools');
    if (tools.hidden) { clearTimeout(toolsTimer); document.body.classList.remove('audience-tools-visible'); } else reveal();
  }
  tools.onclick = reveal;
  document.addEventListener('pointermove', e => { if (!tools.hidden && (e.clientY > innerHeight - 85 || e.clientY < 85 || e.target.closest(controls))) reveal(); });
  document.addEventListener('focusin', e => { if (!tools.hidden && e.target.closest(controls)) reveal(); });
  document.addEventListener('fullscreenchange', updateTools);
  function notice(text) { let el = document.getElementById('presenterNotice'); if (!el) { el = document.createElement('div'); el.id = 'presenterNotice'; el.setAttribute('role', 'status'); document.body.append(el); } el.textContent = text; el.hidden = false; }
  function send(type, data = {}) { if (viewer && !viewer.closed) viewer.postMessage({presenterSession: session, type, ...data}, '*'); }
  function close(closeWindow = true) {
    const old = viewer; viewer = null; ready = false; clearInterval(interval); clearTimeout(toolsTimer);
    document.body.classList.remove('audience-mode'); updateTools();
    if (closeWindow && old && !old.closed) old.close();
  }
  const media = () => [...deck.slides[api.current()].querySelectorAll('video,audio')];
  function status() { return {elapsed: elapsed + (paused ? 0 : Date.now() - start), paused, media: media().map((m, id) => ({id, name: m.getAttribute('aria-label') || m.closest('figure')?.querySelector('figcaption')?.textContent || label(`音视频 ${id + 1}`, `Media ${id + 1}`), paused: m.paused, muted: m.muted, time: m.currentTime, duration: Number.isFinite(m.duration) ? m.duration : 0}))}; }
  function markup(slide) {
    if (!slide) return '';
    const copy = slide.cloneNode(true); copy.classList.add('active'); copy.classList.remove('before'); copy.removeAttribute('aria-hidden'); copy.removeAttribute('inert');
    copy.querySelectorAll('script,iframe,object,embed,.presenter-notes,.print-video-poster,.print-audio-label,.replay').forEach(e => e.remove());
    copy.querySelectorAll('video').forEach(v => { const img = document.createElement('img'); if(v.getAttribute('poster'))img.setAttribute('src',v.getAttribute('poster')); img.alt = label('视频预览', 'Video preview'); v.replaceWith(img); });
    copy.querySelectorAll('audio').forEach(a => { const text = document.createElement('span'); text.textContent = label('音频素材', 'Audio'); a.replaceWith(text); });
    // Keep relative asset paths: srcdoc's base resolves them, and sanitization stays strict.
    copy.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    [copy, ...copy.querySelectorAll('*')].forEach(el => { el.removeAttribute('contenteditable'); for (const attr of [...el.attributes]) if (attr.name.startsWith('on')) el.removeAttribute(attr.name); });
    return window.DOMPurify.sanitize(copy.outerHTML, {FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['srcdoc']});
  }
  function render() {
    if (!ready) return;
    const index = api.current(), all = deck.slides, route = deck.route(), position = route.indexOf(index), next = route[position + 1];
    const title = s => s.querySelector('h1,h2')?.textContent.trim() || s.dataset.title || '';
    const notes = all[index].querySelector('.presenter-notes')?.cloneNode(true); notes?.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    send('state', {state: {index, position, length: route.length, language: window.PPTI18n?.language || 'zh', brief: deck.brief, backup: all[index].dataset.backup === 'true', canNavigate: role() === 'solo', hasBrief: all.some(s => s.dataset.skip === 'true'), currentTitle: `${index + 1}. ${title(all[index])}`, nextTitle: next === undefined ? '' : `${next + 1}. ${title(all[next])}`, currentHTML: markup(all[index]), nextHTML: markup(all[next]), notes: notes?.textContent.trim() || '', base: location.href, width: all[index].clientWidth, height: all[index].clientHeight, inlineCSS: [...document.querySelectorAll('head style')].map(s => s.textContent).join('\n'), styles: [...document.querySelectorAll('link[rel=stylesheet]')].map(el => el.href), theme: {}, options: all.map((s, i) => ({index: i, title: title(s), backup: s.dataset.backup === 'true'})), ...status()}});
  }
  function open() {
    if (!['solo', 'project'].includes(role())) return;
    if (viewer && !viewer.closed) { viewer.focus(); return; }
    if (viewer) close(false);
    if (document.body.classList.contains('edit-mode')) document.getElementById('editButton').click();
    const random = new Uint8Array(24); crypto.getRandomValues(random); session = [...random].map(n => n.toString(16).padStart(2, '0')).join('');
    const url = new URL('presenter.html', location.href); url.searchParams.set('presenter-session', session);
    viewer = window.open(url.href, `westlake-presenter-${session}`, 'popup=yes,width=1360,height=880,resizable=yes,scrollbars=yes');
    if (!viewer) { notice(label('浏览器拦截了演讲者窗口，请允许弹出窗口后重试。', 'The presenter popup was blocked. Allow popups and retry.')); return; }
    ready = false; start = Date.now(); elapsed = 0; paused = false;
    document.getElementById('presenterNotice')?.setAttribute('hidden', '');
    if (document.body.classList.contains('show-notes')) document.getElementById('notesButton').click();
    document.querySelector('#presentationCatalog')?.close(); if (document.querySelector('#thumbnailPanel')?.hidden === false) document.querySelector('.thumb-close').click();
    if(document.body.classList.contains('agent-open')) document.querySelector('#agentClose')?.click();
    document.body.classList.add('audience-mode'); updateTools();
    interval = setInterval(() => { if (!viewer || viewer.closed) { close(false); return; } if (!ready && Date.now() - start > 8000) { close(); notice(label('演讲者窗口未连接，请确认 presenter.html 和 assets 已完整复制。', 'Presenter did not connect. Check presenter.html and the complete assets folder.')); return; } if (ready) send('status', {state: status(), index: api.current()}); }, 250);
    viewer.focus();
  }
  window.addEventListener('message', e => {
    if (!viewer || e.source !== viewer || e.data?.presenterSession !== session) return;
    const d = e.data;
    if (d.type === 'ready') { ready = true; render(); return; }
    if (d.type === 'closed') { close(false); return; }
    if (d.type !== 'command') return;
    const a = d.action;
    if (a === 'move' && role() === 'solo') deck.move(d.direction === -1 ? -1 : 1);
    else if (a === 'jump' && role() === 'solo') deck.navigate(d.index);
    else if (a === 'boundary' && role() === 'solo') { const indices=deck.main(); deck.navigate(d.edge==='first'?indices[0]:indices.at(-1)); }
    else if (a === 'route' && role() === 'solo') document.getElementById('routeButton').click();
    else if (a === 'return' && role() === 'solo') deck.returnFromBackup();
    else if (a === 'language') window.PPTI18n.setLanguage(window.PPTI18n.language === 'en' ? 'zh' : 'en');
    else if (a === 'end') close();
    else if (a === 'pauseTimer') { if (paused) { start = Date.now(); paused = false; } else { elapsed += Date.now() - start; paused = true; } send('status', {state: status(), index: api.current()}); }
    else if (a === 'resetTimer') { elapsed = 0; start = Date.now(); send('status', {state: status(), index: api.current()}); }
    else if (a === 'media' && d.page === api.current()) {
      const m = Number.isInteger(d.id) && media()[d.id]; if (!m) return;
      if (d.operation === 'play' || d.operation === 'replay') { if (d.operation === 'replay') m.currentTime = 0; m.play().catch(() => send('warning', {text: label('请先在观众窗口点击播放，再从这里控制。', 'Click Play in the audience window first.')})); }
      else if (d.operation === 'pause') m.pause(); else if (d.operation === 'mute') m.muted = !m.muted;
      else if (d.operation === 'seek' && Number.isFinite(d.fraction) && Number.isFinite(m.duration)) m.currentTime = m.duration * Math.max(0, Math.min(1, d.fraction));
      send('status', {state: status(), index: api.current()});
    }
  });
  button.onclick = open;
  for (const name of ['ppt-slide-change', 'ppt-content-change', 'ppt-route-change', 'resize']) window.addEventListener(name, render);
  window.addEventListener('ppt-language-change', () => { render(); updateTools(); });
  window.addEventListener('pagehide', () => close());
  document.addEventListener('keydown', e => { if (e.key.toLowerCase() !== 'p' || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,[contenteditable=true],#agentPanel,dialog,.class-app,.archive-dialog,#thumbnailPanel,.region-layer')) return; e.preventDefault(); viewer && !viewer.closed ? close() : open(); });
  window.PPTPresenter = {open, close, get active() { return !!viewer && !viewer.closed; }}; updateTools();
})();
