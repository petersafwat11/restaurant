# Auto-close DELIVERED → COMPLETED + order-flow polish

## Goal (user)
- Delivery orders: staff only click **Delivered**; system auto-archives DELIVERED → COMPLETED after a short grace window.
- Verify pickup / dine-in / delivery flows are all coherent.
- Investigate why the admin order modal "has no time-per-order input".

## Findings
- FSM is type-gated (`packages/types/src/order.ts` graph + `apps/api/src/orders/order-state-machine.ts` RULES; parity test on (from,to) pairs).
  - Delivery: … READY → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
  - Pickup / Dine-in: … READY → COMPLETED (never DELIVERED)
- Both `transition()` (staff) and `forceTransition()` (system) funnel through `applyTransition()` (orders.service.ts:753) which emits `order.status_changed`. **Enqueue hook goes here** when `to === 'DELIVERED'`.
- Loyalty earn is idempotent (unique orderId → P2002 no-op) → auto-complete won't double-earn. COMPLETED notification = NONE (no customer spam). Kitchen ticket already removed at DELIVERED.
- BullMQ delayed-job pattern to copy: `account-deletion` (deterministic `jobId`, processor re-reads + no-ops).
- **Refund window**: `ANY_TO_REFUNDED` (order-state-machine.ts) + admin `showRefund` exclude COMPLETED. So once completed, the normal refund flow is blocked (already true for pickup/dine-in). Auto-completing delivery shrinks its refund window to the grace period.
- **ETA input already exists**: `order-drawer-body.tsx` `EtaControl`, gated by `has('order:status_update')`; i18n keys present (en+pl). Roles with it: owner, manager, kitchen. **cashier does NOT have `order:status_update`** → a cashier sees neither the ETA field nor the Advance button. Owner sees it → if the user doesn't, their admin build is likely pre-merge, or they're a non-owner role, or didn't recognise the "Estimated time" field.

## Plan
### 1. Auto-complete job (core)
- `packages/jobs`: add `QUEUE_ORDERS='orders'`, `JOB_ORDER_AUTO_COMPLETE='order.auto-complete'`, `OrderAutoCompletePayloadSchema={orderId}`.
- `orders.module.ts`: `BullModule.registerQueue({ name: QUEUE_ORDERS })`, add processor provider.
- `orders.service.ts`: inject `@InjectQueue(QUEUE_ORDERS)`; in `applyTransition`, on `to==='DELIVERED'` enqueue delayed job (`jobId: order-autocomplete:<id>`, `delay=GRACE_MS`), non-blocking + logged. New `autoCompleteDelivered(orderId)`: re-read; if still DELIVERED → `forceTransition(id,'COMPLETED',null,note)`; else no-op.
- New `order-auto-complete.processor.ts` (`@Processor(QUEUE_ORDERS)`).
- `GRACE_MS` = 60 min named constant (short, but covers immediate delivery complaints). Documented; easy to make env-configurable later.

### 2. Keep the manual "Complete" out of the staff flow
- Admin `order-detail-drawer.tsx` only: when `order.status==='DELIVERED'`, suppress the "Advance to Completed" button and show an "auto-completing after delivery" info line. **No state-machine change** (DELIVERED→COMPLETED stays staff-allowed as a legal override + the system path); no gating/parity test churn.

### 3. Refund window (DECISION — validate)
- Auto-completing shrinks the delivery refund window. Proposal: allow refund from COMPLETED (add to `ANY_TO_REFUNDED` + admin `showRefund` + update 2 unit tests + check e2e). Also fixes the pre-existing inability to refund completed pickup/dine-in orders.
- Risk: EU-payment path ("be careful" per notes). Alternative: leave refund gating as-is and rely on the 60-min grace. **Get a second opinion before doing this.**

### 4. ETA modal
- No code bug found — report where it is + the cashier gap. Optionally relabel for clarity / give cashier `order:status_update` — only if the user wants.

## Verify
`pnpm --filter @repo/jobs build` + `pnpm --filter api typecheck` + order-state-machine unit tests + notification/loyalty specs. e2e relies on CI (no local DB).

## FINAL (implemented) — after advisor review
- **Refund change DROPPED.** Advisor: with current gating the grace window *is* the delivery refund window, so a generous window preserves refundability without touching the EU-payment surface. Chose `AUTO_COMPLETE_GRACE_MS = 2h` (surfaced to the user — tune-or-open-refunds if they want it shorter). No `ANY_TO_REFUNDED` / refund / gating change.
- **Single-source UI suppression via `systemOnly`.** Instead of local guards in 4 UI spots, marked the `DELIVERED→COMPLETED` graph edge `systemOnly: true` (its literal meaning: "fired by the grace job, never a staff button"). `forwardTransitions`/`nextStatusFor` now exclude it everywhere (drawer, detail page, list row, bulk). Backend RULES unchanged (staff still allowed = harmless override) → parity + gating tests untouched (17 pass).
- Drawer + detail page show the `autoCompleting` label ("Completes automatically" / PL) for DELIVERED.
- **Pickup/dine-in:** no change needed — `READY→COMPLETED` stays the staff's natural terminal click (not systemOnly). Verified.
- **ETA modal:** no bug. `OrderDrawerBody.EtaControl` ("Estimated time") renders in the drawer *and* the [id] page, gated by `order:status_update` (owner/manager/kitchen; NOT cashier). User's admin was almost certainly pre-merge. Reported + asked which screen/role.
- Verified: jobs/types/api/admin typecheck clean; api 110 unit + admin 29 unit pass; e2e test added (order-state-machine.e2e) for auto-complete happy-path + no-op, runs in CI.
