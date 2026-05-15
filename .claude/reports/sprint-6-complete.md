# Sprint 6 — Admin Core: KPIs + Orders — Completion Report

> Source: project plan §12 Sprint 6 · Plan: `.claude/plans/sprint-6.md`
> Completed: 2026-05-15 · Scope: backend + data layer, **NO UI**

## Status: ✅ Done — awaiting review

Every Sprint 6 surface (admin orders list w/ server-side filtering, order
detail drawer data, status-transition + refund flow, KDS advance, KPI overview)
now has a tested endpoint + typed hook. No UI written — page files remain
`return null` + `// TODO(ui):`. The lint board is **green again** (was red on
pre-existing Sprint 7/8 issues).

| Verification | Before | After |
|---|---|---|
| `pnpm typecheck` | 15/15 | **15/15** |
| `pnpm lint` | 3/4 (admin red) | **4/4** |
| `pnpm test` (unit) | api 37 · web 10 · admin 6 · utils 10 · auth 12 | admin **10** (+4); rest unchanged, all pass |
| `pnpm --filter @repo/api test:e2e` | 60 / 12 files | **67 / 14 files** (+orders-admin 4, +audit-orders 3) |
| `pnpm db:seed` | idempotent | idempotent (+`seedOrders`; reviews now attach) |

## Why most plumbing already existed

Sprints 5/7/8 + the pre-Sprint-6 hardening pre-built Sprint 6's hooks/realtime
(they knew it was coming). This sprint closed the **genuine remaining gaps**
flagged across those reports rather than rebuilding scaffolding.

## Per-phase summary

### Phase A — Shared types (`packages/types/src/order.ts`)
- `OrderListQuerySchema` extended with `restaurantId`, `type`, `from`, `to`,
  `search` (all optional; existing `status/cursor/limit` kept).
- Added `OrderCustomerSchema` + `OrderPaymentSchema` (Payment + nested
  `refunds[]`). `OrderSchema` gained **optional** `customer` / `payment`
  (additive — consistent with the locked additive-change rule). `order.ts` now
  imports `PaymentSchema`/`RefundSchema` (no cycle — `payment.ts` imports only
  zod).

### Phase B — Backend: admin orders list + detail enrichment
`apps/api/src/orders/orders.service.ts`:
- `list()` is now **dual-mode**: caller with `order:read` + `restaurantId` →
  restaurant-wide list filtered by status/type/`createdAt` range/search
  (`OR` over orderNumber + user first/last/email, `mode:'insensitive'`),
  cursor-paginated. Everyone else → unchanged own-orders path. Extracted a
  shared module-level `toListItem()` mapper (removes the duplicated row map).
