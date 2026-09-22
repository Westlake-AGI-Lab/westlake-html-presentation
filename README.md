# 西湖大学 HTML 演示模板 · PPT 智能讲解 Agent

## 根据学生问题生成个人讲解页

打开 AI 面板时暂时隐藏课堂入口控件，避免其遮挡移动端输入框；关闭面板后恢复。

在 AI 输入框中输入问题，点击 **生成讲解页**。系统根据问题、当前 HTML 页及此前所有页面（含讲稿）生成 1–3 页个人草稿。后续页面和聊天历史不参与；点击时冻结上下文与语言。只有明确附加的图片发送给视觉模型，不会自动识别页面内的图片，无需上传 PDF。**我的讲解页** 可重新打开最新结果，来源按钮返回原始页面。备注注明不确定性及补充推理；服务器校验来源页码范围，但不独立核实事实。

预览仅保留在页面内存中，刷新即丢失。**下载 HTML** 保存独立的自包含文字演示，包含备注和来源链接；在线预览渲染公式，下载文件保留 LaTeX 文字。来源链接需要原服务器可访问，且原文以后可能变化。新结果替换旧预览，需要保留时请先下载。问题与附件留在输入框以便修改或重试。个人草稿不修改原讲稿，也不进入课堂统计、学习档案或教师批准版本。

POST `/api/personal-slides` 接受 `question`、`slides`、`currentSlide`、`language`（`zh`/`en`）及可选 `images`；返回包含 `title`、`bullets`、`notes`、`sources` 的 `slides`，以及 `model`、`currentSlide`。复用服务端 Responses 服务商配置，以及现有网络/来源检查、学生/IP、全局次数与并发限制。限制：问题 4,000 字符，来源最多 80 页，上下文含标记最多 80,000 字符；单页标题/正文/讲稿分别最多 200/10,000/5,000 字符。超限拒绝，不静默遗漏前文。输出 1–3 页，每页 1–4 个要点，图片沿用原有限制。一次模型调用完成生成及提示词要求的来源核对，没有独立验证器或检索功能，无新增配置。

方法参考：Yuheng Yang, Wenjia Jiang, Yang Wang, Yi Song, Yiwei Wang, Chi Zhang. *Auto-Slides: An Interactive Multi-Agent System for Creating and Customizing Research Presentations*. arXiv:2509.11062v3 (2026), https://arxiv.org/abs/2509.11062v3。本功能将交互式改进及来源核对思路用于问题驱动的 HTML 补充讲解，并非复现完整 PDF/Beamer 多智能体流程，也不将其研究结果宣称为本项目的效果。

验证：`tests/test_server.py` 包含后端模拟测试；`tests/test_personal_slides.cjs` 包含桌面/移动端浏览器测试。真实服务商输出质量仍需审核。内网部署待完成（2026-09-22）：SSH 在握手阶段超时，HTTP 返回空响应；未修改远端文件或设置。

## 教师审阅的课程改进

GitHub 发布内容：通用模板包含此流程及虚构示例，不包含私有课堂数据库、本地演示凭据、生成版本或独立 Diffusion 稿件。发布本功能不代表自动发布教师批准的演示文稿。

在教师控制台（`/?mode=teacher`）打开 **课程改进 · Top 10**。**打开示例课堂**会创建独立、已结束的课堂，包含 8 位虚构参与者的 18 条示例问题和三个预备主题。准备示例补充页不会调用 AI，数据与幻灯片均明确标注为示例，真实学生不能加入该课堂。

真实课堂中，学生可在 AI 输入区勾选默认关闭的同意框。之后的提问文字和页码才会保存给教师，同时记录课堂内的化名成员 ID、请求 ID 和源文件 SHA-256 版本。图片、回答及历史对话不复制到分析记录。刷新页面会重置同意；取消勾选仅停止之后的采集，不删除已经分享的问题。即使 AI 回答失败，已分享的问题仍计数；相同请求 ID 的重试不会重复计数。文字本身可能含身份信息，因此不保证完全匿名。人数按不同课堂成员身份计算，不是真实身份核验。

**AI 分析主题**将当前源文件版本最新最多 200 条已分享问题、合计最多 40,000 个问题字符，以及源稿文字和讲稿发送给现有配置的 Responses 服务商，按语义归类。服务端核对问题依据 ID，独立计算人数与问题数，按不同参与者数、再按问题数排序，最多展示 10 个主题。报告显示已分析及未分组数量与时间；刷新获取最新计数，分析需要主动点击。普通课堂帖子、个人档案和旧稿件版本不纳入。

