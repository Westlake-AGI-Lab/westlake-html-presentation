/* UI-only localization: never translate deck content or conversation bodies. */
(() => {
  'use strict';
  const dictionary = {
    '分享片段给老师':'Share excerpt with teacher',
    '已保存到本机':'Saved on this device',
    '仅本次会话；打开学习档案可启用本机保存。':'Session only; open Learning archive to enable local saving.',
    '问问这份 PPT':'Ask this PPT','打开 PPT 智能讲解（A）':'Open PPT assistant (A)',
    '关闭 PPT 智能讲解':'Close PPT assistant','关闭智能讲解':'Close assistant','PPT 智能讲解 Agent':'PPT assistant','PPT 智能讲解':'PPT assistant',
    '正在连接服务…':'Connecting…','整套 PPT 文字已就绪':'Presentation text is ready',
    '我会优先结合你正在看的页面回答，也可以跨页解释概念、梳理结构或比较不同章节。回答中的“第 N 页”对应当前网页页码。':'I prioritize the slide you are viewing and can explain concepts across the deck. “Slide N” refers to the page number in this presentation.',
    '快捷问题':'Quick questions','总结这一页':'Summarize slide','解释核心概念':'Explain concepts','联系整套 PPT':'Connect the deck','本页追问':'Explore this slide','考考我':'Quiz me',
    '询问这份 PPT，例如：这一页讲了什么？':'Ask about this PPT, e.g. what does this slide explain?',
    '发送问题':'Send question','OpenAI API · 等待配置':'OpenAI API · Setup required','清空对话':'Clear chat',
    '演示工具':'Presentation tools','幻灯片导航':'Slide navigation','上一页':'Previous slide','下一页':'Next slide',
    '编辑 E':'Edit E','完成 E':'Done E','讲稿 N':'Notes N','隐藏讲稿 N':'Hide notes N','全屏 F':'Fullscreen F','打印':'Print',
    '开启或关闭页面内编辑（E）':'Toggle editing (E)','显示或隐藏讲稿（N）':'Toggle speaker notes (N)','进入或退出全屏（F）':'Toggle fullscreen (F)','打印或导出 PDF':'Print or export PDF',
    '编辑模式已开启 · 点击虚线区域直接修改 · 自动保存在本浏览器':'Editing enabled · Click outlined text to edit · Saved in this browser',
    '← → 翻页 · A 提问 · E 编辑 · N 讲稿 · F 全屏':'← → Navigate · A Ask · E Edit · N Notes · F Fullscreen',
    '宽屏':'Wide view','导出':'Export','↓ 回到最新':'↓ Latest','＋ 图片':'＋ Image','停止':'Stop','重试':'Retry','关闭预览':'Close preview','附件预览':'Attachment preview','移除':'Remove',
    '图片压缩后发送给当前 API 服务商；仅存本页内存。停止不保证上游立即停止计费。':'Compressed images are sent to the configured API provider and kept only in page memory. Stopping may not immediately stop provider billing.',
    '整套文字已就绪 · 支持图片提问':'Deck ready · Image questions supported','需要配置 API Key':'API key required','请通过 server.py 启动':'Start with server.py',
    '浏览器未允许复制':'Clipboard access was denied','复制 Markdown':'Copy Markdown','复制代码':'Copy code','已复制原始 Markdown。':'Raw Markdown copied.','代码已复制。':'Code copied.',
    '请等待当前操作结束再添加图片。':'Wait for the current operation before adding images.','每次最多添加 3 张图片。':'Add up to 3 images per message.',
    '仅支持 PNG、JPEG、WebP 图片。':'Only PNG, JPEG and WebP images are supported.','单张原图片不得超过 5 MiB。':'Each original image must be at most 5 MiB.',
    '图片损坏，无法读取。':'The image is damaged or unreadable.','图片像素过多，请先缩小。':'The image has too many pixels; resize it first.',
    '无法将图片压缩到 1 MiB，请选择更小的图片。':'Unable to compress below 1 MiB; choose a smaller image.',
    '图片已压缩（最长边 ≤2048，每张 ≤1 MiB），请预览文字清晰度。':'Images compressed (longest edge ≤2048 px, each ≤1 MiB). Preview text legibility.',
    '浏览器存储已满，本次聊天仅保留在当前页面。':'Browser storage is full. This chat remains only in the current page.',
    '正在思考…':'Thinking…','未收到正文。':'No response text received.','正在结合 PPT 思考…':'Thinking about the presentation…',
    '生成中':'Generating','未完成':'Incomplete','失败':'Failed','已停止 · 未完成':'Stopped · Incomplete','失败 · 未完成':'Failed · Incomplete','已停止，回答未完成':'Stopped; the answer is incomplete',
    '请求超时，回答未完成':'Request timed out; the answer is incomplete','回答完成':'Answer complete','已停止':'Stopped','回答未完成':'Answer incomplete',
    '跳转到模型引用的页面（未自动核验引用）':'Go to the model-cited slide (citation not independently verified)',
    '请结合当前 PPT 解释这张图片':'Please explain this image in the context of the current presentation',
    '上下文累计超过 6 张图片，请清空对话后继续。':'Context exceeds 6 images. Clear the conversation to continue.',
    '服务端不支持流式协议，请重启新版 server.py。':'Streaming is unavailable. Restart the updated server.py.',
    '生成失败':'Generation failed','流式事件过大':'Streaming event is too large','连接提前关闭，已保留收到的内容。':'The connection ended early. Received content has been preserved.',
    '未收到有效回答。':'No valid answer received.','文字和内存附件已清空。':'Conversation text and in-memory attachments cleared.',
    'PPT 问答记录':'PPT conversation','读者':'Reader','助手':'Assistant','[未完成]':'[Incomplete]','[图片未包含在导出文件中]':'[Images are not included in this export]',
    '当前使用人数较多，请稍后重试。':'The service is busy. Please try again later.','今天的共享问答额度已用完，请明天再试。':'The shared daily quota is exhausted. Try again tomorrow.',
    '提问过于频繁，请稍后再试。':'Too many requests. Please try again later.','仅允许指定内网地址访问。':'Access is restricted to the configured internal network.',
    '不接受跨站请求。':'Cross-site requests are not allowed.','接口不存在。':'Endpoint not found.','请求为空或超过 12 MiB。':'The request is empty or exceeds 12 MiB.',
    '请求格式错误。':'Invalid request format.','服务请求失败或超时。':'The service request failed or timed out.',
    '页面格式错误。':'Invalid slide format.','每条消息最多 3 张图片，上下文累计最多 6 张。':'Up to 3 images per message and 6 per context are allowed.',
    '图片格式错误。':'Invalid image format.','单张发送图片不能超过 1 MiB。':'Each submitted image must be at most 1 MiB.',
    '仅接受 PNG、JPEG、WebP Base64 图片，不接受远程图片地址。':'Only Base64 PNG, JPEG and WebP images are accepted, not remote image URLs.',
    '图片大小无效。':'Invalid image size.','图片格式与声明不符、为动画，或尺寸超过 2048 像素。':'The image format does not match its declaration, is animated, or exceeds 2048 pixels.',
    '图片损坏或无法解码。':'The image is damaged or cannot be decoded.','请输入问题或附加图片。':'Enter a question or attach an image.',
    '缺少演示内容或当前页信息。':'Presentation content or current slide is missing.','当前页码无效。':'Invalid current slide number.',
    '历史对话格式错误。':'Invalid conversation history.','历史消息格式错误。':'Invalid history message.','助手历史不能携带上传图片。':'Assistant history cannot contain uploaded images.',
    'stream 必须是布尔值。':'stream must be a boolean.','language 必须为 zh 或 en。':'language must be zh or en.',
    '服务端尚未配置 OPENAI_API_KEY。':'OPENAI_API_KEY is not configured on the server.','上游连接失败或超时，请检查网络与接口配置。':'The upstream connection failed or timed out. Check the network and API configuration.',
    '上游回答未完成，请重试或调整输出额度。':'The upstream answer is incomplete. Retry or adjust the output allowance.',
    '上游未返回可显示文字。':'The provider returned no displayable text.','上游事件过大。':'The upstream event is too large.',
    '上游没有返回流式响应，请确认接口支持 Responses SSE。':'The provider did not return a stream. Verify Responses SSE support.',
    '上游流式数据异常或超时。':'The upstream stream is invalid or timed out.','上游连接中断，回答未完成。':'The upstream connection was interrupted; the answer is incomplete.',
    '上游生成未完成（额度、输出上限或接口错误），已保留部分内容。':'Generation is incomplete (quota, output limit or API error). Partial content has been preserved.'
  };
  let language = 'zh';
  try { language = localStorage.getItem('westlake-ui-language') === 'en' ? 'en' : 'zh'; } catch (_) {}
  function t(value, lang = language) {
    if (lang !== 'en' || typeof value !== 'string') return value;
    if (dictionary[value]) return dictionary[value];
    return value
      .replace(/^当前：/, 'Current: ')
      .replace(/^提问时位于第 (\d+) 页/, 'Asked on slide $1')
      .replace(/^原有 (\d+) 张图片已失效，请重新上传。$/, '$1 previous image(s) expired. Please upload again.')
      .replace(/^(查看附件|预览) /, (_, label) => label === '预览' ? 'Preview ' : 'View attachment ')
      .replace(/^请求失败（(\d+)）$/, 'Request failed ($1)')
      .replace(/^上游接口 HTTP (\d+)，请检查密钥、额度及模型图片\/流式支持。$/, 'Provider HTTP $1. Check credentials, quota and model image/streaming support.')
      .split(' · ').map(part => dictionary[part] || part).join(' · ');
  }
  const roots = '.utility-controls,.deck-controls,.keyboard-hint,.edit-toast,.agent-header,.agent-context-bar,.agent-welcome,.agent-composer,.agent-launcher,.agent-message-meta,.chat-expired,.chat-placeholder,.chat-image-dialog,.chat-action,.archive-status,#agentLatest';
  const originals = new WeakMap();
  function textNode(node) {
    let record = originals.get(node);
    if (!record || node.data !== record.rendered) record = {source:node.data};
    const rendered = t(record.source);
    if (node.data !== rendered) node.data = rendered;
    record.rendered = rendered; originals.set(node, record);
  }
  const attributeOriginals = new WeakMap();
  function refresh() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll(roots).forEach(root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.parentElement.closest('textarea,input,#languageToggle,#chatLanguageToggle,.chat-user-text') && (!node.parentElement.closest('.chat-markdown') || node.parentElement.closest('.chat-action,.chat-expired'))) textNode(node);
      }
    });
    document.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(el => {
      if (el.closest('.slide') || ['languageToggle','chatLanguageToggle'].includes(el.id)) return;
      const record = attributeOriginals.get(el) || {};
      for (const attr of ['title','aria-label','placeholder','alt']) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr);
        if (!record[attr] || record[attr].rendered !== current) record[attr] = {source:current};
        const rendered = t(record[attr].source);
        if (rendered !== current) el.setAttribute(attr,rendered);
        record[attr].rendered = rendered;
      }
      attributeOriginals.set(el,record);
    });
    document.querySelectorAll('#languageToggle,#chatLanguageToggle').forEach(button => {
      button.textContent = language === 'en' ? '中文' : 'English';
      button.title = language === 'en' ? 'Switch to Chinese' : '切换为英文';
      button.setAttribute('aria-label', button.title);
    });
  }
  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'zh';
    try { localStorage.setItem('westlake-ui-language', language); } catch (_) {}
    refresh(); window.dispatchEvent(new Event('ppt-language-change'));
  }
  window.PPTI18n = { t, get language() {return language;}, setLanguage, refresh };
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button'); button.id = 'languageToggle'; button.type = 'button'; button.className = 'utility-button';
    button.onclick = () => setLanguage(language === 'en' ? 'zh' : 'en');
    document.querySelector('.utility-controls').prepend(button);
    const chatButton=button.cloneNode(true); chatButton.id='chatLanguageToggle'; chatButton.className='chat-action'; chatButton.onclick=button.onclick;
    document.querySelector('.chat-tools').prepend(chatButton);
    refresh();
    let queued = false;
    new MutationObserver(records => {
      if (records.every(r => r.target === button || button.contains(r.target) || r.target === chatButton || chatButton.contains(r.target))) return;
      if (!queued) { queued = true; requestAnimationFrame(() => {queued=false; refresh();}); }
    }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});
  });
})();
