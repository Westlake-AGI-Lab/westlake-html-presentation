/* Saved practice evidence, kept separate from activity time and mastery claims. */
(() => {
  const KEY = 'slidemate-socratic-records-v1';
  const L = (en, zh) => { try { return localStorage.getItem('westlake-ui-language') === 'zh' ? zh : en; } catch (_) { return en; } };
  const section = document.createElement('section'); section.className = 'progress-section'; section.id = 'socraticRecords';
  const anchor = document.querySelector('.progress-privacy'); if (!anchor) return; anchor.before(section);
  const node = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  function render() {
    section.replaceChildren(node('h2', L('Socratic practice records', '苏格拉底式练习记录')),
      node('p', L('Saved attempts and tutor questions · not completion or mastery grades. Slide images and worked answers are not saved.', '已保存的作答与导师追问 · 不代表完成度或掌握程度。未保存幻灯片图像或完整答案。')));
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || 'null');
      const records = data?.version === 1 && Array.isArray(data.records) ? data.records.slice(-100).reverse() : [];
      if (!records.length) section.append(node('p', L('No saved practice records. Enable text saving in lecture Practice to retain your dialogue.', '暂无已保存的练习记录。在讲义练习中启用文字保存即可保留对话。')));
      for (const r of records) {
        if (!r || !Array.isArray(r.turns)) continue;
        const item = node('details', ''); item.className = 'socratic-record';
        item.append(node('summary', `${String(r.title || '').slice(0,200)} · Slide ${r.page} · ${Number(r.attempts)||0} ${L('attempts', '次作答')}`), node('p', String(r.question||'').slice(0,900)));
        r.turns.slice(-16).forEach(t => item.append(node('p', `${t.role === 'student' ? L('You', '你') : L('Tutor', '导师')}: ${String(t.text||'').slice(0,4000)}`)));
        const url = new URL(String(r.href||''), location.origin);
        if (url.origin === location.origin && /^\/(lecture|deck)\.html$/.test(url.pathname)) {
          const link = node('a', L('Reopen lecture →', '重新打开讲义 →')); link.href = url.pathname+url.search+'#'+Math.max(1,Math.min(500,Number(r.page)||1)); item.append(link);
        }
        section.append(item);
      }
    } catch (_) { section.append(node('p', L('Practice records could not be read. Existing stored data was not changed.', '无法读取练习记录，现有存储数据未修改。'))); }
  }
  render(); window.addEventListener('storage', render);
  document.getElementById('progressLanguage')?.addEventListener('click', () => setTimeout(render,0));
})();
