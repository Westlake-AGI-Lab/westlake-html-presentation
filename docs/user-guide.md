# 西湖大学 HTML 演示模板

## 工作区账号登录（2026-11-01，取代下文旧演示登录说明）

在原 `/student.html` 表单输入维护者配置的本地 ID 和密码。无需选择身份，系统自动打开 `/teacher` 或 `/courses`；已登录访问登录页或根地址也会自动跳转。不要使用校园密码，大学 Private Token 连接仍为独立机制。所有登录失败统一显示 Incorrect ID or password；15 分钟内每 ID 五次或每 IP 二十次失败会临时锁定。请等待窗口到期后重试。表单不再预填或在浏览器中校验样例密码，登录只提交至本站服务器。

工作区复用课程侧栏和配色：Today 提供近期活动与高频提问页面；Courses 支持课程创建、讲义上传、发布/隐藏、重命名、替换、删除、排序和定时发布。讲义视图显示问题热度、匿名问答、答案标记和学生可见批注。Students、Discussions 以及课程内 Insights / AI / Practice / Students 标签仍显示 Coming soon；AI 设置、完整分析和讨论审核尚未实现。使用中文/EN 切换语言，Sign out 撤销服务端会话。学生手动访问受保护页面会回到课程页。账号种子与迁移见 README；密码仅在仓库外的私有配置中提供。会话最长 12 小时；浏览器本地学习记录不按账号隔离。原课堂教师口令仍为独立机制。


## 小西宠物与学习入口

验证（2026-10-19）：JavaScript 语法与差异空白检查通过。浏览器验证桌面及 390×844 视口、中英文、小西点击/拖动/刷新恢复、练习提问草稿与已有输入保留。主稿的 Quiz/Practice 和个人讲解页入口仍存在，未重新执行完整测验或 AI 生成，未调用真实模型。内网同步待完成：SSH 连接关闭，HTTP 返回空响应；未修改远端文件或设置。

讲义页面保留可拖动的小西宠物，点击可打开 AI 面板。顶部“练习”（Practice）在可用时打开现有概念练习；独立讲义则在输入框准备可修改的练习提问，不自动发送，也不覆盖已有输入。宠物位置保存在本浏览器，拖动不会触发提问，刷新后恢复；手机显示较小，打印时隐藏，并尊重减少动态效果设置。AI 面板采用小西头像、浅色绿色界面、清晰的来源栏和可换行的工具按钮；原有练习、个人讲解页、档案、上传、导出与停止/重试操作保留。此为界面更新，不改变模型配置或提升 AI 准确率的声明。

教师工作区与互动测验仍从现有主讲稿进入（教师入口仍需登录），本次不新增门户切换。班级测验与教师课程改进仍属于主课堂；独立讲义不会自动加入主课堂或使用其他讲义的测验。个人 Auto-slides 仍在讲义 AI 面板的“生成讲解页”中；教师批准流程仍在教师工作区。

## 安装与目录

从仓库根目录运行 `python3 -m venv .venv`，然后运行 `.venv/bin/python -m pip install -e .`。当前目录入口为 `.venv/bin/python westlake.py demo courses --output /tmp/xiaoxi-workspace --port 8782`（输出目录须为空）。`serve` 仍用于内部通用模板或显式配置的网页目录。前端在 `web/`，Python 包在 `src/westlake_ppt/`。下文命令均从仓库根目录执行；旧 Python 启动脚本仍兼容。详细配置见 [configuration.md](configuration.md)，API 见 [api.md](api.md)。

## 先尝试，再查看讲解

线性代数本地预览：`python3 eigen_demo.py --output /tmp/xiaoxi-eigen-demo --port 8782`（目录须为空）。打开 `http://127.0.0.1:8782`，在章节导航中选页，拖动角度滑块观察向量变换；手机上可滚动当前页查看图。顶部 Practice 打开练习，选题自动跳转到来源页。离线评分始终为“不确定”，完成两次作答及两条提示后可查看讲解，不能据此评价AI准确率。发布源代码并不代表已部署；演示仍通过上述命令在本地启动。

