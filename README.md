# Westlake HTML Presentation

10月11日整合了特征向量动画演示、Python包结构与双屏演示更新。前端文件（含 `presenter.html`）位于 `web/`；生成演示时也复制演讲者页面及资源。`python3 westlake.py test --suite browser` 包含双屏演示检查。本次整合尚未部署到内部Diffusion服务器：SSH主机密钥验证失败。

[English](README.en.md) | [使用说明](docs/user-guide.md)

## 双屏演示与打印修复（2026-10-07）

点击“演讲者 P”或按 P 打开关联的演讲者窗口。将原幻灯片窗口放到外接屏幕，按 F 全屏；演讲者窗口显示当前页、下一页、讲稿和计时器，并可控制翻页、跳页、暂停/重置计时以及当前页音视频的播放、暂停、重播、静音和进度。视频预览使用静态封面，实际播放在观众窗口；浏览器若禁止自动播放，先在观众窗口点击播放。两窗口的界面语言同步，正文保持原语言。窗口由主页面关联，分别打开两份 HTML 不会自动配对。

普通观众窗口保留演示按钮；双屏全屏时工具栏自动收起，移动鼠标到顶部/底部、键盘聚焦按钮或点击“演示工具”可唤出。关闭演讲者窗口恢复普通演示。学生和教师控制台不提供本地演讲者入口；课堂投影端可以打开只读演讲者视图，翻页仍由教师控制台管理，不改变课堂权限。浏览器窗口连接使用随机会话与窗口身份校验，不新增服务器会话或 AI 请求。

目录 G 提供直接跳页。可在 .slide 上标记 data-backup="true" 为备份页、data-skip="true" 为精简路线跳过页；未配置时隐藏相关按钮。顺序翻页、下一页预览和 End 按当前主讲路线运行；备份可通过目录/缩略图进入，Esc 或演讲者窗口“返回主讲”回到进入前页面。打印始终包含全部主讲页，不包含备份页，不受精简路线影响。

打印按钮先结束编辑、暂停媒体，并等待所有主讲页图片与字体就绪（最长 20 秒）；失败会提示重试。隐藏页图片提前加载，视频打印静态封面、音频打印素材说明。统一 1600×900 的 16:9 页面，修复封面比例、深蓝章节页、桌面多栏布局、图表动画造成的空白和末页分页；讲稿、聊天、课堂浮层及工具栏不打印。使用按钮准备打印比直接 Ctrl/Cmd+P 更可靠；视频须提供本地 poster 图片。

本地编辑支持 Esc 完成、编辑期间禁止跳页、纯文本粘贴和存储失败提示；兼容旧索引文字，保存时使用页面/元素键，并清理危险 HTML。建议为页面设置稳定 id 或 data-id；重排同一页元素后应备份旧编辑并设置 data-edit-key。浏览器编辑不会写回文件。

需随页面一起复制 presenter.html、完整 assets，以及后端新的静态白名单。演示、双屏和打印可离线运行；AI 与课堂仍需原有 Python 服务。浏览器自动化测试见 tests/test_presentation_browser.cjs，需 Playwright 和 Chrome，运行时不调用付费 AI。

编辑恢复会保留公式容器、双栏、列表、表格和安全链接，不再把结构拆成普通文字。运行 `node tests/test_presentation_browser.cjs` 验证离线双窗口、媒体、编辑和 PDF；`PRESENTATION_TEST_URL=http://127.0.0.1:8765/ node tests/test_presentation_served.cjs` 验证 HTTP 资源、弹窗及打印失败重试（示例稿件另设 `PRESENTATION_EXPECT_SLIDES=16`）。测试需 Playwright 和 Chrome，接口使用 mock，不产生 AI 费用。

本轮双屏、打印及编辑组件已于 2026-10-07 备份后同步到 4090 的 16 页 Diffusion 示例，并通过线上双窗口和静态资源验证；未替换稿件、私有配置或课堂数据库。仅表示本轮组件上线，不能据此认定其他历史待部署功能已同步。验证详情见 `tests/VERIFICATION.md`。

## 本地线性代数预览

基于讲义来源的概念练习 HTML 工作区：教师审核问题、学生书面作答、分步提示及自愿分享概念摘要。另支持讲义问答、课堂互动和浏览器本地学习档案。模型判断不是成绩，也不是经过验证的掌握程度评分。

## 快速开始

需要 Python 3.10+。在仓库目录运行：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/westlake-ppt serve
```

打开 `http://127.0.0.1:8765`。AI 调用须在服务端配置凭据，见[配置说明](docs/configuration.md)。默认仅允许本机访问。仓库 `web/` 包含通用讲义与前端；在其他目录使用已安装包时，须指定 `serve --web-root /path/to/web`。macOS 使用 `launch.command`。原 Python 入口及中文启动器仍兼容。

## 演示与开发

```sh
python3 westlake.py demo eigen --output /tmp/xiaoxi-eigen-demo --port 8782
python3 westlake.py test
python3 westlake.py eval assessment_agreement --smoke
python3 westlake.py prompts
```

演示输出目录须为空，包含16页英文线性代数讲义、向量动画和五个练习概念。离线评估始终返回 `uncertain`，不评测真实模型。教师演示口令为 `local-demo`。测试命令运行 Python 和 Node 单元检查；可选浏览器检查需要 Node Playwright 与 Chrome。合成实验的冒烟测试结果不属于研究发现。

## 文档

- [架构与目录](docs/architecture.md)、[API](docs/api.md)、[配置](docs/configuration.md)
- [课堂与练习](docs/classroom.md)、[隐私与安全](docs/privacy.md)
- [测试](docs/testing.md)、[部署与兼容](docs/deployment.md)、[部署日志](docs/deployment-log.md)
- [研究要求与状态](docs/research.md)、[实验](experiments/README.md)、[演示准备](docs/DEMO_READINESS.md)

私有数据、结果、凭据及单独维护的 Diffusion 讲义不得提交 Git。研究收集与公开数据发布须分别取得同意及适用的伦理批准/豁免。不声称已有研究结果、录用、获奖或校方授权；所提供品牌素材仍受权利人许可约束。维护约定见 [AGENTS.md](AGENTS.md)。
