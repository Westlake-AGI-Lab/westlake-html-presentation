# Local verification / 本地验证记录

日期 / Date: 2026-09-17。涵盖本地验证和授权内网部署；Diffusion 稿件不在 GitHub 发布范围内。 / Covers local verification and authorized LAN deployment; the Diffusion deck is excluded from GitHub publication.

## 内网部署追加验证 / LAN deployment verification

- 主项目和服务器均通过 12 项后端测试，新增来源网段、Host 校验及请求额度/并发限制测试。/ All 12 backend tests pass locally and on the server, including network/Host restrictions and request/concurrency limits.
- 服务器服务已自动启动，原进展文档网站保持运行；网页返回 200，源码路径返回 404，未允许的 Host 返回 403。/ The service is enabled, the existing document website remains active, the page returns 200, source paths return 404, and unapproved Host values return 403.
- 已用 16 页 Diffusion 稿件替换服务器上的空白模板，核对 HTML 哈希一致；保留独立浏览器存储键、“本页追问”和“考考我”。/ The server now serves the 16-slide Diffusion deck with a matching HTML hash, separate browser storage, slide-specific prompts and quiz controls.
- 内网 HTTP 浏览器真实问答完成，将第 5 页错误答案 0.08 纠正为 0.4，公式和页码跳转按钮正常渲染；客户端不再依赖仅安全上下文可用的 randomUUID。/ A live LAN HTTP request corrected slide 5's answer from 0.08 to 0.4 and rendered math and citation buttons. Client IDs no longer depend on secure-context-only randomUUID.
- 本次只发布通用项目、部署支持与文档，不将 Diffusion 稿件、上传图片、聊天记录或私有配置加入 GitHub。/ Only the reusable project, deployment support and docs are published; no Diffusion deck, uploaded images, conversations or private configuration enter GitHub.

## 已通过 / Passed

- 两套目录均运行 10 个 Python 单元测试：PNG/JPEG/WebP、非法 Base64、类型伪造、损坏/超大图片、图片数量、历史上下文、旧 JSON 接口、SSE Unicode、失败/截断/异常断流、断开连接、跨域、请求上限、GET/HEAD 静态白名单。
- `node --check assets/chat.js`、Python 编译及 `git diff --check`。
- 浏览器：多图选择、压缩提示、预览、移除、纯图片默认问题；剪贴板 PNG 粘贴；追问请求包含历史图片。
- 浏览器：四种公式定界符、矩阵、上下标、表格、代码原文复制、未闭合公式保留；脚本/原始 HTML 转义，危险链接及远程图片不激活。
- 浏览器：停止保留部分回答并标为未完成，手动重试不重复用户问题，模拟流式错误保留内容；页码按钮、宽屏、回到最新控件；390px 视口侧栏全宽。
- 刷新后文字记录与公式恢复，明确提示旧图片失效。两套共享 JS/CSS 相同，端口及存储键独立。
- 导出文件已实际下载并检查：保留 Markdown、图片省略提示与未完成标记，不含 Base64 图片字节。演示讲稿显示、编辑模式切换及退出编辑后的翻页正常。
- APIWharf 真实链路：现有私有配置模型接受附件并返回流式回答，准确描述非敏感示例图片中的宇航服、幼苗和界面；在 Diffusion 第 5 页把错误答案 0.08 纠正为 0.4，解释开平方系数，返回公式、表格及页码。未切换供应商或模型。
- 初始验证时的项目内容扫描未发现真实 API/GitHub token；私有配置仍在项目外。

## 验证边界 / Coverage limits

拖拽的原生文件事件、长达 180 秒的浏览器超时及实际打印对话框尚未逐项人工验收；实现路径已检查，但不将代码检查等同于端到端通过。上游服务将来可能改变兼容性，本次成功不保证长期可用。停止测试验证本地中断与连接关闭，不证明服务商立即停止计费。

Native file drag/drop, the full 180-second browser timeout, and the OS print dialog still need individual manual checks. Implemented paths were inspected but are not claimed as end-to-end passes. Exported Markdown was downloaded and checked: image bytes are excluded and incomplete states retained. Provider compatibility may change. Local cancellation does not prove immediate billing cancellation.

## 复测 / Repeat

`python3 -m unittest discover -s tests -v`

浏览器真实调用会外发当前 PPT、讲稿、近期对话和附件并可能产生费用。恶意渲染测试应使用本地 mock，不向上游发送私密数据。真实测试图片和对话不保存在测试目录。

Live browser checks send slide text, notes, recent conversation and attachments to the configured provider and may incur charges. Use a local mock for adversarial rendering checks. No live-test images or transcripts are stored here.
