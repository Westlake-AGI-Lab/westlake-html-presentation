# Westlake HTML Presentation

[English](README.en.md) | [使用说明](docs/user-guide.md)

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
