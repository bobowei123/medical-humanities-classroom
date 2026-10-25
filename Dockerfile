# 医学人文智慧课堂 · 生产镜像
# 单服务部署：Node 服务同时提供 API 与前端页面
# 运行前需要提供环境变量 DATABASE_URL（PostgreSQL 连接串）

FROM node:22-slim

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# ---------- 前端构建 ----------
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN cd /app/frontend && pnpm install --frozen-lockfile

COPY frontend/ /app/frontend/
RUN cd /app/frontend && pnpm build

# ---------- 后端构建 ----------
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
COPY backend/prisma /app/backend/prisma/
COPY backend/tsconfig.json /app/backend/
RUN cd /app/backend && pnpm install --frozen-lockfile

COPY backend/ /app/backend/
RUN cd /app/backend && pnpm build

# ---------- 运行 ----------
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/backend
EXPOSE 3000

# 启动时自动同步数据表结构（幂等，已存在则跳过），然后启动服务
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
