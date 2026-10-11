# Local verification / 本地验证记录

## 双屏演示迁移 / Presentation migration (2026-10-07)

- 从“浙音ppt”会话迁移通用演示功能和修复，未迁移该课程正文、素材或固定时长。主模板保留10页，独立Diffusion稿件保留16页。/ Reusable features and fixes from the referenced presentation task were migrated, excluding lecture content, assets and fixed durations. The generic deck retains 10 slides; the separate Diffusion example retains 16.
- 主项目44项、独立示例13项Python测试通过；两套稿件各41项Chrome/Playwright检查通过：离线双窗口和图片真实加载、双向翻页、当前/下一页真实尺寸预览、讲稿、计时、双语、音频播放/暂停/静音、静态媒体预览、精简/备份路线及Home/End边界、工具栏恢复、编辑锁定与Esc保存、结构恢复、恶意保存HTML过滤、学生/投影角色隔离和390px布局。/ All 44 main-project and 13 example Python tests, plus 41 browser checks for each deck passed, covering local windows and loaded images, navigation, previews, notes, timer, language, media, route boundaries, tools, editing and role isolation.
- 补查修复离线预览图片：保留相对资源路径，让iframe的base解析，避免放宽HTML安全过滤；预览图片naturalWidth断言通过。/ Relative asset paths now resolve through the preview base without weakening HTML sanitization; naturalWidth assertions verify loaded images.
- 既有框选问答、文字高亮、个人讲解页及课程改进的桌面/窄屏浏览器回归通过；ZIP、学习档案保存/容量失败及双语字典检查通过。高亮测试补充字体与入场动画等待，避免在文字尚未稳定时拖选。/ Existing region, highlights, personal-slide and lecture-improvement regressions passed on desktop/narrow viewports, together with archive, quota-failure and i18n checks. Native selection now waits for fonts and the entrance animation.
- 实际生成10页模板及16页Diffusion PDF，均逐页渲染检查。修复深蓝章节页、封面比例、打印误用移动单栏和动画柱形空白；发现并修复编辑恢复将公式/双栏/列表容器移除的问题。备份页不打印、视频poster及统一16:9分页通过。/ Actual 10- and 16-page PDFs were rendered and visually inspected. Print layout/animation defects and flattened edited markup were identified and fixed; backup exclusion, posters and uniform pages passed.
- 本地HTTP及4090线上各6组检查通过：新增资源GET/HEAD白名单、源码404、LAN弹窗关联与双向翻页、弹窗阻止提示、图片缺失时阻止打印及重试恢复、现有问答面板和390px双语工具栏；未出现页面脚本错误。AI接口使用mock，未调用付费模型。/ Six grouped HTTP checks passed locally and live, with no page errors or paid model calls.
- 4090服务与原pdf-report-tool均保持active；本轮更新前备份至 `/home/user/apps/westlake-ppt-presentation-backup.MPAfsu`，上线文件哈希与独立本地示例一致。仅更新本轮演示组件和静态白名单，不改变私有配置、数据库及其他历史待部署功能。未自动commit或push。/ Both services remain active. A recoverable pre-deployment backup exists; deployed hashes match the standalone example. Private configuration and data were preserved; unrelated previously pending features were not deployed, and no Git commit/push was performed.
- 边界：双屏用真实关联浏览器窗口模拟，未在实体双显示器/Safari/真实手机上验收；PDF验证不等于操作系统打印对话框验收。本轮未重新验证上游AI语义质量或付费接口。内网HTTP仍无传输加密。/ Limits: linked windows were exercised, not physical monitors, Safari or real phones. PDF checks do not validate the OS print dialog. Upstream AI quality/paid requests were not retested; LAN HTTP remains unencrypted.

## Concept practice / 概念练习 (2026-10-03)