动画实验：播放键从输入向量演示到变换终点，可暂停、重置或手动调整进度。在 Direction 中选择投影线方向及其垂线可精确查看特征值1和0；旋转页可比较90度和180度。勾选 Unit square 或 Transform grid 查看面积与坐标网格变化。角度滑块支持键盘，也可直接拖动图中的方向。Try this question 直接打开本页练习。减少动态效果的系统设置会关闭过渡动画；播放键此时直接到终点。手机上滚动当前幻灯片查看实验区。

1. 教师在 `/?mode=teacher` 登录，打开“概念练习”，读取已有概念、用AI提取草稿或手动添加。检查来源引文、问题、内部标准、两条提示及完整答案，勾选审核后发布。发布后旧版本练习须重新开始。
2. 学生在AI面板打开“练习”，选择概念及解释/应用/反例题，填写推理并提交。反馈可能错误，不应当作成绩；不确定状态表示证据不足。
3. 首次作答后查看提示一，修订后查看提示二。达到标准或两次作答并查看两条提示后，可以打开讲解。“先尝试”模式中的快捷解释、框选提问及个人讲解页受此流程约束；“自由问答”可主动切换。
4. “记录与同意”中可单独启用本浏览器保存、下载或删除记录。练习记录未并入ZIP学习档案。在课堂中可自愿发送概念摘要给教师，也可撤回全部摘要。教师仅收到状态计数，不收到答案原文。
5. 研究记录默认关闭，与教师摘要分享分开。仅在机构要求的伦理批准/豁免及参与者说明已准备好后配置研究；学生还须独立同意。撤回清除服务器研究事件，已下载文件由研究团队处理。

演练：`python3 learning_demo.py --output /tmp/xiaoxi-practice-demo --mock --port 8781`，输出目录须为空。教师演示口令 `local-demo`。页面明确标注脚本模拟评分，不代表真实AI判断质量，也不能用于研究结果。

## 课堂测验与报告

在线性代数演示的教师控制台创建课堂后，点击 **Create quiz**，从预设题库选择1至5题，编辑题目、选项、答案键和解释，勾选审核后发布。学生在顶部 **Quiz** 中明确加入测验；答题时实时显示已答和剩余数量。每个测验只提交一次，若仍有未答题，须在测验窗口内确认按跳过提交。

关闭测验或结束课堂后，学生逐题看到正确、错误或跳过状态、自己的选择、正确答案和解释。**Class report** 汇总测验、题目、提交和未提交次数，并显示选项数量、百分比及按幻灯片去重的错误人数；跨多个测验的提交总数不是去重学生数。报告可下载为聚合JSON或HTML。**Open sample report** 使用独立的虚构课堂，不代表真实教学或研究结果。私人聊天不进入测验报告。

## 根据自己的问题生成讲解页

AI 面板打开时课堂入口暂时隐藏，关闭面板后恢复，避免移动端控件互相遮挡。

1. 打开 AI 面板，在当前页输入问题，例如“这一步公式是怎么推导的？”。
2. 点击“生成讲解页”（English 界面为 Create slides）。系统读取点击时的当前页及此前页面的文字和讲稿；不会读取后续页或聊天历史。图片问题需手动附加截图。
3. 在独立预览中翻阅 1–3 页个人讲解草稿，展开讲解备注；点击来源页码可返回原讲稿。草稿未经教师审核，引用范围校验不代表事实验证。
4. 关闭后可用“我的讲解页”重新打开。修改输入框中的问题再生成，会替换旧预览。生成期间可以停止；失败后可重试，输入问题与附件保留。
5. 用“下载 HTML”保存个人版本。预览刷新即丢失，也不保存到学习档案或教师版本；下载文件独立显示文字与备注，公式保留 LaTeX 文本。来源链接需要访问原服务器。

此功能不修改全班演示，不自动向教师提交。沿用 AI 服务配置及请求限额；超出 80 页/80,000 字符上下文时提示错误，不会静默丢弃前文。

## 演示：学生问题驱动课程改进