- `getById()` enriches with `customer` + `payment{refunds}` when the caller has
  `order:read` (parallel `loadOrderCustomer` / `loadOrderPayment` — payment
  mapping mirrors `payments.service`'s `toPaymentDto`/`toRefundDto`). Self/owner
  view leaves both `null`. Ownership 404 scoping unchanged.

### Phase C — KDS advance hook
- `apps/admin/src/features/kitchen/hooks/use-advance-ticket.ts` (new):
  `useAdvanceKitchenTicket(restaurantId)` mutation + pure `nextKitchenStatus()`
  (`CONFIRMED→PREPARING→READY`, else `null`). Wraps the existing
  `POST /orders/:id/status` (state machine already permits kitchen role
  server-side — no API change). Invalidates kitchen feed + order detail keys.
  Exported from `kitchen/hooks/index.ts`.

### Phase D — Audit decorators (Sprint 6 write surface)
- `@AuditAction('order:create','order')` + `@AuditAction('order:status_changed',
  'order')` on `orders.controller.ts`; `@AuditAction('order:refund','payment')`
  on `payments.controller.ts` refund. The global `AuditInterceptor` (Sprint 8)
  already captures after-state from the `OrderDto`/`RefundDto` `id` — no
  interceptor change. Menu/promotion/staff audit stays deferred per plan.

### Phase E — Analytics rollup scheduler
- `apps/api/src/jobs/analytics.processor.ts` now implements `OnModuleInit`,
  injects `@InjectQueue(QUEUE_ANALYTICS)`, and registers two repeatable jobs at
  boot — `analytics.rollup-daily` (`0 * * * *`) and `analytics.rollup-finalize`
  (`0 2 * * *`, UTC) — mirroring `R2OrphanCleanupProcessor` exactly (BullMQ
  dedupes by name+cron). Closes Sprint 8 "Open decision #5". The `process()`
  handler + queue/module wiring already existed; analytics aggregation was
  **not** rewritten to read `DailyMetric` (on-demand fallback is correct;
  scheduler just populates the table for future optimization).

### Phase F — api-client + admin hooks + routes
- `packages/api-client`: no change — `orders.list` already forwards the parsed
  query record, so the extended schema flows through (verified by typecheck +
  e2e).
- `orders/hooks/use-admin-orders.ts` (new): `useAdminOrders` (query) +
  `useAdminOrdersInfinite` (cursor `useInfiniteQuery`) + `AdminOrderFilters`.
  `query-keys.ts`: `adminList` / `adminListInfinite` keys (kept distinct so the
  flat + infinite caches don't collide).
- `features/dashboard/hooks/use-dashboard-overview.ts` (new):
  `useDashboardOverview(restaurantId, period)` composite — ties
  `useAnalyticsOverview/RevenueTimeseries/TopItems/OrdersByStatus` + a
  recent-orders slice (`useAdminOrders` limit 10) into one shape with an
  aggregate `isLoading`/`error`. Mirrors Sprint 8's `useExportFlow` ergonomic
  pattern.
- Route placeholders (`(dashboard)/page.tsx`, `orders/page.tsx`,
  `orders/[id]/page.tsx`, `orders/kitchen/page.tsx`) confirmed already
  `return null` + `// TODO(ui):` — left untouched.

### Phase G — Seed (`packages/db/seed.ts`)
- `seedOrders(restaurantId)` — 8 orders for the test restaurant across
  status (PENDING/CONFIRMED/PREPARING/READY/DELIVERED/COMPLETED×2/CANCELLED) ×
  type (PICKUP/DELIVERY/DINE_IN), spread over the last ~10 days, each with an
  `OrderItem`, a full `OrderStatusEvent` trail, and a `Payment` for confirmed+
  orders (one DELIVERED order gets a partial `Refund`). Idempotent (skips when
  the restaurant already has orders — verified: back-to-back re-seed prints
  "Skipping orders — 8 already present"). Runs before `seedReviews()`, which
  now attaches 3 reviews to the completed/delivered orders (previously skipped
  — "no completed orders yet").

### Phase H — Tests
- e2e `orders-admin.e2e-spec.ts` (4): staff-vs-customer scoping (+ customer
  can't escalate via `restaurantId`); filter by type & search; cursor
  pagination; detail enrichment present for staff / `null` for self.
- e2e `audit-orders.e2e-spec.ts` (3): `order:create` logged for an authed
  order placement; `order:refund` logged on refund (both poll the async
  `audit.write` queue ≤3s); non-`audit:read` caller gets 403.
- unit `use-advance-ticket.test.ts` (3): `nextKitchenStatus` mapping; mutation
  POSTs the computed `to`; no-next-step errors without an API call.
- unit `use-dashboard-overview.test.ts` (1): composite shape with MSW-stubbed
  analytics + orders endpoints.

## Decisions applied (from plan §Defaults)

| # | Default | Applied |
|---|---------|---------|
| 1 | `GET /orders` dual-mode, no new endpoint | `OrdersService.list` branches on `order:read` + `restaurantId` |
| 2 | Admin detail = additive optional `customer`/`payment` | `OrderSchema` optional fields, populated only for `order:read` |
| 3 | Audit only Sprint 6 write surface | `order:create/status_changed/refund` only |
| 4 | Scheduler mirrors R2 processor; no DailyMetric read rewrite | `analytics.processor` `OnModuleInit` repeatable jobs |
| 5 | Search = case-insensitive contains; date range inclusive UTC | Prisma `OR` + `createdAt gte/lte` |
| 6 | No new permission keys | All required keys already existed + role-mapped |
| 7 | Green lint via Biome safe fixes | Fixed pre-existing `notify.ts`/`reports/hooks` + formatted new files |

## Open decisions for review

None blocking. For awareness:
1. **Refund audit `resourceType` is `payment`** (the refund response is a
   `RefundDto`, so the interceptor records the refund id under `payment`, not
   the order). Acceptable + documented; revisit if the audit UI wants order-keyed
   refund rows.
2. **`order:create` audit only fires for authed placements.** Guest orders
   (`@Public`, no `req.user`) are skipped by the interceptor by design — guest
   checkout isn't an admin write. Cashier-placed orders are captured.
3. **Analytics still aggregates on-demand.** The rollup scheduler now populates
   `DailyMetric`, but reads were intentionally **not** repointed at it
   (optimization, out of Sprint 6 scope; Sprint 8 deferred only the bootstrap).
   Flag for a future perf pass if historical queries get slow.

## Test count delta

| Suite | Before | After | Δ |
|---|---|---|---|
| API e2e | 60 / 12 files | **67 / 14 files** | +4 orders-admin, +3 audit-orders |
| Admin unit | 6 | **10** | +3 advance-ticket, +1 dashboard-overview |
| typecheck / lint | 15/15 · 3/4 | 15/15 · **4/4** | lint board greened |

## Files created / modified

**Created**
- `packages/db` — (seed.ts modified; no new files)
- `apps/api/test/orders-admin.e2e-spec.ts`, `apps/api/test/audit-orders.e2e-spec.ts`
- `apps/admin/src/features/orders/hooks/use-admin-orders.ts`
- `apps/admin/src/features/kitchen/hooks/use-advance-ticket.ts`
- `apps/admin/src/features/dashboard/hooks/use-dashboard-overview.ts`
- `apps/admin/src/features/dashboard/hooks/index.ts`
- `apps/admin/src/features/kitchen/hooks/__tests__/use-advance-ticket.test.ts`
- `apps/admin/src/features/dashboard/hooks/__tests__/use-dashboard-overview.test.ts`
- `.claude/plans/sprint-6.md`, `.claude/reports/sprint-6-complete.md`

**Modified**
- `packages/types/src/order.ts`
- `apps/api/src/orders/orders.service.ts`, `orders/orders.controller.ts`
- `apps/api/src/payments/payments.controller.ts`
- `apps/api/src/jobs/analytics.processor.ts`
- `apps/admin/src/features/orders/hooks/index.ts`, `orders/query-keys.ts`
- `apps/admin/src/features/kitchen/hooks/index.ts`
- `apps/admin/src/lib/notify.ts`, `apps/admin/src/features/reports/hooks/index.ts`
  (pre-existing Sprint 7/8 lint fix)
- `packages/db/seed.ts`

## Bring-up notes

No Docker in the container. Brought up natively (record for repro):
```bash
cp .env.example .env
useradd -m pg && chown pg:pg /tmp/pgdata           # PG refuses to run as root
su pg -c '/usr/lib/postgresql/16/bin/initdb -D /tmp/pgdata -U postgres --auth=trust'
su pg -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -l /tmp/pg.log \
  -o '-k /tmp -p 5432 -c listen_addresses=127.0.0.1' start"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c 'CREATE DATABASE restaurant;'
redis-server --daemonize yes --port 6379
pnpm --filter @repo/db generate
pnpm --filter @repo/db migrate:deploy   # 7 migrations
pnpm db:seed                            # now includes seedOrders + 3 reviews
```
- New seed data: 8 orders (mixed status/type, last 10 days) + 6 payments + 1
  partial refund + 3 reviews on the test restaurant. No new env vars, no new
  migrations (no schema change this sprint).

## What to know before the next sprint

- **`GET /orders` is dual-mode.** Staff list = `?restaurantId=…` + `order:read`;
  customer list = no `restaurantId`. The admin orders/overview UI consumes
  `useAdminOrders` / `useAdminOrdersInfinite` / `useDashboardOverview`; KDS uses
  `useKitchenFeed` + `useAdvanceKitchenTicket`. Every Sprint 6 screen has a
  typed hook + tested endpoint — UI sprint can build directly on these.
- **Audit is now live on order/payment writes.** The interceptor was global but
  silent until this sprint. Extending `@AuditAction` to menu/promotion/staff
  remains the deferred mechanical pass (Sprint 7/8 surface).
- **Analytics rollup is scheduled.** `DailyMetric` will populate hourly +
  finalize nightly. If you change Postgres isolation or the cron, re-verify.
