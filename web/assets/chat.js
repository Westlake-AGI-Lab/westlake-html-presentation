/* Shared local PPT chat. Attachments stay in memory; never persist image bytes. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = (text) => window.PPTI18n.t(text);
  // randomUUID is unavailable on ordinary LAN HTTP origins.
  const uniqueId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const escape = s => { const el = make('span', '', s); return el.innerHTML; };
  const markdown = new marked.Marked({ gfm: true, breaks: false, renderer: {
    html: token => escape(token.text),
    image: token => escape(`[${PPTI18n.language==='en'?'Image not loaded':'图片未自动加载'}: ${token.text || ''}]`)
  }});
  const mathCache = new Map();
  let mathQueue = Promise.resolve();

  // Shield TeX before Markdown consumes backslashes, underscores or table pipes.
  function renderMarkdown(text) {
    const equations = [];
    const prefix = 'PPTMATH' + uniqueId() + 'X';
    const pattern = /```[^\n]*\n[\s\S]*?(?:```|$)|`[^`\n]*`|\\\[[\s\S]*?(?:\\\]|$)|\\\([\s\S]*?(?:\\\)|$)|\$\$[\s\S]*?(?:\$\$|$)|(?<![\\\w])\$(?!\s)(?:\\.|[^$\n])*?\$(?!\d)/g;
    const protectedText = text.replace(pattern, raw => {
      if (raw.startsWith('`')) return raw;
      const display = raw.startsWith('\\[') || raw.startsWith('$$');
      const delimiter = raw.startsWith('\\[') ? '\\]' : raw.startsWith('\\(') ? '\\)' : display ? '$$' : '$';
      const size = delimiter.length;
      const closed = raw.length > size * 2 && raw.endsWith(delimiter);
      const index = equations.push({ raw, display, closed, tex: raw.slice(size, -size) }) - 1;
      return prefix + index + 'END';
    });
    const root = make('div', 'chat-markdown');
    root.innerHTML = DOMPurify.sanitize(markdown.parse(protectedText), {
      USE_PROFILES: { html: true }, FORBID_TAGS: ['img', 'style', 'input', 'button', 'iframe', 'video', 'audio', 'svg', 'math'],
      FORBID_ATTR: ['style', 'id', 'name', 'src', 'srcset']
    });
    root.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!/^(https?:\/\/|mailto:)/i.test(href)) a.removeAttribute('href');
      else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement.closest('pre,code')) continue;
      const regex = new RegExp(prefix + '(\\d+)END', 'g');
      const matches = [...node.textContent.matchAll(regex)];
      if (!matches.length) continue;
      const frag = document.createDocumentFragment(); let start = 0;
      for (const match of matches) {
        frag.append(node.textContent.slice(start, match.index));
        const eq = equations[Number(match[1])];
        const span = make('span', eq.display ? 'chat-math display' : 'chat-math', eq.raw);
        if (eq.closed) { span.dataset.tex = eq.tex; span.dataset.display = String(eq.display); }
        frag.append(span); start = match.index + match[0].length;
      }
      frag.append(node.textContent.slice(start)); node.replaceWith(frag);
    }
    return root;
  }

  async function typeset(root) {
    if (!window.MathJax?.startup?.promise) return;
    await MathJax.startup.promise;
    let stylesChanged = false;
    for (const el of root.querySelectorAll('[data-tex]')) {
      const key = el.dataset.display + el.dataset.tex;
      try {
        let result = mathCache.get(key);
        if (!result) {
          result = await MathJax.tex2chtmlPromise(el.dataset.tex, { display: el.dataset.display === 'true' });
          stylesChanged = true;
          if (result.querySelector('[data-mjx-error]')) continue;
          if (mathCache.size >= 100) mathCache.delete(mathCache.keys().next().value);
          mathCache.set(key, result);
        }
        el.replaceChildren(result.cloneNode(true));
      } catch (_) { /* Keep readable TeX if parsing fails. */ }
    }
    // Conversion APIs do not install their output stylesheet automatically.
    if (stylesChanged && !document.getElementById('MJX-CHTML-styles')) {
      // Non-adaptive CSS covers cached and streamed equations without dropping glyphs.
      document.head.append(MathJax.chtmlStylesheet());
    }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const field = make('textarea'); field.value = text; document.body.append(field); field.select();
      const ok = document.execCommand('copy'); field.remove(); if (!ok) throw new Error('浏览器未允许复制');
    }
  }

  class WestlakeChat {
    constructor({ storageKey, getContext, navigate }) {
      this.storageKey = storageKey; this.getContext = getContext; this.navigate = navigate;
      this.messages = []; this.pending = []; this.busy = false; this.processing = false; this.follow = true;
      this.panel = $('agentPanel'); this.log = $('agentConversation'); this.input = $('agentInput');this.panel.inert=true;
      this.mount(); this.mountWorkspace(); this.mountConnection(); this.restore(); this.health(); this.update();
      window.addEventListener('keydown', event => {
        // Disabling the last navigation button can move focus to the body.
        if(this.personalPreview?.open && !this.personalPreview.contains(event.target)) event.stopPropagation();
      }, true);
      this.archive = new LearningArchive(this); this.archiveReady = this.archive.init();
      if (window.SlideMatePractice && !['teacher','project'].includes(window.PPTClassroom?.role)) this.learning = new SlideMatePractice(this);
      else if (window.PPTLearning && !['teacher','project'].includes(window.PPTClassroom?.role)) this.learning = new PPTLearning(this);
      if (window.WestlakeRegion) this.region = new WestlakeRegion(this);
      window.addEventListener('ppt-math-ready', () => this.messages.forEach(m => this.paint(m)), {once:true});
      window.addEventListener('ppt-language-change', () => { this.messages.filter(m=>!m.text).forEach(m=>this.paint(m));this.messages.forEach(m=>this.paintIdentity(m)); });
    }
    button(label, fn, parent, id) {
      const button = make('button', 'chat-action', label); button.type = 'button';
      if (id) button.id = id; button.onclick = fn; parent.append(button); return button;
    }
    mount() {
      const tools = make('div', 'chat-tools');
      $('agentClose').before(tools);
      this.widthTools=tools;
      this.button('导出', () => this.export(), tools, 'agentExport');
      this.latest = this.button('↓ 回到最新', () => { this.follow = true; this.scroll(); }, this.panel, 'agentLatest');
      this.latest.hidden = true;
      const composer = this.panel.querySelector('.agent-composer');
      this.attachments = make('div', 'chat-attachments'); this.attachments.id = 'agentAttachments';
      composer.insertBefore(this.attachments, composer.querySelector('.agent-input-row'));
      const actions = make('div', 'chat-composer-actions');
      composer.insertBefore(actions, this.attachments);
      this.fileInput = make('input'); this.fileInput.type = 'file'; this.fileInput.multiple = true;
      this.fileInput.accept = 'image/png,image/jpeg,image/webp'; this.fileInput.id = 'agentImages'; this.fileInput.hidden = true;
      actions.append(this.fileInput);
      this.upload = this.button('＋ 图片', () => this.fileInput.click(), actions, 'agentUpload');
      this.createSlides = this.button('', () => this.generateSlides(), actions, 'agentCreateSlides');
      this.viewSlides = this.button('', () => this.personalPreview?.showModal(), actions, 'agentViewSlides');
      this.viewSlides.hidden = true;
      const slideLabels = () => {
        this.createSlides.textContent = PPTI18n.language === 'en' ? 'Create slides' : '生成讲解页';
        this.viewSlides.textContent = PPTI18n.language === 'en' ? 'My slides' : '我的讲解页';
      };
      slideLabels(); window.addEventListener('ppt-language-change', slideLabels);
      this.stop = this.button('停止', () => { this.stopReason = '已停止，回答未完成'; this.controller?.abort(); }, actions, 'agentStop');
      this.retry = this.button('重试', () => this.run(this.lastRequest, true), actions, 'agentRetry');
      this.stop.hidden = true; this.retry.hidden = true;
      this.notice = make('p', 'chat-notice'); this.notice.id = 'agentNotice'; this.notice.setAttribute('role', 'status');
      composer.append(this.notice);
      composer.append(make('p', 'chat-privacy', '图片压缩后发送给当前 API 服务商；仅存本页内存。停止不保证上游立即停止计费。'));
      this.preview = make('dialog', 'chat-image-dialog');
      this.button('关闭预览', () => this.preview.close(), this.preview);
      this.previewImage = make('img'); this.previewImage.alt = '附件预览'; this.preview.append(this.previewImage); document.body.append(this.preview);
      this.preview.addEventListener('click', e => { if (e.target === this.preview) this.preview.close(); });
      this.fileInput.onchange = () => { this.addFiles([...this.fileInput.files]); this.fileInput.value = ''; };
      this.input.addEventListener('paste', e => {
        const files = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean);
        if (!files.length) return; e.preventDefault();
        const text = e.clipboardData.getData('text/plain'); if (text) this.input.setRangeText(text, this.input.selectionStart, this.input.selectionEnd, 'end');
        this.addFiles(files);
      });
      this.panel.addEventListener('dragover', e => { e.preventDefault(); this.panel.classList.add('chat-drop'); });
      this.panel.addEventListener('dragleave', e => { if (!this.panel.contains(e.relatedTarget)) this.panel.classList.remove('chat-drop'); });
      this.panel.addEventListener('drop', e => { e.preventDefault(); this.panel.classList.remove('chat-drop'); this.addFiles([...e.dataTransfer.files]); });
      this.log.addEventListener('scroll', () => { this.follow = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 70; this.latest.hidden = this.follow; });
      $('agentLauncher').onclick = () => this.open(); $('agentClose').onclick = () => this.close(); $('agentScrim').onclick = () => this.close();
      $('agentSend').onclick = () => this.ask(); $('agentClear').onclick = () => this.clear();
      this.panel.querySelectorAll('.agent-suggestion').forEach((b,index) => {
        const label=b.textContent;
        b.onclick = () => this.ask(PPTI18n.language==='en' ? [
          'Please summarize the key points on the current slide.',
          'Please explain the key concept on this slide in simple terms, with a worked example where useful.',
          label==='考考我' ? 'Quiz me on the current slide: ask only one question and wait for my answer before giving feedback.' : this.access.required ? 'How does this slide connect to the concepts we have discussed?' : 'How does this slide connect to the rest of the presentation?'
        ][index] : b.dataset.question || label);
      });
      this.input.addEventListener('input',()=>this.growInput());
      this.input.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing) {e.preventDefault(); this.ask();} });
    }
    growInput() {this.input.style.height='auto';this.input.style.height=Math.min(this.input.scrollHeight,120)+'px';}
    mountWorkspace() {
      this.preferredWidth=400;this.panelControls=[];
      this.panelBreakpoint=matchMedia('(min-width:901px)');
      this.attachPanelControls(this.panel,this.widthTools,'chat');
      window.addEventListener('resize',()=>this.applyPanelWidth(false));
      window.addEventListener('blur',()=>this.finishResize());
      window.addEventListener('ppt-language-change',()=>this.applyPanelWidth(false));
      document.addEventListener('pointerdown',event=>{for(const c of this.panelControls)if(c.menu.open&&!c.menu.contains(event.target))c.menu.open=false;});
      this.applyPanelWidth(false);
    }
    panelLimits() {return {min:320,max:Math.max(320,Math.min(720,innerWidth-520))};}
    applyPanelWidth(notify=true) {
      const limits=this.panelLimits();this.panelWidth=Math.round(Math.max(limits.min,Math.min(limits.max,this.preferredWidth)));
      document.documentElement.style.setProperty('--assistant-width',this.panelWidth+'px');this.panel.classList.toggle('chat-compact',this.panelWidth<520);
      for(const c of this.panelControls){
        c.range.min=limits.min;c.range.max=limits.max;c.range.value=this.panelWidth;c.output.textContent=this.panelWidth+' px';
        c.label.textContent=this.L('Panel width','面板宽度');c.range.setAttribute('aria-label',c.label.textContent);c.summary.textContent=this.L('Width','宽度');
        c.handle.setAttribute('aria-label',this.L('Resize assistant panel. Left arrow widens; right arrow narrows.','调整助手面板宽度：向左箭头加宽，向右箭头缩窄。'));
        c.handle.title=this.L('Drag to resize · Left/Right arrows','拖动调整宽度 · 左右箭头');
        for(const [key,value]of Object.entries({min:limits.min,max:limits.max,now:this.panelWidth}))c.handle.setAttribute('aria-value'+key,String(value));
      }
      if(notify){cancelAnimationFrame(this.workspaceFrame);this.workspaceFrame=requestAnimationFrame(()=>{this.growInput();window.dispatchEvent(new Event('resize'));});}
    }
    setPanelWidth(value) {this.preferredWidth=value;this.applyPanelWidth();}
    syncWorkspace() {
      document.body.classList.toggle('assistant-open',document.body.classList.contains('agent-open')||document.body.classList.contains('practice-open'));
      this.applyPanelWidth();
    }
    attachPanelControls(panel,tools,key) {
      const handle=make('div','assistant-resizer');handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-controls',panel.id);panel.prepend(handle);
      const menu=make('details','assistant-width-menu'),summary=make('summary');menu.append(summary);
      const controls=make('div','assistant-width-controls'),label=make('label'),range=make('input'),output=make('output');
      range.type='range';range.step='1';range.id='assistantWidth-'+key;label.htmlFor=range.id;output.htmlFor=range.id;
      controls.append(label,output,range);menu.append(controls);tools.prepend(menu);
      const c={handle,menu,summary,label,range,output};this.panelControls.push(c);
      range.addEventListener('input',()=>this.setPanelWidth(Number(range.value)));
      menu.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();menu.open=false;summary.focus();}});
      handle.addEventListener('keydown',event=>{
        const limits=this.panelLimits();let value;
        if(event.key==='ArrowLeft')value=this.panelWidth+24;else if(event.key==='ArrowRight')value=this.panelWidth-24;
        else if(event.key==='Home')value=limits.min;else if(event.key==='End')value=limits.max;else return;
        event.preventDefault();event.stopPropagation();this.setPanelWidth(Math.max(limits.min,Math.min(limits.max,value)));
      });
      handle.addEventListener('pointerdown',event=>{
        if(!this.panelBreakpoint.matches||!event.isPrimary||event.button!==0)return;
        event.preventDefault();this.finishResize();this.resizeDrag={handle,id:event.pointerId,x:event.clientX,width:this.panelWidth};
        handle.setPointerCapture(event.pointerId);document.body.classList.add('assistant-resizing');
      });
      handle.addEventListener('pointermove',event=>{const drag=this.resizeDrag;if(drag?.handle===handle&&drag.id===event.pointerId)this.setPanelWidth(drag.width+drag.x-event.clientX);});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,event=>{if(this.resizeDrag?.id===event.pointerId)this.finishResize();});
      this.applyPanelWidth(false);return c;
    }
    finishResize() {
      const drag=this.resizeDrag;this.resizeDrag=null;document.body.classList.remove('assistant-resizing');
      if(drag?.handle.hasPointerCapture(drag.id))drag.handle.releasePointerCapture(drag.id);
    }
    status(text, error = false) { $('agentStatusText').textContent = text; $('agentStatusDot').className = 'agent-status-dot ' + (error ? 'error' : 'ready'); }
    L(en,zh) { return PPTI18n.language==='en'?en:zh; }
    mountConnection() {
      this.access={required:true,connected:false,models:[],available:false};
      this.connection=make('details','university-connection'); this.connection.id='universityConnection';
      this.connection.open=true;
      this.connectionSummary=make('summary');this.connection.append(this.connectionSummary);
      this.connectionBody=make('div','university-body');this.connection.append(this.connectionBody);
      this.connectHeading=make('h3');
      const steps=make('ol');
      this.connectSteps=steps;
      this.connectStep1=make('li');const link=make('a','','https://hpc.westlake.edu.cn/#/ai-campus');
      link.href='https://hpc.westlake.edu.cn/#/ai-campus';link.target='_blank';link.rel='noopener noreferrer';
      this.connectStep1Text=make('span');this.connectStep1.append(this.connectStep1Text,make('br'),link);
      this.connectStep2=make('li');this.connectStep3=make('li');steps.append(this.connectStep1,this.connectStep2,this.connectStep3);
      this.disclosure=make('p');this.connectionState=make('p','university-state');this.connectionState.id='universityState';this.connectionState.setAttribute('role','status');
      this.connectForm=make('form');this.connectForm.autocomplete='off';
      this.tokenLabel=make('label');this.tokenLabel.htmlFor='universityToken';
      const row=make('div','university-token-row');this.tokenInput=make('input');this.tokenInput.id='universityToken';
      this.tokenInput.type='password';this.tokenInput.required=true;this.tokenInput.maxLength=4096;
      this.tokenInput.autocomplete='off';this.tokenInput.spellcheck=false;this.tokenInput.setAttribute('autocapitalize','none');
      this.tokenInput.setAttribute('aria-describedby','universityState');
      this.tokenShow=this.button('',()=>{const show=this.tokenInput.type==='password';this.tokenInput.type=show?'text':'password';this.tokenShow.setAttribute('aria-pressed',String(show));this.tokenShow.textContent=this.L(show?'Hide':'Show',show?'隐藏':'显示');},row);
      this.tokenShow.setAttribute('aria-controls','universityToken');this.tokenShow.setAttribute('aria-pressed','false');row.prepend(this.tokenInput);
      this.modelLabel=make('label');this.modelLabel.htmlFor='universityModel';this.modelSelect=make('select');this.modelSelect.id='universityModel';
      this.connectButton=make('button','chat-action');this.connectButton.type='submit';this.connectButton.id='universityConnect';
      this.connectForm.append(this.tokenLabel,row,this.modelLabel,this.modelSelect,this.connectButton);
      this.connectForm.onsubmit=e=>{e.preventDefault();this.connectUniversity();};
      this.switchForm=make('form','university-model-switch');
      this.switchLabel=make('label');this.switchLabel.htmlFor='universityActiveModel';
      this.switchSelect=make('select');this.switchSelect.id='universityActiveModel';
      this.switchSelect.setAttribute('aria-describedby','universityState');
      this.switchButton=make('button','chat-action');this.switchButton.type='submit';this.switchButton.id='universitySwitch';
      this.switchForm.append(this.switchLabel,this.switchSelect,this.switchButton);
      this.switchForm.onsubmit=e=>{e.preventDefault();this.switchUniversityModel();};
      this.switchSelect.onchange=()=>{this.switchButton.disabled=this.switchSelect.disabled||this.switchSelect.value===this.access.model;};
      this.connectionBody.append(this.switchForm);
      this.disconnectButton=this.button('',()=>this.disconnectUniversity(),this.connectionBody,'universityDisconnect');
      this.connectionBody.prepend(this.connectHeading,steps,this.disclosure,this.connectionState,this.connectForm);
      // Inside the existing scrollable conversation, so mobile retains the composer.
      this.log.prepend(this.connection);
      this.connection.addEventListener('keydown',e=>e.stopPropagation());
      this.accessLabels();window.addEventListener('ppt-language-change',()=>queueMicrotask(()=>this.accessLabels()));
      window.addEventListener('focus',()=>this.health());
      this.accessTimer=setInterval(()=>{if(this.access.connected&&Date.now()/1000>=this.access.expiresAt){this.access.connected=false;this.accessError=this.L('SlideMate connection expired. Reconnect; your question draft is retained.','SlideMate 连接已过期，请重新连接；问题草稿已保留。');this.connection.open=true;this.accessLabels();}},15000);
    }
    accessLabels() {
      if(!this.connection)return;
      const a=this.access;
      this.connection.hidden=a.required===false;
      this.connectionSummary.textContent=a.connected?this.L('Connected · ','已连接 · ')+a.model:this.L('Connect university AI account','连接大学 AI 账号');
      this.connectHeading.textContent=a.connected?this.L('Model settings','模型设置'):this.L('Connect your university AI account','连接你的大学 AI 账号');
      this.connectSteps.hidden=!!a.connected;
      this.disclosure.hidden=!!a.connected;
      this.connectStep1Text.textContent=this.L('Log in with your campus account at:','使用校园账号登录：');
      this.connectStep2.textContent=this.L('Open “Model Service / API” and apply for a Private Token.','打开“Model Service / API”，申请 Private Token。');
      this.connectStep3.textContent=this.L('Paste your Private Token below and Connect.','在下方粘贴 Private Token 并连接。');
      this.disclosure.textContent=this.L('Your questions, current slide text and selected conversation context go to the university AI service. Slide images would be sent only when used; image input is currently disabled pending verification. No campus username or password is collected. Token stays in server memory for '+(a.lifetime||7200)/3600+' hours; disconnect deletes it. A server restart ends connections. Campus network/VPN may be required on the server.','问题、当前页文字及所选对话上下文会发送至大学 AI 服务。使用图片时会发送图片；目前图片输入尚未验证，已禁用。不收集校园用户名或密码。令牌仅在服务器内存保留 '+(a.lifetime||7200)/3600+' 小时，断开即删除；服务器重启将结束连接。服务器可能需要校园网或 VPN。');
      this.tokenLabel.textContent='Private Token';this.tokenShow.textContent=this.L(this.tokenInput.type==='password'?'Show':'Hide',this.tokenInput.type==='password'?'显示':'隐藏');
      this.modelLabel.textContent=this.L('University model','大学模型');
      const selected=this.modelSelect.value;this.modelSelect.replaceChildren(...(a.models||[]).map(m=>{const o=make('option','',m);o.value=m;return o;}));if(a.models?.includes(selected))this.modelSelect.value=selected;
      this.connectButton.textContent=this.connecting?this.L('Connecting…','正在连接…'):this.L('Connect','连接');
      this.connectButton.disabled=this.connecting||!a.available||!a.models?.length;
      this.tokenInput.disabled=this.connecting;this.modelSelect.disabled=this.connecting;this.tokenShow.disabled=this.connecting;
      this.connectForm.hidden=!!a.connected;this.disconnectButton.hidden=!a.connected;
      this.switchForm.hidden=!a.connected;
      this.switchLabel.textContent=this.L('Switch model','切换模型');
      if(!this.switching){this.switchSelect.replaceChildren(...(a.models||[]).map(m=>{const o=make('option','',m);o.value=m;return o;}));this.switchSelect.value=a.model||'';}
      this.switchSelect.disabled=!!(this.busy||this.processing||this.connecting||this.switching);
      this.switchButton.disabled=this.switchSelect.disabled||this.switchSelect.value===a.model;
      this.switchButton.textContent=this.switching?this.L('Validating model…','正在验证模型…'):this.L('Switch model','切换模型');
      this.switchForm.setAttribute('aria-busy',String(!!this.switching));

      this.disconnectButton.textContent=this.L('Disconnect and delete token','断开连接并删除令牌');this.disconnectButton.disabled=!!(this.connecting||this.switching||this.busy||this.processing);
      this.connectionState.textContent=this.accessError||(this.switching?this.L('Validating the selected model. The active model stays ','正在验证所选模型，当前模型仍为 ')+a.model:null)||(a.connected?this.L('Connected · ','已连接 · ')+a.model+' · '+this.L('expires ','到期时间 ')+new Date(a.expiresAt*1000).toLocaleTimeString():!a.available?this.L('Remote token entry requires HTTPS. LAN HTTP is disabled. Use localhost or ask the operator to configure HTTPS.','远程令牌输入需要 HTTPS，内网 HTTP 已禁用。请使用本机地址或请维护者配置 HTTPS。'):this.L('Not connected. Connect to use Xiaoxi; browsing remains available.','尚未连接。使用小西需先连接，浏览课程无需令牌。'));
      if(a.required){$('agentModelLabel').textContent=a.connected?a.model:this.L('University AI','大学 AI');if(!this.busy)this.status(a.connected?this.L('Connected · text context','已连接 · 文字上下文'):this.L('Connect university AI account','请连接大学 AI 账号'),!a.connected);}
      if(a.required){const related=this.panel.querySelectorAll('.agent-suggestion')[2];if(related){related.textContent=this.L('Related concepts','关联概念');related.dataset.question=this.L('How does this slide connect to the concepts we have discussed?','当前页与我们已经讨论的概念有什么联系？');}const welcome=this.panel.querySelector('.agent-welcome p');if(welcome)welcome.textContent=this.L('Ask about the current slide text or work through a formula. Check the source slide and review AI explanations. Images are not enabled.','可围绕当前页文字提问或推导公式，请核对原稿与 AI 解释。图片功能尚未启用。');}
      if(this.upload)this.upload.disabled=this.busy||this.processing||(a.required&&!a.images);
      const privacy=this.panel.querySelector('.chat-privacy');if(privacy)privacy.hidden=!!a.required;
      this.learning?.syncAccess?.();
    }
    async health() {
      try {
        const r=await fetch('/api/university/status',{cache:'no-store'});if(!r.ok)throw Error();
        this.access=await r.json();this.accessLabels();
        if(!this.access.required){const h=await (await fetch('/api/health')).json();$('agentModelLabel').textContent=h.model;if(!this.busy)this.status(h.configured?'整套文字已就绪 · 支持图片提问':'需要配置 API Key',!h.configured);}
      } catch (_) {this.accessError=this.L('Cannot reach SlideMate. Check the local server; your draft is retained.','无法连接 SlideMate，请检查本地服务；草稿已保留。');this.accessLabels();}
    }
    requireConnection(draft) {
      if(this.connecting||this.switching)return false;
      if(!this.access.required)return true;
      if(this.access.connected&&Date.now()/1000<this.access.expiresAt)return true;
      if(this.access.connected)this.accessError=this.L('SlideMate connection expired. Reconnect; your question draft is retained.','SlideMate 连接已过期，请重新连接；问题草稿已保留。');
      this.access.connected=false;if(draft&&!this.input.value)this.input.value=draft;
      this.open();this.connection.open=true;this.accessLabels();this.tokenInput.focus();return false;
    }
    async connectUniversity() {
      if(this.connecting)return;
      this.connecting=true;this.accessError='';this.accessLabels();
      try {
        const r=await fetch('/api/university/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:this.tokenInput.value.trim(),model:this.modelSelect.value}),signal:AbortSignal.timeout(75000)});
        const data=await r.json();if(!r.ok)throw Error(data.error||'Connection failed');
        this.tokenInput.value='';this.tokenInput.type='password';this.tokenShow.setAttribute('aria-pressed','false');
        this.access={...this.access,...data};this.connection.open=false;this.input.focus();
        // Connection tests never submit a pending question.
      } catch(e) {this.accessError=e.name==='TimeoutError'?this.L('Connection timed out. Check campus network/VPN and retry. Your question is retained.','连接超时，请检查校园网或 VPN 后重试。问题已保留。'):e.name==='TypeError'?this.L('SlideMate is unreachable. Your question is retained; retry explicitly.','无法连接 SlideMate，问题已保留，请手动重试。'):e.message;}
      finally {this.connecting=false;this.accessLabels();if(this.accessError)this.tokenInput.focus();}
    }
    async switchUniversityModel() {
      if(this.busy||this.processing||this.connecting||this.switching||!this.access.connected)return;
      const model=this.switchSelect.value;
      if(model===this.access.model)return;
      this.switching=true;this.accessError='';this.controls();
      try {
        const r=await fetch('/api/university/model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model}),signal:AbortSignal.timeout(75000)});
        const data=await r.json();
        if(!r.ok)throw Error(data.error||this.L('Validation failed.','验证失败。'));
        this.access={...this.access,...data};
      } catch(e) {
        // A lost response may follow a successful commit. Reconcile with server truth.
        await this.health();
        this.accessError=this.L('Model switch failed: ','模型切换失败：')+(e.name==='TimeoutError'||e.name==='TypeError'?this.L('Connection interrupted. Check the active model and retry.','连接中断，请检查当前模型后重试。'):e.message)+this.L(' Active model: ',' 当前模型：')+this.access.model;
      } finally {this.switching=false;this.controls();}
    }
    async disconnectUniversity() {
      if(this.connecting||this.switching||this.busy||this.processing)return;this.connecting=true;this.accessLabels();
      try {const r=await fetch('/api/university/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();this.access.connected=false;this.tokenInput.value='';this.accessError='';this.connection.open=true;}
      catch(_){this.accessError=this.L('Disconnect could not be confirmed. Retry; the server session also expires automatically.','未能确认断开，请重试；服务器会话也会自动过期。');}
      finally{this.connecting=false;this.accessLabels();if(!this.access.connected)this.tokenInput.focus();}
    }
    async connectionFailure(response, data) {
      if(response.status===401&&this.access.required){this.access.connected=false;this.accessError=data.error;this.connection.open=true;this.accessLabels();}
    }
    update() {
      const {currentSlide,slides} = this.getContext();
      $('agentCurrentTitle').textContent = '当前：' + currentSlide.title;
      $('agentPagePill').textContent = String(currentSlide.number).padStart(2,'0')+' / '+slides.length;
      const active = document.querySelector('.slide.active');
      const buttons = this.panel.querySelectorAll('.agent-suggestion');
      if (active?.dataset.question) buttons[1].dataset.question = active.dataset.question;
    }
    open() { if(this.learning?.dialog?.open&&this.learning.close)this.learning.close(false);this.panel.inert=false;document.body.classList.add('agent-open');this.syncWorkspace(); $('agentLauncher').setAttribute('aria-expanded','true'); this.panel.setAttribute('aria-hidden','false'); this.update();this.accessLabels();this.growInput();this.input.focus(); }
    close(focus=true) { this.finishResize();document.body.classList.remove('agent-open');this.syncWorkspace();$('agentLauncher').setAttribute('aria-expanded','false');this.panel.setAttribute('aria-hidden','true');this.panel.inert=true;if(focus)$('agentLauncher').focus(); }
    scroll() { if(this.follow) {this.log.scrollTop = this.log.scrollHeight; this.latest.hidden = true;} }
    showImage(image) { this.previewImage.src = image.dataUrl; this.preview.showModal(); }
    async compress(file) {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('仅支持 PNG、JPEG、WebP 图片。');
      if (file.size > 5*1024*1024) throw Error('单张原图片不得超过 5 MiB。');
      const bitmap = await createImageBitmap(file).catch(() => {throw Error('图片损坏，无法读取。');});
      try {
        if(bitmap.width * bitmap.height > 40000000) throw Error('图片像素过多，请先缩小。');
        let scale = Math.min(1, 2048/Math.max(bitmap.width,bitmap.height));
        const canvas = document.createElement('canvas');
        for(let attempt=0;attempt<8;attempt++) {
          canvas.width = Math.max(1, Math.round(bitmap.width*scale)); canvas.height = Math.max(1,Math.round(bitmap.height*scale));
          const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
          let dataUrl = canvas.toDataURL('image/png');
          if (dataUrl.length > 1398104) dataUrl = canvas.toDataURL('image/jpeg', Math.max(.55,.9-attempt*.05));
          const size = Math.floor((dataUrl.split(',')[1].length*3)/4);
          if(size<=1024*1024) return {id:uniqueId(),name:file.name||'剪贴板图片',dataUrl};
          scale *= .8;
        }
        throw Error('无法将图片压缩到 1 MiB，请选择更小的图片。');
      } finally { bitmap.close(); }
    }
    async addFiles(files) {
      if(this.access?.required&&!this.access.images){this.notice.textContent=this.L('University image input is not verified. Use a text question.','大学图片输入尚未验证，请使用文字问题。');return;}
      if(this.busy || this.processing) {this.notice.textContent='请等待当前操作结束再添加图片。';return;}
      if(!files.length) return;
      if(this.pending.length+files.length>3) {this.notice.textContent='每次最多添加 3 张图片。';return;}
      this.processing=true; this.controls();
      try {
        const results=[]; for(const file of files) results.push(await this.compress(file));
        this.pending.push(...results); this.drawPending(); this.notice.textContent='图片已压缩（最长边 ≤2048，每张 ≤1 MiB），请预览文字清晰度。';
      } catch(e) {this.notice.textContent=e.message;}
      finally {this.processing=false;this.controls();}
    }
    drawPending() {
      this.attachments.replaceChildren();
      for(const image of this.pending) {
        const tile=make('div','chat-attachment'); const img=make('img');img.src=image.dataUrl;img.alt=image.name;
        const show=this.button('',()=>this.showImage(image),tile);show.setAttribute('aria-label','预览 '+image.name);show.append(img);
        this.button('移除',()=>{this.pending=this.pending.filter(i=>i.id!==image.id);this.drawPending();},tile);
        this.attachments.append(tile);
      }
    }
    controls() {
      this.accessLabels();
      this.createSlides.disabled=this.busy||this.processing||this.switching;
      $('agentSend').disabled=this.busy||this.processing||this.switching; this.upload.disabled=this.busy||this.processing||this.switching||(this.access?.required&&!this.access.images);
      $('agentClear').disabled=this.busy||this.processing||this.switching; this.stop.hidden=!this.busy;
      this.retry.disabled=!!this.switching;
      this.retry.hidden=this.busy||!this.lastRequest||!['error','stopped'].includes(this.messages.at(-1)?.status);
      this.panel.querySelectorAll('.agent-suggestion').forEach(b=>b.disabled=this.busy||this.processing||this.switching);
    }
    persist(force=false) {
      if(this.archive?.enabled) return this.archive.save(force);
      const safe=this.messages.slice(-20).map(({role,text,meta,status,images,imageCount})=>({role,text,meta,status:status==='streaming'?'stopped':status,imageCount:images?.length||imageCount||0}));
      try {sessionStorage.setItem(this.storageKey,JSON.stringify(safe));} catch (_) {this.notice.textContent='浏览器存储已满，本次聊天仅保留在当前页面。';}
    }
    restore() {
      try {
        const saved=JSON.parse(sessionStorage.getItem(this.storageKey)||'[]');
        if(!Array.isArray(saved)) return;
        this.messages=saved.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-20).map(m=>({role:m.role,text:m.text,meta:typeof m.meta==='string'?m.meta:'',status:m.status==='complete'||!m.status?'complete':'stopped',imageCount:Number(m.imageCount)||0,images:[]}));
        this.messages.forEach(m=>this.addRow(m));
      } catch (_) {}
    }
    addRow(message) {
      message.id ||= uniqueId(); message.time ||= new Date().toISOString();
      const row=make('div','agent-message '+message.role), bubble=make('div','agent-message-bubble');
      message.row=row; message.body=make('div');message.metaNode=make('div','agent-message-meta');
      message.identity=make('div','chat-message-heading');message.sender=make('span','chat-sender');message.timestamp=make('time','chat-timestamp');message.identity.append(message.sender,message.timestamp);
      this.paintIdentity(message);
      bubble.append(message.identity,message.body,message.metaNode);row.append(bubble);this.log.append(row);
      if(window.PPTClassroom?.role==='student') this.button(PPTI18n.language==='en'?'Share excerpt with teacher':'分享片段给老师',()=>PPTClassroom.share(message).catch(e=>{this.notice.textContent=e.message;}),bubble);
      if(message.role==='assistant') this.button('复制 Markdown',async()=>{try{await copyText(message.text);this.notice.textContent='已复制原始 Markdown。';}catch(e){this.notice.textContent=e.message;}},bubble);
      if(['user','assistant'].includes(message.role)) this.button(PPTI18n.language==='en'?'Share to Discussion':'分享到讨论',async()=>{
        if(!message.text?.trim()||message.status==='streaming'){this.notice.textContent=PPTI18n.language==='en'?'Wait for this response to finish before sharing.':'请等待回答完成后再分享。';return;}
        try{const {openComposer}=await import('./discussion-share.js');await openComposer({text:message.text,role:message.role,course:new URLSearchParams(location.search).get('course')||''});}catch(e){this.notice.textContent=e.message;}
      },bubble);
      this.paint(message);return row;
    }
    paintIdentity(message) {
      if(!message.sender)return;
      message.sender.textContent=t(message.role==='user'?'读者':'助手');
      const time=new Date(message.time);
      if(!Number.isNaN(time.getTime())){message.timestamp.dateTime=time.toISOString();message.timestamp.textContent=new Intl.DateTimeFormat(PPTI18n.language,{hour:'2-digit',minute:'2-digit'}).format(time);}
    }
    paint(message) {
      message.revision=(message.revision||0)+1;const revision=message.revision;
      const root=message.role==='assistant'?renderMarkdown(message.text||t(message.status==='streaming'?'正在思考…':'未收到正文。')):make('div','chat-user-text',message.text);
      for(const image of message.images||[]) {const img=make('img','chat-message-image');img.src=image.dataUrl;img.alt=image.name;const b=make('button','chat-image-button');b.type='button';b.setAttribute('aria-label','查看附件 '+image.name);b.onclick=()=>this.showImage(image);b.append(img);root.append(b);}
      if(message.imageCount && !message.images?.length) root.append(make('p','chat-expired',`原有 ${message.imageCount} 张图片已失效，请重新上传。`));
      this.linkPages(root);
      root.querySelectorAll('pre').forEach(pre=>{const code=pre.querySelector('code');if(code)this.button('复制代码',async()=>{try{await copyText(code.textContent);this.notice.textContent='代码已复制。';}catch(e){this.notice.textContent=e.message;}},pre);});
      root.querySelectorAll('table').forEach(table=>{const wrap=make('div','chat-table');table.before(wrap);wrap.append(table);});
      message.body.replaceChildren(root);
      message.metaNode.textContent=[message.meta,message.status==='streaming'?'生成中':message.status==='stopped'?'已停止 · 未完成':message.status==='error'?'失败 · 未完成':'',message.error||''].filter(Boolean).join(' · ');
      this.scroll();
      mathQueue=mathQueue.catch(()=>{}).then(async()=>{if(message.revision!==revision||!root.isConnected)return;await typeset(root);if(message.revision===revision)this.scroll();});
    }
    linkPages(root) {
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      const count=this.getContext().slides.length;
      for(const node of nodes) {
        if(node.parentElement.closest('pre,code,a,.chat-math'))continue;
        const matches=[...node.textContent.matchAll(/(?:第\s*(\d+)\s*页|\b(?:slide|page)\s+(\d+)\b)/gi)];if(!matches.length)continue;
        const frag=document.createDocumentFragment();let pos=0;
        for(const match of matches){frag.append(node.textContent.slice(pos,match.index));const n=Number(match[1]||match[2]);if(n>=1&&n<=count){const b=make('button','chat-page-link',match[0]);b.type='button';b.title='跳转到模型引用的页面（未自动核验引用）';b.onclick=()=>{this.navigate(n-1);this.update();};frag.append(b);}else frag.append(match[0]);pos=match.index+match[0].length;}
        frag.append(node.textContent.slice(pos));node.replaceWith(frag);
      }
    }
    async generateSlides() {
      if(this.learning?.blocks(this.getContext())) { this.learning.open(); return; }
      if(this.busy||this.processing||this.switching)return;
      if(!this.requireConnection())return;
      const en=PPTI18n.language==='en', question=this.input.value.trim();
      if(!question){this.notice.textContent=en?'Enter your question first.':'请先输入问题。';this.input.focus();return;}
      const context=JSON.parse(JSON.stringify(this.getContext()));
      context.slides=context.slides.slice(0,context.currentSlide.number);
      const request={...context,question,language:PPTI18n.language,images:this.pending.map(i=>({...i}))};
      this.busy=true;this.controller=new AbortController();this.stopReason=en?'Generation stopped.':'生成已停止。';this.controls();
      this.notice.textContent=en?'Preparing explanatory slides…':'正在生成讲解页…';
      const deadline=setTimeout(()=>this.controller?.abort(),120000);
      try {
        const response=await fetch('/api/personal-slides',{method:'POST',headers:{'Content-Type':'application/json',...window.PPTClassroom?.headers()},body:JSON.stringify(request),signal:this.controller.signal});
        const result=await response.json();if(!response.ok){await this.connectionFailure(response,result);throw Error(result.error||`HTTP ${response.status}`);}
        if(!Array.isArray(result.slides)||!result.slides.length)throw Error(en?'Invalid slides.':'讲解页格式无效。');
        this.showPersonalSlides(result,request);
        this.notice.textContent=en?'Personal draft ready · not teacher-reviewed.':'个人草稿已生成 · 未经教师审核。';
      } catch(error) {this.notice.textContent=this.controller.signal.aborted?(en?'Stopped or timed out. You can retry.':'已停止或超时，可重新生成。'):error.message;}
      finally {clearTimeout(deadline);this.busy=false;this.controller=null;this.controls();}
    }
    showPersonalSlides(result,request) {
      this.personalPreview?.remove();
      const en=request.language==='en', dialog=make('dialog','personal-slides-dialog');
      this.personalPreview=dialog;this.viewSlides.hidden=false;
      const bar=make('div','personal-slides-toolbar'), counter=make('span');
      const stage=make('section','personal-slide'), notes=make('details'), noteBody=make('div');
      notes.append(make('summary','',en?'Speaker notes':'讲解备注'),noteBody);
      let index=0;
      const draw=()=>{
        const slide=result.slides[index];stage.replaceChildren();
        stage.append(make('p','personal-slide-label',en?'Personal draft · not teacher-reviewed':'个人草稿 · 未经教师审核'),make('h2','',slide.title));
        const points=make('ul');slide.bullets.forEach(point=>{const li=make('li');li.append(renderMarkdown(point));points.append(li);});stage.append(points);
        const sources=make('div','personal-slide-sources');
        slide.sources.forEach(number=>this.button((en?'Slide ':'第 ')+number+(en?'':' 页'),()=>{dialog.close();this.close();this.navigate(number-1);this.update();},sources));stage.append(sources);
        noteBody.replaceChildren(renderMarkdown(slide.notes));notes.open=false;
        counter.textContent=`${index+1} / ${result.slides.length}`;prev.disabled=index===0;next.disabled=index===result.slides.length-1;
        mathQueue=mathQueue.catch(()=>{}).then(()=>typeset(stage)).then(()=>typeset(noteBody));
      };
      const prev=this.button('←',()=>{index--;draw();},bar);prev.setAttribute('aria-label',en?'Previous':'上一页');
      bar.append(counter);
      const next=this.button('→',()=>{index++;draw();},bar);next.setAttribute('aria-label',en?'Next':'下一页');
      this.button(en?'Download HTML':'下载 HTML',()=>this.downloadPersonalSlides(result,request),bar);
      this.button(en?'Close':'关闭',()=>dialog.close(),bar);
      dialog.append(bar,stage,notes);document.body.append(dialog);draw();dialog.showModal();
      dialog.addEventListener('keydown',event=>event.stopPropagation());
      dialog.addEventListener('touchend',event=>event.stopPropagation());
      dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    }
    downloadPersonalSlides(result,request) {
      const doc=document.implementation.createHTMLDocument('Personal lecture supplement');
      doc.documentElement.lang=request.language;
      const meta=doc.createElement('meta');meta.name='viewport';meta.content='width=device-width, initial-scale=1';doc.head.append(meta);
      const style=doc.createElement('style');style.textContent='body{margin:0;background:#eef2f4;color:#18212b;font:20px/1.6 system-ui}section{box-sizing:border-box;max-width:1100px;min-height:620px;margin:24px auto;padding:48px;background:white;border-top:6px solid #087b70;overflow-wrap:anywhere}h2{font-size:32px}li{margin:20px 0}footer,details{font-size:15px}a{color:#006a9c}@media(max-width:600px){section{padding:24px;min-height:0}h2{font-size:26px}}@media print{section{break-after:page;margin:0;min-height:0}}';doc.head.append(style);
      result.slides.forEach(slide=>{
        const section=doc.createElement('section');section.append(make('p','',request.language==='en'?'Personal draft · not teacher-reviewed':'个人草稿 · 未经教师审核'),make('h2','',slide.title));
        const ul=make('ul');slide.bullets.forEach(point=>ul.append(make('li','',point)));section.append(ul);
        const footer=make('footer');slide.sources.forEach(number=>{
          const link=make('a','',`Slide ${number}: ${request.slides[number-1].title}`);const url=new URL(location.href);url.hash=String(number);url.search='';link.href=url.href;footer.append(link,doc.createTextNode(' · '));
        });section.append(footer);
        const notes=make('details');notes.append(make('summary','','Notes'),make('p','',slide.notes));section.append(notes);doc.body.append(section);
      });
      const url=URL.createObjectURL(new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}));
      const a=make('a');a.href=url;a.download='personal-lecture-slides.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    async ask(override='', selectedContext=null) {
      if(this.busy||this.processing||this.switching)return;
      if(this.learning?.blocks(selectedContext||this.getContext())) { this.learning.open(); return; }
      const question=(override||this.input.value).trim()||(this.pending.length?t('请结合当前 PPT 解释这张图片'):'');if(!question)return;
      if(!this.requireConnection(question))return;
      const previous=this.messages.slice(-12);
      if(previous.reduce((sum,m)=>sum+(m.images?.length||0),0)+this.pending.length>6){this.notice.textContent='上下文累计超过 6 张图片，请清空对话后继续。';return;}
      let context=selectedContext||this.getContext();
      if(this.access.required){const all=context.slides, n=context.currentSlide.number;context={...context,slides:all.map((slide,index)=>index===n-1?slide:{number:index+1}),currentSlide:context.currentSlide};}
      const request={...context,...window.PPTImprovements?.questionConsent(),language:PPTI18n.language,question,images:this.pending.map(i=>({...i})),stream:!this.access.required,history:previous.map(m=>({role:m.role,text:m.text,status:m.status,images:m.images||[],imageCount:m.imageCount||0}))};
      this.lastRequest=JSON.parse(JSON.stringify(request));this.pending=[];this.drawPending();this.input.value='';this.input.style.height='auto';this.notice.textContent='';this.follow=true;
      const user={role:'user',text:question,images:request.images,status:'complete',page:{...context.currentSlide},language:request.language,meta:`提问时位于第 ${context.currentSlide.number} 页 · ${context.currentSlide.title}`};
      this.messages.push(user);this.addRow(user);this.processing=true;this.controls();await this.persist(true);this.processing=false;await this.run(this.lastRequest,false);
    }
    async run(request,retry) {
      if(this.busy||this.processing||this.switching||!request)return;
      if(!this.requireConnection(request.question))return;
      if(this.learning?.blocks(request)) { this.learning.open(); return; }
      this.busy=true;this.stopReason='已停止，回答未完成';this.controller=new AbortController();this.open();this.status('正在结合 PPT 思考…');
      let message;
      if(retry){message=this.messages.at(-1);message.text='';message.error='';message.status='streaming';}
      else{message={role:'assistant',text:'',status:'streaming',images:[],page:{...request.currentSlide},language:request.language,meta:`提问时位于第 ${request.currentSlide.number} 页`};this.messages.push(message);this.addRow(message);}
      this.controls();this.persist();this.paint(message);
      let timer=null,done=false;
      const schedule=()=>{if(timer===null)timer=setTimeout(()=>{timer=null;this.paint(message);this.persist();},180);};
      const deadline=setTimeout(()=>{this.stopReason='请求超时，回答未完成';this.controller.abort();},180000);
      try {
        const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',...window.PPTClassroom?.headers()},body:JSON.stringify({...request,studyContext:window.studyContext?{...window.studyContext,slide:request.currentSlide.number}:undefined}),signal:this.controller.signal});
        if(!response.ok){const e=await response.json().catch(()=>({}));await this.connectionFailure(response,e);throw Error(e.error||`请求失败（${response.status}）`);}
        if(this.access.required){const result=await response.json();message.text=result.answer||'';done=true;}
        else {
        if(!response.headers.get('content-type')?.includes('application/x-ndjson'))throw Error('服务端不支持流式协议，请重启新版 server.py。');
        const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
        const consume=line=>{if(!line.trim())return;const event=JSON.parse(line);if(event.type==='delta'){message.text+=event.text||'';schedule();}else if(event.type==='done'){done=true;if(event.model)$('agentModelLabel').textContent=event.model;}else if(event.type==='error')throw Error(event.error||'生成失败');};
        try{while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});if(buffer.length>2500000)throw Error('流式事件过大');let index;while((index=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,index));buffer=buffer.slice(index+1);}}buffer+=decoder.decode();if(buffer.trim())consume(buffer);}
        finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
        }
        if(!done)throw Error('连接提前关闭，已保留收到的内容。');
        if(!message.text.trim())throw Error('未收到有效回答。');
        message.status='complete';this.status('回答完成');
      }catch(e){message.status=this.controller.signal.aborted?'stopped':'error';message.error=this.controller.signal.aborted?this.stopReason:e.message;this.status(message.status==='stopped'?'已停止':'回答未完成',true);if(!this.input.value)this.input.value=request.question||'';}
      finally{clearTimeout(deadline);if(timer!==null)clearTimeout(timer);this.busy=false;this.controller=null;this.paint(message);this.persist(true);this.controls();}
    }
    clear() {if(this.busy||this.processing||this.switching)return;if(!confirm(PPTI18n.language==='en'?'Delete all messages and images in this conversation?':'删除当前会话的文字及图片？'))return;this.messages=[];this.pending=[];this.lastRequest=null;this.preview.close();this.previewImage.removeAttribute('src');this.log.querySelectorAll('.agent-message').forEach(n=>n.remove());this.drawPending();this.persist(true);this.controls();this.notice.textContent='文字和内存附件已清空。';}
    export() {
      const text='# '+t('PPT 问答记录')+'\n\n'+this.messages.map(m=>`## ${t(m.role==='user'?'读者':'助手')}\n\n${m.time||''}\n\n${t(m.meta||'')}${m.page?'\nSlide '+m.page.number+' · '+m.page.title:''}\n\n${m.text}\n\n${m.status==='complete'?'':t('[未完成]')}${(m.images?.length||m.imageCount)?'\n'+t('[图片未包含在导出文件中]'):''}`).join('\n\n');
      const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=make('a');a.href=url;a.download='ppt-chat.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }
  window.WestlakeChat=WestlakeChat;
})();
