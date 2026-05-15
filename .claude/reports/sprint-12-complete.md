# Sprint 12 — Hardening + Launch — Completion Report

**Date:** 2026-05-15
**Scope:** Sentry (API + scrubbing), PostHog product analytics (typed
catalog + server capture), feature flags (catalog + evaluator + admin +
guard + soft-launch), k6 load scripts, backup/DR + soft-launch runbooks,
pen-test checklist + automated hardening suite. Backend + frontend **data
layer** + ops artifacts. **NO UI** (client Sentry/PostHog instrumentation
explicitly deferred — see Open decisions). Final master-plan sprint.

---

## Summary

Delivered. 3 new shared packages (`@repo/observability`, `@repo/analytics`,
`@repo/feature-flags`), 1 new migration (`add_sprint_12_tables` →
`FeatureFlag`), Sentry init + PII-scrubbing wired into bootstrap + the global
exception filter, a global `AnalyticsProductService` capturing 5 backend
events, a global feature-flag module (`GET /feature-flags`, admin CRUD,
route guard), new `flags:write` permission, frontend feature-flag hooks,
k6 scripts, backup scripts + runbooks, a pen-test checklist with 2 tracked
findings, and 2 new e2e specs.

Pipeline: **typecheck 32/32 · lint 32/32 · unit suites all green**
(observability 3 · analytics 4 · feature-flags 6 · api 43 · web 10 ·
admin 10 · i18n 9 · utils 27 · auth-core 12). e2e specs written, not
executed here — see "Environment / verification".

---

## Files created / modified

### New packages
- **`packages/observability/`** — `initNodeSentry` (no-op when DSN empty),
  `captureException`/`flushSentry`, `beforeSend` PII scrub (auth headers,
  bodies, cookies, card/secret keys) + 3 unit tests
- **`packages/analytics/`** — typed `ANALYTICS_EVENT_SCHEMAS` catalog,
  `createAnalytics` server client (no-op when key empty, always validates
  payloads) + 4 unit tests
- **`packages/feature-flags/`** — `FLAG_CATALOG`, `evaluateFlag/evaluateAll`
  (env override → DB row + sticky % rollout → default),
  `parseEnvOverrides`, `rolloutBucket` + 6 unit tests

### `packages/db/`
- `prisma/schema.prisma` — new `FeatureFlag` model
- **NEW** `prisma/migrations/20260515140000_add_sprint_12_tables/migration.sql`
- `seed.ts` — `seedFeatureFlags` (FLAG_CATALOG mirror) + `flags:write`
  permission mirror

### `packages/types/` · `packages/api-client/`
- **NEW** `src/feature-flag.ts` (resolved map, admin DTO, update DTO)
- `src/permissions.ts` — `flags:write` (owner + manager)
- `src/index.ts` — re-export
- `api-client/src/client.ts` — `featureFlags.resolved/listAdmin/update`

### `apps/api/`
- `package.json` — `@repo/observability`, `@repo/analytics`,
  `@repo/feature-flags`
- `src/config/env.ts` — `SENTRY_DSN/ENV/TRACES_SAMPLE_RATE`,
  `POSTHOG_KEY/HOST`, `FEATURE_FLAG_OVERRIDES` (all optional, empty → no-op)
- `src/main.ts` — `initNodeSentry` before bootstrap
- `src/common/filters/http-exception.filter.ts` — Sentry capture for
  5xx/non-HTTP only
- **NEW** `src/analytics-product/` (@Global service: `order.created`→
  order_placed, `order.status_changed`→payment_succeeded; safe `capture`)
- **NEW** `src/feature-flags/` (service, controller, `@FeatureFlag` +
  `FeatureFlagGuard`, @Global module)
- `src/auth/auth.service.ts` — `signup` capture
- `src/referrals/referrals.service.ts` — `referral_completed` capture
- `src/orders/orders.service.ts` — `loyalty_redeemed` capture
- `src/app.module.ts` — AnalyticsProduct + FeatureFlags modules
- `test/setup-e2e.ts` — `flags:write` mirror + `featureFlag` cleanup
- **NEW** `test/feature-flags.e2e-spec.ts`, `test/security-hardening.e2e-spec.ts`

### `apps/web/` · `apps/admin/` · `apps/mobile/`
- **NEW** `features/feature-flags/hooks` (`useFeatureFlags`,
  `useFeatureFlag`; admin adds `useAdminFeatureFlags`/`useUpdateFeatureFlag`)

### Ops / docs
- **NEW** `load/order-flow.js`, `load/auth-flow.js`, `load/README.md`
- **NEW** `scripts/backup/pg-backup.sh`, `pg-restore.sh`,
  `redis-snapshot.sh` (executable)
- **NEW** `docs/runbooks/backup-dr.md`, `docs/runbooks/soft-launch.md`,
  `docs/security/pentest-checklist.md`

---

