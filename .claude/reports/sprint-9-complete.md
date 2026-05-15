# Sprint 9 — Mobile Polish + Push — Completion Report

**Date:** 2026-05-15
**Scope:** Push/notifications integration, in-app feed, notification
preferences, deep links, repeatable-job scheduler bootstrap, order-tracking
snapshot, read-only loyalty, review photo upload, offline cart. Backend +
frontend data layer. **NO UI** (pages return `null` + `// TODO(ui):`).

---

## Summary

Delivered. 1 new migration, 2 new NestJS modules (`loyalty`, `scheduler`),
`notifications` upgraded from dispatch-only to a full controller+service,
3 new shared-type files, deep-link util, ETA util, push-token lifecycle
(inline `DeviceNotRegistered` pruning + daily sweep), preference-gated
dispatcher, review images end-to-end, mobile/web data hooks, route
placeholders, additive seed, 10 new unit tests, 4 new e2e specs.

Pipeline: **typecheck 15/15 · lint 4/4 · unit suites all green** (api
38→43, utils 10→15). e2e specs written but not executed here — see
"Environment / verification".

---

## Files created / modified

### `packages/db/`
- `prisma/schema.prisma` — `PushToken.lastUsedAt` + `@@index([userId])`;
  new `NotificationPreference`; new `ReviewImage`; `Review.images` relation;
  `User.notificationPreference` relation.
- **NEW** `prisma/migrations/20260515110000_add_sprint_9_tables/migration.sql`
- `seed.ts` — `seedLoyalty`, `seedNotifications` (+ default preference),
  `seedReviewImages` (guarded), wired into `main()`.

### `packages/types/`
- **NEW** `src/notification.ts`, `src/loyalty.ts`
- `src/review.ts` — `ReviewImageDto`, `MAX_REVIEW_IMAGES`, `images` on
  `ReviewDto`, `imageKeys` on `CreateReviewSchema`
- `src/upload.ts` — `review-image` kind
- `src/order.ts` — `GeoPointDto`, `OrderTrackingDto`
- `src/index.ts` — re-exports

### `packages/utils/`
- **NEW** `src/deep-link.ts` (+ `src/deep-link.test.ts`, 5 tests) — re-export

### `packages/jobs/`
- `src/queues.ts` — `JOB_PUSH_TOKEN_CLEANUP`
- `src/payloads.ts` — `PushTokenCleanupPayloadSchema`

### `packages/api-client/`
- `src/client.ts` — `notifications.*`, `loyalty.*`, `orders.getTracking`,
  new type imports + return-object wiring

### `apps/api/`
- **NEW** `src/loyalty/` — module, controller, service (read-only)
- **NEW** `src/scheduler/` — module + `SchedulerService`
  (`OnApplicationBootstrap` repeatable-job registration)
- **NEW** `src/notifications/notifications.controller.ts`,
  `notifications.service.ts`
- `src/notifications/notifications.module.ts` — controller + service
- `src/notifications/notification-dispatcher.service.ts` — preference gating
- **NEW** `src/orders/order-tracking.ts` (ETA helper) +
  `src/orders/__tests__/order-tracking.spec.ts` (5 tests)
- `src/orders/orders.service.ts` — `getTracking()` + `parseGeoPoint`
- `src/orders/orders.controller.ts` — `GET /orders/:id/tracking`
- `src/reviews/reviews.service.ts` — image keys → `ReviewImage`, DTO images
- `src/reviews/reviews.module.ts` — imports `UploadsModule`
- `src/uploads/uploads.service.ts` — `review-image` prefix
- `src/jobs/push.processor.ts` — deep-link payload, ticket reconciliation
  (prune dead tokens, bump `lastUsedAt`), cleanup-job branch
- `src/app.module.ts` — `LoyaltyModule`, `SchedulerModule`
- **NEW** `test/notifications.e2e-spec.ts`, `test/loyalty.e2e-spec.ts`,
  `test/order-tracking.e2e-spec.ts`, `test/reviews.e2e-spec.ts`

### `apps/mobile/`
- **NEW** `src/features/notifications/hooks/index.ts` (8 hooks incl.
  `useRegisterPushToken`), `src/features/loyalty/hooks/index.ts`
- **NEW** `src/features/orders/hooks/use-order-tracking-snapshot.ts`
  (exported from index)
- **NEW** `src/features/cart/hooks/use-cart-sync.ts` (exported from index)
- `src/stores/cart-store.ts` — offline cart snapshot persistence
- **NEW** `app/notifications.tsx`, `app/account/loyalty.tsx`,
  `app/account/notifications.tsx` (all `null` + TODO)

### `apps/web/`
- **NEW** `src/features/notifications/hooks/index.ts`,
  `src/features/loyalty/hooks/index.ts`
- **NEW** `(account)/loyalty/page.tsx`, `(account)/notifications/page.tsx`

---

