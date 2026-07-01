# Runbook: Backup & Disaster Recovery

# Topology

Self-hosted on a single **Contabo VPS** with Docker Compose: Caddy,
self-hosted **PostgreSQL** and **Redis** (compose-internal containers), and
local-disk uploads at `/opt/restaurant/uploads`. There is **no** managed
database, no managed PITR, no Cloudflare R2, and no Vercel/EAS. See
`deploy/RUNBOOK.md` for day-to-day commands.

## Systems of record

| Store | Role | Backup strategy |
|-------|------|-----------------|
| **PostgreSQL** (self-hosted container) | System of record (orders, payments, users, loyalty) | Nightly `pg_dump` to `/opt/restaurant/backups/`, 7-day retention (`deploy/scripts/backup-db.sh`, cron at 03:15 UTC) |
| **Redis** (self-hosted container) | Cache + BullMQ broker (NOT source of truth) | Best-effort RDB snapshot only |
| **Local uploads** (`/opt/restaurant/uploads`) | Menu + review images | Bind-mounted Docker volume on the VPS disk; **no offsite copy yet** (see "Required next steps") |

## Objectives

> ⚠️ Current reality: backups are a same-VPS nightly logical dump only. There
> is no point-in-time recovery and no offsite copy, so a VPS/disk loss today
> loses everything since the last nightly dump. The objectives below are the
> **target** state once offsite backups land.

- **RPO** (max data loss): ≤ 24 h with the current nightly dump; target ≤ 1 h
  once encrypted offsite backups + more frequent dumps are in place. (Managed
  PITR is **not** configured.)
- **RTO** (max downtime): ≤ 60 min to rebuild the stack and restore the latest
  dump on a fresh VPS.

## Routine backups

- **Postgres:** nightly `pg_dump` (`deploy/scripts/backup-db.sh`, cron 03:15
  UTC) writes `/opt/restaurant/backups/db-YYYYMMDD-HHMMSS.dump`, 7-day
  retention. Verify the cron emits a dump > 0 bytes and alert if it skips.
  These dumps live **on the same VPS** today — copy them offsite manually
  (`scp`) until automated offsite backups exist.
- **Uploads:** `/opt/restaurant/uploads` is on the VPS disk only. Copy offsite
  manually (`rsync`, see `deploy/RUNBOOK.md` → "Manage uploads") until an
  automated offsite job exists.
- **Redis:** snapshot is best-effort. A total Redis loss means: cold caches
  (self-heal) and **lost in-flight BullMQ jobs** — see "Redis loss" below.

## Required next steps (pre-launch, not yet done)

These are the §I4 actions still owed — do not treat them as in place:

- [ ] **Encrypted offsite database backups** (e.g. push the nightly dump to a
      separate provider/region with at-rest encryption) + a documented
      restore drill from the offsite copy.
- [ ] **Offsite copy of `/opt/restaurant/uploads`** (or migrate to versioned
      object storage).
- [ ] Monitoring on backup age (alert if the newest dump is > 24 h old) and
      disk usage.

## Restore drills (run quarterly)

The detailed, copy-paste restore procedure (drop/recreate DB, `pg_restore`)
lives in `deploy/RUNBOOK.md` → "Restore database from a backup". Drill it
against a scratch DB rather than production:

1. Provision a scratch Postgres (a throwaway container is fine).
2. Restore the latest `db-*.dump` into it with `pg_restore` (see the deploy
   runbook).
3. `pnpm --filter @repo/db migrate:deploy` (confirm schema head matches).
4. Boot the API against the scratch DB; run the e2e suite as a smoke check.
5. Record wall-clock restore time; if > RTO, escalate capacity.
6. Once offsite backups exist, drill the restore **from the offsite copy**, not
   just the local one.

## Failure scenarios

### Postgres loss
There is no managed replica and no PITR. Recovery is a restore from the latest
nightly dump:
1. Provision/recreate the Postgres container, restore the latest dump, replay
   migrations (`prisma migrate deploy`), and restart the API. Full procedure in
   `deploy/RUNBOOK.md`.
2. Everything since the last nightly dump is lost — minimise this by landing
   offsite + more frequent backups (see "Required next steps").
3. Reconcile payments: the **`reconciliation`** BullMQ queue (15-min repeat
   job) compares non-terminal local payments to Stripe and repairs status gaps;
   Stripe is the external source of truth for payment state. Never consider
   payment state restored from a Postgres dump alone — let reconciliation
   re-sync against Stripe.

### Redis loss
1. Caches self-rebuild — no action.
2. In-flight jobs (email/SMS/receipts) are lost. Re-enqueue critical
   ones: order-status notifications are reconstructable from
   `OrderStatusEvent`; receipts from `Order`. Idempotency keys live in Redis —
   a loss only weakens dedupe briefly; the DB unique constraints
   (`Idempotency`, `LoyaltyTransaction (accountId,orderId,kind)`,
   webhook event ids) still prevent double effects.
3. Repeatable schedulers re-register on next API boot (stable jobIds).

### VPS / total host loss
The whole stack (Caddy, web, admin, api, Postgres, Redis) runs on one Contabo
VPS, so a host loss is a full-stack rebuild:
1. Provision a new VPS, run `deploy/bootstrap.sh`, restore `.env` and the
   latest dump, `prisma migrate deploy`, bring the stack up, repoint DNS.
2. Restore `/opt/restaurant/uploads` from the offsite copy (once one exists).
3. Caddy re-issues Let's Encrypt certs automatically on first boot.

## Verification checklist (pre-launch)

- [ ] Nightly `backup-db.sh` cron green for 7 consecutive days
- [ ] One full restore drill completed within RTO
- [ ] `reconciliation` job verified to close a synthetic webhook gap
- [ ] **Encrypted offsite** DB backups configured + a restore drill from the
      offsite copy
- [ ] Offsite copy of `/opt/restaurant/uploads`
- [ ] Alerting on: backup skipped, backup age > 24 h, disk > 80%