## Environment / verification

Same constraint as Sprints 9–11 — **no Postgres / Redis** in this container.

```
pnpm typecheck      ✓ 32/32
pnpm lint           ✓ 32/32
pnpm test (unit)    ✓ observability 3 · analytics 4 · feature-flags 6 ·
                       api 43 · web 10 · admin 10 · i18n 9 · utils 27 ·
                       auth-core 12
prisma validate     ✓ schema valid (dummy DATABASE_URL)
prisma generate     ✓ client regenerated
```

Written + committed for a DB-enabled run: `feature-flags.e2e-spec.ts`,
`security-hardening.e2e-spec.ts`. Migration SQL hand-authored to match the
existing convention. Sentry/PostHog are no-op without creds, so the suites
run credential-free.

---

## Decisions Applied (from plan §DEFAULTS)

| # | Default | How implemented |
|---|---------|-----------------|
| 9 | Sentry | `@repo/observability` no-op-safe Node init; bootstrap init + filter capture (5xx/unhandled only); `beforeSend` scrubs PII. Client error-boundary UI deferred (Open #1) |
| 10 | PostHog | `@repo/analytics` typed catalog + server client (no-op when key empty); 5 backend events captured via the event bus / service calls. Frontend autocapture deferred (Open #1) |
| 11 | Feature flags | `@repo/feature-flags` catalog + evaluator (env → DB+rollout → default); `GET /feature-flags`, admin CRUD under `flags:write`, `@FeatureFlag` guard; `useFeatureFlag` hooks |
| 12 | Hardening artifacts | k6 scripts + README, backup/restore/redis scripts, backup-DR + soft-launch runbooks, pen-test checklist + `security-hardening.e2e-spec.ts` |
| 13 | Additive migration only | one new migration; none altered |

---

## Open decisions for review

1. **Client Sentry / PostHog instrumentation deferred to the UI sprint.**
   Wiring `@sentry/nextjs`, `@sentry/react-native`, `posthog-js` is a
   runtime/UI concern and would pull browser bundles into a no-UI sprint.
   The **server** side (error capture + scrubbing + the typed event
   catalog + env wiring) is delivered now; the UI sprint only needs to add
   the client init using the same env vars. Frontends got the
   feature-flag data hooks (no heavy dep).
2. **Two pen-test findings are tracked, not auto-fixed**
   (`docs/security/pentest-checklist.md`):
   - **A8 (HIGH):** no brute-force rate limit on `/auth/login|otp|
     forgot-password`. Recommended fix: Redis fixed-window limiter reusing
     the existing contact-module pattern. Not applied under this sprint's
     gate to avoid destabilizing the auth e2e suite without a DB to verify
     against here — flagged as a pre-launch blocker.
   - **D4 (MEDIUM):** no `@fastify/helmet`. Recommended: add with CSP
     report-only first.
   All other checklist items are verified in code and locked by
   `security-hardening.e2e-spec.ts`.
3. **`payment_succeeded`** is captured off `order.status_changed → CONFIRMED`
   (the clean server-side "paid" signal for both Stripe-webhook and COD
   paths) rather than adding a new payment event emission.

---

## Known gaps / deferred items

- Client-side Sentry/PostHog init + React error boundaries (Open #1).
- Auth rate limiting + security headers (Open #2 — tracked findings).
- k6 runs are not in per-PR CI (need staging + seed) — gate them in the
  pre-launch checklist (`load/README.md`).
- e2e specs unexecuted here (no DB) — see "Environment".

---

## Bring-up notes

- **New migration:** `20260515140000_add_sprint_12_tables`. Run
  `pnpm db:migrate:deploy` then `pnpm db:generate`.
- **New seed:** `seedFeatureFlags` upserts the catalog (idempotent;
  `loyalty.redemption`/`referral.program` on, rest off).
- **New permission:** `flags:write` (owner + manager). Re-run `pnpm db:seed`.
- **New env (all optional, empty → no-op):** `SENTRY_DSN`, `SENTRY_ENV`,
  `SENTRY_TRACES_SAMPLE_RATE`, `POSTHOG_KEY`, `POSTHOG_HOST`,
  `FEATURE_FLAG_OVERRIDES` (`key=on,key2=off`).
- **New endpoints:** `GET /feature-flags`, `GET /admin/feature-flags`,
  `PATCH /admin/feature-flags/:key`. Confirm in Swagger `/api/v1/docs`.
- **Ops:** `load/` (k6), `scripts/backup/*.sh`, `docs/runbooks/*`,
  `docs/security/pentest-checklist.md`.

## Project status

Master-plan Sprints **0–12 complete** (backend + data layer; UI is the
separate later phase). Pre-launch blockers carried forward: pen-test
finding **A8** (auth rate limiting). The Sprint 3–8 concurrency/multi-tenant
hardening backlog and the client-instrumentation/UI work remain for the UI
phase.
