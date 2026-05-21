# Deployment Plan: Restaurant App → Contabo VPS

**Status:** Draft for approval.
**Owner:** Peter (you = decisions/payment/credentials) + Claude (execution via SSH and Playwright).

---

## 1. Decisions locked

| Decision | Choice | Notes |
|---|---|---|
| VPS provider | **Contabo Cloud VPS 10** | 4 vCPU, 8 GB RAM, 200 Mbit/s |
| Storage | **150 GB SSD (free)** | SSD is plenty for our workload |
| Region | **EU (Germany)** | Assumed MENA customer base; confirm before purchase |
| OS | **Ubuntu 24.04 LTS, plain** | No control panel |
| Term | **1 month first** | Verify, then renew 12-month for -20% |
| Auto Backup add-on | **No** | We will do free nightly local `pg_dump` instead |
| Object storage | **None** | Images go to a local-disk Docker volume |
| Domain registrar | **Hostinger** (new domain — name TBD by user) | |
| URL pattern | `web` = `{domain}` · `admin` = `admin.{domain}` · `api` = `api.{domain}` | |
| Projects on this VPS | **Restaurant app only for now** | Caddy reverse-proxy ready to host more later |
| TLS | **Caddy + Let's Encrypt** | Auto-issued, auto-renewed |
| Container registry | **GitHub Container Registry (ghcr.io)** | Free for private images on personal accounts |
| CI/CD | **GitHub Actions** | Build → push → SSH deploy → migrate |
| Monitoring | **Sentry (already wired) + UptimeRobot free tier** | |
| Email | **Resend** (existing env vars) | Don't send mail from VPS IP — Contabo IPs are often blocklisted |
| SMS | **Twilio** (existing env vars) | |
| Payments | **Stripe** (existing env vars) | |

**Estimated monthly cost:** €4.50/mo (VPS 1mo) → €3.60/mo (after 12mo renewal). Domain ~$10/year. Everything else free tier or already paid.

---

## 2. Architecture

```
                          Internet
                              │
                              ▼
            ┌─────────────────────────────────┐
            │       Contabo VPS (EU)          │
            │       Ubuntu 24.04 LTS          │
            │                                 │
            │   UFW: only 22, 80, 443 open    │
            │                                 │
            │  ┌───────────────────────────┐  │
            │  │  Docker bridge net: app   │  │
            │  │                           │  │
            │  │  Caddy (80/443)           │  │
            │  │   ├─ {domain}      →  web │  │
            │  │   ├─ admin.{d}     →  admin│ │
            │  │   └─ api.{d}       →  api │  │
            │  │                           │  │
            │  │  web (Next.js)    :3000   │  │
            │  │  admin (Next.js)  :3001   │  │
            │  │  api (NestJS+WS)  :4000   │  │
            │  │  postgres:16              │  │
            │  │  redis:7                  │  │
            │  └───────────────────────────┘  │
            │                                 │
            │  Volumes (host bind/named):     │
            │    /opt/restaurant/data/pg      │
            │    /opt/restaurant/data/redis   │
            │    /opt/restaurant/uploads      │
            │    /opt/restaurant/backups      │
            │                                 │
            └─────────────────────────────────┘
```

**Why one big network with Caddy in front:** when project 2 arrives later, we add its containers to the same Docker network and add a new `{domain2}` route in the Caddyfile — no port juggling, automatic SSL.

**Why all-in-one for now (api + worker same container):** simpler ops, fits 8 GB easily. We can split when load demands it.

---

## 3. What I (Claude) will do vs what you must do

### You (one-time):
1. **Buy the Contabo VPS 10** at the page already open in your browser. Settings:
   - Term: 1 Month
   - Region: European Union (confirm)
   - Storage: **150 GB SSD (free)** — change from current URL default
   - Image: Ubuntu 24.04 LTS
   - Auto Backup: **No**
   - Generate root password → **save it in your password manager before clicking submit**
