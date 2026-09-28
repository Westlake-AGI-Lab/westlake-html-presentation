/* Private text annotations use paint-only ranges; slide HTML stays untouched. */
(() => {
  'use strict';
  const labels = {
    title: ['个人荧光笔', 'Personal highlighter'], yellow: ['黄色', 'Yellow'],
    green: ['绿色', 'Green'], pink: ['粉色', 'Pink'], erase: ['删除选中标记', 'Remove selected highlights'],
    undo: ['撤销本页上次操作', 'Undo last change on this slide'], close: ['关闭荧光笔', 'Close highlighter'],
    saved: ['已保存在此浏览器', 'Saved in this browser'],
    failed: ['保存失败：标记仅保留在当前页面。', 'Save failed: highlights remain only on this page.'],
    unreadable: ['无法读取已保存标记。', 'Saved highlights could not be read.'],
    limit: ['本页最多保存 200 个标记。', 'This slide allows up to 200 highlights.'],
    unsupported: ['此浏览器不支持文本高亮。', 'Text highlighting is unavailable in this browser.']
  };
  const colors = ['yellow', 'green', 'pink'];
  const excluded = 'script,style,.presenter-notes,svg,canvas,mjx-container,input,textarea,button,select,[hidden]';
  const t = key => labels[key][window.PPTI18n?.language === 'en' ? 1 : 0];
  function fingerprint(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return (value >>> 0).toString(16);
  }
  function textMap(slide) {
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = []; let text = '', node;
    while ((node = walker.nextNode())) { nodes.push({node, start: text.length}); text += node.data; }
    return {nodes, text};
  }
  function start() {
    const role = window.PPTClassroom?.role || new URLSearchParams(location.search).get('mode') || 'solo';
    if (!['solo', 'student'].includes(role)) return;
    const slides = [...document.querySelectorAll('.deck > .slide')];
    const controls = document.querySelector('.utility-controls');
    if (!slides.length || !controls) return;
    const make = (tag, cls, parent) => { const n = document.createElement(tag); n.className = cls; parent?.append(n); return n; };
    const iconButton = (key, icon, parent) => {
      const b = make('button', 'highlight-button', parent); b.type = 'button'; b.dataset.highlightLabel = key;
      const img = make('img', '', b); img.src = `assets/vendor/lucide/${icon}.svg`; img.alt = ''; return b;
    };
    const trigger = iconButton('title', 'highlighter', controls); trigger.id = 'highlightToggle';
    trigger.setAttribute('aria-pressed', 'false'); trigger.setAttribute('aria-controls', 'highlightToolbar');
    if (!window.CSS?.highlights || !window.Highlight) {
      trigger.disabled = true; trigger.title = t('unsupported'); trigger.setAttribute('aria-label', t('unsupported')); return;
    }
    const bar = make('section', 'highlight-toolbar', document.body); bar.id = 'highlightToolbar'; bar.hidden = true;
    const tools = make('div', 'highlight-tools', bar); tools.setAttribute('role', 'toolbar');
    const swatches = colors.map(color => {
      const b = make('button', 'highlight-button highlight-swatch', tools); b.type = 'button';
      b.dataset.highlightLabel = color; b.dataset.color = color; b.onclick = () => apply(color); return b;
    });
    const erase = iconButton('erase', 'eraser', tools), undo = iconButton('undo', 'undo-2', tools);
    const close = iconButton('close', 'x', tools), status = make('p', 'highlight-status', bar);
    status.setAttribute('role', 'status');
    const paints = Object.fromEntries(colors.map(color => {
      const paint = new Highlight(); CSS.highlights.set(`ppt-${color}`, paint); return [color, paint];
    }));
    const states = new Map(); let active = false, pending = null, statusKey = '';
    function notify(key) { statusKey = key; status.textContent = key ? t(key) : ''; }
    function current() { return slides.find(slide => slide.classList.contains('active')); }
    function stateFor(slide) {
      const map = textMap(slide), old = states.get(slide);
      if (old?.text === map.text) return Object.assign(old, {nodes: map.nodes});
      const key = `westlake-highlights-v1:${location.pathname}:${slides.indexOf(slide)}:${fingerprint(map.text)}`;
      const state = {...map, key, marks: [], history: []};
      try {
        const data = JSON.parse(localStorage.getItem(key) || 'null');
        if (data?.version === 1 && data.text === map.text && Array.isArray(data.marks)) {
          state.marks = data.marks.slice(0, 200).filter(m => Number.isInteger(m.start) && Number.isInteger(m.end)
            && m.start >= 0 && m.end > m.start && m.end <= map.text.length && colors.includes(m.color))
            .map(({start, end, color}) => ({start, end, color}));
        }
      } catch (_) { notify('unreadable'); }
      states.set(slide, state); return state;
    }
    function rangeFor(state, mark) {
      const a = state.nodes.find(n => mark.start >= n.start && mark.start < n.start + n.node.length);
      const b = state.nodes.find(n => mark.end > n.start && mark.end <= n.start + n.node.length);
      if (!a || !b) return null;
      const range = document.createRange(); range.setStart(a.node, mark.start - a.start); range.setEnd(b.node, mark.end - b.start); return range;
    }
    function render() {
      Object.values(paints).forEach(paint => paint.clear());
      if (!document.body.classList.contains('edit-mode')) {
        slides.forEach(slide => { const state = stateFor(slide); state.marks.forEach(mark => {
          const range = rangeFor(state, mark); if (range) paints[mark.color].add(range);
        }); });
      }
      updateButtons();
    }
    function updateButtons() {
      swatches.forEach(b => { b.disabled = !pending; });
      const state = current() && stateFor(current());
      erase.disabled = !pending || !state?.marks.some(m => m.start < pending.end && m.end > pending.start);
      undo.disabled = !state?.history.length;
    }
    function save(state) {
      try {
        if (state.marks.length) localStorage.setItem(state.key, JSON.stringify({version: 1, text: state.text, marks: state.marks}));
        else localStorage.removeItem(state.key);
        notify('saved');
      } catch (_) { notify('failed'); }
      render();
    }
    function remember(state) { state.history.push(state.marks.map(m => ({...m}))); if (state.history.length > 20) state.history.shift(); }
    function apply(color) {
      const slide = current();
      if (!pending || pending.slide !== slide) return;
      const state = stateFor(slide);
      if (pending.text !== state.text) { pending = null; updateButtons(); return; }
      const overlap = m => m.start < pending.end && m.end > pending.start;
      // Recolor only the selected span, preserving the remainder of older marks.
      const marks = state.marks.flatMap(m => !overlap(m) ? [m] : color === null ? [] : [
        ...(m.start < pending.start ? [{...m, end: pending.start}] : []),
        ...(m.end > pending.end ? [{...m, start: pending.end}] : [])
      ]);
      if (color) marks.push({start: pending.start, end: pending.end, color});
      marks.sort((a, b) => a.start - b.start);
      const merged = [];
      for (const mark of marks) {
        const last = merged.at(-1);
        if (last && last.color === mark.color && last.end === mark.start) last.end = mark.end;
        else merged.push(mark);
      }
      if (merged.length > 200) { notify('limit'); return; }
      remember(state); state.marks = merged; pending = null; getSelection()?.removeAllRanges(); save(state);
    }
    function selectionChanged() {
      if (!active) return;
      const selection = getSelection(), slide = current(); pending = null;
      if (selection?.rangeCount && !selection.isCollapsed && slide) {
        const range = selection.getRangeAt(0), state = stateFor(slide);
        const a = state.nodes.find(n => n.node === range.startContainer), b = state.nodes.find(n => n.node === range.endContainer);
        if (a && b && range.toString().trim()) pending = {slide, text: state.text, start: a.start + range.startOffset, end: b.start + range.endOffset};
      }
      updateButtons();
    }
    function toggle(value) {
      active = value && !document.body.matches('.edit-mode,.region-selecting,.agent-open');
      bar.hidden = !active; trigger.setAttribute('aria-pressed', String(active));
      document.body.classList.toggle('highlighting', active);
      if (!active) { pending = null; getSelection()?.removeAllRanges(); }
      else selectionChanged();
      position();
      updateButtons();
    }
    function position() { bar.style.top = `${controls.getBoundingClientRect().bottom + 8}px`; }
    function localize() {
      document.querySelectorAll('[data-highlight-label]').forEach(b => { b.title = t(b.dataset.highlightLabel); b.setAttribute('aria-label', b.title); });
      tools.setAttribute('aria-label', t('title')); notify(statusKey);
    }
    trigger.onclick = () => toggle(!active); close.onclick = () => { toggle(false); trigger.focus(); };
    erase.onclick = () => apply(null);
    undo.onclick = () => { const state = stateFor(current()); if (state.history.length) {
      state.marks = state.history.pop(); pending = null; getSelection()?.removeAllRanges(); save(state);
    } };
    bar.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
    bar.addEventListener('keydown', e => e.stopPropagation());
    document.addEventListener('selectionchange', selectionChanged);
    document.addEventListener('keydown', e => {
      if (!active) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); toggle(false); trigger.focus(); }
      else if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) e.stopImmediatePropagation();
    }, true);
    // Stop the deck's swipe listener while native touch selection is active.
    for (const name of ['touchstart', 'touchend']) document.addEventListener(name, e => {
      if (active && (e.target.closest('.deck') || bar.contains(e.target))) e.stopPropagation();
    }, {capture: true, passive: true});
    let previousSlide = current();
    window.addEventListener('ppt-slide-change', () => {
      if (current() !== previousSlide) { pending = null; getSelection()?.removeAllRanges(); previousSlide = current(); }
      render();
    });
    window.addEventListener('ppt-language-change', localize);
    window.addEventListener('resize', position);
    window.addEventListener('storage', e => { if (e.key === null || e.key.startsWith('westlake-highlights-v1:')) { states.clear(); pending = null; render(); } });
    new MutationObserver(() => {
      if (document.body.matches('.edit-mode,.region-selecting,.agent-open')) toggle(false);
      render();
    }).observe(document.body, {attributes: true, attributeFilter: ['class']});
    localize(); render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
