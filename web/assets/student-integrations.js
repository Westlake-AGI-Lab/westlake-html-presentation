// Independent demo adapters. Future providers must be explicitly configured;
// these previews do not authenticate, fetch data, or imply an active connection.
export const demoIntegrations = Object.freeze({
  canvas: { render(container) {
    container.innerHTML = `<p class="preview-note">Fictional sample · No Canvas account connected. Materials below are labels, not downloadable files.</p><article class="sample-item"><strong>Introduction to Machine Learning</strong><p>Sample course · Autumn 2026</p><p>Week 03 — Probability foundations<br>Materials: Lecture notes · Practice questions</p></article><article class="sample-item"><strong>Scientific Thinking &amp; Research</strong><p>Sample course · Autumn 2026</p><p>Week 02 — Asking a research question<br>Materials: Reading list · Seminar outline</p></article>`;
  } },
  campus: { render(container) {
    container.innerHTML = `<p class="preview-note">Concept preview · University approval and official authentication setup are required. No services are connected.</p><article class="sample-item"><strong>Campus account</strong><p>Future official sign-in could confirm your identity through the university’s own login service.</p></article><article class="sample-item"><strong>University services</strong><p>Future approved links could help you find library resources and campus learning support.</p></article>`;
  } }
});

// Shared presentation primitives. No credentials, persistence, requests or per-frame writes.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const seen = new WeakSet();
let keyboard = false;
const running = new WeakMap();
const rootStyle = getComputedStyle(document.documentElement);
const ease = rootStyle.getPropertyValue('--ease-out').trim();
const canMove = () => !reduced.matches && !keyboard;
function stopMotion() {
  document.getAnimations().forEach(animation => {
    if (animation.effect?.getTiming().iterations === Infinity) animation.cancel();
    else { try { animation.finish(); } catch (_) { animation.cancel(); } }
  });
  document.querySelectorAll('[style*="will-change"]').forEach(el => el.style.removeProperty('will-change'));
}
document.addEventListener('keydown', event => {
  if (['Tab','Enter',' '].includes(event.key)) {
    keyboard = true; document.body.classList.add('keyboard-input'); stopMotion();
  }
}, true);
document.addEventListener('pointerdown', () => {
  keyboard = false; document.body.classList.remove('keyboard-input');
}, {passive:true});
reduced.addEventListener('change', () => { if (reduced.matches) stopMotion(); });
document.addEventListener('visibilitychange', () => document.body.classList.toggle('motion-paused', document.hidden));
document.addEventListener('animationstart', event => {
  if (event.animationName === 'student-reveal') event.target.style.willChange = 'transform, opacity';
});
function clearReveal(event) {
  if (event.animationName !== 'student-reveal') return;
  event.target.classList.remove('is-revealing'); event.target.style.removeProperty('will-change');
}
document.addEventListener('animationend', clearReveal);
document.addEventListener('animationcancel', clearReveal);
function fade(el, to, duration = 150, from) {
  if (!el) return Promise.resolve();
  const opacity = from ?? getComputedStyle(el).opacity;
  if (from === undefined && Math.abs(Number(opacity)-to)<.001 && !running.has(el)) return Promise.resolve();
  running.get(el)?.cancel();
  if (!canMove()) {el.style.opacity = String(to); return Promise.resolve();}
  el.style.willChange = 'opacity'; el.style.opacity = String(to);
  const animation = el.animate([{opacity}, {opacity:to}], {duration, easing:ease});
  running.set(el, animation);
  return animation.finished.catch(() => {}).finally(() => {
    if (running.get(el) === animation) {el.style.removeProperty('will-change'); running.delete(el);}
  });
}
export const motion = {
  canMove,
  reveal(elements, {stagger = parseFloat(rootStyle.getPropertyValue('--stagger')), duration = parseFloat(rootStyle.getPropertyValue('--dur-slow')), rise = 14} = {}) {
    elements.filter(Boolean).forEach((el, i) => {
      if (seen.has(el)) return; seen.add(el);
      if (!canMove()) return;
      const delay = Math.min(Math.min(i, 7) * stagger, 400);
      el.classList.add('reveal');
      el.style.setProperty('--i', Math.min(i, 7));
      el.style.setProperty('--stagger', stagger + 'ms');
      el.style.setProperty('--reveal-rise', rise + 'px');
      // Keep the complete group inside 700ms, including its stagger.
      el.style.setProperty('--reveal-duration', Math.min(duration, 700 - delay) + 'ms');
      el.classList.add('is-revealing');
    });
  },
  fade,
  values(elements) {elements.forEach(el => {fade(el, 1, 150, .55).then(() => el.style.removeProperty('opacity'));});},
  error(el) {if (el.textContent) fade(el, 1, 200, .4);},
  navigate(href) {
    if (!canMove()) {location.assign(href); return;}
    if (this.leaving) return; this.leaving = true;
    fade(document.querySelector('.page-surface'), 0, 150).then(() => location.assign(href));
  }
};
// Internal navigation fades content only; sidebar/nav controls never move.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.download) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || (url.pathname === location.pathname && url.search === location.search)) return;
  if (link.closest('.catalog-sidebar')) return;
  event.preventDefault(); motion.navigate(url.href);
});
window.addEventListener('pageshow', event => {
  motion.leaving = false;
  const surface = document.querySelector('.page-surface');
  if (!surface) return;
  if (event.persisted) surface.style.removeProperty('opacity');
  else fade(surface, 1, 200, .7).then(() => surface.style.removeProperty('opacity'));
});
