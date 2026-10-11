/* Eagerly decode hidden slide images before opening the browser's print preview. */
(() => {
  'use strict';
  const button = document.getElementById('printButton');
  const label = (zh, en) => window.PPTI18n?.language === 'en' ? en : zh;
  const mainSlides = () => [...document.querySelectorAll('#deck > .slide')].filter(s => s.dataset.backup !== 'true');
  function eager() {
    const slides = mainSlides(); document.querySelectorAll('.print-last').forEach(s => s.classList.remove('print-last')); slides.at(-1)?.classList.add('print-last');
    for (const slide of slides) {
      for (const video of slide.querySelectorAll('video')) {
        if (!video.poster) continue;
        let img = video.nextElementSibling;
        if (!img?.classList.contains('print-video-poster')) { img = document.createElement('img'); img.className = 'print-video-poster'; video.after(img); }
        img.src = video.poster; img.alt = label('视频静态封面', 'Video poster'); img.loading = 'eager';
      }
      for (const audio of slide.querySelectorAll('audio')) {
        let note = audio.nextElementSibling;
        if (!note?.classList.contains('print-audio-label')) { note = document.createElement('span'); note.className = 'print-audio-label'; audio.after(note); }
        note.textContent = label('音频素材（网页中可播放）', 'Audio (playable in HTML)');
      }
    }
    const images = slides.flatMap(s => [...s.querySelectorAll('img')]); images.forEach(img => img.loading = 'eager'); return images;
  }
  async function ready() {
    const images = eager(); await document.fonts.ready;
    const loaded = await Promise.all(images.map(img => img.decode().then(() => img.naturalWidth > 0, () => false)));
    if (loaded.some(ok => !ok)) throw new Error('Missing print image');
    if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
    return images.length;
  }
  function notice(text) { let node = document.getElementById('printNotice'); if (!node) { node = document.createElement('div'); node.id = 'printNotice'; node.setAttribute('role', 'status'); document.body.append(node); } node.textContent = text; node.hidden = false; }
  async function open() {
    if (button.disabled) return;
    if (document.body.classList.contains('edit-mode')) document.getElementById('editButton').click();
    document.querySelectorAll('#deck video,#deck audio').forEach(m => m.pause());
    button.disabled = true; button.textContent = label('准备打印…', 'Preparing print…'); document.getElementById('printNotice')?.setAttribute('hidden', '');
    let timeout;
    try { await Promise.race([ready(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Print timeout')), 20000); })]); window.print(); }
    catch { notice(label('打印素材尚未全部加载，请等待后重试，并确认 assets 文件夹完整。', 'Print assets are not all ready. Retry and check the complete assets folder.')); }
    finally { clearTimeout(timeout); button.disabled = false; button.textContent = label('打印', 'Print'); }
  }
  eager(); window.addEventListener('beforeprint', eager); button.onclick = open; window.PPTPrint = {open, ready};
})();
