# Sprint 4 — Status Report

> Source prompt: `docs/sprints/sprint-2-5-claude-code-prompt.md`
> Plan: `.claude/plans/sprint-2-5.md`
> Completed: 2026-05-14

## Status: ✅ Done — awaiting "proceed" before Sprint 5

Sprint 4 backend (Stripe + COD providers, refunds, webhook dedupe, receipt PDF job) plus shared `pricing.service`, payment types, customer + admin hooks are in place. **No UI written** — Sprint 9 wires the native pay sheets and the admin refund button.

| Verification | Result |
|---|---|
| `pnpm typecheck` | 14/14 packages green |
| `pnpm lint` | 4/4 lintable packages green |
| `pnpm test` | utils 6, web 10, admin 5, **api 5 (new — pricing.service)** = **26/26 unit tests pass** |
| `pnpm --filter @repo/api test:e2e` | **39/39 e2e tests pass** (Sprint 0-3's 31 + payments 8) |
| `pnpm --filter @repo/db seed` | idempotent — same Sprint 2/3 data, now on a schema with `Restaurant.taxRate`, `P24`/`BLIK` enums, and `WebhookEvent` table |

---

## Files created/modified by package

| Package | Created | Modified |
|---|---|---|
| `packages/db` | 1 migration (`20260514170000_payment_method_poland`) | `schema.prisma` (taxRate + P24/BLIK enum + WebhookEvent), `src/index.ts` (re-export `WebhookEvent` type), `seed.ts` (permissions list) |
| `packages/jobs` | — | `queues.ts` (+`QUEUE_RECEIPT`, `JOB_EMAIL_RECEIPT`, `JOB_EMAIL_REFUND`, `JOB_RECEIPT_GENERATE`), `payloads.ts` (3 new schemas) |
| `packages/types` | `payment.ts` | `index.ts`, `permissions.ts` (added `payment:read`, `payment:refund`; cashier role gets `payment:read`) |
| `packages/api-client` | — | `client.ts` (payments resource inline) |
| `apps/api` (src) | `pricing/` (2 files), `payments/` (controllers ×2, service, provider interface, Stripe + COD providers, webhook-events service, module = 7 files), `jobs/receipt-pdf.tsx`, `jobs/receipt.processor.ts` | `app.module.ts` (+PaymentsModule, +PricingModule), `bullmq/bullmq.module.ts` (+QUEUE_RECEIPT), `config/env.ts` (Stripe vars), `main.ts` (raw-body parser for webhook), `mailer/mailer.service.ts` (attachments support), `jobs/email.processor.ts` (+receipt/refund handlers), `jobs/jobs.module.ts` (registers queues), `orders/orders.service.ts` (uses PricingService), `orders/orders.module.ts` (+PricingModule), `package.json` (+`stripe`, +`@react-pdf/renderer`) |
| `apps/api` (test) | `payments.e2e-spec.ts` (8 tests), `pricing/pricing.service.spec.ts` (5 tests) | `setup-e2e.ts` (raw-body parser, payment+webhook tables in reset, perms list), `orders.e2e-spec.ts` (tax expectations) |
| `apps/web` | `features/payments/` (2 hooks + query-keys + index) | — |
| `apps/admin` | `features/payments/` (2 hooks + query-keys + index) | — |
| `apps/mobile` | `features/payments/` (2 hooks + query-keys + index) | `package.json` (+`@stripe/stripe-react-native`), `src/providers/app-providers.tsx` (TODO marker for StripeProvider) |

Roughly 35 new files + ~20 edits.

---

## Implemented endpoints

**Public:**
- `GET /payments/config` — returns `{ stripePublishableKey, currency }` for client-side SDK init.
- `POST /payments/webhooks/stripe` — raw-body verified, idempotent dedupe via `WebhookEvent` table.

**Customer (auth required):**
- `POST /payments/intent` — body `{ orderId, provider: 'stripe'|'cod', methodKind }`. Stripe path returns `{ clientSecret, publishableKey, confirmed: false }`. COD short-circuits → marks `Payment.status = PAID` and transitions `Order` to `CONFIRMED` immediately.
- `GET /payments/by-order/:orderId` — owner or staff with `payment:read`.

**Admin (auth + `payment:refund`):**
- `POST /payments/:paymentId/refunds` — body `{ amount?, reason }`. Partial allowed. Full refund transitions order to `REFUNDED`. Emits a refund-confirmation email job.

**Webhook handler:**
- `payment_intent.succeeded` → marks `Payment.status = PAID`, transitions `Order` to `CONFIRMED`, appends status event, enqueues receipt PDF job.
- `payment_intent.payment_failed` → marks payment `FAILED`, order stays `PENDING`.
- `charge.refunded` → logged (Stripe-side refund sync; the actual `Refund` row is created via our refund endpoint in Sprint 4).

---

## Decisions made (per plan defaults, all unchanged)

1. **Schema migration** — `taxRate Decimal(5,4) @default(0.08)` on `Restaurant`; `P24` + `BLIK` added to `PaymentMethodKind`; `WebhookEvent` table with provider event id as PK (uniqueness gives idempotency for free).
2. **Stripe stub mode** — when `STRIPE_SECRET_KEY` is empty, the provider returns deterministic `pi_stub_<orderId>` refs and `<ref>_secret_stub` client secrets so the frontend SDK call chain can be tested without real Stripe keys.
3. **Webhook dedupe** — `WebhookEvent` table with provider's event id as PK. `recordIfNew` returns `false` on duplicate (P2002) and the handler short-circuits.
4. **COD short-circuit** — `cod.provider.createIntent` returns `{ confirmed: true }`; `PaymentsService` then runs `confirmOrderFromPayment` which transitions order + creates the `OrderStatusEvent(CONFIRMED)` + enqueues a receipt job. The same path runs from `payment_intent.succeeded` webhook for Stripe.
5. **`Restaurant.taxRate`** — added as a Decimal column (not JSON). Default 8% (Polish VAT on prepared food).
6. **Tip clamping** — `pricing.service` rejects `tipAmount > subtotal` with a thrown error; orders controller surfaces it as 400.
7. **Provider abstraction** — `PaymentProvider` interface implemented by `StripeProvider` and `CodProvider`. Adding PayU/Adyen later is a new provider class — no refactor.

## Other implementation choices worth flagging

- **Raw-body parsing** for Stripe webhooks: we `removeContentTypeParser('application/json')` and replace with one that stashes the raw `Buffer` on `req.rawBody` when the URL is the webhook path. Done in both `main.ts` and `test/setup-e2e.ts` so e2e tests can hit the webhook endpoint with JSON and still go through signature verification (stub mode in test).
- **Queue registration is duplicated** — `BullmqModule` registers all queues at root, and `JobsModule` + `PaymentsModule` re-register only the queues they `@InjectQueue()`. `@nestjs/bullmq`'s `registerQueue` is idempotent past the first call.
- **`Cashier` role now gets `payment:read`** — needed for staff to view payment status on the orders list. Refund stays owner/manager-only.
- **`PaymentMethodKind` widening** — DB enum still includes legacy `PAYMOB` (per plan: "Leave it in the enum"). The shared `@repo/types` excludes it from the union; the service-side `pickProvider` rejects `PAYMOB` with a 400 if it shows up.
- **Receipt PDF** — generated via `@react-pdf/renderer.renderToBuffer`. Single-page A4 with restaurant name, order number, line items, totals breakdown, payment method, refund line (if any). Snapshot test deferred to Sprint 5/6 alongside more receipt polish — the renderer is invoked by e2e via queue+worker boot, not unit-tested directly.
- **`orders.service` refactor** — now calls `pricing.service.calculateTotals` which fetches `Restaurant.taxRate`. Tip validation lives in the pricing service. Sprint 3's orders e2e was updated to expect `taxTotal` and the higher `grandTotal`.
- **`@stripe/stripe-react-native` added to mobile** as a dep, but `<StripeProvider>` is NOT initialized in `app-providers.tsx`. Marked with a `// TODO(ui):` for Sprint 9.

---

## Schema changes (1 new migration)

```
packages/db/prisma/migrations/20260514170000_payment_method_poland/migration.sql
```

```sql
ALTER TYPE "PaymentMethodKind" ADD VALUE IF NOT EXISTS 'P24';
ALTER TYPE "PaymentMethodKind" ADD VALUE IF NOT EXISTS 'BLIK';

ALTER TABLE "Restaurant"
  ADD COLUMN "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.08;

CREATE TABLE "WebhookEvent" (...);
CREATE INDEX "WebhookEvent_provider_type_idx" ON "WebhookEvent"("provider", "type");
```

---

## Sprint 4 verification commands run

```bash
pnpm install                                    # +stripe, +@react-pdf/renderer, +@stripe/stripe-react-native
pnpm --filter @repo/db migrate:deploy           # applied payment_method_poland
pnpm --filter @repo/db generate                 # regen Prisma client
pnpm typecheck                                  # 14/14 green
pnpm lint                                       # 4/4 green
pnpm test                                       # 26/26 unit (added 5 pricing.service tests)
pnpm --filter @repo/api test:e2e                # 39/39 e2e (8 new payments tests)
pnpm --filter @repo/db seed                     # idempotent
```

---

## Known gaps / deferred

- **Stripe real keys** — no real Stripe account credentials in dev; stub mode covers the path. Setting `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PUBLISHABLE_KEY` in `.env` switches all four (stub vs live) automatically. Document in `docs/local-setup.md` when running against real Stripe.
- **PDF snapshot test** — `pricing.service` has unit tests; `receipt-pdf` is exercised end-to-end via the queue but lacks a direct snapshot test. Added as a follow-up — Sprint 5/6 will write one once the PDF template stabilises (post design tokens landing).
- **Charge.refunded webhook** — currently logs only. Refunds initiated from the Stripe dashboard need a sync step (create a `Refund` row from `event.data.object.amount_refunded`). Deferred; the path is documented inside `dispatchEvent`.
- **Receipt locale** — `Intl.NumberFormat` uses the runtime default. When i18n lands (Sprint 11) the receipt should pin a locale per-restaurant.
- **Loyalty point revoke on refund** — plan flagged enqueueing `loyalty:revoke_earned_points`. Loyalty module doesn't exist yet (Sprint 11); a TODO comment in the refund flow notes the hook.

---

## What's ready for Sprint 5 to use

- **`Order` status events** are written by both the orders module (on create) and payments module (on payment success). Sprint 5's state machine layers on top — just call into a new `OrdersService.transition(...)` rather than touching `Order.status` directly. The existing two callsites (orders.create, payments.confirmOrderFromPayment) become two calls into the new state machine.
- **`@nestjs/event-emitter`** isn't installed yet — Sprint 5 will add it for the realtime/notification decoupling.
- **WebhookEvent table** is in place; the same `recordIfNew` pattern can be reused by other webhook sources (Slack, push delivery callbacks, etc.).
- **Receipt + refund email jobs** wire `MailerService` attachment support — Sprint 5 notification templates plug into the same email queue.
- **`PaymentProvider` interface** with `parseWebhook` makes adding PayU/Adyen later a same-shape file under `providers/`.

---

## Stop point

Sprint 4 is complete. Awaiting **"proceed"** before I start Sprint 5 (Fastify 5 + Swagger, order state machine, Socket.IO gateway, notification dispatcher with real Expo push, kitchen feed endpoint, realtime-client package).
