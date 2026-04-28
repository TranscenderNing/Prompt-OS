# PromptOS · Prompt 操作系统

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/OWNER/REPO?include_prereleases)](https://github.com/OWNER/REPO/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi)
![Frontend](https://img.shields.io/badge/frontend-React+Vite-61dafb?logo=react)

> 让 Prompt 像代码一样可复用、可进化、可协作的 AI 开发环境
>
> 把仓库推到 GitHub 后，把 README 里的 `OWNER/REPO` 替换为你的 `user/repo`（徽章和 GHCR 镜像路径都会自动生效）。

这不是一个"更好的 Prompt 编辑器"，而是一个 **Prompt 资产管理 + 工作流编排底座**。
通用设计，三类使用者（开发者 / 内容创作者 / 企业）都能扩展。

---

## ✨ 特性（MVP v0.1）

| 模块 | 功能 |
|------|------|
| 资产管理 | Prompt CRUD、标签、全文搜索（name / 描述 / 模板 / 标签） |
| 结构化模板 | `{{变量}}` 占位、类型（string/textarea/number/enum）、默认值、描述 |
| 版本控制 | 每次「提交」生成新 `PromptVersion`；支持分支（from 任意版本派生新 branch）、Checkout |
| 调试台 | 同一 Prompt 同时跑多模型/多参数对比，记录历史、耗时 |
| AI 辅助生成 | 引导式 5 步提问 → 自动产出 `template + variables_schema + rationale`，可一键入库 |
| 素材库 | 镜头 / 风格 / 语气 / 关键词 片段；一键插入到当前编辑位置 |
| 导入导出 | 全量 JSON 导入导出；单个 Prompt 导出 Markdown |
| 兼容模型 | 任何 OpenAI 兼容 API（OpenAI / DeepSeek / 通义 / 智谱 / Moonshot / 本地 vLLM...） |

---

## 🗂 目录结构

```
PromptOS/
├── backend/                  FastAPI + SQLite + SQLAlchemy
│   ├── app/
│   │   ├── main.py           入口、CORS、路由注册
│   │   ├── database.py       SQLite 会话
│   │   ├── models.py         ORM 模型
│   │   ├── schemas.py        Pydantic 出入参
│   │   ├── llm.py            OpenAI 兼容调用 + 离线 fallback
│   │   └── routers/          prompts / tags / snippets / render / debug / ai / io
│   ├── seed.py               种子数据（首次启动自动灌入）
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 Vite + React + TS + Tailwind
│   ├── src/                  App / api / components/*
│   ├── nginx.conf            生产镜像使用（反代 /api → backend:8000）
│   ├── package.json
│   └── Dockerfile            多阶段构建：node build → nginx 托管
├── docker-compose.yml        ★ 生产部署（Nginx + 后端 + 数据卷）
├── docker-compose.dev.yml    ★ 开发部署（前后端均热更新）
├── .env.example              环境变量样板
├── .dockerignore
├── start.sh                  本机直跑（免 Docker）
└── README.md
```

---

## 🚀 部署方式

### 方式 A · Docker 一键部署（推荐）

> 需要 Docker Desktop ≥ 4.30 或 Docker Engine ≥ 20.10（含 `docker compose` 插件）。
> macOS / Windows 请安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)；Linux 可用 `curl -fsSL https://get.docker.com | sh`。

```bash
# 1. 进入项目目录
cd PromptOS

# 2. （可选）复制环境变量模板，按需填入 LLM 默认 Key
cp .env.example .env

# 3. 一键启动（首次会构建镜像，约 1~2 分钟）
docker compose up -d --build

# 4. 访问
open http://localhost:8080
```

常用命令：

```bash
docker compose logs -f backend          # 查看后端日志
docker compose logs -f frontend         # 查看前端/nginx 日志
docker compose ps                       # 服务状态
docker compose restart backend          # 单服务重启
docker compose down                     # 停止并删除容器（数据卷保留）
docker compose down -v                  # 彻底清理（包含 SQLite 数据）
docker compose pull && docker compose up -d --build  # 更新重建
```

**数据持久化：**
SQLite 文件挂载在命名卷 `promptos-data` 内（容器路径 `/data/promptos.db`），
`docker compose down` 不会丢数据；需要备份直接：

```bash
docker run --rm -v promptos-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/promptos-backup.tgz -C /data .
```

**端口 / 配置（`.env`）：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PROMPTOS_PORT` | `8080` | 前端对外端口，映射到容器内 Nginx:80 |
| `PROMPTOS_LLM_BASE_URL` | _空_ | 服务端默认 LLM Base URL（可选；用户也可在前端 UI 里配）|
| `PROMPTOS_LLM_API_KEY` | _空_ | 服务端默认 API Key |
| `PROMPTOS_LLM_MODEL` | `gpt-4o-mini` | 服务端默认模型名 |

> 两种 Key 配置方式可共存：前端 UI 里填的 Key **优先**（仅存浏览器 localStorage，后端不持久化），没填时 fallback 到服务端 `.env`，再没配就走**离线模拟输出**。

架构：
```
┌──────────────┐     :8080 HTTP       ┌─────────────────────┐
│   Browser    │ ───────────────────► │ frontend (nginx)    │
└──────────────┘                      │  · 托管 Vite 构建产物│
                                      │  · /api  反代 ──────┼─► ┌──────────────┐
                                      └─────────────────────┘   │  backend     │
                                              docker network     │  FastAPI:8000│
                                              `promptos-net`     │  SQLite      │
                                                                 │  volume:/data│
                                                                 └──────────────┘
```

---

### 方式 B · Docker 开发模式（代码热更新）

```bash
docker compose -f docker-compose.dev.yml up --build
```

- 前端 `http://localhost:5173`，保存 `.tsx` 即时热更
- 后端 `http://localhost:8000`，保存 `.py` 自动重启
- SQLite 与生产共用命名卷 `promptos-data`（方便切换）

---

### 方式 B+ · 从 GHCR 拉预构建镜像（零构建）

CI 已为你自动构建多架构镜像（amd64 + arm64）。任何 tag 或 main 提交都会出现在 GHCR：

```bash
# 下载一个 release 的部署包（含 docker-compose.yml + .env.example）
curl -sL https://github.com/OWNER/REPO/releases/latest/download/promptos-vX.Y.Z-deploy.tgz | tar xz
cd release
cp .env.example .env
# docker-compose.yml 里把 OWNER/REPO 替换成你的仓库路径
sed -i '' "s/OWNER\/REPO/your-user\/your-repo/g" docker-compose.yml
docker compose up -d
```

或直接手动拉：

```bash
docker pull ghcr.io/OWNER/REPO-backend:latest
docker pull ghcr.io/OWNER/REPO-frontend:latest
```

公开镜像不需要 `docker login`；私有仓库先：
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u <your-user> --password-stdin
```

---

### 方式 C · 本机直跑（免 Docker）

```bash
bash start.sh
```

自动建 Python venv、安装依赖、灌种子、并启动 uvicorn + vite。

要求：Python ≥ 3.12（3.14 需 `pydantic>=2.11`，本项目已兼容），Node ≥ 18。

---

## 🔑 模型配置

打开前端右上角 **⚙ 设置**，可一键选预设（OpenAI / DeepSeek / 通义 / 智谱 / Moonshot），填入：
- Base URL（需兼容 OpenAI Chat Completions）
- API Key
- 默认模型名

> 未配置时：AI 生成走 **离线兜底模板**，调试台返回 **离线模拟输出**。全流程 UI 仍可跑通。

---

## 📐 数据模型

```
Prompt (id, name, description, use_case, current_version_id, tags[], created_at, updated_at)
  └─< PromptVersion (id, prompt_id, parent_version_id, branch, version_no,
                     template, variables_schema, commit_message, created_at)
Tag (id, name, color)
Snippet (id, category, title, content, tags[])
DebugRun (id, prompt_version_id, rendered, model, params, output, latency_ms, created_at)
```

每次修改模板/schema → 生成新 `PromptVersion`，`parent_version_id` 串起一棵版本树。
`branch` 字段让你在 `main / dev-v2 / exp-xxx` 之间切换。

---

## 🧭 核心交互

- **左栏**：Prompt 列表 + 搜索 + 场景过滤（通用/开发/创作/企业）
- **中间**：三联编辑 —— 模板源码 / 高亮预览 / 渲染结果
- **右栏 Tab**：参数面板 · 版本树 · 调试台
- **顶栏**：✨ AI 生成 · 📚 素材库 · ↑↓ 导入导出 · ⚙ 设置

---

## 🧪 API 速查

| Method | Path | 说明 |
|--------|------|------|
| GET  | `/api/health` | 健康检查 |
| GET  | `/api/prompts?q=&tag=&use_case=` | 列表 + 搜索 |
| POST | `/api/prompts` | 新建（带初始版本）|
| GET/PATCH/DELETE | `/api/prompts/{id}` | 详情/更新/删除 |
| GET  | `/api/prompts/{id}/versions` | 版本列表 |
| POST | `/api/prompts/{id}/commit` | 新提交 |
| POST | `/api/prompts/{id}/branch` | 新分支 |
| POST | `/api/prompts/{id}/checkout/{vid}` | 切换当前版本 |
| POST | `/api/render` | 变量渲染 + 缺失检测 |
| POST | `/api/render/extract` | 自动提取 `{{var}}` |
| POST | `/api/debug/run` | 调试台运行 |
| POST | `/api/ai/generate` | AI 辅助生成 |
| GET  | `/api/io/export` | 全量导出 JSON |
| POST | `/api/io/import` | 全量导入 |
| GET  | `/api/io/export/prompt/{id}/markdown` | 单条导出 Markdown |

生产部署后，Swagger 文档在容器内 `backend:8000/docs`（外部默认不暴露，需查看日志或临时加 ports 映射）。

---

## 🛠 故障排查

**Q: `docker compose up` 时前端镜像构建卡在 `npm install`**
A: 国内网络慢，可在 `frontend/Dockerfile` 的 `npm ci` 前加一行：
```dockerfile
RUN npm config set registry https://registry.npmmirror.com
```

**Q: 后端容器起来但前端显示 API 错误**
A: `docker compose logs backend` 看是不是 `pip install` 出错；也可 `docker compose exec backend curl -s http://127.0.0.1:8000/api/health` 直接验。

**Q: 想清空数据重来**
A: `docker compose down -v` 会删除命名卷 `promptos-data`，下次启动时 `seed.py` 会重新灌入种子。

**Q: 想把 SQLite 换成 PostgreSQL**
A: 改 `backend/app/database.py` 的 `create_engine` URL，并在 compose 里加一个 `postgres` 服务 + `depends_on`。模型 100% 兼容（都用 SQLAlchemy ORM）。

---

## 🤖 CI / CD

GitHub Actions 工作流位于 `.github/workflows/ci.yml`，流程：

```
push/PR ──► backend-test  ─┐
         └► frontend-build ┴──► docker (buildx · amd64+arm64) ──► (tag 触发) release
```

| Job | 做什么 |
|-----|-------|
| `backend-test` | Python 3.12 装依赖 → 起 uvicorn → curl 冒烟 health/list/render/commit/ai |
| `frontend-build` | Node 20 → `tsc` 类型检查 → `vite build` → 上传 dist artifact |
| `docker` | QEMU + Buildx 构建多架构镜像，push 到 GHCR，GHA 缓存加速 |
| `release` | 打 `v*.*.*` tag 时自动创建 GitHub Release + 附部署包 |

**镜像 Tag 策略**（由 `docker/metadata-action` 生成）：
- main 分支 push → `:main`、`:sha-<short>`、`:latest`
- PR → `:pr-<number>`（仅 build，不 push）
- tag `v1.2.3` → `:1.2.3`、`:1.2`、`:latest`

**首次在 GitHub 上启用 CI 的 3 步：**

1. 仓库 Settings → Actions → General → Workflow permissions 选 **Read and write**
2. Settings → Packages → 确保允许推送到 GHCR（默认已开）
3. 推首条 tag：`git tag v0.1.0 && git push origin v0.1.0` —— 会自动发 Release

**自动安全更新：** `.github/dependabot.yml` 每周扫一次 GitHub Actions、pip、npm、Docker 基础镜像的新版本，自动开 PR。

## 🧩 扩展方向

- [ ] Prompt 打分 & A/B 评估（DebugRun.score + 自动对比）
- [ ] Prompt → Agent：把 Prompt 当函数，编排成工作流（LangChain UI 风格）
- [ ] 多人协作：登录、工作区、权限、审核
- [ ] 模板市场：社区分享 / Fork（Git 语义已经就绪）
- [ ] Git 同步：把 `prompts/` 作为真正的 Git repo
- [ ] Prompt as API：把某个 Version 暴露成 HTTP 接口
- [ ] 切到 PostgreSQL + Redis + 对象存储（企业方向）

---

MIT License · 2026