**准备补充页 → 审阅草稿 → 编辑 / 预览 → 批准并生成新版本**生成 1–3 页补充内容。教师须核查事实、公式、引用与隐私。批准后在私有课堂数据库保存独立 HTML 版本，在原稿末尾追加补充页，保留原页码。源文件、当前课堂和 GitHub 不自动变化。每个批准版本以当前服务器源稿为基础，不会自动合并多个批准记录；浏览器本地编辑也不是源稿。通过 **打开新版本** 或 **下载 HTML** 查看；下载文件需配套 `assets/` 目录，AI 功能需本地服务。审阅完成后另行发布为下一版源稿，不自动 commit、push、创建 PR 或部署。输出为 HTML 演示，并非 `.pptx`。

不需要新增凭据、依赖或环境设置。`improvements.py` 复用现有服务端模型接口与教师会话。SQLite 保存已同意分享的问题、报告、草稿及批准 HTML；删除课堂或课堂结束 30 天后的既有清理会一并删除，请独立备份批准版本。教师专用接口：GET `/api/classroom/improvement-dashboard?room=...`、GET `/api/classroom/improvement-file?id=...`（添加 `download=1` 下载）、POST `/api/classroom/improvement-{sample,analyze,draft,save,approve,reject}`。POST 须同源并携带教师 Cookie，最多 64 KiB，沿用已有请求及并发预算。`/api/chat` 可选接收 `shareForImprovement: true` 与 `improvementRequestId`，须带有效课堂请求头，每成员每小时最多采集 30 条。生成内容为转义后写入 HTML 的纯文本。源稿改变后旧草稿不可批准；批准文件不可原地改写。Git 凭据和学生记录不会自动放进演示导出。

验证：`python3 -m unittest discover -s tests -v`；使用独立本地测试服务、Playwright 和 Chrome，运行 `IMPROVEMENT_TEST_URL=http://127.0.0.1:8772 IMPROVEMENT_TEST_PASSWORD=YOUR_TEST_PASSWORD node tests/test_improvements.cjs`。浏览器测试在测试数据库创建示例课堂和文件，并模拟学生 AI 回答；真实服务商输出质量仍须教师审阅。内网 Diffusion 同步待完成：2026-09-20 SSH 连接被关闭，远端文件和设置未修改。

## 互动课堂与本机学习档案

教师入口为 `/?mode=teacher`。使用私有教师口令登录，创建课堂后将学生链接或二维码发给学生，另开“投影或预览”窗口用于投影。学生用课堂码匿名加入，默认跟随老师，主动翻页后暂停跟随，可点击“回到老师当前页”。教师看板不会投影。课堂模式使用原始稿件，不加载独立模式下的本机编辑。

- 学生的快捷反馈每人每页保留最新值，可撤回；问题最多 500 字，只有教师能读。AI 私聊默认不分享，可预览、确认后分享单条文字片段，或明确勾选课程改进的问题文字采集。
- 点赞默认开启，每人 2 秒一次，统计的是次数不是人数，按老师当前页归属。弹幕默认关闭，教师一键开启后直接上屏；每条 60 字、每人 10 秒一次、全课 2 秒一条，另有每 8 秒最多 2 条的轨道容量限制。弹幕仅纯文本，不自动审核；教师可关闭、清屏、删除及禁言。关闭、翻页、断线恢复均不重播旧动画。
- 状态约每 2 秒同步。投影仅显示 PPT、边缘点赞和最多两条弹幕；支持减少动态效果，不进入打印或缩略图。拥挤时拒绝或不播放过多动画，不积压。网络正常时目标延迟为 3 秒内，并非硬实时保证。
- 学习档案入口在 AI 面板顶部。首次同意后自动保存文字与压缩图片至 IndexedDB，每秒保存流式内容，结束立即保存；不再限制归档为最近 20 条。可新建、重命名、恢复或确认删除会话。未启用时仅临时保存最近 20 条文字，旧图片无法恢复。AI 发送上下文仍限最近 12 条及最多 6 张图片，超限需新建对话。
- 下载当前完整 ZIP 包含版本化 manifest.json、conversations.json、attachments/；Markdown 用于阅读但不含图片。导入作为新会话，不覆盖旧数据；限制 100 MiB、1,000 条目，校验路径、格式、图片与压缩，版本不同提示页码可能不匹配。完整备份不含 API 或教师凭证。
- 浏览器清理、隐私模式、配额不足可能影响保存；保存状态会提示失败，请下载独立备份。同一浏览器的其他使用者可能读到记录，HTTP/localhost/不同端口的本机档案不自动同步。

### 教师配置、部署与接口

在仓库外初始化配置，不会修改已有 API Key、模型或供应商：

