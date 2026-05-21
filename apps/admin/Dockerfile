# syntax=docker/dockerfile:1.7
# Multi-stage build for @repo/admin (Next.js 15, standalone output).
# Build context = repo root. Build: docker build -f apps/admin/Dockerfile .

# ---------- base ----------
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ---------- pruner ----------
FROM base AS pruner
RUN npm install -g turbo@2.3.3
COPY . .
RUN turbo prune @repo/admin --docker

# ---------- installer ----------
FROM base AS installer
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# ---------- builder ----------
FROM installer AS builder
ARG APP_URL_API=http://localhost:4000
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV APP_URL_API=${APP_URL_API} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=pruner /app/out/full/ ./
RUN pnpm --filter @repo/admin build

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app
WORKDIR /app

COPY --from=builder --chown=app:app /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/admin/.next/static ./apps/admin/.next/static

USER app
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
