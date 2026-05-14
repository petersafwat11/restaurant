# Pre-Sprint-6 Hardening Plan

> Source prompt: `docs/sprints/pre-sprint-6-hardening-prompt.md`
> Started: 2026-05-15

## Scope

Focused cleanup pass between Sprint 5 and Sprint 6. NO UI work. Phases A → B → C → D, with verification between phases.

---

## PHASE A — Correctness fixes

### A.1 Stripe `charge.refunded` dashboard sync

**Files**
- `apps/api/src/payments/payments.service.ts` — handle `charge.refunded` in `dispatchEvent()`. Lookup `Payment` by `providerRef`, iterate Stripe refund objects, create missing `Refund` rows (match on `Refund.providerRef`), aggregate, transition order to `REFUNDED` via `forceTransition` when total ≥ payment amount. Log every dashboard-originated refund with `[STRIPE_DASHBOARD_REFUND]` prefix.
- `apps/api/src/payments/providers/stripe.provider.ts` — extend `parsedFromStripeEvent` to surface refund objects for `charge.refunded` events (charge id, refund array, amount totals).
- `apps/api/src/payments/provider.interface.ts` — extend `ParsedWebhookEvent` with optional `refunds` array (`{ id, amount, reason? }[]`) and `amountRefunded` minor-units int.
- `apps/api/src/payments/payments.service.ts` (already covers the refund flow) — ensure `PaymentsService.refund()` writes `result.providerRef` to `Refund.providerRef` so dashboard-echoed events dedupe correctly. Already does this; verify.
- Stub-mode behaviour: `charge.refunded` webhook in stub mode is honoured (same path), so the e2e test can exercise it.

**Tests** in `apps/api/test/payments.e2e-spec.ts`:
- `charge.refunded` for unknown stripe refund id → creates Refund row + transitions order if full.
- Idempotency (same event twice) → one Refund row.
- `charge.refunded` whose refund id matches an existing `Refund.providerRef` → no-op.

### A.2 `Cart.appliedCouponId` cascade

**Files**
- New migration `packages/db/prisma/migrations/20260515100000_pre_sprint_6_cart_coupon_cascade/migration.sql` — drop + recreate FK with `ON DELETE SET NULL`.
- `packages/db/prisma/schema.prisma` — `appliedCoupon Coupon? @relation(..., onDelete: SetNull)`.
- Regenerate Prisma client.

**Test** in a new or existing promotions e2e: delete a coupon with no redemptions, verify dependent cart's `appliedCouponId` is `null`.

---

## PHASE B — Sprint 6 blockers

### B.1 `useLiveOrders` payload + placeholder fix

**Files**
- `packages/types/src/order.ts` — extend `OrderListItemSchema` with `customerName: z.string().nullable()` and `restaurantId: z.string()` (needed by realtime list consumers). Bump `OrderListSchema` mappers accordingly.
- `packages/types/src/realtime.ts` — `OrderCreatedEventSchema` and `OrderStatusChangedEventSchema` extend with `OrderListItemDto` shape (`type`, `customerName`, `itemCount`). Keep existing fields (`from`, `to`, `note`, `changedAt`, `userId`).
- `packages/realtime-client/src/index.ts` — event map already references the same types; verify.
- `apps/api/src/orders/orders.service.ts` — `create()` and `applyTransition()` build full `OrderListItemDto`-shaped events. For status changes load `_count.items` + `user.firstName/lastName/email` once.
- `apps/api/src/orders/orders.service.ts` `list()` and any other DTO list mapper — include `customerName`/`restaurantId` in result.
- `apps/admin/src/features/orders/hooks/use-live-orders.ts` — drop placeholder, use payload directly.

**Test** in `apps/admin/__tests__` (vitest): mock `getRealtimeClient`, fire `order.created` event with `type: 'DELIVERY'`, assert query cache `type === 'DELIVERY'`.

### B.2 Realtime e2e test

**Files**
- `apps/api/test/realtime.e2e-spec.ts` — new file.
- Uses `socket.io-client` (already a dep). Connect to `http://127.0.0.1:<port>/` after starting the app on a real listening port via `app.listen(0)`. Use auth token from `ensureOwnerToken` / `register`.
- 6 scenarios per spec.

**Helper**: small `waitForEvent(socket, name, timeoutMs)` promise.

---

## PHASE C — Quality + coverage

### C.1 Receipt PDF snapshot test

**Files**
- Add dep `pdf-parse@^1.1.1` to `apps/api/package.json` (devDependency).
- `apps/api/src/jobs/receipt-pdf.spec.ts` — synthetic fixture, call `renderReceiptPdf`, run through `pdf-parse`, snapshot:
  - Page count.
  - Substrings: restaurant name, formatted order number `R-2026-000001`, line items (name + qty), totals breakdown labels, payment method, currency.
- A second snapshot for refunded order (passes `refundedAmount`).

### C.2 R2 image orphan cleanup

**Files**
- `apps/api/src/uploads/uploads.service.ts` — add `deleteObject(key: string)` (try/catch + log).
- `apps/api/src/menu/menu.service.ts` `removeItemImage()` — extract R2 key from image URL, call `uploads.deleteObject`.
- New `apps/api/src/jobs/r2-orphan-cleanup.processor.ts` — BullMQ processor + repeatable job runs daily at 03:00 UTC.
- `packages/jobs/src/queues.ts` — `QUEUE_R2_CLEANUP = 'r2.orphan-cleanup'`, `JOB_R2_ORPHAN_SWEEP`.
- `apps/api/src/bullmq/bullmq.module.ts` — register new queue.
- `apps/api/src/jobs/jobs.module.ts` — register processor.
- Schedule the repeatable job in `JobsModule.onModuleInit()` (or similar) — `repeat: { cron: '0 3 * * *', tz: 'UTC' }`.
- Skip unit tests per defaults.

### C.3 `formatMoney` locale pinning

**Files**
- `packages/utils/src/money.ts` — `formatMoney(value, currency, locale?)`. Default locale via currency map (`PLN→pl-PL`, `EUR→de-DE`, `GBP→en-GB`, `USD→en-US`, else `en-US`).
- `packages/utils/src/money.test.ts` — add cases.
- `apps/api/src/jobs/receipt-pdf.tsx` — receipts use `formatMoney(value, currency)` for all displayed amounts in the totals + line items blocks (drop manual `${value} ${currency}`).
- `apps/api/src/jobs/receipt.processor.ts` — pass `formatMoney`-formatted values into the renderer where appropriate (or let renderer do it — keeping the renderer in charge of formatting is cleanest).

---

## PHASE D — Documentation

**Files**
- `docs/local-setup.md` — append a "Live-mode credentials" section + "Troubleshooting" subsection per prompt §PHASE D.

---

## §DEFAULTS to apply

1. Migrations: `pre_sprint_6_<topic>` naming.
2. Realtime payloads: additive only.
3. Snapshots: text-based for PDFs.
4. Locale pinning: PLN → pl-PL.
5. R2 orphan cleanup: 7-day soft window.
6. Dashboard refund handler: per A.1 above.
7. Cart FK: `SetNull`.
8. `useLiveOrders` placeholder: remove via payload extension.

## Verification

Run between phases:
```
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @repo/api test:e2e
```

Final report: `.claude/reports/pre-sprint-6-hardening-complete.md`.
