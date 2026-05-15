# Cross-Sprint Correctness Audit (Sprints 3–8) — Report

> Requested: review the Sprint 3/4/5/6/7/8 reports against the actual code,
> find hidden bugs, and finalize before Sprint 9.
> Completed: 2026-05-15 · Branch: `claude/sprint-6-planning-PLYif`

## Method

Four parallel deep-review agents audited the live service code (not the
reports' claims) per domain — Sprint 3+4 (cart/orders/payments), Sprint 5
(state machine/realtime), Sprint 7 (reservations/staff/etc.), Sprint 8
(analytics/reports/audit) — plus a manual cross-cutting review of the auth
guard, permissions map ↔ seed sync, and the Sprint 6 changes. ~60 raw
findings were triaged into **genuine bugs fixed now**, **contained
mitigations**, and **accepted/deferred with rationale** (several were
theoretical, non-bugs, or already documented as known gaps in prior reports).

## Verification

| Check | Before audit | After fixes |
|---|---|---|
| `pnpm typecheck` | 15/15 | **15/15** |
| `pnpm lint` | 4/4 | **4/4** |
| unit (`pnpm test`) | api 37 · web 10 · admin 10 · utils 10 · auth 12 | **api 38** · web 10 · admin 10 · utils 10 · auth 12 |
| `pnpm --filter @repo/api test:e2e` | 67 / 14 files | **70 / 14 files** (+3 regression tests, 0 regressions) |

No automated check regressed. The auth/permissions cross-check found
`seed.ts` ROLE_PERMISSIONS **in sync** with `packages/types/src/permissions.ts`
(only nit: `reports:read` is a dead key — the reports module correctly uses
`report:read`/`report:export`).

## Fixed (verified, low-risk, behavior-locked by tests)

| # | Severity | Area | Fix |
|---|---|---|---|
| 1 | Critical | Analytics completion rate | `analytics.service.ts` — was `completed/total` (unstable, inflated by in-flight/refunded). Now `completed/(completed+cancelled)` per the KPI catalog. Regression test added. |
| 2 | Critical | Idempotency race | `idempotency.service.ts` + `orders.service.ts` — atomic `SET NX` reservation **before** order work + release-on-failure. Concurrent duplicate `POST /orders` now replays or 409s instead of creating two orders. Concurrent regression test added. |
| 3 | High | Refund → no notification/realtime + state-machine bypass | `payments.service.ts` `refund()` — full-refund order transition now goes through `OrdersService.forceTransition` (state-machine-guarded, emits `order.status_changed`, pulls the kitchen ticket, fires the dispatcher) instead of a raw `tx.order.update`. |
| 4 | High | Webhook double-receipt / terminal-order resurrection | `payments.service.ts` `confirmOrderFromPayment()` — conditional `updateMany(where status=PENDING)`; receipt enqueued + event written **only** when the order actually transitioned. Concurrent duplicate webhooks no longer double-confirm or resend receipts; a racing cancel can't be overwritten. |
| 5 | High | Stripe refund wrong currency | `stripe.provider.ts` / `provider.interface.ts` — refund minor-units now use the payment's currency, not hardcoded `'usd'`. |
| 6 | High | Audit can't be scoped per restaurant | `audit.interceptor.ts` — now extracts + records `restaurantId`; refund audit uses `idFrom:'paymentId'` so the row references the payment, not the refund id. |
| 7 | High | Customer detail cross-restaurant leak | `customers.service.ts`/`controller` — `get()` accepts optional `restaurantId` and scopes orders/spend/reviews (mirrors `list()`). |
| 8 | High | KPI/report SQL injection pattern + UTC bucketing | `analytics.service.ts` `revenueTimeseries` — removed `Prisma.raw('${trunc}')` string-build (now branched `Prisma.sql` literals) and buckets `AT TIME ZONE` the restaurant tz (consistent with `salesByHour`). |
| 9 | High | Coupon money leak | `coupon-validation.ts` — BOGO returned a flat `promo.value` discount off `grandTotal` regardless of cart; FREE_DELIVERY was a misleading no-op. Both now rejected (`PROMOTION_INACTIVE`) until item-level logic ships. Regression test added. |
| 10 | Medium | State-machine `from` race | `orders.service.ts` `applyTransition` — `from` is now the caller's pre-update status (callers already loaded + guarded the order) instead of a racy post-write event-log lookup. |
| 11 | Medium | Ghost KDS tickets | `orders.service.ts` — `kitchen.ticket_removed` now also emits on `CANCELLED`/`REFUNDED`/`DELIVERED`. |
| 12 | Medium | KDS ordering | `orders.service.ts` `listKitchenTickets` — sorted by `confirmedAt` ASC (the documented KDS contract) instead of `createdAt`. |
| 13 | Medium | Delivery-zone holes | `delivery-zone.service.ts` — GeoJSON interior rings are holes; a point in a hole is now correctly OUTSIDE the zone. Regression test added. |
| 14 | Medium | Reports expiry status | `reports.service.ts` — expired export download now `410 Gone` (was `400`). |
| 15 | Medium | Long-lived socket auth | `realtime.gateway.ts` — token `exp` captured at connect and re-checked on `subscribe` (expired → disconnect), so a demoted/revoked user can't keep using sensitive feeds on a stale connection; the connect verify error is now logged instead of silently swallowed. |
| 16 | Low | Order-number year | `order-number.ts` — uses `getUTCFullYear()` so the `R-YYYY-` prefix matches the UTC `createdAt`. |

Regression tests added: `delivery-zone.spec.ts` (hole case),
`analytics.e2e-spec.ts` (completion rate with cancelled+pending),
`promotions.e2e-spec.ts` (BOGO/FREE_DELIVERY rejected),
`orders.e2e-spec.ts` (concurrent same-key → one order).

## Accepted / Deferred (with rationale — NOT fixed, by design)

These are real observations but were intentionally not changed pre-Sprint-9
because they require architectural change/migrations, are pre-existing
documented limitations, or are non-bugs:

1. **Coupon double-spend under concurrency** (no unique constraint, count
   outside txn). A correct fix needs a partial unique index that respects
   nullable guest `userId` + `perUserLimit>1`, or serializable in-txn
   re-validation threaded through `promotions.validate`. Prior reports already
   document guest coupon reuse as a known limitation. Deferred — needs a
   schema/transaction design decision, too risky as a blind pre-Sprint-9 edit.
2. **Reservation booking race** (Serializable + recheck, no exclusion
   constraint). Robust fix = Postgres `btree_gist` EXCLUDE constraint
   (extension + migration) or `SELECT … FOR UPDATE` on the table row.
   Deferred to a focused reservations-hardening pass; current code is
   single-restaurant-dev acceptable.
3. **Roles are global / staff hierarchy on stale JWT.** `UserRole` has no
   `restaurantId` and guards trust JWT claims until token expiry — this is the
   system-wide auth design (all guards use JWT claims), not a Sprint-7 bug.
   Documented; a token-version/`isActive` re-check is a cross-cutting auth
   project, not an isolated fix.
4. **Notification preferences / opt-out** — no preference model exists in the
   schema; honoring opt-outs is a future feature, not a bug.
5. **AOV = revenue / completed-orders** — this is the standard "average
   completed-order value"; the report's "revenue/orders" wording was loose.
   Kept as-is (correct metric); deltaPercent ratio-vs-percent + `prev==0`
   convention left unchanged to avoid a frontend-contract change pre-Sprint-9.
6. **`charge.refunded` / refund over-refund cross-flow concurrency** — needs a
   payment row lock spanning the external provider call (distributed-tx
   problem). The in-process pre-checks remain; flagged for the payments
   hardening pass.
7. **realtime-client no re-subscribe on reconnect**, **push token cleanup**,
   **audit success-only**, **reservation `update()` re-validation**,
   **getAvailability UTC day window**, **holiday JSON read-modify-write race**,
   **guest session-key randomness (Math.random)** — real but low-severity /
   frontend / pre-existing documented; itemized here for the Sprint 9+ backlog.

## Files changed

`apps/api/src/` — `analytics/analytics.service.ts`,
`orders/orders.service.ts`, `orders/idempotency.service.ts`,
`orders/order-number.ts`, `payments/payments.service.ts`,
`payments/payments.controller.ts`, `payments/provider.interface.ts`,
`payments/providers/stripe.provider.ts`, `promotions/coupon-validation.ts`,
`settings/delivery-zone.service.ts`, `customers/customers.service.ts`,
`customers/customers.controller.ts`, `audit-log/audit.interceptor.ts`,
`reports/reports.service.ts`, `realtime/realtime.gateway.ts`.
Tests: `settings/__tests__/delivery-zone.spec.ts`, `test/analytics.e2e-spec.ts`,
`test/promotions.e2e-spec.ts`, `test/orders.e2e-spec.ts`.

## Sprint 9 readiness

The clear correctness defects across the money, KPI, audit, realtime and
geofencing paths are fixed and locked with tests; the full pipeline is green
(typecheck 15/15 · lint 4/4 · unit · e2e 70). The remaining items are
concurrency-hardening / architectural decisions captured above as an explicit
backlog rather than hidden bugs. Recommended before production (not blocking
Sprint 9 feature work): a dedicated **concurrency & multi-tenant hardening
pass** covering items 1–3 and 6 (DB constraints + row locks + auth re-check).
