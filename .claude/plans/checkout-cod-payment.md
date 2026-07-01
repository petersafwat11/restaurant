# Checkout: Cash-on-delivery now, card/BLIK gated on provider readiness

## Goal
Make checkout fully payable **today** with no online payment provider configured:
- **Cash on delivery (COD)** works end-to-end for **guests and authed users** — placing
  the order records a COD payment and confirms the order.
- **Card** and **BLIK** are **disabled** (with an explanatory tooltip) while no provider
  is ready, and **light up automatically** when the provider becomes ready.
- When the provider is ready, the sticky-rail **Place order** CTA runs the existing
  Stripe Elements confirm (card inline / BLIK via redirect); for COD it just places.
- The whole flow is **aware of provider status** from a single source of truth.

## Current state (why this is needed)
- `POST /orders` (`@Public()`, guest-capable) creates a **PENDING** order, records **no
  payment**, and never confirms it. The web `onSubmit` for COD just redirects to success —
  the order is stuck PENDING with no Payment row.
- Payment finalization lives in `POST /payments/intent` (`PaymentsService.createIntent`),
  which **requires `actor.userId` + ownership** → **guests can't use it**. And
  `OrdersService → PaymentsService` would be a circular module dep.
- "Provider ready" today = `payments.stripe_elements` flag (default **off**) **and**
  non-empty `STRIPE_PUBLISHABLE_KEY` (default **empty**). Both off → nothing is payable
  online, which is the situation we must handle.
- COD option is currently gated to `DELIVERY && total < 100`, so disabling card/BLIK would
  strand **PICKUP/DINE_IN** and large delivery orders with **no usable method**.

## Decisions (locked)
1. **Finalize COD server-side at order creation** (not via `/payments/intent`). Add
   `paymentMethod?: PaymentMethodKind` to `CreateOrderDto`; the server acts only on `'COD'`.
   Non-COD methods leave the order PENDING for the Stripe flow. This is guest-safe and
   avoids the circular dep.
2. **Unify the "confirm" step.** Move `confirmOrderFromPayment` logic
   (`updateMany PENDING→CONFIRMED` + `CONFIRMED` statusEvent + receipt enqueue) into
   `OrdersService`; move `QUEUE_RECEIPT` registration into `OrdersModule`. Have
   `PaymentsService.confirmOrderFromPayment` delegate to it so both COD entry points behave
   identically (same guard, `Payment.status = 'PAID'`, **no `applyTransition`** — preserve
   the existing no-realtime-event behavior; the e2e suite guards this).