- 42 Python tests passed, including 10 learning tests covering response evidence, correct/partial/uncertain states, hint ordering, answer disclosure, stale catalogue/source versions, owner isolation, teacher authentication, same-origin requests, private-source blocking, optional summary/research consent, withdrawal and classroom deletion. / 42项Python测试通过，含10项概念练习测试，覆盖证据校验、状态、提示顺序、答案解锁、版本/成员隔离、认证/同源检查及自愿分享/研究同意、撤回与课堂删除。
- In-app browser/Playwright checks used the isolated scripted determinant demo at 1280x720 and 390x844: wrong attempt, first hint, revision, second hint, worked answer; correct attempt; teacher catalogue loading and publication blocked until review; default-off local saving, enabled persistence across reload, English/Chinese labels. Screenshots inspected; no horizontal overflow observed in the desktop dialog or mobile layout. / 桌面与移动视口的脚本演示已检查作答、两级提示、讲解、教师发布审核、本地自愿保存及双语切换，截图已检查。
- Python compilation, learning JavaScript syntax, existing i18n dictionary checks and `git diff --check` passed. No paid model calls or real student data. / Python与JavaScript语法、现有双语字典及差异空白检查通过；未调用付费模型，未使用真实学生数据。
- Not established: semantic quality of extraction/assessment, resistance to answer leakage in teacher-provided hints, physical-phone behavior, calibrated mastery, or learning effects. Region gating was inspected in code, not exercised through a full mobile crop interaction in this run. Research approval is not granted by configuration. / 尚未验证真实模型语义质量、审核提示的泄漏、真机体验、掌握度校准或学习效果；本轮框选门控仅检查代码。配置不构成伦理批准。
- Internal deployment pending: SSH closed the connection and HTTP returned an empty reply. No remote files, credentials or services changed. / 内网部署待完成：SSH连接关闭，HTTP空响应，未修改远端文件、凭据或服务。

## 个人文本高亮 / Personal text highlights (2026-09-28)

- Chrome / Playwright 在 1440×1000 和 390×844 视口通过：三色高亮、重叠改色、删除、撤销、刷新恢复、翻页保留、存储失败提示、源文字变化隔离及教师/投影角色隔离。桌面真实鼠标拖选和模拟课堂每两秒轮询下的选区保持通过；触屏翻页冲突使用合成事件验证。截图已人工检查。 / Chrome / Playwright passed at 1440×1000 and 390×844: colors, overlapping recoloring, erase, undo, reload, navigation, storage failures, changed-source isolation and teacher/projection isolation. Actual desktop mouse selection survives mocked two-second classroom polling; synthetic touch events verify swipe suppression. Screenshots were visually inspected.
- 32 项现有 Python 测试、Python/JavaScript 语法及差异空白检查通过。未调用真实 AI；真实手机长按选区手柄尚未验证。 / All 32 existing Python tests, Python/JavaScript syntax and diff whitespace checks passed. No real AI calls; physical-phone long-press handles remain untested.
- 内网同步待完成：SSH 握手超时，HTTP 10 秒超时；未修改远端文件、配置或服务。 / Internal deployment pending: SSH banner exchange and the 10-second HTTP probe timed out; remote files, configuration and services were unchanged.

## 课程改进 / Lecture improvements (2026-09-20)

- 29 项 Python 测试通过，包括同意采集、HTTP 问答联动、教师权限、同源校验、重试去重、分组依据及人数计算、真实生成路径的模拟接口、草稿编辑/拒绝/批准、HTML 转义、版本冲突及课堂删除清理。 / 29 Python tests passed, including opt-in capture through HTTP chat, teacher authorization, same-origin checks, retry deduplication, grouping evidence and participant counts, mocked real-generation path, draft editing/rejection/approval, HTML escaping, revision conflicts and room deletion cleanup.
- Chrome 在 1440×1000 桌面与 390×844 触屏视口验证示例主题、编辑/预览、批准后的 11 页 HTML、源稿不变、下载、学生同意默认关闭及刷新重置；截图人工检查。补充页内容轨道高度加入回归断言。 / Chrome covered sample themes, editing/preview, approved 11-slide HTML, unchanged source, download and default-off/reset-on-reload student consent at desktop and touch viewports. Screenshots were inspected; a content-track height assertion guards the export layout.
- 原有桌面/触屏框选回归、i18n、ZIP 及学习档案检查、Python 与 JavaScript 语法检查通过。没有配置独立构建或 lint 命令。 / Existing desktop/touch region regression, i18n, ZIP and learning-archive checks, and Python/JavaScript syntax checks passed. No separate build or lint command is configured.
- 示例使用明确标注的虚构数据，不调用模型；真实模型输出质量及真实手机设备未验证。所有者已授权将通用课程改进功能发布到 GitHub，私有数据和独立 Diffusion 稿件不在发布范围。SSH 首次连接被关闭，发布前重试超时，内网部署待完成，远端文件和凭据未修改。 / The sample uses labeled synthetic data without model calls; real model quality and physical mobile devices were not tested. The owner authorized GitHub publication of the reusable lecture-improvement feature, excluding private data and the independent Diffusion deck. SSH was initially closed and the pre-publication retry timed out; internal deployment remains pending, with no remote file or credential changes.

