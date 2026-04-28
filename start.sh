#!/bin/bash
# 一键启动 PromptOS (后端 + 前端)
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="/Users/ning/.workbuddy/binaries/node/versions/22.12.0/bin"
export PATH="$NODE_BIN:$PATH"

echo "==> 启动后端 (FastAPI @ 8000)"
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -q -r requirements.txt
fi
.venv/bin/python seed.py >/dev/null 2>&1 || true
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "==> 启动前端 (Vite @ 5173)"
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