```bash
python3 configure_classroom.py --config /absolute/private/config.json --data-dir /absolute/private/classroom-data --access-file /absolute/private/teacher-access.txt
PPT_CONFIG_PATH=/absolute/private/config.json python3 server.py
```

脚本仅在口令不存在时生成随机教师口令，保存在权限 600 的私有文件中，不打印口令。可通过私有 JSON 配置 `TEACHER_PASSWORD`、`CLASSROOM_DATA_DIR`，环境变量优先。更改后重启。不要将口令或数据库提交、打包或通过学生链接传播。

课堂数据库位于 CLASSROOM_DATA_DIR，保存课堂、显式反馈、弹幕、点赞统计，以及上文明确同意的问题分析与审阅补充页，不归档完整 AI 私聊。结束课堂默认保留 30 天（请求时清理），教师可提前删除，课堂反馈可导出 JSON/CSV，课程改进版本单独下载 HTML。重启保留数据库，但教师会话失效、弹幕关闭、旧动画不重播。systemd 必须仅为该数据目录设置 ReadWritePaths；创建目录后再重启。备份/回滚应同时保留私有配置、数据库与旧代码。

新增 `/api/classroom/` 路由：POST login/logout/create/join/control/feedback/question/like/danmaku；GET rooms/state/export。教师使用 HttpOnly、SameSite=Strict Cookie；学生使用随机成员令牌，room 与令牌归属由服务器验证。POST 必须同源，正文上限 16 KiB；投稿带 requestId 防重。state 接收 room、role、since、boot，返回版本、游标及增量事件；teacher=1 只有教师会话才能读取看板。原 /api/chat 兼容；课堂请求使用 X-Classroom-Room 与 X-Classroom-Token，按成员限流，独立模式按 IP 限流，仍保留每日 200 次、2 并发等原有总限额。

当前为可信内网 HTTP：没有传输加密、实名体系或学生身份验证，不承诺匿名不可追踪。教师口令保护管理接口，但隐藏讲稿不等于静态文件保密。不要用于公网、考试保密材料或敏感数据。

本地依赖新增 fflate 0.8.2（ZIP）与 qrcode-generator 1.4.4（二维码），随 assets/vendor 提供，无运行时 CDN。新增测试：`node tests/test_archive.cjs`；后端测试包含权限、幂等、重启、保留期限以及 50 个成员并发读取，不调用付费 AI。

部署状态（2026-09-17）：4090 的 Diffusion 示例已更新互动课堂、点赞/弹幕和学习档案；教师入口 http://10.21.3.45:8765/?mode=teacher ，原演示地址不变。21 项后端测试通过，线上跟随翻页、点赞及带图片档案刷新恢复已验证；仅校内网或相应 VPN 可访问。实际手机、真实存储耗尽和完整打印尚未实测。教师口令在部署者私有 access 文件中，不能发给学生。

## 缩略图导航

点击左下角 44×44 图标展开左侧缩略图栏，查看各页实际排版并直接跳页；当前页橙色高亮，翻页时同步更新。桌面端跳页后保持展开，手机窄屏（≤600px）选页后自动收起。可用方向键、Home / End 选择缩略图，Enter / 空格跳转，Esc 关闭。界面跟随中英文切换，幻灯片内容不翻译。

预览按当前窗口比例缩放，在打开面板及窗口尺寸变化时重建；编辑后重新打开即可刷新。预览不显示讲稿、不进入聊天上下文、不上传或保存截图，打印时隐藏导航。共用资源 `assets/thumbnails.js` 与 `assets/thumbnails.css` 需一同部署，并重启后端以加载新的静态资源白名单。

中文 | [English](README.en.md)

面向西湖大学教学、科研汇报与会议演示的轻量级网页 PPT 模板：用浏览器演示、编辑和打印幻灯片，并通过右侧 AI 对话面板随时提问。

## 当前项目状态（2026-09-18）

### 框选与区域问答

演示工具栏中的蓝色框选图标支持鼠标或手指拖出矩形。局部截图预览提供 **解析公式**、**这是什么方法？**、**解释这里** 及自定义问题。控件和预设问题随中英文界面切换，已输入的问题保持原文。仅框选不会调用 AI；点击预设问题或发送自定义问题后，截图和冻结的幻灯片上下文通过现有聊天接口提交，回答显示在侧栏。

按 Escape 或取消退出，也可重新框选。键盘用户启动工具后可用方向键移动初始矩形、Shift+方向键调整大小、Enter 截取。翻页或调整窗口大小会取消未发送的选区。请先结束编辑模式，并发送或清空现有聊天草稿。沿用已有图片数量上限，不增加自动重试或新 API 接口。

