/* A route back to courses without changing the current lecture or classroom. */
(() => {
  if(document.body.classList.contains('pdf-lecture')) return;
  if (['teacher','student','project'].includes(new URLSearchParams(location.search).get('mode'))) return;
  const link=document.createElement('a');link.href='courses.html';link.className='catalog-return';
  const style=document.createElement('style');style.textContent='.catalog-return{position:fixed;top:18px;left:20px;z-index:48;display:flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid #d6e2d9;border-radius:9px;background:#fffffff2;color:#28654f;font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;box-shadow:0 2px 9px #132d1e08}.catalog-return svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.5}.catalog-return:focus-visible{outline:3px solid #b99238;outline-offset:3px}.eigen-demo .catalog-return{top:90px;left:24px}.eigen-demo .eigen-rail{padding-top:56px}.agent-open .catalog-return{display:none}@media(max-width:900px){.eigen-demo .catalog-return{top:66px;left:14px;padding:6px 10px}.eigen-demo .eigen-rail{padding-top:0}}@media print{.catalog-return{display:none!important}}';document.head.append(style);
  const update=()=>{link.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="12" y="2" width="6" height="6" rx="1"/><rect x="2" y="12" width="6" height="6" rx="1"/><rect x="12" y="12" width="6" height="6" rx="1"/></svg>';link.append(document.createTextNode(window.PPTI18n?.language==='zh'?'课程目录':'Courses'));};
  update();window.addEventListener('ppt-language-change',update);document.body.append(link);
  link.addEventListener('keydown',e=>e.stopPropagation());link.addEventListener('touchend',e=>e.stopPropagation());
})();