1. 教师进入 `/?mode=teacher`，使用已有教师口令登录。在“课程改进 · Top 10”点击“打开示例课堂”。这是独立的已结束课堂：8 位虚构参与者、18 条问题、3 个主题，不调用 AI。
2. 点击某主题的“准备补充页”，在“审阅草稿”中修改标题、要点和讲稿，切换“预览”检查版式。示例草稿明确标注，并非真实课程的 AI 讲解。
3. 点击“批准并生成新版本”，再“打开新版本”或“下载 HTML”。补充页在原稿末尾，原页码不变。下载后与原项目的 `web/assets/` 目录配套使用。也可保存草稿或拒绝。
4. 批准只保存新 HTML 文件内容，不替换当前课堂、源文件或 GitHub；不自动 commit/push，多个批准版本也不自动合并。确认内容后另行发布为下一版源稿。浏览器本地编辑不属于生成依据，输出不是 PowerPoint `.pptx`。
5. 真实课堂中，学生可在 AI 聊天输入区主动勾选“将此后提问的文字分享给教师”。默认不勾选，刷新重置；不采集图片、AI 回答及历史。取消勾选停止之后的采集，不删除已有记录。问题即使回答失败也会计数，相同请求的重试不会重复计数。
6. 教师点击“刷新”查看计数，再点击“AI 分析主题”，使用现有服务商按语义分组。只分析当前源稿版本的最新最多 200 条、40,000 个字符，按不同课堂成员数排名，最多显示 10 个主题。实际参与人数未经身份核验，问题文字也可能含个人信息。分析和真实草稿生成会调用现有 API 并使用额度；发布前务必核查事实、公式、引用和隐私。

问题、报告、草稿与批准版本保存在私有课堂数据库，课堂删除或结束 30 天后的清理会一并删除，请下载重要版本独立备份。历史部署情况见[部署日志](deployment-log.md)。

课堂使用：进入 `/?mode=teacher`，从私有 teacher-access.txt 取得口令登录，创建课堂后分享学生链接或二维码，单独打开投影窗口。学生点“课堂互动”反馈、点赞和发送弹幕；弹幕默认关闭，由老师开启后公开显示。老师可关闭、清屏、删除和禁言。AI 私聊默认不分享给老师。

长期保存：打开 AI 面板的“学习档案”，阅读并同意本机保存后自动保留文字和压缩图片。课后下载“当前完整 ZIP”作为独立备份，使用“导入学习档案”恢复为新会话。Markdown 只用于阅读，不含图片。浏览器被清理或换地址时数据不会自动迁移；共用电脑请注意隐私。详见中英文 README 的互动课堂章节。

点击左下角缩略图图标，展开左侧预览栏，点击任意页跳转；橙色边框表示当前页。关闭按钮或 Esc 收起。手机窄屏选择后自动收起。中英文切换同时适用于导航；编辑后重新打开预览即可刷新。此功能不需要 API 调用，也不会上传图片。

完整的项目背景、技术原理、配置与开发指南请见 [中文 README](../README.md) 或 [English README](../README.en.md)。后续功能更新须同步维护这两份文档。

当前版本以课程目录为首页；源码与讲义素材在仓库内。内网服务器须独立部署，当前不可验证可用。共享问答会使用部署者配置的 API 额度。

直接双击 `web/deck.html` 即可演示；如需使用右侧的 PPT 智能讲解 Agent，请按下面方式通过本地服务启动。

## 框选公式或图表提问

1. 在工具栏点击蓝色框选图标，使用鼠标或手指在当前页拖出一个矩形。
2. 检查截图预览，然后点击“解析公式 / Explain formula”“这是什么方法？ / Identify method”或“解释这里 / Explain this”；也可输入自己的问题并点击发送箭头。
3. 回答显示在原有聊天侧栏，可继续追问。仅框选或预览不会调用 AI，选择问题后才发送截图及演示上下文给当前服务商。
4. “重新框选 / Select again”可重选，Escape 或“取消 / Cancel”可退出。翻页或调整窗口会取消未发送选区。

菜单及预设问题随 `English / 中文` 切换。键盘用户可用方向键移动矩形、Shift+方向键调整大小、Enter 截取。编辑时请先退出编辑；已有聊天草稿请先发送或清空。截图沿用聊天图片上限，不自动重试。预览由网页重绘，复杂公式可能存在差异；视频、iframe、未加载或跨域图片请改用上传截图。发送后的图片沿用现有聊天存储规则。

