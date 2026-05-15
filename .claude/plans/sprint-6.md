# Sprint 6 — Admin Core: KPIs + Orders — Plan (NO UI)

> Project plan §12 Sprint 6 scope: Overview page (KPI cards, revenue chart, top
> items, recent orders) · Orders list with server-side filtering · Order detail
> drawer · Status-transition UI · Refund flow · Kitchen Display (KDS).
>
> Process: same as every prior sprint — **no UI**. Page files stay `return null`
> + `// TODO(ui):`. Deliver backend endpoints + shared Zod types + api-client +
> admin hooks/query-keys + seed + tests + report. Single stop gate after the
> report.

## Context snapshot (verified against the codebase, 2026-05-15)

Most of Sprint 6's *plumbing* was pre-built by Sprints 5/7/8 + the pre-Sprint-6
hardening (they knew Sprint 6 would consume it). The genuine remaining gaps:

| # | Gap | Evidence |
|---|-----|----------|
| 1 | **No admin/staff orders list.** `OrdersService.list()` throws if no `userId` and filters `where:{userId}`. `OrderListQuerySchema` only has `status,cursor,limit`. No `restaurantId/type/from/to/search`. | `apps/api/src/orders/orders.service.ts:389-430`, `packages/types/src/order.ts:135-140` |
| 2 | **Order detail not admin-complete.** `OrderDto` has items + statusEvents but no `customer` and no `payment` block — the detail drawer needs both. | `packages/types/src/order.ts:77-109`, `orders.service.ts:432-449` |
| 3 | **KDS has no "advance ticket" hook.** `POST /orders/:id/status` + state machine already allow kitchen transitions; only an ergonomic admin hook is missing. | `apps/admin/src/features/kitchen/hooks/use-kitchen-feed.ts` (read-only) |
| 4 | **Analytics rollup never scheduled.** `AnalyticsService.rollupDay()` + `AnalyticsProcessor` exist but no repeatable BullMQ job feeds them — Sprint 8 explicitly deferred bootstrap. Overview KPI page is Sprint 6's headline. | Sprint 7-8 report "Open decisions #5"; only `repeat:` in src is `r2-orphan-cleanup.processor.ts` |
| 5 | **Zero `@AuditAction` decorators.** Sprint 8 left "apply to order status_changed / refund" as the mechanical pass for the orders sprint. | grep `@AuditAction` in `apps/api/src` → none |
| 6 | **No overview composite / recent-orders / admin-orders hooks.** Analytics hooks exist; "recent orders" + filtered admin list + a `useDashboardOverview` composite (mirrors Sprint 8's `useExportFlow`) do not. | `apps/admin/src/features/{orders,analytics}/hooks` |
| 7 | **`pnpm lint` is red.** Pre-existing Sprint 7/8 errors block the board: `apps/admin/src/lib/notify.ts:9` (suppressions/unused) + `apps/admin/src/features/reports/hooks/index.ts` (organizeImports + format). | `pnpm lint` baseline |

Locked decisions respected (from prior reports): hand-rolled `JwtAuthGuard`;
Vitest+`unplugin-swc` e2e; additive realtime/DTO changes only; money on the wire
= fixed-point strings; `OrderListItemDto` already carries `type/customerName/
itemCount/restaurantId`; cursor pagination for growable lists; Biome lint still
skipped on `apps/api`; new migrations only (none needed this sprint — no schema
change).

Baseline verification (this environment — native PG16 as user `pg` + redis):
typecheck **15/15**, unit **api 37 / web 10 / admin 6**, e2e **60/60**,
lint **3/4** (admin red, pre-existing).

## Defaults — applied automatically (noted in report)

1. `GET /orders` stays **dual-mode**: customer-scoped (existing) when caller
   lacks `order:read`; admin filtered list when caller has `order:read` **and**
   passes `restaurantId`. No new endpoint, no breaking change.
2. Admin order detail = **additive optional** `customer` + `payment` fields on
   `OrderSchema`, populated only when caller has `order:read` (consistent with
   the additive-change rule). Customer self-view leaves them `null`.
3. Audit decorators this sprint cover **only Sprint 6's write surface**:
   `order:create`, `order:status_changed`, `order:refund`. Menu/promotion/staff
   audit stays deferred.
4. Rollup scheduler mirrors the `R2OrphanCleanupProcessor` pattern exactly
   (`onModuleInit` → `queue.add(job,{},{repeat:{pattern,tz}})`, BullMQ dedupes).
   `analytics.rollup-daily` hourly; `analytics.rollup-finalize` 02:00 UTC.
   Analytics aggregation itself is **not** rewritten to read `DailyMetric` —
   on-demand fallback is correct; scheduler just populates the table.
5. Search filter = case-insensitive contains on `orderNumber` OR customer
   name/email. Date range = `from`/`to` ISO datetime, inclusive, UTC stored.
6. New shared types are additive; no permission keys added (all needed keys —
   `order:read/status_update/refund`, `kitchen:read`, `analytics:read`,
   `audit:read` — already exist + are role-mapped).
7. Lint board greened by applying Biome's safe fixes to the two pre-existing
   Sprint 7/8 files only — no behavior change, no unrelated reformat.

## Phase 0 — Environment bring-up (done before planning; documented for repro)

No Docker in this container. Brought up natively: `.env` from `.env.example`;
PG16 via `initdb`/`pg_ctl` run as unprivileged user `pg` (PG refuses root) on
`127.0.0.1:5432`, db `restaurant`; `redis-server --daemonize`; `migrate:deploy`
(7 migrations) + `db:seed`. Will be recorded in the report's bring-up notes.

## Phase A — Shared types (`packages/types/src/order.ts`)

- Extend `OrderListQuerySchema`: add `restaurantId?`, `type?` (enum), `from?`
  (`z.string().datetime()`), `to?`, `search?` (string, max 100). Keep existing
  `status/cursor/limit`. Re-infer `OrderListQuery`.
- Add `OrderCustomerSchema` (`id,name,email,phone`) and reuse existing
  `PaymentDto`/`RefundDto` from `payment.ts`. Add **optional** `customer`
  (`.nullable().optional()`) and `payment` (`.nullable().optional()`) to
  `OrderSchema`. Re-infer `OrderDto`.
- No `index.ts` change needed (order.ts already re-exported). `pnpm --filter
  @repo/types typecheck`.

## Phase B — Backend: admin orders list + detail enrichment

`apps/api/src/orders/orders.service.ts`:
- `list(actor, query)`: if `actor.permissions.includes('order:read')` &&
  `query.restaurantId` → **admin branch**: `where` built from
  restaurantId/status/type/createdAt range/search (OR on orderNumber +
  user.firstName/lastName/email, `mode:'insensitive'`), keep cursor+limit+
  `createdAt desc`, map to `OrderListItemDto` (already wired). Else → existing
  customer branch unchanged.
- `getById`: when caller has `order:read` (not owner), include `user` +
  `payment{refunds}`; map into the new optional `customer`/`payment` DTO fields.
  Owner/self path unchanged (fields stay `null`).
- `orders.controller.ts`: no signature change (already passes `permissions`);
  add `@AuditAction` in Phase D.

## Phase C — KDS advance hook + kitchen wiring

- Backend already complete (`POST /orders/:id/status`, state machine permits
  `kitchen` CONFIRMED→PREPARING→READY). No API change.
- `apps/admin/src/features/kitchen/hooks/use-advance-ticket.ts` (new):
  `useAdvanceKitchenTicket(orderId)` — mutation wrapping
  `orders.updateStatus`, computes the next KDS status
  (`CONFIRMED→PREPARING→READY`), invalidates kitchen + order query keys.
  Export from `kitchen/hooks/index.ts`.

## Phase D — Audit decorators (Sprint 6 write surface)

- `orders.controller.ts`: `@AuditAction('order:create','order')` on `create`;
  `@AuditAction('order:status_changed','order')` on `updateStatus`.
- `payments.controller.ts`: `@AuditAction('order:refund','payment')` on refund.
- Interceptor is already global (Sprint 8) + captures after-state from the
  `OrderDto`/`RefundDto` `id`. No interceptor change.

## Phase E — Analytics rollup scheduler

- `apps/api/src/jobs/analytics.processor.ts`: implement `OnModuleInit`; inject
  `@InjectQueue(QUEUE_ANALYTICS)`; on boot register two repeatable jobs
  (`JOB_ANALYTICS_ROLLUP_DAILY` hourly `0 * * * *`, `JOB_ANALYTICS_ROLLUP_FINALIZE`
  `0 2 * * *` UTC). `process()` switches on job name → for each active
  restaurant call existing `rollupDay()` (today for daily; yesterday for
  finalize). Reuse `JOB_*` names already in `packages/jobs/src/queues.ts` (add
  only if missing). Verify `QUEUE_ANALYTICS` registered in `bullmq.module.ts`
  (Sprint 8 added it) — wire processor in `jobs.module.ts` if not already.

## Phase F — api-client + admin hooks + query-keys + route placeholders

- `packages/api-client/src/client.ts`: `orders.list` already forwards the
  parsed query record — extended schema flows through automatically; just
  confirm typecheck. No structural change.
- `apps/admin/src/features/orders/`:
  - `use-admin-orders.ts` (new): `useAdminOrders(filters)` `useQuery` +
    `useAdminOrdersInfinite(filters)` `useInfiniteQuery` (cursor).
  - `query-keys.ts`: add `adminList(filters)` key.
  - export from `orders/hooks/index.ts`.
- `apps/admin/src/features/dashboard/` (new feature):
  - `query-keys.ts` + `hooks/use-dashboard-overview.ts`:
    `useDashboardOverview(restaurantId, period)` composite — ties
    `useAnalyticsOverview` + `useRevenueTimeseries` + `useTopItems` +
    `useOrdersByStatus` + a recent-orders slice (`useAdminOrders` limit 10).
    Mirrors Sprint 8's `useExportFlow` ergonomic-composite pattern. Returns
    `{ overview, revenue, topItems, ordersByStatus, recentOrders, isLoading,
    error }`.
  - export `index.ts`.
- Route placeholders already exist and already `return null` +
  `// TODO(ui):` (`(dashboard)/page.tsx`, `orders/page.tsx`,
  `orders/[id]/page.tsx`, `orders/kitchen/page.tsx`) — leave untouched, confirm.

## Phase G — Seed (additive)

- `packages/db/seed.ts`: add `seedOrders()` — create ~8 orders for the test
  restaurant across statuses (PENDING/CONFIRMED/PREPARING/READY/COMPLETED/
  CANCELLED) + a couple DELIVERY/PICKUP/DINE_IN, with a paid `Payment` (+1
  partial `Refund`) and `OrderStatusEvent` trail, spread over the last ~10 days
  so KPI deltas + the admin list + KDS feed + recent-orders have real data.
  Idempotent (skip if orders already exist). Re-run `seedReviews()` afterwards
  so the now-COMPLETED orders get reviews (previously skipped — "no completed
  orders yet").

## Phase H — Tests

- e2e `apps/api/test/orders-admin.e2e-spec.ts` (new): admin filtered list by
  status/type/date/search; restaurant scoping; cursor pagination; customer
  caller still gets only own orders (no regression); detail enrichment
  (`customer`+`payment` present for `order:read`, `null` for self).
- e2e `apps/api/test/audit-orders.e2e-spec.ts` (new): status change → an
  `AuditLog` row with `action:'order:status_changed'` appears (poll ≤2s,
  async queue); refund → `order:refund` row.
- Unit `apps/admin/src/features/kitchen/hooks/__tests__/use-advance-ticket.test.ts`:
  next-status mapping (CONFIRMED→PREPARING→READY; READY → no-op/guard).
- Unit `apps/admin/src/features/dashboard/hooks/__tests__/use-dashboard-overview.test.ts`:
  MSW-stub the 4 analytics endpoints + orders list, assert composite shape +
  aggregated loading flag.
- Extend `setup-e2e.ts` only if a helper is missing (it already cleans
  order/payment/auditLog + has full `ALL_PERMISSIONS`).

## Verification gate (run end-to-end before the report)

```bash
pnpm --filter @repo/db generate
pnpm typecheck                              # expect 15/15
pnpm lint                                   # expect 4/4 after Phase F/lint fix
pnpm test                                   # admin + util + web + api unit
pnpm --filter @repo/api test:e2e            # 60 + new specs
pnpm db:seed                                # idempotent re-seed incl. seedOrders
# Swagger spot check: /api/v1/docs lists no new routes (expected — reused) ;
# GET /orders?restaurantId=..&status=.. returns filtered list with owner token
```

## Risks / shortcuts

- Audit interceptor captures **after-state only** (Sprint 8 design) — refund
  audit row's `resourceType` is `payment` (response is `RefundDto`); acceptable,
  documented.
- Analytics aggregation still on-demand; scheduler only *populates* `DailyMetric`
  for future optimization. Rewiring reads to prefer the rollup table is
  explicitly out of scope (risky, Sprint 8 deferred only the bootstrap).
- e2e runs here via native PG/redis; environment is ephemeral — report records
  exact bring-up commands.

## Open decisions for review

None blocking — all choices covered by the defaults above. Anything that turns
into a real fork during implementation gets flagged in the final report's
"Open decisions" section and the most conservative option taken.

## Deliverable

`.claude/reports/sprint-6-complete.md` after the full verification gate passes,
then stop for review.
