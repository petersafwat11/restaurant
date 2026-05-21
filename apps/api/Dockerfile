# syntax=docker/dockerfile:1.7
# Multi-stage build for @repo/api (NestJS + Fastify + BullMQ workers).
# Build context = repo root. Build: docker build -f apps/api/Dockerfile .

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
# `turbo prune` extracts only the files needed for @repo/api into out/json
# (package.jsons only — for the install layer) and out/full (full source).
FROM base AS pruner
RUN npm install -g turbo@2.3.3
COPY . .
RUN turbo prune @repo/api --docker

# ---------- installer ----------
# Install deps using only the package.jsons → great layer caching.
FROM base AS installer
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# ---------- builder ----------
# Copy the rest of the pruned source, generate Prisma client, build the API.
FROM installer AS builder
COPY --from=pruner /app/out/full/ ./
RUN pnpm --filter @repo/db exec prisma generate
RUN pnpm --filter @repo/api build

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production \
    API_PORT=4000 \
    UPLOADS_DIR=/var/uploads
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app \
 && mkdir -p /var/uploads && chown -R app:app /var/uploads
WORKDIR /app

# Copy node_modules (with Prisma client) + the built API + the schema (needed
# for `prisma migrate deploy` at boot time of the api container).
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/packages ./packages
COPY --from=builder --chown=app:app /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=app:app /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=app:app /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

USER app
EXPOSE 4000
# `tini` via Docker's --init flag (set in compose) handles PID 1 zombie reaping.
CMD ["node", "apps/api/dist/main.js"]