框选功能已包含在 GitHub 通用模板中。AI 回答需要启动本地服务并配置支持图片的服务商。当前课程目录与讲义素材随源码一并发布。部署历史及待办见[部署日志](deployment-log.md)。

## 启动 PPT 智能讲解 Agent

点击小西宠物或按 A 打开聊天；宠物可拖动，悬停时展示放大镜。

右上角工具栏或聊天面板顶部的 `English / 中文` 可一键切换界面，刷新后保留选择；新问题跟随所选语言回答。PPT 原文与已有对话不自动翻译，生成中切换和重试不会改变该请求原来的语言。

后端依赖由 `pyproject.toml` 定义，按上面的虚拟环境安装步骤会安装 Pillow。

聊天支持选择/粘贴/拖入图片、Markdown/公式、流式回答、停止/失败重试、复制和导出。每次最多 3 张图片，原图每张不超过 5 MiB；压缩后发送给现有 API 服务商。图片不写入磁盘或浏览器存储，刷新后须重新上传。点击回答中的页码可以跳转，但模型引用仍须核实。详细限制与新增接口见两份 README。

服务商与模型由部署者配置。密钥可保存在用户私有目录 `~/.config/westlake-ppt-agent/config.json`，不得包含在模板压缩包中。双击 `launch.command` 即可启动；终端窗口需要保持打开。若服务已经运行，直接访问下面的本地网址即可。

以下为其他电脑的通用配置方法：

API Key 不应写进 HTML。请在“终端”中进入本文件夹，然后执行：

```bash
export OPENAI_API_KEY="你的 OpenAI API Key"
python3 westlake.py serve
```

浏览器打开：`http://127.0.0.1:8765`

可选配置：

```bash
export OPENAI_MODEL="gpt-5.5"
export PORT="8765"
```

Agent 会自动读取每一页的标题、正文和演讲者讲稿，并实时获得读者当前所在页。每次提问会同时提供整套演示内容、当前页和最近对话作为上下文。服务端通过 OpenAI Responses API 回答，默认使用 `store: false`，不会把 API Key 暴露给浏览器。

- `←` / `→`、`PageUp` / `PageDown`：翻页
- `E`：开启或关闭页面内编辑；修改会自动保存在当前浏览器
- `N`：显示或隐藏演讲者讲稿
- `F`：进入或退出全屏
- `A`：打开或关闭 PPT 智能讲解 Agent
- 点击或轻触右下角宠物也可打开智能讲解；鼠标悬停或键盘聚焦时，宠物会拿起放大镜。平时会轻轻移动、眨眼并切换行走姿态；系统开启“减少动态效果”后停止待机动画。宠物可离线显示，打印时自动隐藏。
- “打印”：打印或导出为 16:9 PDF
- 网址末尾可添加 `#6`，直接打开第 6 页

## 替换内容

小西每次只显示一种语言的问候。使用现有 English / 中文按钮切换：英文为“Hello, I'm Xiaoxi. How can I help you?”，中文为“你好，我是小西。有什么可以帮你？”。切换不会翻译幻灯片正文。问候气泡随宠物移动，打开聊天时隐藏；它是本地固定文字，不需要调用 API。

宠物可以用鼠标或手指拖动，位置会保存在当前浏览器中，刷新后恢复。拖动不会打开聊天，普通点击或轻触才会打开；缩小窗口时宠物会保持在窗口内。移动范围限于当前网页。

推荐先复制整个文件夹，再修改副本。页面内编辑适合快速改文字；如需长期维护、替换图片或调整图表，请直接编辑 HTML：

- 品牌颜色统一定义在 CSS 顶部的 `:root`
- 图片位于 `assets` 文件夹
- 数据页条形长度由 `style="--value:88%"` 控制，修改时请同时更新右侧数值
- 每页讲稿位于 `<aside class="presenter-notes">` 中

模板使用了原始西湖大学 PPT 中的校徽及示例视觉素材；对外发布前请遵循学校现行视觉识别与品牌使用规范。

## 安全说明

- 内网分享服务部署参考 `deploy/westlake-ppt.service`；仅供可信校内网络或 VPN 使用，无账号登录且 HTTP 不加密，不要上传敏感材料。
- 共享聊天默认每 IP 每小时 30 次、全站每日 200 次、最多 2 个并发；达到限制会提示稍后重试。该计数重启清零，不代替 API 服务商消费预算。