3. **COD availability is provider-aware:**
   - Provider **not ready** → COD is available for **all three order types** with **no
     `< 100` cap** (it's the only method; capping blocks checkout). Card/BLIK disabled.
   - Provider **ready** → keep the old secondary-COD gate (`DELIVERY && total < 100`);
     card/BLIK enabled and primary.
4. **Per-order-type COD label/description** (single `cod` id): delivery → "Cash on
   delivery", pickup → "Pay at pickup", dine-in → "Pay at the table".
5. Auto-confirm COD → CONFIRMED (established design; `CodProvider.confirmed:true`, e2e
   asserts it). No new staff-accept flow.

## Phase 1 — Types (`packages/types`)
- `order.ts`: add `paymentMethod: z.enum(PAYMENT_METHOD_KINDS).optional()` to
  `CreateOrderSchema` (import from `./payment`). No Order column added — method is recorded
  on the Payment row.

## Phase 2 — API: COD finalize + unified confirm
- **`orders.module.ts`**: register `QUEUE_RECEIPT` via `BullModule.registerQueue`.
- **`orders.service.ts`**:
  - Inject `@InjectQueue(QUEUE_RECEIPT)`.
  - Add `confirmPendingOrder(orderId, note): Promise<boolean>` — the moved logic:
    `updateMany({where:{id,status:'PENDING'},data:{status:'CONFIRMED'}})`; if `count===0`
    return false; create `CONFIRMED` `orderStatusEvent`; `receiptQueue.add(JOB_RECEIPT_GENERATE,{orderId})`.
  - In `create()`, after `idempotency.store`, if `dto.paymentMethod === 'COD'`: create the
    `Payment` row (`provider:'cod'`, `method:'COD'`, `providerRef:'cod_<id>'`,
    `amount:grandTotal`, `currency`, `status:'PAID'`), then `await confirmPendingOrder(id,'Payment confirmed')`.
    Mirror `createIntent`'s COD path exactly. Refetch the DTO so the response reflects
    CONFIRMED + payment.
- **`payments.service.ts`**: `confirmOrderFromPayment` delegates to
  `orders.confirmPendingOrder(...)`; drop the now-unused `receiptQueue` (keep `emailQueue`
  for refunds). **`payments.module.ts`**: drop `QUEUE_RECEIPT` from its `registerQueue`.
- Guest receipt: verified safe — `ReceiptProcessor` no-ops on missing `user.email`
  (guests get no receipt email today; pre-existing, out of scope).

## Phase 3 — Web checkout (`checkout-app.tsx`)
- Single readiness flag: `onlinePaymentsReady = stripeElementsEnabled && !!stripeConfig?.publishableKey`.
- `PAYMENT_OPTIONS`: set `disabled: !onlinePaymentsReady` + `disabledReason` on `card` and
  `blik`; per-type label/description for `cod`.
- Visibility/gating in the step-5 `Controller`:
  - `cod` shown when `!onlinePaymentsReady` (all types) OR (ready && `DELIVERY && total<100`).
  - Default + auto-correct selected method: if the current `paymentMethod` is disabled/hidden,
    set it to `cod`. Change form default from `'card'` to a computed safe default.
- `onSubmit` branch by method:
  - **COD** → `createOrder.mutateAsync({ …, paymentMethod: 'COD' })` → redirect to success
    (server already confirmed). No `/payments/intent` call.
  - **card/BLIK** (only reachable when ready) → existing Stripe Elements confirm flow.
    Replace the three hardcoded `'card'` checks (onSubmit branch L410, `StripePaymentForm`
    render L842) to also accept `'blik'`; pass the right `methodKind` to `createIntent`
    (`'BLIK'` vs `'STRIPE_CARD'`) in `stripe-payment-form.tsx`.
- Place-order CTA: disable if the selected method is disabled; method-aware label
  ("Place order · {total}" for COD; "Pay {total}" when card/blik).

## Phase 4 — i18n (`packages/i18n/messages/{en,pl}/web/shop/checkout.json`)
- COD per-type labels/descriptions (`cod.delivery|pickup|dineIn`).
- `disabledReason` for card/blik (e.g. "Online card payments are coming soon — pay cash on
  delivery for now").
- CTA `payNow` variant. Keep keys parallel in en + pl.

## Phase 5 — Deferred online-path gap (flag, don't silently half-do)
- `return_url` → `/checkout/return` **route does not exist** → BLIK/redirect methods 404 on
  return. Add a minimal `(shop)/checkout/return/page.tsx` that reads the order and forwards
  to `/checkout/success/[orderId]`, **or** explicitly call it out as a known deferred gap in
  the PR. (Recommend adding the stub since BLIK is in scope of the future path.)

## Phase 6 — Tests & verification
- **API e2e** (`payments.e2e-spec.ts` or `orders.e2e-spec.ts`):
  - Guest COD: `POST /orders {type:'PICKUP', paymentMethod:'COD', sessionKey}` →
    order `CONFIRMED` + `Payment{method:'COD',status:'PAID'}` exists.
  - Authed COD via order create → CONFIRMED + payment row.
  - Existing `/payments/intent` COD path still passes (delegation refactor).
- **Web**: lightweight check that card/blik render disabled when `onlinePaymentsReady` is
  false and COD is selectable for all order types (jsdom unit if feasible; otherwise
  Playwright manual per CLAUDE.md "visual check").
- `pnpm --filter @repo/types build`, API e2e, web typecheck/lint.

## Out of scope
- Real Stripe keys / live online payments (flag stays off; we only make the path correct).
- Storing guest contact email on the order for receipts (pre-existing limitation).
- Admin payment-method display changes (Payment row already carries `method`).
