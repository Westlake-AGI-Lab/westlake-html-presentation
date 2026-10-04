(() => {
  'use strict';
  const translations = new Map();
  const L = (en, zh) => {
    translations.set(en, [en, zh]); translations.set(zh, [en, zh]);
    return window.PPTI18n?.language === 'zh' ? zh : en;
  };
  function localize(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode, pair = translations.get(n.textContent);
      if (pair && !n.parentElement.closest('textarea')) n.textContent = L(...pair);
    }
  }
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  async function api(action, data = {}, teacher = false) {
    const response = await fetch(teacher ? '/api/classroom/learning-' + action : '/api/learning', {
      method: 'POST', headers: {'Content-Type': 'application/json', ...window.PPTClassroom?.headers()},
      body: JSON.stringify({action, language: PPTI18n.language, ...data}), signal: AbortSignal.timeout(115000)
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
    return result;
  }
  function button(parent, text, fn) {
    const b = node('button', text); b.type = 'button'; b.onclick = fn; parent.append(b); return b;
  }
  function check(parent, text, fn) {
    const label = node('label', '', 'learning-check'), box = node('input'); box.type = 'checkbox';
    label.append(box, node('span', text)); parent.append(label); box.onchange = () => fn(box); return box;
  }
  function download(value, name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'}));
    const a = node('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const stateName = state => ({
    unassessed: L('Not assessed', '尚未评估'), understood: L('Criteria met on this attempt', '本次达到标准'),
    partial: L('Partially demonstrated', '部分理解'), misunderstood: L('Possible misconception', '可能存在误解'),
    uncertain: L('More evidence needed', '需要更多依据'), correct: L('Supported', '有依据'),
    missing: L('Missing', '未体现'), incorrect: L('Needs revision', '需要修正')
  }[state] || state);

  class Practice {
    constructor(chat) {
      this.chat = chat; this.guided = false; this.records = []; this.busy = false;
      this.storageKey = chat.storageKey + ':practice-v1';
      this.dialog = node('dialog', '', 'learning-dialog'); this.dialog.id = 'learningDialog';
      this.dialog.addEventListener('keydown', e => e.stopPropagation());
      this.dialog.addEventListener('touchend', e => e.stopPropagation());
      const header = node('header'); header.append(node('h2', L('Concept practice', '概念练习')));
      button(header, L('Close', '关闭'), () => this.dialog.close()); this.dialog.append(header);
      this.notice = node('p', '', 'learning-notice'); this.notice.setAttribute('role', 'status'); this.dialog.append(this.notice);
      this.catalogue = node('details'); this.dialog.append(this.catalogue);
      this.exercise = node('section'); this.dialog.append(this.exercise);
      const privacy = node('details'); privacy.append(node('summary', L('Records and consent', '记录与同意')));
      this.keep = check(privacy, L('Save practice attempts on this browser', '在此浏览器保存练习记录'), box => {
        if (!box.checked) { try { localStorage.removeItem(this.storageKey); } catch (_) {} }
        this.persist();
      });
      privacy.append(node('p', L('Shared browser profiles can access saved attempts. Model assessment sends your response to the configured provider. Private practice expires after 30 minutes; expired memory is cleared on a subsequent practice request or server restart. It is not written to the classroom database.', '共用浏览器可能访问已保存的作答。模型评估会将答案发送给已配置的服务商。私人练习30分钟后失效，其内存将在后续练习请求或服务器重启时清除，不写入课堂数据库。')));
      button(privacy, L('Download my practice records', '下载我的练习记录'), () => download({version: 1, records: this.records}, 'practice-records.json'));
      button(privacy, L('Delete my local records', '删除本地记录'), () => { this.records = []; this.persist(); this.drawHistory(); });
      button(privacy, L('Withdraw all my teacher summaries', '撤回我的所有教师摘要'), () => this.work(() => api('withdraw')));
      this.research = node('section'); privacy.append(this.research); this.dialog.append(privacy);
      this.history = node('section'); this.dialog.append(this.history); document.body.append(this.dialog);
      const tools = chat.panel.querySelector('.chat-tools');
      this.launch = button(tools, L('Practice', '练习'), () => this.open()); this.launch.id = 'agentPractice';
      const modes = node('fieldset', '', 'learning-modes'); modes.append(node('legend', L('Assistance', '帮助模式')));
      for (const [value, label] of [['practice', L('Try first', '先尝试')], ['explore', L('Explore', '自由问答')]]) {
        const line = node('label'), radio = node('input'); radio.type = 'radio'; radio.name = 'learningMode'; radio.value = value;
        radio.checked = value === 'explore'; radio.onchange = () => { this.guided = value === 'practice'; this.initialized = true; this.guardLabels(); };
        line.append(radio, node('span', label)); modes.append(line);
      }
      chat.panel.querySelector('.agent-suggestions')?.before(modes);
      if (!modes.isConnected) chat.input.parentElement.before(modes);
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
        if (saved?.version === 1 && Array.isArray(saved.records)) { this.records = saved.records.slice(-100); this.keep.checked = true; }
      } catch (_) { this.notice.textContent = L('Local practice records could not be loaded.', '无法读取本地练习记录。'); }
      window.addEventListener('ppt-slide-change', () => this.guardLabels());
      window.addEventListener('ppt-language-change', () => {
        localize(this.dialog); localize(modes); localize(this.launch);
        if (this.data) { this.drawCatalogue(); this.drawResearch(); this.drawHistory(); }
        this.drawExercise();
      });
      this.load().catch(e => { this.notice.textContent = e.message; });
    }
    blocks(context) {
      return this.guided && (!this.session?.exposed || this.session.page !== context.currentSlide.number ||
        this.session.revision !== this.data?.revision || this.session.version !== this.data?.version);
    }
    guardLabels() {
      const locked = this.blocks(this.chat.getContext());
      this.chat.panel.querySelectorAll('.agent-suggestion').forEach(b => { b.setAttribute('aria-disabled', String(locked)); });
      this.chat.createSlides.setAttribute('aria-disabled', String(locked));
    }
    async work(fn) {
      if (this.busy) return;
      this.busy = true; const working = L('Working...', '处理中...'); this.notice.textContent = working;
      const controls = [...this.dialog.querySelectorAll('button,input,textarea,select')].map(el => [el, el.disabled]);
      controls.forEach(([el]) => el.disabled = true);
      try { await fn(); if (this.notice.textContent === working) this.notice.textContent = ''; }
      catch (e) { this.notice.textContent = e.name === 'TimeoutError' ? L('Request timed out. Retry to continue.', '请求超时，请重试。') : e.message; }
      finally { this.busy = false; controls.forEach(([el, disabled]) => el.disabled = disabled); this.updateControls(); }
    }
    async load() {
      this.data = await api('catalogue');
      if (!this.initialized) {
        this.guided = this.data.concepts.length > 0; this.initialized = true;
        this.chat.panel.querySelectorAll('[name=learningMode]').forEach(r => r.checked = r.value === (this.guided ? 'practice' : 'explore'));
      }
      this.drawCatalogue(); this.drawResearch(); this.drawHistory(); this.guardLabels();
    }
    open() { if (!this.dialog.open) this.dialog.showModal(); this.work(() => this.load()); }
    drawCatalogue() {
      this.catalogue.replaceChildren(node('summary', L('Reviewed concepts', '已审核概念')));
      this.catalogue.open = !this.session;
      if (!this.data.concepts.length) {
        this.catalogue.append(node('p', L('No reviewed concepts for this lecture yet.', '本讲义暂无已审核概念。'))); return;
      }
      for (const c of this.data.concepts) {
        const row = node('div', '', 'learning-concept'); row.append(node('strong', c.title), node('p', c.objective));
        const commands = node('div', '', 'learning-actions');
        button(commands, L('Slide ', '第 ') + c.page, () => { this.dialog.close(); this.chat.navigate(c.page-1); });
        c.tasks.forEach((task, i) => button(commands, `${i+1}. ${task.kind}`, () => this.work(async () => {
          if (this.session) await api('forget', {session: this.session.session}).catch(() => {});
          this.session = await api('start', {concept: c.id, task: task.id}); this.answerText = '';
          this.chat.navigate(c.page-1);
          this.drawCatalogue(); this.drawExercise(); this.guardLabels(); this.answer.focus({preventScroll: true});
          this.dialog.scrollTop = 0;
        })));
        row.append(commands); this.catalogue.append(row);
      }
    }
    drawExercise() {
      this.exercise.replaceChildren(); if (!this.session) return;
      const s = this.session; this.exercise.append(node('h3', s.title), node('p', s.question, 'learning-question'));
      if (this.data?.assessmentMode === 'scripted-mock') this.exercise.append(node('p', L('Scripted demo assessment. Not an AI evaluation.', '脚本演示评分，不是AI评估。'), 'learning-notice'));
      this.answer = node('textarea'); this.answer.id = 'learningAnswer'; this.answer.maxLength = 4000;
      this.answer.rows = 4; this.answer.value = this.answerText || ''; this.answer.setAttribute('aria-label', L('My reasoning', '我的推理'));
      this.answer.oninput = () => { this.answerText = this.answer.value; };
      this.exercise.append(this.answer);
      const actions = node('div', '', 'learning-actions');
      this.submit = button(actions, L('Check my reasoning', '检查我的推理'), () => this.work(async () => {
        const answer = this.answer.value;
        this.session = await api('attempt', {session: s.session, answer});
        this.records.push({id: uid(), at: new Date().toISOString(), revision: s.revision, version: s.version,
          concept: s.concept, title: s.title, task: s.task, question: s.question, answer,
          state: this.session.state, feedback: this.session.feedback,
          assisted: !!(s.hintCount || s.exposed || s.attempts), hints: s.hintCount, exposed: s.exposed});
        this.records = this.records.slice(-100); this.persist(); this.drawExercise(); this.drawHistory(); this.guardLabels();
      }));
      this.hint = button(actions, L('Next hint', '下一条提示'), () => this.work(async () => {
        this.session = await api('hint', {session: s.session}); this.drawExercise();
      }));
      this.explain = button(actions, L('Open explanation', '查看讲解'), () => this.work(async () => {
        this.session = await api('explain', {session: s.session}); this.drawExercise(); this.guardLabels();
      }));
      this.exercise.append(actions, node('p', `${stateName(s.state)} · ${L('Attempts', '尝试')}: ${s.attempts} · ${L('Hints', '提示')}: ${s.hintCount}`));
      for (const item of s.feedback) {
        this.exercise.append(node('p', `${item.label}: ${stateName(item.status)}`));
        if (item.quote) this.exercise.append(node('blockquote', item.quote));
      }
      s.hints.forEach((h, i) => this.exercise.append(node('p', `${L('Hint', '提示')} ${i+1}: ${h}`, 'learning-hint')));
      if (s.answer) this.exercise.append(node('h4', L('Reviewed explanation', '已审核讲解')), node('p', s.answer));
      this.share = check(this.exercise, L('Share this concept summary with my teacher (no written answer)', '与教师分享本概念摘要（不含作答原文）'), box => {
        box.checked = false;
        if (!this.session.attempts) return;
        this.work(async () => { const result = await api('share', {session: s.session, consent: true});
          this.exercise.append(node('p', L('Shared: ', '已分享：') + result.state)); });
      });
      this.exercise.append(node('small', L('AI assessment may be wrong. These observations are not grades or a mastery score.', 'AI评估可能有误。这些观察不是成绩或掌握程度评分。')));
      this.updateControls();
    }
    updateControls() {
      if (!this.session) return;
      if (this.hint) this.hint.disabled = this.busy || this.session.hintCount >= 2 || this.session.attempts <= this.session.hintCount;
      if (this.explain) this.explain.disabled = this.busy || !this.session.canExplain || this.session.exposed;
      if (this.submit) this.submit.disabled = this.busy || this.session.attempts >= 8;
      if (this.share) this.share.disabled = this.busy || !this.session.attempts || !window.PPTClassroom?.room;
    }
    persist() {
      if (!this.keep.checked) return;
      try { localStorage.setItem(this.storageKey, JSON.stringify({version: 1, records: this.records})); }
      catch (_) { this.notice.textContent = L('Could not save locally. Download your records.', '本地保存失败，请下载记录。'); }
    }
    drawHistory() {
      this.history.replaceChildren(node('h3', L('My concept evidence', '我的概念记录')));
      const groups = new Map();
      for (const record of this.records) {
        const key = record.revision + ':' + record.version + ':' + record.concept;
        if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record);
      }
      for (const records of groups.values()) {
        const latest = records.at(-1), details = node('details');
        details.append(node('summary', `${latest.title} · ${stateName(latest.state)} · ${latest.assisted ? L('With assistance or revision', '有辅助或修订') : L('First attempt in this session', '本次会话首次尝试')} · ${records.length}`));
        if (latest.revision !== this.data?.revision || latest.version !== this.data?.version) details.append(node('p', L('Earlier lecture or concept version', '旧版讲义或概念')));
        for (const r of records) details.append(node('p', `${r.at} · ${r.question}`), node('blockquote', r.answer), node('p', stateName(r.state)));
        this.history.append(details);
      }
    }
    drawResearch() {
      this.research.replaceChildren(); const study = this.data.study;
      if (!study.enabled) { this.research.append(node('p', L('Research logging is disabled.', '研究记录未启用。'))); return; }
      const a = node('a', L('Study information and consent', '研究说明与同意')); a.href = study.information; a.target = '_blank'; a.rel = 'noopener'; this.research.append(a);
      this.research.append(node('p', `${study.approval} · ` + L('Opt-in records concept/question IDs, assessment labels, hints, attempts and times. Records older than 30 days are deleted on subsequent classroom requests. Written answers and AI chats are excluded. Withdrawal deletes stored research events for this classroom membership; previously downloaded exports must be handled by the study team.', '自愿记录概念/问题编号、评估标签、提示、尝试和时间。超过30天的记录在后续课堂请求时删除。不含作答原文或AI聊天。撤回将删除本课堂成员的服务器研究事件；已下载的导出文件须由研究团队处理。')));
      const consentBox = check(this.research, L('I have read the study information and consent to research logging', '我已阅读研究说明并同意记录研究数据'), box => {
        const consent = box.checked; box.checked = !consent;
        this.work(async () => { await api('research-consent', {consent, protocol: study.approval}); box.checked = consent; });
      });
      consentBox.checked = !!this.data.researchConsent; consentBox.disabled = !window.PPTClassroom?.room;
      button(this.research, L('Withdraw research consent and delete events', '撤回研究同意并删除数据'), () => this.work(async () => {
        await api('research-consent', {consent: false}); consentBox.checked = false;
      }));
    }
  }

  function mountTeacher(parent) {
    const section = node('section', '', 'learning-teacher'); section.append(node('h2', L('Concept practice', '概念练习'))); parent.append(section);
    window.addEventListener('ppt-language-change', () => localize(section));
    const status = node('p'); status.setAttribute('role', 'status'); section.append(status);
    let revision = '', baseVersion = '', concepts = [], busy = false;
    const controls = node('div', '', 'learning-actions'); section.append(controls);
    const editor = node('div'); section.append(editor);
    const reviewed = check(section, L('I checked source support, question difficulty, criteria, hints and worked answers', '我已检查来源、问题难度、标准、提示和完整答案'), () => {});
    const run = async fn => {
      if (busy) return; busy = true; status.textContent = L('Working...', '处理中...');
      try { await fn(); status.textContent = L('Ready', '就绪'); } catch (e) { status.textContent = e.message; }
      finally { busy = false; }
    };
    function textField(parent, label, value, change, rows = 2) {
      const line = node('label', label), input = node('textarea'); input.value = value || ''; input.rows = rows;
      input.oninput = () => { reviewed.checked = false; change(input.value); }; line.append(input); parent.append(line);
    }
    function draw() {
      editor.replaceChildren();
      concepts.forEach((c, ci) => {
        const details = node('details'); details.open = true; details.append(node('summary', c.title || `Concept ${ci+1}`));
        textField(details, L('Concept', '概念'), c.title, v => c.title = v, 1);
        textField(details, L('Objective', '目标'), c.objective, v => c.objective = v);
        const sourceLabel = node('label', L('Source slide', '来源页')); const page = node('input'); page.type = 'number'; page.min = '1'; page.value = c.page;
        page.oninput = () => { c.page = Number(page.value); reviewed.checked = false; }; sourceLabel.append(page); details.append(sourceLabel);
        textField(details, L('Exact source quotation, including notes', '来源原文（可含讲稿）'), c.source, v => c.source = v);
        c.tasks.forEach((q, qi) => {
          const task = node('fieldset'); task.append(node('legend', L('Question ', '问题 ') + (qi+1)));
          const kind = node('select'); kind.setAttribute('aria-label', 'Question type');
          ['explain', 'apply', 'counterexample'].forEach(k => kind.add(new Option(k, k))); kind.value = q.kind;
          kind.onchange = () => { q.kind = kind.value; reviewed.checked = false; }; task.append(kind);
          textField(task, L('Question', '问题'), q.question, v => q.question = v);
          q.checks.forEach(ch => { textField(task, L('Feedback label (no solution)', '反馈维度（不含答案）'), ch.label, v => ch.label = v, 1);
            textField(task, L('Private correctness criterion', '内部评分标准'), ch.expected, v => ch.expected = v); });
          q.hints.forEach((h, i) => textField(task, L('Hint ', '提示 ') + (i+1), h, v => q.hints[i] = v));
          textField(task, L('Worked answer', '完整答案'), q.answer, v => q.answer = v, 3);
          button(task, L('Remove question', '删除问题'), () => { c.tasks.splice(qi, 1); reviewed.checked = false; draw(); }); details.append(task);
        });
        button(details, L('Add question', '添加问题'), () => { c.tasks.push(newTask()); reviewed.checked = false; draw(); });
        button(details, L('Remove concept', '删除概念'), () => { concepts.splice(ci, 1); reviewed.checked = false; draw(); }); editor.append(details);
      });
    }
    function newTask() { return {id: uid(), kind: 'explain', question: '', answer: '', hints: ['', ''], checks: [{label: '', expected: ''}]}; }
    button(controls, L('Load published concepts', '读取已发布概念'), () => run(async () => {
      const data = await api('catalogue', {}, true); ({revision, concepts} = data); baseVersion = data.version; reviewed.checked = false; draw();
    }));
    button(controls, L('Extract draft with AI', 'AI提取草稿'), () => run(async () => {
      const current = await api('catalogue', {}, true); baseVersion = current.version;
      const data = await api('extract', {}, true); ({revision, concepts} = data); reviewed.checked = false; draw();
    }));
    button(controls, L('Add concept', '添加概念'), () => run(async () => {
      if (!revision) { const current = await api('catalogue', {}, true); revision = current.revision; baseVersion = current.version; concepts = current.concepts; }
      concepts.push({id: uid(), title: '', objective: '', page: 1, source: '', tasks: [newTask()]}); reviewed.checked = false; draw();
    }));
    button(section, L('Publish reviewed concepts', '发布已审核概念'), () => run(async () => {
      const data = await api('save', {revision, baseVersion, concepts, reviewed: reviewed.checked}, true); baseVersion = data.version;
    }));
    const summary = node('section'); section.append(summary);
    button(section, L('Refresh opted-in concept summaries', '刷新自愿分享摘要'), () => run(async () => {
      const data = await api('summary', {room: PPTClassroom.room}, true); summary.replaceChildren(node('h3', L('Shared concept evidence', '分享的概念记录')));
      summary.append(node('p', L('Counts cover participating memberships only; missing records do not mean misunderstanding.', '仅统计参与分享的课堂成员；没有记录不代表不理解。')));
      data.counts.forEach(row => summary.append(node('p', `${concepts.find(c => c.id === row.concept)?.title || row.concept} · ${row.state}: ${row.count}`)));
    }));
    button(section, L('Download consented research events', '下载自愿研究事件'), () => run(async () => {
      download(await api('research-export', {room: PPTClassroom.room}, true), 'practice-study-events.json');
    }));
  }
  window.PPTLearning = Practice; window.PPTLearningTeacher = {mount: mountTeacher};
})();