## 发布前回归 / Pre-release regression (2026-09-18)

中英文 README 已对齐当前课堂、档案、部署依赖及安全边界。重新运行 21 项 Python 测试、ZIP/本机保存及配额失败模拟测试、双语字典测试，全部通过；未新增付费 AI 调用。此前记录中的“未推送”仅描述当时的实现验证阶段，本次按用户要求发布到 GitHub。Diffusion 稿件及私有数据仍排除在仓库外。

Both READMEs now reflect classroom/archive features, deployment dependencies and security boundaries. All 21 Python tests, ZIP/local-save/quota-failure simulations and bilingual dictionary tests pass again; no additional paid AI calls were made. Earlier “not pushed” statements describe the implementation stage; this release is explicitly requested by the user. The Diffusion deck and private data remain outside the repository.

日期 / Date: 2026-09-17。涵盖本地验证和授权内网部署；Diffusion 稿件不在 GitHub 发布范围内。 / Covers local verification and authorized LAN deployment; the Diffusion deck is excluded from GitHub publication.

## 框选演示 / Area selection demo

- 2026-09-20 发布检查：合并最新课堂、档案及缩略图功能后，通用模板通过 21 项 Python 测试、Python 语法检查、i18n 检查，以及桌面和触屏框选浏览器回归。AI 回答使用模拟接口，未测试真实服务商。 / Publication checks on 2026-09-20: after integrating the latest classroom, archive and thumbnail features, the generic template passed 21 Python tests, Python syntax and i18n checks, plus desktop and touch area-selection browser regression. AI responses were mocked; no real provider was tested.
- 2026-09-20：所有者授权将框选功能发布到 GitHub；内网 SSH 连接超时，部署待完成。 / On 2026-09-20 the owner authorized GitHub publication of area selection; internal SSH timed out and deployment remains pending.
- Playwright 在独立 Diffusion 演示上验证 1440×900 桌面与 390×844 触屏：框选、非空截图及尺寸、英文公式请求、中文自定义 Enter 发送、截图与页码对应、取消、键盘选区、重选、翻页取消以及聊天草稿保留。截图已人工检查。 / Playwright verified desktop and touch capture, nonblank bounded crops, English formula questions, Chinese custom Enter submission, image/page correspondence, cancellation, keyboard selection, reselection, navigation cancellation and draft preservation on the independent Diffusion demo. Screenshots were visually inspected.
- 浏览器自动测试拦截 AI 请求；不以模拟回答证明真实模型质量。 / Browser automation mocks AI requests; mock replies do not establish real model quality.
- 原有 13 项后端测试及 i18n 检查通过。系统代理影响本地测试连接，设置 `NO_PROXY=127.0.0.1,localhost` 后通过。 / Existing 13 backend tests and i18n checks passed. Local test connections required `NO_PROXY=127.0.0.1,localhost` to bypass the system proxy.

## 内网部署追加验证 / LAN deployment verification

### 互动课堂与学习档案（2026-09-17）/ Classrooms and learning archives

