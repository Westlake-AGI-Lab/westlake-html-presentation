/* Portable presentation routes and local controls; no model or classroom requests. */
(() => {
  'use strict';
  const slides = [...document.querySelectorAll('#deck > .slide')];
  const api = window.PPTDeck;
  if (!api || !slides.length) return;
  const role = () => window.PPTClassroom?.role || 'solo';
  const text = (zh, en) => window.PPTI18n?.language === 'en' ? en : zh;
  let brief = false, returnMain = 0, lastSlide = api.current();
  const main = () => slides.map((s, i) => i).filter(i => slides[i].dataset.backup !== 'true' && (!brief || slides[i].dataset.skip !== 'true'));
  const backups = slides.map((s, i) => i).filter(i => slides[i].dataset.backup === 'true');
  const route = () => slides[api.current()].dataset.backup === 'true' ? backups : main();
  const make = (id, zh, en, action) => {
    const button = document.createElement('button'); button.id = id; button.type = 'button'; button.className = 'utility-button';
    button.onclick = action; button.dataset.zh = zh; button.dataset.en = en;
    document.querySelector('.utility-controls').append(button); return button;
  };
  const dialog = document.createElement('dialog'); dialog.id = 'presentationCatalog';
  const heading = document.createElement('h2'), close = document.createElement('button'), list = document.createElement('div');
  close.type = 'button'; close.textContent = '×'; close.onclick = () => dialog.close(); list.className = 'presentation-catalog-list';
  dialog.append(heading, close, list); document.body.append(dialog);
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  function navigate(index) {
    if (!['solo','student'].includes(role()) || document.body.classList.contains('edit-mode') || !Number.isInteger(index) || !slides[index]) return;
    if (slides[api.current()].dataset.backup !== 'true') returnMain = api.current();
    if (brief && slides[index].dataset.skip === 'true' && slides[index].dataset.backup !== 'true') brief = false;
    api.navigate(index);
  }
  function catalog(backupOnly = false) {
    if (role() !== 'solo') return;
    heading.textContent = text(backupOnly ? '备份页' : '幻灯片目录', backupOnly ? 'Backup slides' : 'Contents');
    close.setAttribute('aria-label', text('关闭目录', 'Close contents')); list.replaceChildren();
    slides.forEach((slide, i) => {
      if (backupOnly && slide.dataset.backup !== 'true') return;
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = `${i + 1} · ${slide.dataset.title || ''}` + (slide.dataset.backup === 'true' ? text('〔备份〕', ' [Backup]') : brief && slide.dataset.skip === 'true' ? text('〔精简跳过〕', ' [Skipped in brief route]') : '');
      button.setAttribute('aria-current', String(i === api.current())); button.onclick = () => { dialog.close(); navigate(i); };
      list.append(button);
    });
    dialog.showModal();
  }
  const contents = make('contentsButton', '目录 G', 'Contents G', () => catalog());
  const backup = make('backupButton', '备份 B', 'Backup B', () => catalog(true));
  const routeButton = make('routeButton', '完整版', 'Full route', () => {
    brief = !brief; const indices = main(); if (!indices.length) { brief = false; return; }
    const index = api.current(); if (!indices.includes(index)) api.navigate(indices.find(i => i > index) ?? indices.at(-1));
    update(); window.dispatchEvent(new Event('ppt-route-change'));
  });
  function update() {
    if (slides[lastSlide]?.dataset.backup !== 'true' && slides[api.current()].dataset.backup === 'true') returnMain = lastSlide;
    lastSlide = api.current();
    for (const button of [contents, backup, routeButton]) { button.textContent = text(button.dataset.zh, button.dataset.en); button.hidden = role() !== 'solo'; button.disabled = document.body.classList.contains('edit-mode'); }
    backup.hidden ||= !backups.length; routeButton.hidden ||= !slides.some(s => s.dataset.skip === 'true');
    routeButton.textContent = brief ? text('精简版', 'Brief route') : text('完整版', 'Full route');
    const r = route(), position = r.indexOf(api.current());
    document.getElementById('prevButton').disabled = !['solo','student'].includes(role()) || position <= 0 || document.body.classList.contains('edit-mode');
    document.getElementById('nextButton').disabled = !['solo','student'].includes(role()) || position >= r.length - 1 || document.body.classList.contains('edit-mode');
    if (backups.length || brief) document.getElementById('slideCount').textContent = `${slides[api.current()].dataset.backup === 'true' ? text('备份 ', 'Backup ') : ''}${position + 1} / ${r.length}`;
  }
  window.WestlakePresentation = { slides, main, backups, route, navigate, catalog, onNavigate(index) { if(brief && slides[index]?.dataset.skip==='true' && slides[index]?.dataset.backup!=='true') brief=false; }, get brief() { return brief; }, move(direction) { const r = route(); navigate(r[Math.max(0, Math.min(r.length - 1, r.indexOf(api.current()) + direction))]); }, returnFromBackup() { navigate(returnMain); } };
  window.addEventListener('ppt-slide-change', update); window.addEventListener('ppt-language-change', update); window.addEventListener('ppt-content-change', update);
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,[contenteditable=true],#agentPanel,dialog,.class-app,.archive-dialog,#thumbnailPanel,.region-layer,.highlight-toolbar')) return;
    if (e.key.toLowerCase() === 'g') { e.preventDefault(); catalog(); }
    if (e.key.toLowerCase() === 'b' && backups.length) { e.preventDefault(); catalog(true); }
    if (e.key === 'Escape' && slides[api.current()].dataset.backup === 'true' && dialog.open === false && document.querySelector('#thumbnailPanel')?.hidden !== false) window.WestlakePresentation.returnFromBackup();
  });
  update();
})();