- 不要把真实 API Key 写进 HTML、`.env.example` 或公开仓库。
- 公网部署时，请为 `/api/chat` 增加身份验证、速率限制与使用额度控制。
- 网页可以继续离线演示；只有智能讲解功能需要服务端和网络连接。
- 使用兼容服务商时，PPT 内容与问题会发送到所配置的服务商；`store: false` 是请求参数，并不代表对第三方数据保留策略的保证。

## 学生个人荧光笔

1. 在学生页面或独立浏览中，点击右上角荧光笔图标。
2. 用鼠标选中文字；手机上长按文字并拖动系统选区手柄。点击黄色、绿色或粉色色块保存标记。
3. 重新选中已标记的文字，点击橡皮擦删除相交标记；弯箭头撤销当前页的最近操作（本次打开期间最多 20 次）。
4. 点击关闭或按 Escape 退出；启用荧光笔时不使用滑动翻页，可继续使用翻页按钮。

标记仅保存在当前浏览器，刷新可恢复，不会修改老师的演示文稿，也不会共享给老师或其他学生。同一浏览器配置的其他使用者仍可能看到这些标记。更换设备、来源地址或修改幻灯片文字不会自动迁移标记。清除浏览器数据会删除标记，保存失败会显示提示。每页最多 200 个标记；学习档案、下载和打印不包含这些标记。仅支持可选择的普通文字，不支持图片内文字、SVG、canvas 或已渲染公式。不支持文本高亮 API 的浏览器会禁用按钮。真实手机长按手柄尚待实机验证。

## Course selection

Run `python3 westlake.py demo courses --output /tmp/xiaoxi-course-catalog --port 8782` with an empty output directory, then open `http://127.0.0.1:8782/`. Choose a card and a lecture. `/courses.html` is also available during ordinary serving. The existing animated Linear Algebra demo retains its practice and quizzes; seven new introductory samples are self-study only, with independent browser storage. UI language switches do not translate lecture content. Use the current checkout; GitHub updates and internal-server deployment are separate actions.

## PDF lecture viewer

Choose a PDF lecture from the course catalog. The viewer preserves original diagrams and credits. Use grouped contents/search, page entry and zoom/fit. Edit, Notes and Highlight are available below the slide. The top-right menu offers fullscreen, presenter view, and printing; Original PDF downloads the unchanged source. Original PDF artwork stays unchanged; edits add personal captions/notes, and PDF highlighting marks page regions. Animations remain static PDF snapshots. Q&A receives lecture text; images require an explicit attachment/region capture. Existing samples and the Linear Algebra demo are retained.

学生登录演示：从课程页底部 Demo sign-in & integrations 或 `/student.html` 进入，点击 Fill demo details 后进入演示。不要使用真实凭据。Canvas、校园服务是未连接的虚构预览；Courses、My progress、Discussions 链接进入现有学习平台。刷新或 Sign out of demo 退出，不存储或发送登录输入。

登录页已与 Courses、My progress、Discussions 的字体、配色和布局统一。桌面侧栏及学习工具入口可直接浏览现有工作区；手机优先展示登录表单。演示登录和 Canvas／校园服务预览的使用方式不变。


## SlideMate 视觉苏格拉底式练习

使用现有讲义 **Practice**，再点击 **开始本页视觉练习**。开始操作会将所选幻灯片图像及文字发送至已配置的服务端模型服务商。不新增登录、课程、示例讲稿或替代仪表盘。PDF 练习通过本地目录解析课程/讲义/页码，使用已登记的教师原图，替换客户端提供的像素与文字。HTML 练习捕获浏览器当前渲染页面；它是浏览器快照，不是经核验的教师原稿。个人 PDF 标注与高亮不属于原图。媒体、复杂 CSS 和动画状态可能无法准确捕获，请核对快照。