`assets/region.js` / `assets/region.css` 使用本地 html2canvas 1.4.1 和 Lucide 框选图标。截图由 DOM 重绘，不保证与屏幕逐像素一致，也不是 OCR 转录；复杂公式和图表尤其需要检查预览。选区内的视频、iframe、未加载或跨域图片会被拒绝，请改用手动上传截图；其他不支持的 CSS 或媒体也可能存在渲染差异。仅附加当前可见矩形区域，压缩后最长边不超过 2048 像素、每张不超过 1 MiB。临时预览仅存内存；发送后沿用现有聊天附件及存储行为。API 密钥不会交给浏览器，仍适用下文的共享与隐私规则。

框选功能已包含在 GitHub 通用模板中。AI 回答需要启动本地服务并配置支持图片的服务商。独立 Diffusion 稿件不进入仓库或发布包。内网部署待完成：2026-09-20 服务器 SSH 连接超时，部署文件和设置未修改。

浏览器回归：安装 Playwright 和 Chrome 并启动本地服务后，运行 `REGION_TEST_URL=http://127.0.0.1:8765/ node tests/test_region.cjs`。测试使用模拟 AI 回答，覆盖桌面和触屏框选、非空截图、双语请求、取消、翻页及草稿保留。自动化测试不代表真实 AI 回答质量已获验证。

### 一键中英文界面

演示工具栏和聊天面板顶部均有 `English / 中文` 按钮。切换覆盖聊天操作、状态与错误、上传/预览提示、复制/导出、编辑/讲稿/全屏/打印、导航和快捷问题；选择保存在当前站点的浏览器本地存储，刷新后保留。PPT 正文、讲稿、页面标题和已有对话不自动翻译，也不会触发付费翻译请求。

每次提问固定 `language: "zh" | "en"`（旧 API 请求省略时默认中文），英文模式要求模型用英文讲解和测验反馈。生成中切换只改变界面，当前回答及失败重试仍用发送时语言。英文 `Slide N` / `Page N` 引用同样可点击。Markdown 导出的功能标签跟随当前语言，原始消息保持原样。字典与界面适配位于 `assets/i18n.js`；运行 `node tests/test_i18n.cjs` 与 Python 测试验证。

