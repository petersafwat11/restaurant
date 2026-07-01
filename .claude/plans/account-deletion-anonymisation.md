# Slice 9 / Phase G2 — Account deletion & anonymisation

GDPR-grade verified account deletion + BullMQ anonymisation. Additive, reversible-until-execution.

## Decisions (advisor-confirmed)
- Schema: additive nullable fields on `User` + new Prisma enum `AccountDeletionStatus`
  (NONE | PENDING | CANCELLED | COMPLETED) — identical to the Zod enum.
- Reauth: BOTH paths. Password reauth → schedule immediately. Email single-use token
  (hashed via `hashToken`, stored on the user row, expiry) → `confirm` schedules.
- Endpoints (authenticated customer, NO `@Permissions` — customer role has none):
  `POST /account/deletion/request`, `POST /account/deletion/confirm`,
  `POST /account/deletion/cancel`, `GET /account/deletion`. `@RateLimit` on the 3 mutating ones.
- Grace period: 7 days (PROVISIONAL — owner/lawyer must confirm).
- Job: new `accountDeletion` queue + `account.anonymise` job, delayed to `deletionScheduledAt`,
  deterministic `jobId = anonymise:<userId>`. Processor re-reads user; NO-OP unless
  `status===PENDING && scheduledAt<=now`. Cancel just flips status → job no-ops.
- Anonymise (NOT delete) the User row (Review.userId is FK-restrict): email→`deleted-<id>@deleted.invalid`,
  phone→null, names/avatar cleared, isActive=false, status=COMPLETED, anonymisedAt set.
  Delete child rows explicitly: addresses, refreshTokens, pushTokens, notificationPreference,
  paymentMethods, carts. RETAIN orders/payments/refunds/receipts/audit (the Order already carries
  an immutable customer snapshot). Reviews/loyalty/referrals retention = lawyer matrix (commented).
- Pure helper `pseudonymiseUser()` (deterministic transform) + `__tests__`.
- i18n: create `pl|en/web/account-deletion.json`; register in `packages/i18n/src/messages.ts`
  (shared registry — necessary edit) under key `web.accountDeletion`. Identical key trees (parity test).

## Files
- types: `packages/types/src/account-deletion.ts` (+ index export)
- jobs: `packages/jobs/src/queues.ts` (+ QUEUE_ACCOUNT_DELETION, JOB_ACCOUNT_ANONYMISE),
  `packages/jobs/src/payloads.ts` (AccountAnonymisePayloadSchema)
- db: `packages/db/prisma/schema.prisma` (enum + User fields) + migration
  `20260627140000_add_account_deletion/migration.sql`
- api module: `apps/api/src/account-deletion/**` (module, controller, service, processor,
  pseudonymise.ts + __tests__, README runbook)
- `apps/api/src/app.module.ts` (register module), `apps/api/src/bullmq/bullmq.module.ts` (queue)
- api-client: `accountDeletion` group + register
- web: `apps/web/src/app/[locale]/(account)/account/delete/page.tsx` + `features/account/hooks/**`
- e2e: `apps/api/test/account-deletion.e2e-spec.ts`

## Verify
typecheck @repo/types, @repo/jobs, @repo/api-client; `db generate` then @repo/api typecheck.
No local Postgres/Redis → e2e written for CI only.

## Owner/lawyer decisions (surface, do not invent)
1. Retention matrix incl. reviews/loyalty/referrals for an anonymised account.
2. Grace-period length (default 7d).
3. Reauth policy: password vs email-token vs both (both implemented).
4. Phone-only users (no password, synthetic email) can't self-serve — manual privacy-email path.
