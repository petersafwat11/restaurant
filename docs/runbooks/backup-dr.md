# Runbook: Backup & Disaster Recovery

## Systems of record

| Store | Role | Backup strategy |
|-------|------|-----------------|
| **PostgreSQL** | System of record (orders, payments, users, loyalty) | Managed PITR + nightly logical dump (`scripts/backup/pg-backup.sh`) |
| **Redis** | Cache + BullMQ broker (NOT source of truth) | Convenience RDB snapshot (`scripts/backup/redis-snapshot.sh`) |
| **R2 / object storage** | Menu + review images | Provider versioning + lifecycle (no app-side dump) |

## Objectives

- **RPO** (max data loss): ≤ 5 min — rely on managed Postgres
  point-in-time recovery; the nightly logical dump is the offsite fallback.
- **RTO** (max downtime): ≤ 60 min for full region restore.

## Routine backups

- **Postgres:** managed automated PITR (provider) **plus** a nightly
  `pg-backup.sh` to offsite storage, 7-day retention. Verify the cron emits a
  dump > 0 bytes and alert if it skips.
- **Redis:** snapshot is best-effort. A total Redis loss means: cold caches
  (self-heal) and **lost in-flight BullMQ jobs** — see "Redis loss" below.

## Restore drills (run quarterly)

1. Provision a scratch Postgres.
2. `DATABASE_URL=<scratch> ./scripts/backup/pg-restore.sh <latest>.dump`
3. `pnpm --filter @repo/db migrate:deploy` (confirm schema head matches).
4. Boot the API against the scratch DB; run the e2e suite as a smoke check.
5. Record wall-clock restore time; if > RTO, escalate capacity.

## Failure scenarios

### Postgres primary loss
1. Fail over to the managed replica (provider console / `pg` failover).
2. If no replica: provision new instance, restore latest dump, replay
   migrations, repoint `DATABASE_URL`, redeploy API.
3. Reconcile payments: run the `payment-reconcile` job to close webhook gaps
   (Stripe is the external source of truth for payment state).

### Redis loss
1. Caches self-rebuild — no action.
2. In-flight jobs (email/SMS/push/receipts) are lost. Re-enqueue critical
   ones: order-status notifications are reconstructable from
   `OrderStatusEvent`; receipts from `Order`. Idempotency keys live in Redis —
   a loss only weakens dedupe briefly; the DB unique constraints
   (`Idempotency`, `LoyaltyTransaction (accountId,orderId,kind)`,
   webhook event ids) still prevent double effects.
3. Repeatable schedulers re-register on next API boot (stable jobIds).

### Region outage
1. Restore Postgres in the standby region from PITR/dump.
2. Redeploy API (Docker image) + repoint DNS.
3. Web/admin (Vercel) and mobile (EAS) are region-agnostic — only the API +
   DB need failover.

## Verification checklist (pre-launch)

- [ ] Nightly `pg-backup.sh` cron green for 7 consecutive days
- [ ] One full restore drill completed within RTO
- [ ] `payment-reconcile` job verified to close a synthetic webhook gap
- [ ] Alerting on: backup skipped, replica lag, disk > 80%
