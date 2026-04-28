# ---- PromptOS Frontend (multi-stage) ----
# Stage 1: 构建 Vite 产物
FROM node:25-alpine AS builder

WORKDIR /app

# 优先拷 package.json 利用缓存（先拷整个 frontend 里 package* 再整体覆盖源码）
COPY frontend/package.json ./package.json

RUN npm install --no-audit --no-fund

COPY frontend/ ./

RUN npm run build

# Stage 2: Nginx 托管
FROM nginx:1.27-alpine AS runner

# 清空默认站点
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
