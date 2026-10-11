(() => {
  'use strict';
  const L = (zh, en) => window.PPTI18n?.language === 'en' ? en : zh;
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  let panel, status, content, actions, consent, consentLabel, activeRoom = '', data, busy = false, generation = 0;
  const button = (parent, text, fn) => {
    const node = el('button', '', text); node.type = 'button'; node.onclick = fn; parent.append(node); return node;
  };
  async function api(action, body, query = {}) {
    const response = await fetch('/api/classroom/improvement-' + action + (body ? '' : '?' + new URLSearchParams(query)), {
      method: body ? 'POST' : 'GET', headers: {'Content-Type': 'application/json'},
      body: body ? JSON.stringify({...body, language: PPTI18n.language}) : undefined,
      signal: AbortSignal.timeout(120000)
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || L('请求失败，请重试。', 'Request failed. Please retry.'));
    return result;
  }
  function controls() { actions?.querySelectorAll('button').forEach(b => { b.disabled = busy || (!activeRoom && b.dataset.needsRoom === 'yes'); }); }
  async function run(fn) {
    if (busy) return;
    busy = true; controls(); panel?.setAttribute('aria-busy', 'true');
    status.textContent = L('正在处理…', 'Working…');
    try { await fn(); }
    catch (error) { status.textContent = error.name === 'TimeoutError' ? L('请求超时，请刷新后检查结果。', 'Request timed out. Refresh to check the result.') : error.message; }
    finally { busy = false; controls(); panel?.setAttribute('aria-busy', 'false'); }
  }
  async function refresh() {
    if (!activeRoom) return;
    const room = activeRoom, version = ++generation;
    const result = await api('dashboard', null, {room});
    if (room !== activeRoom || version !== generation) return;
    data = result; render();
    status.textContent = result.report?.sample ? L('示例数据 · 未调用 AI', 'Sample data · No AI call') : L('仅统计明确同意分享的 AI 问题。', 'Only AI questions explicitly shared by students are counted.');
  }
  function toolbar() {
    actions.replaceChildren();
    const reload = button(actions, L('刷新', 'Refresh'), () => run(refresh)); reload.dataset.needsRoom = 'yes';
    const analyze = button(actions, L('AI 分析主题', 'Analyze themes with AI'), () => run(async () => {
      const room = activeRoom;
      await api('analyze', {room});
      if (room === activeRoom) await refresh();
    })); analyze.dataset.needsRoom = 'yes';
    button(actions, L('打开示例课堂', 'Open sample class'), () => run(async () => {
      const result = await api('sample', {});
      await PPTClassroom.selectRoom(result.room);
      await refresh();
    }));
    controls();
  }
  function render() {
    content.replaceChildren();
    if (!data) { content.append(el('p', 'improvement-empty', L('选择课堂后查看学习主题。', 'Select a class to view learning themes.'))); return; }
    const stats = el('div', 'improvement-stats');
    for (const [number, label] of [[data.students, L('参与者', 'Participants')], [data.questions, L('已分享问题', 'Shared questions')], [data.report?.topics.length || 0, L('学习主题', 'Learning themes')]]) {
      const item = el('div'); item.append(el('strong', '', String(number)), el('span', '', label)); stats.append(item);
    }
    stats.append(el('small', '', L('稿件版本 ', 'Source version ') + data.revision)); content.append(stats);
    if (!data.report) {
      content.append(el('p', 'improvement-empty', data.questions ? L('已有问题，尚未分析。', 'Questions are available. Analysis has not run yet.') : L('还没有学生分享的 AI 问题。', 'No students have shared AI questions yet.')));
    } else {
      const report = data.report;
      content.append(el('p', 'improvement-meta', `${L('本次分析', 'Analyzed')}: ${report.analyzed} / ${data.questions} · ${L('未分组', 'Unassigned')}: ${report.unassigned} · ${new Date(report.created * 1000).toLocaleString()}`));
      const table = el('div', 'improvement-table');
      const heading = el('div', 'improvement-row improvement-table-head');
      for (const title of ['#', L('主题 / 建议', 'Theme / Recommendation'), L('人数', 'People'), L('问题', 'Questions'), L('操作', 'Action')]) heading.append(el('span', '', title));
      table.append(heading);
      report.topics.forEach((topic, index) => {
        const row = el('article', 'improvement-row'); row.append(el('span', 'improvement-rank', String(index+1)));
        const text = el('div', 'improvement-topic'); text.append(el('h3', '', topic.title), el('p', '', topic.suggestion), el('small', '', L('相关页：', 'Slides: ') + topic.pages.join(', ')));
        const details = el('details'); details.append(el('summary', '', L('查看问题示例', 'Question examples')));
        topic.examples.forEach(q => details.append(el('p', '', q))); text.append(details);
        row.append(text, el('strong', 'improvement-number', String(topic.students)), el('span', 'improvement-number', String(topic.questions)));
        const command = el('div', 'improvement-command');
        button(command, L('准备补充页', 'Prepare slides'), () => run(async () => {
          const room = activeRoom;
          await api('draft', {room, report: report.id, topic: topic.id});
          if (room === activeRoom) { await refresh(); if (data.drafts[0]) review(data.drafts[0]); }
        })); row.append(command); table.append(row);
      });
      content.append(table);
    }
    content.append(el('h3', 'improvement-drafts-title', L('补充页与审阅记录', 'Supplements and review history')));
    if (!data.drafts.length) content.append(el('p', 'improvement-empty', L('尚无草稿。', 'No drafts yet.')));
    for (const draft of data.drafts) {
      const row = el('div', 'improvement-draft-row');
      const state = {draft: L('待审阅', 'Needs review'), approved: L('已批准 · 新版本', 'Approved · New version'), rejected: L('已拒绝', 'Rejected')}[draft.status];
      row.append(el('span', 'improvement-state ' + draft.status, state), el('strong', '', draft.topic));
      if (draft.status === 'draft') button(row, L('审阅草稿', 'Review draft'), () => review(draft));
      if (draft.status === 'approved') {
        const query = new URLSearchParams({id: draft.id});
        const open = el('a', '', L('打开新版本', 'Open new version')); open.href = '/api/classroom/improvement-file?' + query; open.target = '_blank'; open.rel = 'noopener'; row.append(open);
        query.set('download', '1');
        const download = el('a', '', L('下载 HTML', 'Download HTML')); download.href = '/api/classroom/improvement-file?' + query; row.append(download);
      }
      content.append(row);
    }
  }
  function review(draft) {
    const room = activeRoom;
    const dialog = el('dialog', 'improvement-dialog');
    dialog.addEventListener('keydown', e => e.stopPropagation());
    const head = el('header', 'improvement-review-head'); head.append(el('h2', '', L('审阅补充页', 'Review supplemental slides')));
    button(head, L('关闭', 'Close'), () => dialog.close()); dialog.append(head);
    dialog.append(el('p', 'improvement-review-note', draft.sample ? L('示例草稿 · 不是 AI 生成的课程讲解。', 'Sample draft · Not an AI-generated course explanation.') : L('AI 草稿 · 发布前请核查公式、事实和引用。', 'AI draft · Check formulas, facts and references before publication.')));
    const mode = el('div', 'improvement-modes'); dialog.append(mode);
    const editor = el('div', 'improvement-editor'), preview = el('div', 'improvement-preview');
    dialog.append(editor, preview); preview.hidden = true;
    const inputs = [];
    draft.slides.forEach((slide, index) => {
      const section = el('section', 'improvement-edit-slide'); section.append(el('h3', '', L('补充页 ', 'Supplement ') + (index+1)));
      const item = {};
      for (const [key, title, value, limit] of [['title', L('标题', 'Title'), slide.title, 100], ['bullets', L('要点（每行一个，最多四个）', 'Points (one per line, up to four)'), slide.bullets.join('\n'), 963], ['notes', L('讲稿', 'Speaker notes'), slide.notes, 1600]]) {
        const label = el('label', '', title), input = el(key === 'title' ? 'input' : 'textarea'); input.value = value; input.maxLength = limit;
        input.setAttribute('aria-label', title + ' ' + (index+1)); label.append(input); section.append(label); item[key] = input;
      }
      inputs.push(item); editor.append(section);
    });
    const values = () => inputs.map(item => ({title: item.title.value.trim(), bullets: item.bullets.value.split('\n').map(s => s.trim()).filter(Boolean), notes: item.notes.value.trim()}));
    function showPreview() {
      preview.replaceChildren();
      for (const slide of values()) {
        const sheet = el('section', 'improvement-slide-preview');
        const brand = el('div', 'improvement-preview-brand'), logo = el('img'); logo.src = 'assets/westlake-logo.png'; logo.alt = 'Westlake University'; brand.append(logo, el('span', '', L('课程补充', 'Lecture supplement')));
        const list = el('ul'); slide.bullets.forEach(point => list.append(el('li', '', point)));
        sheet.append(brand, el('h3', '', slide.title), list); preview.append(sheet);
      }
    }
    const editButton = button(mode, L('编辑', 'Edit'), () => { editor.hidden = false; preview.hidden = true; editButton.setAttribute('aria-pressed', 'true'); previewButton.setAttribute('aria-pressed', 'false'); });
    const previewButton = button(mode, L('预览', 'Preview'), () => { showPreview(); editor.hidden = true; preview.hidden = false; editButton.setAttribute('aria-pressed', 'false'); previewButton.setAttribute('aria-pressed', 'true'); }); editButton.setAttribute('aria-pressed', 'true'); previewButton.setAttribute('aria-pressed', 'false');
    const message = el('p', 'improvement-review-note', L('批准后在原稿末尾追加补充页，生成可下载的新 HTML 版本。当前课堂和 GitHub 不会自动更新。', 'Approval appends supplements to a new downloadable HTML version. The live class and GitHub are not updated automatically.')); message.setAttribute('role', 'status'); dialog.append(message);
    const foot = el('footer', 'improvement-review-actions'); dialog.append(foot);
    let saving = false;
    async function submit(action) {
      if (saving) return;
      saving = true; foot.querySelectorAll('button').forEach(b => b.disabled = true); dialog.querySelectorAll('input,textarea').forEach(n => n.disabled = true);
      try {
        await api(action, {room, id: draft.id, slides: values()});
        dialog.close(); if (room === activeRoom) await refresh();
        status.textContent = action === 'approve' ? L('新版本已保存，等待发布。', 'New version saved, awaiting publication.') : L('审阅已保存。', 'Review saved.');
      } catch (error) { message.textContent = error.message; }
      finally { saving = false; foot.querySelectorAll('button').forEach(b => b.disabled = false); dialog.querySelectorAll('input,textarea').forEach(n => n.disabled = false); }
    }
    button(foot, L('拒绝', 'Reject'), () => submit('reject'));
    button(foot, L('保存草稿', 'Save draft'), () => submit('save'));
    const approve = button(foot, L('批准并生成新版本', 'Approve & create version'), () => submit('approve')); approve.className = 'improvement-primary';
    dialog.addEventListener('close', () => dialog.remove(), {once: true});
    document.body.append(dialog); dialog.showModal();
  }
  function mount(app) {
    panel = el('section', 'improvement-panel'); panel.id = 'lectureImprovements';
    const head = el('header', 'improvement-heading'); head.append(el('h2', '', L('课程改进 · Top 10', 'Lecture improvements · Top 10')));
    actions = el('div', 'improvement-actions'); head.append(actions);
    status = el('p', 'improvement-status'); status.setAttribute('role', 'status'); content = el('div'); panel.append(head, status, content);
    app.insertBefore(panel, app.querySelector('.class-summary')); toolbar(); render();
  }
  function localizeConsent() {
    if (consentLabel) consentLabel.textContent = L('将此后提问的文字分享给教师，用于课程改进（不含图片、回答及历史；课堂结束后保留 30 天）。', 'Share the text of subsequent questions with the teacher for lecture improvement (no images, answers or history; retained for 30 days after class ends).');
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (PPTClassroom.role !== 'student') return;
    const label = el('label', 'improvement-consent'); consent = el('input'); consent.type = 'checkbox'; consent.id = 'improvementConsent'; consent.checked = false;
    consentLabel = el('span'); label.append(consent, consentLabel); document.querySelector('.agent-composer').prepend(label); localizeConsent();
  });
  window.addEventListener('classroom-state', event => {
    if (consent) { consent.disabled = event.detail.ended; if (event.detail.ended) consent.checked = false; }
    if (!panel || event.detail.room === activeRoom) return;
    activeRoom = event.detail.room; data = null; render(); controls();
    refresh().catch(error => { status.textContent = error.message; });
  });
  window.addEventListener('ppt-language-change', () => {
    localizeConsent(); if (panel) { panel.querySelector('h2').textContent = L('课程改进 · Top 10', 'Lecture improvements · Top 10'); toolbar(); render(); }
  });
  window.PPTImprovements = {mount, questionConsent() {
    if (!consent?.checked || !PPTClassroom.headers()['X-Classroom-Token']) return {};
    return {shareForImprovement: true, improvementRequestId: crypto.randomUUID()};
  }};
})();
