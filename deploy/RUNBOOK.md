# Operations runbook

Quick reference for running the restaurant stack on the Contabo VPS.
All commands run as `deploy` on the VPS unless stated otherwise.

```bash
ssh deploy@207.180.217.159
cd /opt/restaurant
```

---

## Deploy a change

**Normal path:** push to `main` → GitHub Actions builds images → automatically deploys.

**Manual deploy (force a specific tag):**

GitHub → Actions → `deploy` → "Run workflow" → enter `image_tag` (e.g. `sha-abc1234` or `latest`).

**Manual deploy from the VPS itself:**

```bash
cd /opt/restaurant
IMAGE_TAG=latest docker compose pull api web admin
docker compose run --rm api sh -c "cd packages/db && npx prisma migrate deploy"
docker compose up -d --no-deps api web admin
```

---

## Rollback

Find a previous successful build's short SHA from GitHub Actions (or run `docker image ls | grep restaurant`), then:

```bash
cd /opt/restaurant
IMAGE_TAG=sha-PREV docker compose pull api web admin
docker compose up -d --no-deps api web admin
```

If a bad migration is the problem: see "Restore database" below — Prisma migrations are forward-only by design, so a backup restore is the rollback path.

---

## View logs

```bash
docker compose logs -f --tail=200 api
docker compose logs -f --tail=200 web
docker compose logs -f --tail=200 admin
docker compose logs -f --tail=200 caddy
docker compose logs -f --tail=200 postgres
```

All at once:
```bash
docker compose logs -f --tail=50
```

---

## Open a Postgres shell

```bash
docker compose exec postgres psql -U postgres restaurant
```

Common one-liners:
```bash
docker compose exec postgres psql -U postgres restaurant -c '\dt'
docker compose exec postgres psql -U postgres restaurant -c 'SELECT COUNT(*) FROM "Order";'
```

---

## Restart a single service

```bash
docker compose restart api
docker compose restart caddy
```

---

## Backups

Nightly `pg_dump` runs at 03:15 UTC via cron (installed by `bootstrap.sh`).
Backups land in `/opt/restaurant/backups/` as `db-YYYYMMDD-HHMMSS.dump`.
Retention: 7 days.

**Manual backup right now:**
```bash
/bin/bash /opt/restaurant/scripts/backup-db.sh
```

**List recent backups:**
```bash
ls -lh /opt/restaurant/backups/
```

**Copy a backup to your laptop (run from your laptop, not the VPS):**
```bash
scp deploy@207.180.217.159:/opt/restaurant/backups/db-XXXXXXXX-XXXXXX.dump .
```

---

## Restore database from a backup

Destructive. Verify the backup file first.

```bash
cd /opt/restaurant
# Stop apps that talk to Postgres
docker compose stop api web admin

# Drop + recreate the DB (Postgres won't let you restore over an existing one cleanly).
docker compose exec -T postgres dropdb -U postgres --if-exists restaurant
docker compose exec -T postgres createdb -U postgres restaurant

# Restore
cat backups/db-YYYYMMDD-HHMMSS.dump \
  | docker compose exec -T postgres pg_restore -U postgres -d restaurant

# Bring apps back
docker compose start api web admin
```

---

## Manage uploads

Files live under `/opt/restaurant/uploads/` (bind-mounted to the api container as `/var/uploads`).

```bash
du -sh /opt/restaurant/uploads/         # total size
ls /opt/restaurant/uploads/menu-items/  # menu item images
```

To copy uploads off the VPS (manual backup):
```bash
# From your laptop
rsync -avz deploy@207.180.217.159:/opt/restaurant/uploads/ ./uploads-backup/
```

---

## SSL / Caddy

Caddy auto-issues + renews Let's Encrypt certs. Cert state lives in the
`caddy-data` volume — don't delete it.

**Force cert renewal (only if something looks broken):**
```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

**Caddy access logs:**
```bash
docker compose logs --tail=200 caddy
```

---

## Resize the VPS

Done via Contabo control panel — Cloud VPS supports live resize, ~1–2 min
reboot. Stack auto-restarts on boot (all services use `restart: unless-stopped`).

---

## Add a 2nd project to this VPS

1. Create `/opt/<project>/` with its own `docker-compose.yml`.
2. Attach its services to the `app-net` external network.
3. Add a new hostname block to `/opt/restaurant/Caddyfile`:
   ```
   <project>.example.com {
       reverse_proxy <service-name>:<port>
   }
   ```
4. `docker compose -f /opt/restaurant/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile`
5. Add an A record for `<project>` in Hostinger DNS pointing at the same IP.

---

## SSH lockout recovery

If you lock yourself out of SSH (firewall misconfig, key deleted), use
Contabo's VNC console via the customer panel:

1. https://my.contabo.com → Your Services → the VPS → Manage → VNC.
2. Log in as root with the original root password (or whatever you rotated it to).
3. Fix sshd / ufw / authorized_keys, then restart sshd.

---

## Useful diagnostic snippets

```bash
# Disk usage
df -h
du -sh /opt/restaurant/* /var/lib/docker

# Container resource use
docker stats --no-stream

# Open ports + listening sockets
sudo ss -tlnp

# Recent UFW blocks
sudo journalctl -u ufw --since "1 hour ago"

# fail2ban status
sudo fail2ban-client status sshd

# Time / NTP
timedatectl status
```