2. **Wait ~5 min** for provisioning email with the public IPv4.
3. **Generate an SSH keypair on your machine** (I'll give the command in §6).
4. **Add the public key to Contabo** via their control panel (Playwright can do this if you want).
5. **Buy domain** on Hostinger (any name you want; tell me before deploy).
6. **Provide me**: VPS IP, root password (or SSH key access), domain name, and the secret values for Stripe/Resend/Twilio/Sentry when I ask for them.

### Me (via SSH + Playwright):
- All code changes (R2 → local disk, Dockerfiles, compose)
- Hostinger DNS A-record setup via Playwright
- All VPS bootstrap (Docker, firewall, swap, fail2ban, user, SSH hardening)
- Initial deploy
- CI/CD wiring
- Backup cron
- Smoke test

---

## 4. Phase 1 — Code changes (before first deploy)

> All these are in this repo. I'll do them and commit when you approve.

### 4.1 Swap R2 for local-disk storage
**Files:**
- `apps/api/src/config/env.ts` (lines 32–37) — remove `R2_*` vars, add `UPLOADS_DIR` (default `/var/uploads`) and `UPLOADS_PUBLIC_URL` (default `${APP_URL_API}/uploads`).
- `apps/api/src/uploads/uploads.service.ts` — rip out `@aws-sdk/client-s3`, `PutObjectCommand`, presign logic. Replace with `fs.promises.writeFile()` to `UPLOADS_DIR/{kind}/{nanoid}.{ext}`. Return `{ url, key }` shaped the same as the R2 path.
- `apps/api/src/uploads/uploads.controller.ts` — switch from "client uploads via presigned URL" model to "client posts multipart to `POST /uploads`", server validates MIME/size and stores. Simpler for our scale.
- `packages/ui/src/image-uploader/index.tsx` — change client to post multipart `FormData` to `/uploads` instead of fetching a presign and PUT-ing.
- `apps/admin/src/features/uploads/hooks/use-upload-image.ts` — same.
- `apps/api/src/main.ts` (lines 56–60) — confirm `/uploads/*` is already served. Keep.
- `apps/web/next.config.ts` (lines 14–18) — replace localhost:4000 image remotePattern with `api.{domain}` once domain known.

### 4.2 Remove `r2.orphan-cleanup` queue
- `packages/jobs/src/queues.ts` — remove the queue.
- `apps/api/src/jobs/r2-orphan-cleanup.processor.ts` — **delete file**.
- Replace with a simpler job `uploads.orphan-cleanup` that walks the `UPLOADS_DIR` and deletes files not referenced in any DB row, daily at 03:00 UTC.

### 4.3 Remove the `@aws-sdk/client-s3` and presigner deps
- `apps/api/package.json` — drop `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.
- Run `pnpm install` to update lockfile.

### 4.4 Next.js standalone output (smaller images, faster startup)
- `apps/web/next.config.ts` and `apps/admin/next.config.ts` — add `output: 'standalone'`.

### 4.5 Health endpoints (for compose healthchecks + uptime monitor)
- `apps/api`: confirm there's a `GET /healthz` (no auth) that returns `{ ok: true }`. Add if missing.
- Next.js apps: standalone server responds to `/` — fine. We'll add `/healthz` route returning 200 for monitor.

### 4.6 Dockerfiles
Three new files:
- `apps/api/Dockerfile` — multi-stage: deps → build → runner (Node 20-slim, non-root user, only `dist/` + `node_modules/.prisma` + `prisma/`).
- `apps/web/Dockerfile` — multi-stage, Next.js standalone output.
- `apps/admin/Dockerfile` — same.

Each does `pnpm fetch` → `pnpm install --offline` → `turbo run build --filter=<app>` so the monorepo cache works.

### 4.7 Root `.dockerignore`
- Ignore `node_modules`, `.next`, `dist`, `.turbo`, `.git`, `coverage`, `*.log`, `.env*`.

### 4.8 Prod docker-compose
New file `deploy/docker-compose.prod.yml`:
- `caddy` (image: `caddy:2-alpine`, ports 80+443, mounts `Caddyfile` + named volumes for certs)
- `postgres` (image: `postgres:16-alpine`, named volume, no exposed port)
- `redis` (image: `redis:7-alpine`, named volume, no exposed port)
- `api` (image: `ghcr.io/<you>/restaurant-api:latest`, depends on postgres+redis, bind mount `/var/uploads`, no exposed port)
- `web` (image: `ghcr.io/<you>/restaurant-web:latest`, depends on api, no exposed port)
- `admin` (same)

All services on internal network `app-net`. Only Caddy is reachable from the host.

### 4.9 `deploy/Caddyfile`
```
{$DOMAIN} {
    encode zstd gzip
    reverse_proxy web:3000
}
admin.{$DOMAIN} {
    encode zstd gzip
    reverse_proxy admin:3001
}
api.{$DOMAIN} {
    encode zstd gzip
    reverse_proxy api:4000
    # Socket.IO upgrade is automatic; Caddy detects WS
}
```

### 4.10 `.env.example.prod`
Single env file that lists every required var, used as a template. Real `.env` lives only on the VPS at `/opt/restaurant/.env`, never committed.

---

## 5. Phase 2 — Purchase & DNS prep

**You:**
- Finish the Contabo checkout (§3).
- Buy a domain on Hostinger.

**Me (via Playwright, with your approval before any record-creating click):**
- Log in to Hostinger (you handle credentials).
- Navigate to the new domain's DNS panel.
- Add three A records:
  - `@` → `<VPS_IP>` (TTL 300)
  - `admin` → `<VPS_IP>`
  - `api` → `<VPS_IP>`
- Confirm propagation via `dig` from the VPS.

---

## 6. Phase 3 — VPS bootstrap (SSH script I run on your VPS)

Once you give me the IP + root password OR add my SSH key:

### 6.1 You generate SSH key (do this before purchase email even arrives):
```bash
ssh-keygen -t ed25519 -C "contabo-restaurant" -f ~/.ssh/contabo_restaurant
# Send me the .pub file contents.
```

### 6.2 I run a bootstrap script over SSH (`deploy/bootstrap.sh`):
1. `apt update && apt upgrade -y` (latest security patches)
2. `timedatectl set-timezone UTC`
3. Create swap file (4 GB; useful on 8 GB box during builds)
4. Create `deploy` user, sudoers NOPASSWD, copy SSH key
5. Disable root SSH login + password auth → key only
6. `ufw default deny incoming` → allow 22, 80, 443 → enable
7. Install `fail2ban` (default jail covers sshd)
8. Install `unattended-upgrades` (auto-apply security patches)
9. Install Docker Engine + Compose plugin via official repo
10. Add `deploy` user to `docker` group
11. Create directory tree:
    ```
    /opt/restaurant/
      .env                  (chmod 600)
      docker-compose.yml    (rsynced from repo on deploy)
      Caddyfile
      data/                 (created by docker named volumes, no need)
      uploads/              (bind mount target)
      backups/              (pg_dump destination)
      logs/                 (optional, Docker logs are fine)
    ```
12. Install `tini` if needed (we use `--init` in compose for PID 1 zombie reaping)
13. Log in to ghcr.io with a deploy token (provided by you, scoped to read:packages)

Script idempotent — re-runs are safe.

---

## 7. Phase 4 — First deploy

1. SSH in as `deploy`.
2. `cd /opt/restaurant`
3. Pull images: `docker compose pull`
4. `docker compose up -d postgres redis` (boot infra first)
5. Wait for Postgres ready (`pg_isready` healthcheck).
6. Run migrations: `docker compose run --rm api pnpm --filter @repo/db migrate:deploy` (note `migrate:deploy` not `migrate:dev` — applies pending migrations without prompts).
7. Seed permissions/roles: `docker compose run --rm api pnpm --filter @repo/db seed`.
8. `docker compose up -d` (start api, worker, web, admin, caddy).
9. Caddy auto-provisions SSL certs via Let's Encrypt for all three hostnames (DNS must already point at VPS — Phase 2).
10. Smoke test from my side:
    - `curl https://{domain}/healthz` → 200
    - `curl https://api.{domain}/healthz` → 200
    - `curl https://admin.{domain}/healthz` → 200
    - WS handshake to `wss://api.{domain}/socket.io/` → upgrade succeeds
11. Create initial owner user via API or seed (your call).

---

## 8. Phase 5 — CI/CD (GitHub Actions)

Two workflows under `.github/workflows/`:

### 8.1 `build-and-push.yml` (on push to `main`)
1. Checkout
2. Setup Node 20 + pnpm 9
3. `pnpm install --frozen-lockfile`
4. `pnpm turbo run build --filter=api --filter=web --filter=admin` (cached via Turbo remote cache if you set it up later — optional)
5. Login to ghcr.io
6. Build each Dockerfile, tag with `:latest` and `:sha-<short>`, push.

### 8.2 `deploy.yml` (after `build-and-push.yml` succeeds)
Uses [`appleboy/ssh-action`](https://github.com/appleboy/ssh-action) with secrets:
- `VPS_HOST` (IP)
- `VPS_USER` = `deploy`
- `VPS_SSH_KEY` (private key)

Steps the action runs on the box:
1. `cd /opt/restaurant`
2. `docker compose pull api web admin`
3. `docker compose run --rm api pnpm --filter @repo/db migrate:deploy` (idempotent)
4. `docker compose up -d --no-deps api web admin` (rolling restart; caddy/postgres/redis stay up)
5. `docker image prune -f`
6. Smoke test: `curl -fsS https://api.{domain}/healthz`

**Rollback:** in the same workflow, on health-check failure → `docker compose pull api:sha-<previous>` + `up -d`. Or manual one-liner I'll document.

### 8.3 Secrets to add in GitHub repo settings
| Secret | Source |
|---|---|
| `GHCR_TOKEN` | Personal access token, `write:packages` scope |
| `VPS_HOST` | Contabo IPv4 |
| `VPS_SSH_KEY` | Private half of the deploy keypair |
| `VPS_PORT` | `22` (unless we change it — we won't) |

(App secrets like `STRIPE_SECRET_KEY` live on the VPS `.env`, NOT in GitHub.)

---

## 9. Phase 6 — Backups (free, local-only)

### 9.1 Nightly `pg_dump` cron on the VPS
Script at `/opt/restaurant/scripts/backup-db.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
TS=$(date -u +%Y%m%d-%H%M%S)
docker compose -f /opt/restaurant/docker-compose.yml exec -T postgres \
  pg_dump -U postgres -Fc restaurant > /opt/restaurant/backups/db-$TS.dump
# Keep last 7 days, gzip-equivalent compression already in -Fc
find /opt/restaurant/backups -name 'db-*.dump' -mtime +7 -delete
```
Crontab as `deploy`: `15 3 * * *` (03:15 UTC daily).

### 9.2 Uploads
Uploads volume lives on the same disk. No separate backup — your call as discussed. If the VPS dies, images are lost (acceptable per your decision; we have only ~50 of them and they can be re-uploaded by restaurant owners).

### 9.3 Restore procedure (documented for the runbook)
```bash
docker compose stop api
docker compose exec -T postgres dropdb -U postgres restaurant
docker compose exec -T postgres createdb -U postgres restaurant
cat /opt/restaurant/backups/db-<TS>.dump | docker compose exec -T postgres pg_restore -U postgres -d restaurant
docker compose start api
```

---

## 10. Phase 7 — Monitoring (free)

- **Sentry**: already in the code (`SENTRY_DSN` env var). Sign up at sentry.io, create project, paste DSN into VPS `.env`. Captures unhandled exceptions in api/web/admin automatically.
- **UptimeRobot free tier**: 50 monitors, 5-min interval. Add HTTP monitors for `https://{domain}`, `https://admin.{domain}/healthz`, `https://api.{domain}/healthz`. Email alerts on downtime.
- **Disk/CPU**: `docker stats` over SSH is enough at this scale; we can add Netdata later if needed (free, lightweight).
- **Logs**: `docker compose logs -f --tail=200 <service>`. No external aggregator for now.

---

## 11. Phase 8 — Operations runbook (lives in repo at `deploy/RUNBOOK.md`)

Quick reference written *for future you*, not for me. Contents:
1. Deploy (just push to `main` — CI handles it).
2. Manual deploy (`ssh deploy@vps && cd /opt/restaurant && docker compose pull && docker compose up -d`).
3. Rollback (`docker compose pull api:sha-<prev> && docker compose up -d api`).
4. View logs (`docker compose logs -f api`).
5. Connect to Postgres (`docker compose exec postgres psql -U postgres restaurant`).
6. Run a one-off migration (`docker compose run --rm api pnpm --filter @repo/db migrate:deploy`).
7. Restore DB from backup (see §9.3).
8. Resize VPS to VPS 20/30 (Contabo control panel, 1–2 min reboot).
9. Add a 2nd project to this VPS (when the time comes — separate compose file in `/opt/<project>/`, add hostname block to Caddyfile, reload Caddy).
10. SSL renewal — automatic via Caddy, no action.
11. SSH lockout recovery — Contabo VNC console as root via web panel.

---

## 12. Execution order (chronological — what happens when)

| # | Step | Done by | Blocks on |
|---|---|---|---|
| 1 | Approve this plan | you | reading it |
| 2 | Code: R2 → local, Dockerfiles, compose, Caddyfile, etc. | me | approval |
| 3 | Open PR, you review, merge to `main` | both | step 2 |
| 4 | Buy Contabo VPS | you | step 1 (specs locked) |
| 5 | Generate SSH key, send me pubkey | you | (parallel to 4) |
| 6 | Add SSH key to VPS via Contabo panel | me via Playwright | steps 4 + 5 |
| 7 | Buy domain on Hostinger | you | step 4 (need IP) — actually can be done in parallel |
| 8 | Add DNS A records on Hostinger | me via Playwright | steps 4 + 7 |
| 9 | Wait DNS propagation (5–30 min) | — | step 8 |
| 10 | Bootstrap VPS (`bootstrap.sh` over SSH) | me | steps 4 + 5 + 6 |
| 11 | Upload `.env` to VPS (you give me values) | me + you | step 10 |
| 12 | First image build via GitHub Actions | CI | merged PR (step 3) |
| 13 | First deploy via GitHub Actions to VPS | CI | steps 10–12 |
| 14 | Smoke test all three hostnames + Stripe webhook | me | step 13 |
| 15 | Configure Stripe webhook endpoint to point at `api.{domain}/webhooks/stripe` | you (in Stripe dashboard) | step 14 |
| 16 | Document runbook + close plan | me | step 15 |

---

## 13. Open questions before I start

1. **Domain name** — tell me when you have it. I can start everything else without it (code, Dockerfiles, bootstrap), but DNS + SSL + first smoke test all wait for the domain.
2. **Stripe**: live mode or test mode for first launch? If test mode, we use test keys; you swap to live when ready (just `.env` edit + restart).
3. **Initial admin user**: do you want a seeded super-admin (you give me an email/password), or will you sign up via the web UI then I grant role via DB?
4. **Sentry/PostHog**: you already have accounts, or should I skip them and we add later?
5. **Mobile app (Expo)**: out of scope for VPS deploy — gets published to App/Play store separately. Confirm I shouldn't touch it in this plan.

---

## 14. What this plan does NOT cover (intentionally)

- HA / multi-VPS / load balancing (overkill at this stage)
- Read replicas for Postgres
- Off-VPS backups (your decision — flagged as a risk)
- CDN in front of Caddy (Cloudflare proxy can be added later for free if we want)
- Mobile app deploy (separate process via EAS)
- Custom monitoring beyond Sentry + UptimeRobot

These are documented as "things to do when you outgrow this setup" in §11.

---

## Approval

Read it, ping me with:
- ✅ "go" — I'll start with §4 (code changes) on a feature branch.
- ✏️ Concerns/changes — I'll iterate the plan.

Once §4 is merged, you can buy the VPS in parallel and we proceed straight into §6 bootstrap.