独立的 Curator 和 Questioner 调用识别可见元素、归一化边界框及空间/拓扑关系，然后生成引用这些元素的 Apply/Analyze/Evaluate/Create 问题。私有评分标准与完整推理保留在服务端。页码、幻灯片标识、文字和图像绑定至 SHA-256 快照版本。缺少视觉引用、坐标无效或视觉不可靠时会拒绝生成，而不是静默退回纯文本问题。标记区域由 AI 生成，仍需核对；坐标/结构检查不能证明视觉解读正确。

每次实质性作答依次调用 Assessor、Socratic Tutor 和独立模型 Critic。评估需引用学生原文及问题涉及的视觉元素。误概念得到针对性的反问或反例，不返回预设提示或直接纠正。Critic 在展示前检查问题的视觉依据及答案泄露。模型检查仍可能出错，不保证绝对不泄露，也不声称优于其他产品。本次未进行真实模型质量评估。

至少两次不同的有效作答、一次导师追问且最近修订得到支持后，才解锁 **对照完整推理**。首次正确回答仍会收到追问。空白/过短/重复回答、模型判定的未实际作答、过期版本及提前请求解析都不能推进服务端门槛。投入阈值与模型评估无法证明真实人类推理。失败请求保留输入草稿，不记录评分后的尝试。切换页面或修改文字需开始新会话；页面未关闭时仍显示旧对话。

练习文字保存默认关闭。开启后，记录会出现在现有 **My progress → 苏格拉底式练习记录**，包括学生作答与导师追问；这些是活动/证据记录，不是成绩或掌握程度。记录仅在当前浏览器/来源，可在练习窗口删除。不保存图像、私有评分标准或完整答案。刷新后保留已同意保存的文字，但不会恢复已过期/内存中的教学会话。现有学习时间、高亮、聊天档案及讨论记录保持不变。**将此作答分享到讨论** 通过现有编辑器仅传入所选学生回复与页码；发布仍需审核和明确确认。不新增自动向同学发送功能。


本次仅在本地更新，未获批准部署或进行付费模型调用。

## 学生界面（2026-11-01）

当前学生入口为 `/student.html` → 认证后的 `/courses`。侧栏同时提供“我的进度”和“讨论”，学习记录与讨论仍保存在本浏览器。保留课程搜索、筛选与讲义选择；资料来自当前登录账号。原中间工作区、SlideMate 实验室和集成预览不作为独立入口界面。

课程页不再显示吉祥物/研究演示横幅；中英文按钮位于“Your courses / 我的课程”标题右侧。

登录卡片初始为空。输入维护者提供的本地 ID 和密码，点击“Open courses”；服务端按账号自动进入学生或教师工作区。Show/Hide 切换密码可见性；失败显示统一错误并清空密码。仅向本站提交登录信息，退出会撤销服务端会话。

登录与课程页的入场动效仅播放一次；筛选时卡片短暂淡入淡出，输入框本身不移动。登录插画卡片有轻微慢浮动。系统“减少动态效果”会使页面完全静止。键盘操作不等待转场；鼠标打开同站页面时内容短暂淡出。登录字段初始为空，退出后清空输入；未恢复之前删除的提示或按钮。

### 学生入口视觉细化 / Student entry refinement

登录与课程两屏统一字体、间距和层级；手机导航更紧凑，课程卡片说明更易读。卡片页脚区分课程资料与教学示例；登录、筛选和课程选择流程不变。
Login and courses now share a clearer type/spacing hierarchy, compact phone navigation and readable course descriptions. Card footers distinguish course materials from teaching samples. Login, filtering and lecture selection workflows are unchanged.

### 恢复工作区导航 / Restored workspace navigation
课程页侧栏再次提供“我的进度”和“讨论”；手机上三项导航并排显示。点击打开原有页面，数据与功能不变。
The courses sidebar again offers My Progress and Discussions. On phones, all three workspace links share a row. They open the existing pages; data and behavior are preserved.


Workspace sidebar destinations retain their order/position and open immediately without a navigation fade.


### Switch Xiaoxi's connected model

Expand **Connected · model** in the existing chat, choose **Switch model**, select an allowed model and confirm. The server validates it with a short real inference using your existing session token. Successful switches update the active model shown in chat; failures show an error and keep the previous model. No token re-entry is needed for switching. History, unsent drafts and the current slide are retained. Switching is disabled during chat, slide generation and model validation. A server restart still ends memory-only connections.