## Environment / verification

This container has **no Postgres and no Redis**. Executable gates were run
and pass:

```
pnpm typecheck      ✓ 15/15
pnpm lint           ✓ 4/4
pnpm test (unit)    ✓ api 43 · utils 15 · auth-core 12 · web 10 · admin 10 · mobile 0
prisma validate     ✓ schema valid (with dummy DATABASE_URL)
prisma generate     ✓ client regenerated
```

Not runnable here (require DB+Redis), written + committed for a DB-enabled
run: `test/notifications.e2e-spec.ts`, `test/loyalty.e2e-spec.ts`,
`test/order-tracking.e2e-spec.ts`, `test/reviews.e2e-spec.ts`. The migration
SQL is hand-authored to match the existing `prisma/migrations/*` pattern
(same approach Sprints 7 & 8 used).

---

## Decisions Applied (from plan §DEFAULTS)

| # | Default | How implemented |
|---|---------|-----------------|
| 1 | Notification preferences | `NotificationPreference` (1/user, lazy); in-app always written; dispatcher gates email/sms/push; missing row → defaults |
| 2 | Deep links | `@repo/utils/deep-link.ts`, scheme from `APP_DEEP_LINK_SCHEME`; push `data.url` = `restaurant://orders/{id}` |
| 3 | Push token lifecycle | idempotent upsert by unique token; inline prune on Expo `DeviceNotRegistered`; daily `push.token-cleanup` (>60d) |
| 4 | Scheduler bootstrap | `SchedulerService` `OnApplicationBootstrap`; stable jobIds; push-cleanup + analytics rollup hourly/nightly + reports cleanup. **Deviation:** reservation no-show sweep NOT wired — see Open decisions |
| 5 | Order tracking snapshot | `GET /orders/:id/tracking`, deterministic ETA helper anchored to last status event |
| 6 | Review photos | `imageKeys` (≤5) via existing presign; `review-image` kind; `ReviewImage` rows; images in DTOs |
| 7 | Loyalty read-only | `GET /loyalty/me` (+ lazy bronze account) + `/me/history` cursor; no earn/redeem |
| 8 | Offline cart | cart store persists snapshot to SecureStore + hydrates it; `useCartSync(restaurantId, isOnline)` data hook |
| 12 | Additive migrations only | one new migration; no existing migration touched |

---

## Open decisions for review

1. **Reservation no-show sweep still deferred.** Plan default #4 mentioned
   it, but reservations has no BullMQ queue/processor — wiring one is a
   separate concern and not core to push integration. `SchedulerService`
   registers push/analytics/reports repeatables only. Recommended follow-up:
   a dedicated `reservations` queue + processor, then add the repeatable.
2. **Promo/loyalty push broadcast** (admin-initiated) intentionally **not**
   built — it is not in master-plan Sprint 9 scope. The preference model
   (`promotionsPush`/`promotionsEmail`) is in place so Sprint 11 can ship it
   without a migration.
3. **`reviews.e2e-spec.ts` is new** (none existed pre-Sprint-9). It covers
   own/completed-only, no double review, image attach, 2-URL auto-hide, admin
   toggle.

---

## Known gaps / deferred items

- Reservation no-show sweep scheduling (see Open #1).
- Dynamic OG image rendering — Sprint 10 / UI concern, not Sprint 9.
- Push delivery **receipts** (Expo's second-phase `getPushNotificationReceiptsAsync`)
  are not polled; we act on send-time **tickets** only. The daily stale-token
  sweep is the backstop. Receipt polling is a future hardening item.
- e2e specs unexecuted in this environment (no DB) — see "Environment".

---

## Bring-up notes

- **New migration:** `20260515110000_add_sprint_9_tables`. Run
  `pnpm db:migrate:deploy` then `pnpm db:generate`.
- **New seed:** loyalty account (silver, 120 pts) + ledger, 3 notifications
  + default preference, sample review image — all for `customer@local.test`,
  idempotent/guarded.
- **New env:** none. `APP_DEEP_LINK_SCHEME` already existed (default
  `restaurant`). Optional `DISABLE_SCHEDULERS=1` to skip repeatable-job
  registration (useful for one-off CLI/test runs).
- **New endpoints:** `/notifications` (feed, unread-count, read, read-all,
  push-tokens, preferences), `/loyalty/me` + `/loyalty/me/history`,
  `/orders/:id/tracking`. Confirm in Swagger `/api/v1/docs`.

## What to know before Sprint 10

- `SchedulerService` now owns repeatable-job registration. If you add a
  repeatable, register it there with a stable `jobId` (idempotent on reboot).
- Dispatcher is preference-aware. Any new notification category should add a
  matching pair of preference columns + extend `NotificationPreferenceSchema`.
- Push payloads now carry `data.url`; the UI sprint wires Expo router deep
  linking off `APP_DEEP_LINK_SCHEME`.