- 本机与 4090 均通过 21 项 Python 测试；ZIP 校验与 i18n Node 测试通过。覆盖教师权限、跨课堂/稿件隔离、同源校验、成员令牌、请求幂等、点赞/弹幕限流、禁言、重启、保留期限和静态源码保护。
- 浏览器在本机完成教师登录、创建课堂和二维码显示；学生点赞、困惑反馈、弹幕投影、教师关闭弹幕及同步翻页正常。线上 Diffusion 确认学生默认跟随、自由翻页/返回教师页、点赞、重启后弹幕关闭。
- 4090 实际 HTTP 模拟 50 名成员，150 次状态读取耗时约 0.051 秒（服务器本机环回地址，非校园网络延迟）；无付费 AI 调用。临时测试课堂已删除。
- 本机及线上导入带图片、公式和未完成回复的 ZIP，刷新后图片和回复恢复；本机已触发完整 ZIP 下载。损坏测试图片、路径穿越、超限和不完整 ZIP 被拒绝。源码静态白名单覆盖新增脚本和本地依赖。
- 尚未实测：实际手机浏览器（工具视口覆盖未生效）、磁盘真实耗尽、长时间真实断网、完整打印输出及重新上传“下载所得 ZIP”的第二次往返。本轮未重新调用付费图片问答；原接口由模拟测试回归。不能把本次验证解读为所有设备与异常场景均通过。
- 线上已备份旧版至 /home/user/apps/westlake-ppt-classroom-backup.BuudUm；教师口令只在私有配置和权限 600 的 access 文件，SQLite 位于 /home/user/.local/share/westlake-ppt。未更换 API Key/模型，原 pdf-report-tool 保持 active。本轮未提交或推送 Git。

English summary: 21 Python tests pass locally and on the 4090. ZIP and i18n checks pass. Browser checks covered teacher login/QR creation, student feedback/likes, projected danmaku, teacher controls and page following. Live HTTP tests exercised 50 members and 150 reads with no paid AI calls. Image/formula/incomplete-message archives survived reload locally and online. Real mobile viewports, actual quota exhaustion, prolonged outages, full print output, and re-importing the downloaded ZIP itself remain unverified. Prior code/config/service were backed up; no Git commit or push was made.

### 4090 同步完成（2026-09-17）/ Deployment completed

- 此条更新取代下文之前的“待部署”状态：连接已恢复，双语及缩略图版本已部署并重启 westlake-ppt；原 pdf-report-tool 服务仍 active。备份位于服务器 /home/user/apps/westlake-ppt-backup.P4AC5E。
- 13 项服务器测试通过；健康接口正常，源码路径返回 404；远端 Diffusion HTML 与缩略图脚本 SHA-256 和本地一致。
- 浏览器验证缩略图预览、第 5 页跳转、英文切换；真实请求以英文完成纠错 0.08 → 0.4，公式与 Slide 5 引用正常。/ Live thumbnails, slide navigation, English controls and English Q&A with rendered math passed. Earlier connectivity failures below are historical, not current deployment status.

### 双语界面本地验证 / Local bilingual verification

- 缩略图导航追加：本地 Diffusion 验证真实排版预览、第 5 页点击跳转、End + Enter 跳到第 16 页、中英文切换、390px 窄屏选页自动收起；浏览器错误日志为空。预览隔离在 Shadow DOM，不进入主稿选择器与聊天上下文。服务器 SSH 再次连接超时，缩略图更新仍待部署。/ Thumbnail checks: rendered slide previews, click to slide 5, End + Enter to slide 16, bilingual controls, and auto-close after selection at 390px passed locally; no browser errors. Shadow DOM isolates previews from deck queries and chat context. SSH timed out again; deployment is pending.

- 新增 `assets/i18n.js`；工具栏和聊天标题栏均可切换中英文，浏览器刷新后保留语言。中文输入与历史英文回答不会被切换操作改写。/ Both language controls and reload persistence were verified; typed Chinese and previous English answers remain unchanged.
- 本地 Diffusion 真实调用：英文模式输入中文问题，模型返回英文纠错与公式；`Slide 4` 引用可以跳转且聊天保持打开。390px 窄屏界面可用。/ Live local Diffusion Q&A answered a Chinese question in English, rendered equations, and supported Slide 4 navigation with the panel open; 390px layout was checked.
- 13 项后端测试及 `node tests/test_i18n.cjs` 通过；检查 zh/en 指令、旧请求默认中文、非法语言拒绝与 i18n 资源白名单。修正流式公式缓存的字符样式遗漏。/ 13 backend tests plus dictionary checks pass; language validation, legacy defaults and static serving are covered. Streamed/cached formula glyph styles were fixed.
- 本次双语版服务器同步未完成：SSH 返回 `Host is down`，不能把上述本地通过结果视为新版已上线。/ Bilingual deployment is not complete: SSH returned Host is down. These local passes do not establish that the update is live.

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
