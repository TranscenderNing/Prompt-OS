# ---- PromptOS Backend ----
FROM python:3.14-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 先装依赖（利用层缓存）
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# 再拷源码
COPY backend/ ./

# SQLite 数据目录（会通过 volume 挂出来）
ENV PROMPTOS_DB=/data/promptos.db
RUN mkdir -p /data

EXPOSE 8000

# 启动脚本：首次启动自动 seed（无数据时才写入），然后跑 uvicorn
CMD ["sh", "-c", "python seed.py || true; exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
