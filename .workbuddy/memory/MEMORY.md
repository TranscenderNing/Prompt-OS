# MEMORY.md

> 长期记忆 · 用户偏好、项目约定、跨会话稳定事实

## 用户
- 昵称/称呼：待后续确认
- 工作区路径：/Users/ning/WorkBuddy/20260427093039

## 环境
- macOS (darwin) · Zsh
- Python 3.14.3（系统）—— pydantic/fastapi 需要较新版本，`pydantic>=2.11` 才能在 3.14 上装 wheel
- Node 22.12.0（托管在 `/Users/ning/.workbuddy/binaries/node/versions/22.12.0/bin`）——调用 npm/node 必须显式带 PATH

## 项目：PromptOS（Prompt 操作系统）
- 定位：通用底座，同时服务开发者/内容创作者/企业三类用户
- 技术栈：FastAPI + SQLite + SQLAlchemy（后端）/ Vite + React + TS + Tailwind（前端）
- 端口：后端 8000，前端 5173（Vite 代理 /api → 8000）
- 核心数据：Prompt → PromptVersion（带 parent_version_id、branch、version_no 形成版本树）；Tag / Snippet / DebugRun
- 启动：`bash start.sh`；首次会自动建库 + seed（3 prompts + 8 snippets）
- LLM：兼容 OpenAI Chat Completions 协议，Base URL/API Key/Model 保存在前端 localStorage；未配置时后端走离线兜底（AI 生成返回模板脚手架、调试台返回模拟输出）
- 日志：`/tmp/promptos-be.log`、`/tmp/promptos-fe.log`；PID：`/tmp/promptos-{be,fe}.pid`

## 开发偏好
- 中文回复，输出尽量直给、避免套话
- 金融/股票场景遵循中国习惯：涨红跌绿，默认 ¥（CNY）