- **此 GitHub 仓库**：通用 10 页西湖大学模板、共享聊天组件、Python 后端、部署示例与测试。
- **内网演示**：[Diffusion 理论入门](http://10.21.3.45:8765/) 已部署为 16 页教学示例，不是空白模板；仅校内网络或能够访问该服务器的 VPN 可用，不是公网地址。
- **分享范围**：Diffusion 稿件保存在独立目录并单独部署，不进入此仓库或通用模板发布包。浏览器中的编辑不会自动发布给其他读者。
- **已验证**：缩略图、双语界面、互动课堂与学习档案已部署；21 项后端测试、档案校验及双语测试通过。线上流式问答与公式渲染已在此前验证。完整记录与未覆盖项见 [验证记录](tests/VERIFICATION.md)。
- **安全边界**：API Key 保存在服务器私有目录。教师管理使用私有口令，学生匿名加入；没有实名账号或 HTTPS。共享问答使用部署者的 API 额度，请仅向可信读者分享并避免敏感材料。

## 1. 项目背景

### 内网分享部署

部署示例见 `deploy/westlake-ppt.service`：独立目录 `~/apps/westlake-ppt`、虚拟环境、systemd 用户服务，端口 8765。部署时复制要分享的 HTML 稿件、配套 assets、server.py、classroom.py 和 requirements.txt（首次配置另需 configure_classroom.py）；后端入口文件名保持为 `西湖大学专属HTML演示模板.html`。当前服务器用独立 Diffusion 稿件替换了默认模板，但 GitHub 仍保留通用模板。不上传 Diffusion 稿件、聊天或密钥到代码仓库。私有配置使用 `PPT_CONFIG_PATH` 指定，服务示例指向 `~/.config/westlake-ppt/config.json`，权限设为 600。

安装依赖后，将 service 文件放入 `~/.config/systemd/user/`，按实际主机修改 `ALLOWED_HOSTS` 和 `ALLOWED_NETWORKS`，运行 `systemctl --user daemon-reload`、`systemctl --user enable --now westlake-ppt`。退出 SSH 后保持运行需启用用户 linger。重启：`systemctl --user restart westlake-ppt`；日志：`journalctl --user -u westlake-ppt`。这些命令只管理本应用，不影响其他服务。

服务默认只允许本机；内网示例明确允许私有网段并校验 Host，忽略客户端伪造的转发 IP 头。聊天默认独立模式每 IP、课堂模式每参与者每小时 30 次、全站每天 200 次、最多同时 2 个请求；分别由 `CHAT_REQUESTS_PER_HOUR`、`CHAT_REQUESTS_PER_DAY`、`CHAT_MAX_CONCURRENT` 调整。每日额度按 UTC 重置，全部计数在内存中，重启会清零，失败尝试也计数；这不是金额预算，请另外设置 API 服务商的消费上限。

内网 HTTP 没有传输加密，也没有账号鉴权，仅供可信校内网络/VPN使用，不要提交敏感资料或转发到公网。截图粘贴等能力还受浏览器权限限制，上传按钮可作为替代。客户端 ID 使用 `crypto.getRandomValues`，兼容普通内网 HTTP 地址。公网部署必须另行配置 HTTPS、认证及可靠限流。

本项目结合已有 HTML 演示文稿的交互方式与用户提供的西湖大学会议 PowerPoint 模板，将校徽、深蓝与橙色视觉元素以及常见会议版式整理为可复用的 HTML 模板。目标是让演示文稿不仅能“展示”，也能帮助读者理解内容，方便后续开发者直接修改与扩展。

目前提供 10 页示例：封面、目录、章节页、正文、关键数字、图文、实施路径、数据、核心结论和致谢。示例文字与数值是占位内容，不代表真实研究结果。

这是基于所提供素材制作的定制项目，不代表学校官方发布或授权。校徽、图片等品牌素材的使用与再分发须遵循学校规定及相关权利人的许可。

## 2. 功能与工作原理

- 16:9 演示、翻页、进度显示、全屏、演讲者讲稿和浏览器打印 / PDF。
- 页面内文字编辑，修改保存在当前浏览器的 `localStorage`。
- 右侧智能讲解面板，支持总结当前页、解释概念、联系整套 PPT 和连续追问。
- 宠物入口使用用户提供的角色图片，轻轻移动、眨眼并短暂切换为行走姿态。鼠标悬停或键盘聚焦时展示放大镜；点击或轻触打开问答，`A` 仍可切换面板。系统的减少动态效果设置会停用待机动画。宠物素材可离线使用，打印时隐藏。
- 提问时自动附带所有页面的文字、讲稿、当前页编号与标题，以及最近对话。
- 服务端调用 OpenAI Responses API 或兼容接口；密钥不会发送给网页客户端。

```text
HTML 页面：整套文字 + 讲稿 + 提问时所在页 + 最近对话 + 主动添加的图片
    ↓ POST /api/chat
Python 本地服务：校验输入 → 限制上下文长度 → 组织提示词
    ↓ POST {OPENAI_API_BASE}/responses（服务端携带密钥）
模型回答 → Python 返回 NDJSON 流（或兼容旧 JSON）→ Markdown / 公式侧栏
```

前端采用原生 HTML / CSS / JavaScript，后端使用 Python 标准库和 Pillow（校验图片），需要先安装 `requirements.txt`。浏览器渲染库已随项目本地化，无需 Node.js 或 npm。每次提问重新从当前页面 DOM 提取内容，因此本地编辑后的文字也能进入问答上下文。

这里的“Agent”是具有演示文稿上下文的问答助手，不是自主执行工具的系统。“已阅读全部页面”指在请求中提供逐页文字，不是预训练、向量检索或永久记忆。当前会把读者主动附加的图片发送给模型进行视觉理解，但不会自动读取 PPT 内所有图片，也不直接解析上传的 PPTX。未上传的图表信息应补充到正文或讲稿中。回答提示词要求标注“第 N 页”，并将通用知识标为“补充说明”，但回答仍需人工核实。

## 3. 快速开始

### 只演示，不使用 AI

保留 `assets/` 与 HTML 的相对位置，直接打开 `西湖大学专属HTML演示模板.html`。离线演示无需 API Key；AI 问答必须通过后端启动。

### 启动完整功能

需要 Python 3.10+（本机 Python 3.9 配合已安装的 Pillow 11.3 也已验证）、现代浏览器，以及支持 Responses API 的服务商密钥与可用模型。进入本项目目录，在 macOS / Linux 终端执行：

```bash
python3 -m pip install -r requirements.txt
export OPENAI_API_KEY="YOUR_API_KEY"
export OPENAI_MODEL="YOUR_AVAILABLE_MODEL"
export OPENAI_API_BASE="https://api.openai.com/v1"
python3 server.py
```

Windows PowerShell：

```powershell
python -m pip install -r requirements.txt
$env:OPENAI_API_KEY="YOUR_API_KEY"
$env:OPENAI_MODEL="YOUR_AVAILABLE_MODEL"
$env:OPENAI_API_BASE="https://api.openai.com/v1"
python server.py
```

打开 <http://127.0.0.1:8765>，点击右侧“问问这份 PPT”。保持服务进程运行；前台启动时按 `Ctrl+C` 停止。仅看幻灯片时，也可不配置密钥就运行服务器。

兼容接口示例（本机曾使用此配置完成真实问答测试）：

```bash
export OPENAI_API_BASE="https://www.apiwharf.com/v1"
export OPENAI_MODEL="gpt-6-astra"
```

APIWharf 是第三方服务，不是 OpenAI 官方域名；模型可用性以对应服务商及账户为准。这些设置仅用于本项目，无需修改 Codex 配置。

### 私有配置与 macOS 双击启动

服务会自动读取 `~/.config/westlake-ppt-agent/config.json`。可在仓库外创建此文件，使用以下结构（仅为占位示例）：

```json
{
  "OPENAI_API_KEY": "YOUR_API_KEY",
  "OPENAI_MODEL": "YOUR_AVAILABLE_MODEL",
  "OPENAI_API_BASE": "https://api.openai.com/v1"
}
```

macOS / Linux 建议将配置目录权限设为 `700`、文件权限设为 `600`。环境变量优先于私有配置；修改后需重启服务。私有配置只读取上述三个字段。

macOS 配置好密钥并安装依赖后，可双击 `启动智能PPT.command`。此脚本优先使用 `.venv/bin/python`，否则使用 `/usr/bin/python3`，固定打开 `127.0.0.1:8765`；其他地址 / 端口请使用终端启动。启动前若检测到该地址的健康接口可访问，脚本只打开网页，不另起服务。

| 配置项 | 代码默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 无 | AI 问答必需，仅在服务端使用 |
| `OPENAI_MODEL` | `gpt-5.5` | 建议显式设置账户实际可用的模型 |
| `OPENAI_API_BASE` | `https://api.openai.com/v1` | 自动追加 `/responses`，不要重复填写 |
| `HOST` | `127.0.0.1` | 默认仅本机访问 |
| `PORT` | `8765` | 修改后用相应端口访问 |
| `MAX_OUTPUT_TOKENS` | `3000` | 回答上限，范围 1–16000，受模型额度约束 |

`.env.example` 仅为配置参考，程序不会自动加载 `.env`；请使用环境变量或上述私有 JSON 文件。

## 4. 演示与内容编辑

小西只显示现有 English / 中文界面切换按钮所选语言的一种问候。宠物按钮文字与提示也使用相同语言；不会翻译幻灯片正文。气泡随拖动移动，保持在窗口内；打开问答或打印时随宠物隐藏。这是本地固定问候语，不是 AI 生成的回复。

使用鼠标或手指拖动宠物，可在浏览器窗口内调整位置。位置保存在当前浏览器的 `localStorage` 中；调整窗口大小后，宠物仍保持在可见范围内。拖动不会打开问答，普通点击或轻触仍会打开。这是网页内宠物，不是跨桌面的系统宠物。

| 操作 | 方式 |
| --- | --- |
| 翻页 | `←` / `→`、`PageUp` / `PageDown` 或导航按钮 |
| 打开 / 关闭问答 | `A` 或右侧 AI 按钮 |
| 文字编辑 | `E` 或“编辑”按钮，再次点击退出编辑 |
| 显示讲稿 | `N` |
| 全屏 | `F` |
| 导出 PDF | 点击“打印”，在浏览器打印窗口选择保存为 PDF |
| 直接进入某页 | URL 添加 `#6`，例如 `http://127.0.0.1:8765/#6` |

编辑内容只保存在当前浏览器，不会写回 HTML，也不会随项目上传 GitHub。要向别人分享修改后的内容，请编辑 HTML 源文件。启用学习档案后，聊天文字与图片保存在 IndexedDB；未启用时仅使用 sessionStorage 临时保留文字。服务器不归档 AI 私聊，课堂反馈则独立保存在 SQLite。

建议复制项目作为新演示稿，修改 `.slide` 节点及 `data-title`；正文可编辑区域带 `data-editable`，讲稿位于 `.presenter-notes`。新增 / 删除页面时检查静态页脚页码。品牌颜色在 CSS `:root` 中；数据页需同时修改条形 `--value` 与显示数值。

多个演示稿若共用同一浏览器来源，应为每份稿件更换 `storageKey` 与 `agentSessionKey`，避免编辑与聊天互相覆盖。调整元素顺序后，旧的按索引保存的编辑可能错位：先备份内容，再清除对应站点存储或更新存储键。

## 5. 项目结构与开发入口

```text
.
├── README.md                       # 中文完整说明
├── README.en.md                    # English documentation
├── AGENTS.md                       # 后续开发与双语文档维护约定
├── 西湖大学专属HTML演示模板.html       # 幻灯片、样式与交互逻辑
├── server.py                       # 静态页面服务及 AI 代理接口
├── classroom.py                    # 课堂权限、SQLite、反馈和互动事件
├── configure_classroom.py          # 初始化仓库外教师配置
├── tests/                          # 后端、档案和双语回归测试
├── deploy/                         # 内网 systemd 服务示例
├── 启动智能PPT.command               # macOS 快捷启动
├── 使用说明.md                      # 简短操作说明
├── .env.example                    # 无真实密钥的配置示例
├── .gitignore
└── assets/                         # 品牌图片、聊天、课堂、档案、缩略图及本地依赖
```

前端主要入口：`collectDeckContext()` 提取页面内容，`assets/chat.js` 中的 `WestlakeChat.ask()` 发起问答，`showSlide()` 更新当前页，`saveEdits()` 保存浏览器编辑。后端主要入口：`AGENT_INSTRUCTIONS` 定义回答规则，`build_deck_context()` / `build_request()` 组装上下文，`call_openai()` / `stream_response()` 调用模型，`PresentationHandler` 处理 HTTP。

### 接口约定

- `GET /api/health` → `{ "ok": true, "configured": true, "model": "...", "stream": true, "images": true }`。`configured` 仅表示存在非空密钥，不代表上游连接验证成功。
- `POST /api/chat` 接收如下 JSON；成功返回 `{ "answer": "...", "model": "..." }`，失败返回 `{ "error": "..." }` 及非 2xx 状态码。

```json
{
  "question": "请解释当前页的核心概念",
  "currentSlide": { "number": 1, "title": "封面" },
  "slides": [
    { "number": 1, "title": "封面", "content": "页面正文", "notes": "演讲者补充" }
  ],
  "history": [
    { "role": "user", "text": "之前的问题" },
    { "role": "assistant", "text": "之前的回答" }
  ]
}
```

当前限制：请求体最多 12 MiB；最多 80 页；每页正文 / 讲稿分别最多 10,000 / 5,000 字符；整稿约 80,000 字符；历史最多最近 12 条、合计约 20,000 字符；问题最多 4,000 字符。超出文字限制会截断。模型输出默认上限为 3,000 tokens（可配置），上游读取超时为 90 秒，网页请求总时限为 180 秒。新版支持流式 Markdown / LaTeX，旧非流式接口继续可用。长文稿应考虑检索、分段或调整限额，并同时评估成本。

### 验证与排障

```bash
python3 -m py_compile server.py classroom.py configure_classroom.py
python3 -m unittest discover -s tests -v
node tests/test_archive.cjs
node tests/test_i18n.cjs
curl http://127.0.0.1:8765/api/health
```

手动回归：检查翻页、全屏、编辑与刷新恢复、讲稿、打印；打开问答，在不同页提问，确认当前页标签和回答页码；检查无密钥、错误密钥、网络失败时的提示。真实问答会产生服务商 API 用量；后端自动化测试可运行 `python3 -m unittest discover -s tests -v`，使用模拟上游，不消耗真实 API 额度。

- 页面可用但 AI 不可用：确认不是直接通过 `file://` 打开；检查健康接口、密钥、模型和 base URL，修改配置后重启。
- `Address already in use`：访问已运行的服务，或设置其他 `PORT`；不要随意终止未知进程。
- 401 / 403 / 429 或模型错误：检查服务商权限、额度、速率及模型支持情况。
- 回答看不到图中信息：将关键信息写入正文或讲稿；可手动上传相关图片进行视觉提问，不能假设模型看到了未上传的图片。
- 修改源文件后仍显示旧文字：浏览器保存的编辑可能覆盖源文件，备份后清理对应本地存储。

## 6. 隐私、安全与 GitHub 分享

每次提问会把整套可提取文字、包括演讲者讲稿、当前页和最近聊天发送给配置的 API 服务商。请先确认材料可以外发。请求使用 `store: false`，这不等同于服务商不记录日志或不保留数据；请自行确认其政策。

当前服务器面向可信内网，不是生产级公网服务。已有教师口令、课堂成员隔离、限流、跨站检查和 GET / HEAD 静态白名单，但没有 HTTPS 或实名账号体系；不要直接暴露到公网。公开部署仍需完善认证、HTTPS、反向代理适配和安全审查。

分享前：

- 只提交本项目目录，不提交用户私有配置、真实密钥、聊天记录或其他个人文件。
- 检查暂存区和 Git 历史；`.gitignore` 无法移除已被追踪的秘密，泄露的密钥应撤销并更换。
- 确认校徽、模板及示例图片具备公开再分发权限。
- 当前未附开源许可证；发布者需明确代码许可证，品牌资产另行说明，不应默认可任意使用。

## 7. 后续维护约定

每次更新后，同时同步到现有服务器上的 **Diffusion 示例**（内网地址 `http://10.21.3.45:8765/`），并验证线上效果。服务器上的演示内容必须保留为 Diffusion，不能被主模板覆盖；保留私有配置、安全限制与其他服务。Diffusion 示例仍不进入 GitHub 仓库或发布包。服务器不可达或验证失败时，明确记录为“待部署”，不宣称已更新。此约定不表示自动提交或推送 GitHub。

每一次功能、接口、配置、启动方式或已知限制的更新，都必须在同一变更中同步修改 `README.md` 与 `README.en.md`，确保示例与实际实现一致。影响日常使用时同时更新 `使用说明.md`，影响配置时更新 `.env.example`。此约定也写入 `AGENTS.md`，供后续开发者与代码助手遵循。

## 增强聊天

可拖动的小西宠物作为聊天入口，点击或按 A 打开。动画、问候和拖动逻辑由 `assets/pet.css` 与 `assets/pet.js` 共享。

- 图片：点击“＋ 图片”、拖到侧栏或在输入框粘贴截图。PNG/JPEG/WebP，每次最多 3 张、原文件每张 ≤5 MiB；发送前缩至最长边 ≤2048 像素、每张 ≤1 MiB，预览可放大或移除。只发图片时会自动补上解释问题。
- 最近 12 条上下文可携带累计最多 6 张图片，超过时需新建或清空对话。启用学习档案后图片随文字保存在本机 IndexedDB，刷新可恢复；未启用时图片只在页面内存中，刷新显示失效。服务器不归档上传图片。
- 回复支持 Markdown 标题、列表、引用、表格、代码块，以及 `$…$`、`$$…$$`、`\\(...\\)`、`\\[...\\]` 公式；代码、宽表格和公式可横向滚动。异常公式保留源码。Markdown 原始 HTML 被转义，远程图片不自动加载，危险链接被移除。
- 流式回答支持“停止”。停止、超时或失败会保留部分回答并标为未完成；“重试”仅重新生成最近失败/停止的请求，保留当时页码及附件，不重复用户消息。不会自动续写或自动重试付费请求。
- 复制单条原始 Markdown、复制代码、导出整个对话（不包含图片字节）。支持宽屏阅读、向上阅读时暂停自动滚动、“回到最新”，以及可点击的有效页码。模型页码引用未自动核验。
- 每次请求锁定提问时的页面，即使生成中翻页也不改变该次上下文。幻灯片仍可离线演示，聊天需本地服务；渲染依赖随项目提供，无运行时 CDN。
- 停止会中断浏览器连接，服务器检测断开后关闭上游连接；连接建立期间或服务商内部仍可能继续运行，不能保证立即停止计费。APIWharf 图片和 SSE 是否支持以实际测试为准，不自动更换模型或供应商。

### 新版接口

旧 `POST /api/chat` JSON 请求不变。可增加 `images: [{dataUrl:"data:image/png;base64,...", name:"example.png"}]` 和 `stream:true`；历史项可附同格式 `images`、`imageCount` 和 `status`（complete / stopped / error）。浏览器内部用 id 关联图片，但发送给后端的是完整图片块，不是本地 URL。

流式返回 `application/x-ndjson`，一行一个 JSON：`start`（model）、`delta`（text）、`ping`（心跳）、`done`（model）、`error`（error）。只有 done 代表完成。健康接口的 stream/images 只表示本服务具备转发能力，不证明上游支持。

### 文件与测试

共用组件是 `assets/chat.js` 和 `assets/chat.css`。本地依赖：marked 18.0.13、DOMPurify 3.4.15、MathJax 3.2.2，许可证位于 `assets/vendor/`。Python 图片验证依赖见 `requirements.txt`；建议虚拟环境安装，启动器优先使用本项目 `.venv/bin/python`。

后端单元测试：`python3 -m unittest discover -s tests -v`。浏览器回归应覆盖四种数学定界符、矩阵、代码、XSS、图片预览/移除/失效、停止/重试、页码跳转及窄屏布局。Diffusion 示例独立于主仓库，不应加入发布包。
