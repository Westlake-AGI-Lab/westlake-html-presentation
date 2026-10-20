# Learning Workspace

[English](README.en.md) · [使用指南](docs/user-guide.md)

本地课程工作区，提供讲义导航、Xiaoxi 助手和配套演讲者视图。本仓库包含当前课程目录与讲义界面。

## 启动当前工作区

需要 Python 3.10+，在仓库根目录运行：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/python westlake.py demo courses --output /tmp/xiaoxi-workspace --port 8782
```

打开 **http://127.0.0.1:8782/**。输出目录须为新目录或空目录；重新预览时换一个目录，不要删除已有课堂数据。此命令重现当前本地课程目录，包括线性代数动画讲义。单独运行 `serve` 会打开内部通用模板，不是课程目录启动命令。模板保留在源码中，因为生成讲义需要其中的共享控件。

预览仅监听本机。教师口令 `local-demo` 仅供独立演示；输出目录保存独立课堂数据，不得在共享服务中使用该演示口令。本机修改和推送 GitHub 都不会自动部署内网服务器，详见[部署说明](docs/deployment.md)。

## 课程与资料

- **Computer Architecture and Parallel Computing**：`2610CST3004`，Fall 2026。第 07 讲 *Out-of-Order Execution & Tomasulo (ILP-2)* 保留所提供 PDF 的全部 24 页，包括图表、署名和页码。另有两份入门教学示例。[Canvas 课程](https://canvas.westlake.edu.cn/courses/2042) 可能需要校内登录。
- **Linear Algebra**：原有 16 页特征向量/对角化讲义，含几何动画、练习与课堂测验，另有向量示例。
- **Calculus**：导数和积分示例。
- **Data Structure and Algorithm Design**：搜索、栈与队列示例，以及原创哈希函数实验室。

七份入门示例各有七页，并明确标为教学示例，不代表官方大学课程目录。七份入门示例的代码仅展示，不执行；独立哈希实验室可选执行代码。PDF 中的动画过程仍是静态帧。

## 目录与讲义界面

目录提供课程卡片、搜索、学科筛选和中英文界面。左栏显示透明背景大学标识、Learning Workspace 文字及用户提供的展示资料 **Sholpan Amankeldi · ID 20243841001**。资料为静态展示，不提供登录或身份验证。

原稿讲义与目录示例采用浅色界面，提供可搜索目录、页码输入、缩放/适合窗口、讲稿、荧光笔、打印，以及适用时的原文件下载。已移除 Read text，隐藏文本仍用于搜索与助手上下文。PDF 编辑只添加个人批注及修改讲稿；荧光笔标记区域，支持撤销、清除此页与键盘替代操作。原稿图片和 PDF 下载保持不变。HTML 示例可直接编辑文字并高亮选中文字。修改和标记保存在本浏览器，不改变仓库文件。

演讲者视图以当前页为主，右侧显示下一页和可滚动讲稿，按可用宽度与高度完整适合幻灯片。PDF/示例采用固定 1600×900 预览画布，不受观众窗口大小或缩放影响。保留联动翻页、选页、计时暂停/重置、全屏、语言、媒体和已配置的精简/备份路线。窄屏按纵向排列。请从讲义打开演讲者视图，单独打开的演讲者页面不会自动配对。

## 助手、练习与课堂限制

AI 需要服务端配置提供商。密钥不得进入 Git 或 HTML，详见[配置说明](docs/configuration.md)。问答使用讲义文字与页码；嵌入的页面图像不会自动发送给模型，主动附件或框选才可附加图像。文字上下文不代表图片理解。切换界面语言不会翻译讲义正文。

目录示例与所提供的计算机体系结构讲义使用自学模式，每讲具有独立浏览器存储，不复用主线性代数讲义的课堂、练习或测验题库。线性代数演示保留推理作答、分阶段提示、可选讲解、教师审核的题库测验及汇总课堂报告。题库组装不等于 AI 出题；离线练习评估始终返回 `uncertain`，不代表评分或有效掌握度测量。示例报告在独立课堂中使用明确标注的虚构参与者。

浏览器档案、课堂参与、自愿分享与研究收集有独立控制。私有聊天不作为教师报告。不声称已有研究结果、正式无障碍合规或校方授权；品牌与讲义素材权利归原权利人。

## 开发与验证

```sh
python3 westlake.py test
python3 westlake.py test --suite browser
```

首个命令运行 Python 与 Node 单元检查。浏览器检查需要 Playwright 和 Chrome；目录、原稿与演讲者专项回归命令见[测试说明](docs/testing.md)。检查覆盖桌面/窄屏、原 PDF 完整性、隔离的模拟 AI 上下文、浏览器编辑/讲稿/标记、演讲者适配和课堂权限，不代表真实模型质量、实体设备行为或服务器已成功部署。

运行依赖声明在 `pyproject.toml`。PDF 提取与渲染已在素材准备时完成，不增加服务运行时 PDF 依赖。凭据、`.env`、课堂数据、结果、生成的预览及本地编辑器/代理设置不进入提交。

## 项目结构

- `src/westlake_ppt/`：Python 服务、目录渲染、课堂和演示。
- `web/`：共享前端、课程目录、演讲者及已登记讲义素材。
- `tests/`：单元与浏览器检查。
- `docs/`：架构、配置、使用流程和部署状态。
- `experiments/`：可选研究工具，不属于学生界面。

[架构](docs/architecture.md) · [API](docs/api.md) · [隐私](docs/privacy.md) · [课堂](docs/classroom.md) · [验证](tests/VERIFICATION.md)

macOS 可双击 `launch.command` 或 `启动智能PPT.command` 在 8782 端口打开课程工作区；已有本机服务时复用，否则创建新的隔离预览目录。

## My progress

侧栏在 Courses 上方新增 My progress 与 Discussions。My progress 按课程记录活跃学习时间、每日活动日历及实际文本/PDF 高亮，排除空闲和后台时间。可跨标签暂停追踪；清除时间历史会保留原稿高亮及讲稿。这些是本地活动记录，不是成绩、掌握度估计、排名或研究报告。同一浏览器资料的使用者共享存储，不跨设备同步。

## Discussions — 本地原型

讨论支持课程/主题搜索筛选、最近/未回答/我的帖子视图、嵌套人类回复、编辑/删除自己的帖子和回复，以及有帮助标记。虚构示例参与者展示教师置顶及验证解释，有帮助不代表 AI 已验证。Markdown、代码和数学公式复用既有本地渲染器。

在讲义私聊中，对一条已完成问题或回答选择 Share to Discussion。编辑标题、学生背景和所选 AI 摘录，选择课程/分类/可见性，预览、勾选审核再确认发布。只有所选消息进入编辑器，不附加完整会话、附件或隐藏上下文。AI 摘录编辑后仍保留 AI 生成/未验证标记，取消不会创建帖子。原私有导师继续使用服务端提供商配置。

Ask my agent 创建可编辑、未发布的脚本草稿。Start agent discussion 需明确启动，最多两或三轮，对比固定解释/反例，可暂停/停止。每条内容都需单独审核并确认发布。同学代理是模拟，不联系真实同学或 LLM 代理。

原型使用浏览器 localStorage（`xiaoxi-discussions-v1`）存储帖子，不向其他学生发送消息，也未实现账号、审核或成员权限。Course members / Study group / Only me 是可见性预览，不提供真实访问控制；共用浏览器的人可以读取存储内容。未发布代理草稿仅保留于页面内存。真实多人讨论和实时代理仍需后端与身份认证。

## 哈希表实验室

在 Data Structure and Algorithm Design 中打开 Hash functions · Interactive lab。公开版本新增十页原创 HTML 教学示例，不依赖私有原稿 PDF。Visualize 分步演示分数规范化、字节求和冲突、32 位霍纳哈希与字节抽样；修改示例输入后观察每一步。Try C++ 提供可编辑的可运行代码；引导可视化依据输入字段，不跟踪任意代码编辑。示例哈希和可视化均不构成密码学保证。

C++ 执行为可选功能，默认关闭。通过固定版本的 Runno 依赖在本机运行 Clang/WebAssembly，不执行原生学生二进制，不使用在线编译器。安装 Node.js 22+ 后运行：

```sh
(cd tools/cpp-runner && npm ci --ignore-scripts)
CPP_RUNNER_ENABLED=1 python3 westlake.py demo courses --output /tmp/xiaoxi-with-cpp --port 8782
```

请使用新输出目录。`CPP_RUNNER_NODE` 可指定 Node 可执行文件绝对路径。`/api/cpp/status` 返回可用状态；`/api/cpp/run` 接收 JSON `code` 和可选 `stdin`，仅接受同源 localhost 请求，并限制源代码/输入大小、并发、速率、输出、时间及 WebAssembly 内存。不向来宾传递提供商凭据或主机文件系统权限。编译/运行失败会显示在输出面板。私有讲义目录、PDF、生成数据和依赖均不进入本次发布，不新增许可证或声称校方授权。

2026-10-20 验证：统一单元命令通过 68 项 Python 测试（其中两项可选编译器测试在该轮跳过）及 10 项 JavaScript 测试。另一次启用编译器的运行通过全部四项 C++ 边界/隔离测试。Chrome 桌面/移动端通过 My progress、Discussions 及公开哈希实验室测试，覆盖活跃/空闲计时、存储错误、所选消息隐私、审核批准、有限代理、真实 C++ 输出、诊断及超时。聊天回答为模拟，未进行付费模型调用、真实同学接收或生产鉴权测试。内部 Diffusion 同步待完成：远端关闭 SSH，未修改远端演示、配置或凭据。
