# Claude Code Prompt — Sprints 2–5 (Restaurant/Menu, Cart/Checkout, Payments, Real-time) — NO UI

> Paste this prompt into a fresh Claude Code session at the repo root. The repo already has Sprint 0+1 completed.

---

## CONTEXT

We are continuing the restaurant ordering platform. **Sprint 0 + Sprint 1 are already complete.** Before doing anything else, read these three files in full:

1. `docs/restaurant-app-project-plan.md` — the master plan (especially §4 schema, §5 backend, §8 features, §9 real-time/jobs, §11 payments, §12 sprint plan)
2. `docs/sprints/sprint-0-1-claude-code-prompt.md` — the prompt that drove Sprint 0+1 (so you understand the conventions in force)
3. `docs/sprints/sprint-0-1-complete.md` — the completion report listing what's already built and the **decisions made** that you must NOT re-litigate
4. `CLAUDE.md` at the repo root — the working agreement

The full Prisma schema is **already in place** from Sprint 0+1. Your job is to add backend modules + frontend data-layer (hooks, stores, route files) for Sprints 2, 3, 4, and 5 — still **no UI**.

---

## HARD CONSTRAINT — NO UI

Same rule as Sprint 0+1: **do not write any UI in this run.**

- No JSX content inside page/screen files beyond `return null` with a `// TODO(ui):` comment.
- No styled components, no Tailwind utility classes on elements, no shadcn or NativeWind components.
- No design tokens beyond what already exists.
- The data layer (hooks, stores, API clients, types, endpoints, real-time subscriptions, file-upload plumbing) must be **complete and tested**. When I sit down to build UI later, I write JSX only — every dependency it consumes already works.

## HARD CONSTRAINT — BACKEND IS STILL SCOPED PER SPRINT

The schema covers the whole project, but each sprint adds only its own backend modules. By the end of this run, the following modules exist with full endpoints, services, guards, and tests:

| Sprint | NestJS modules added |
|---|---|
| Sprint 2 | `restaurants`, `menu`, `uploads` |
| Sprint 3 | `cart`, `orders` (creation only — no payment yet), `promotions`, `coupons` |
| Sprint 4 | `payments` (with Stripe + COD adapters), `refunds`, `receipts` job |
| Sprint 5 | `realtime` (Socket.IO gateway), `kitchen`, order state-machine, notification dispatching |

Modules NOT touched in this run: `reservations`, `reviews`, `loyalty`, `analytics`, `staff` management UI flows, `notifications` user-facing feed. Those land in Sprint 6–8.

---

## RESPECT EXISTING DECISIONS

The Sprint 0+1 completion report records these decisions. Do not re-debate or change them:

1. Hand-rolled `JwtAuthGuard` using `@repo/auth-core` — keep using it.
2. Vitest + `unplugin-swc` (with `decoratorMetadata: true`) for API e2e tests.
3. `@swc-node/register` for API dev runtime.
4. `pnpm overrides` pin `@types/react@18.3.18` across the monorepo.
5. `dotenv -e ../../.env --` prefix on scripts that need root `.env`.
6. `useImportType` lint rule OFF in Biome config (preserves runtime imports for Nest DI).
7. Biome lint **skipped** on `apps/api` until Biome 2.x. Type-check + e2e tests are the guardrails there.
8. Web/admin: access token in memory (Zustand), refresh token in httpOnly cookie via `/api/auth/set-session` Route Handler.
9. Mobile: both tokens in `expo-secure-store`.
10. `notify(level, msg)` is a no-op `console.log` for now — keep it that way.

There is one deferred item from Sprint 0+1 that **you will fix as part of Sprint 5**: bumping to `fastify@5` so `@nestjs/swagger@8.1` can be wired up. Sprint 5 already touches the API root (Socket.IO gateway), so the fastify bump rides along naturally.

---

## REQUIRED WORKFLOW

1. **Read all four reference files listed in CONTEXT.** Confirm you've read them.
2. **Write one combined plan to `.claude/plans/sprint-2-5.md`** organized by sprint, each sprint broken into phases with file paths and verification commands. **Stop after writing the plan and wait for my approval.**
3. After I approve the plan, implement **one sprint at a time** with mandatory gates:
   - Implement Sprint 2 fully.
   - Run the Sprint 2 verification checklist.
   - Write a brief Sprint 2 status update to `.claude/reports/sprint-2-status.md`.
   - **Stop and wait for my "proceed" confirmation.**
   - Then Sprint 3 → gate → Sprint 4 → gate → Sprint 5 → final report.
4. At every gate, list anything you had to decide that wasn't specified so I can review before you move on.
5. Open questions during planning: list them in the plan and **stop**. Do not guess on ambiguity.

---

## SPRINT 2 — Restaurant + Menu (backend + data layer)

### 2.1 Backend modules (`apps/api/src/modules`)

**`restaurants`**
- `GET /restaurants` — public, list active restaurants.
- `GET /restaurants/:slug` — public, full detail with hours.
- `POST /restaurants` — `@Permissions('restaurant:write')`.
- `PATCH /restaurants/:id` — `@Permissions('restaurant:write')`.
- `GET /restaurants/:id/hours` and `PUT /restaurants/:id/hours` (replace all 7 days atomically).
- Restaurant info responses cached in Redis with 5-min TTL, invalidated on write.

**`menu`**
- Public: `GET /restaurants/:restaurantId/menu` returns categories with nested items + modifier groups + options. Cached 5-min in Redis, key `menu:{restaurantId}`.
- `GET /restaurants/:restaurantId/menu/categories/:categorySlug/items/:itemSlug` — single item with full modifier tree.
- Admin (all `@Permissions('menu:write')`):
  - `POST /menu/categories`, `PATCH /menu/categories/:id`, `DELETE /menu/categories/:id`.
  - `POST /menu/categories/reorder` — body: `{ orderedIds: string[] }` — updates `position` in one transaction.
  - `POST /menu/items`, `PATCH /menu/items/:id`, `DELETE /menu/items/:id`.
  - `POST /menu/items/:id/availability` — body: `{ isAvailable: boolean }`. Cheap toggle, doesn't bust the whole menu cache (uses a separate `availability:{itemId}` key with 0 TTL + write-through).
  - `POST /menu/items/reorder` — same pattern as categories, scoped by category.
  - `POST /menu/items/:id/images` (link an already-uploaded R2 key), `DELETE /menu/items/:id/images/:imageId`, `POST /menu/items/:id/images/reorder`.
  - `POST /menu/items/:id/modifier-groups`, `PATCH /menu/modifier-groups/:id`, `DELETE /menu/modifier-groups/:id`.
  - `POST /menu/modifier-groups/:id/options`, `PATCH /menu/modifier-options/:id`, `DELETE /menu/modifier-options/:id`.
- Any write to menu invalidates the `menu:{restaurantId}` cache.

**`uploads`**
- `POST /uploads/presign` — body: `{ kind: 'menu-item-image' | 'restaurant-logo' | 'restaurant-cover'; mimeType: string; sizeBytes: number; }` — returns `{ uploadUrl, publicUrl, key, expiresIn }`. Validate mime is `image/jpeg|png|webp` and size ≤ 5MB.
- Uses Cloudflare R2 via the AWS S3 SDK (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`). Configure via the existing R2 env vars in `.env.example`.
- Requires auth + at least one menu-relevant permission. Document presigned URL TTL = 5 min.
- The actual `MenuItemImage` row is created via `POST /menu/items/:id/images` referencing the returned `key` — uploads endpoint does NOT touch the DB.

### 2.2 Shared types — add to `packages/types`

- `restaurant.ts` — `RestaurantPublicDto`, `RestaurantAdminDto`, `CreateRestaurantDto`, `UpdateRestaurantDto`, `OperatingHoursDto`, `UpdateOperatingHoursDto` (array of 7).
- `menu.ts` — `MenuTreeDto`, `MenuCategoryDto`, `MenuItemDto`, `MenuItemDetailDto`, `ModifierGroupDto`, `ModifierOptionDto` + all create/update DTOs + `ReorderDto = { orderedIds: string[] }`.
- `upload.ts` — `PresignUploadDto`, `PresignedUploadResponseDto`.
- Add new permission keys to the union: `restaurant:write`, `menu:write`. Update `ROLE_PERMISSIONS` map (owner + manager get both).

### 2.3 API client — add to `packages/api-client`

- `restaurants.list`, `restaurants.bySlug`, `restaurants.create`, `restaurants.update`, `restaurants.getHours`, `restaurants.updateHours`.
- `menu.getTree(restaurantId)`, `menu.getItem(restaurantId, categorySlug, itemSlug)`.
- `menu.categories.create|update|delete|reorder`.
- `menu.items.create|update|delete|reorder|setAvailability`.
- `menu.items.addImage|removeImage|reorderImages`.
- `menu.modifierGroups.create|update|delete`.
- `menu.modifierOptions.create|update|delete`.
- `uploads.presign`.

### 2.4 Frontend hooks (per app)

For each of `apps/web`, `apps/admin`, `apps/mobile` — only add hooks the surface actually needs:

- **web + mobile**: `useRestaurant(slug)`, `useMenuTree(restaurantId)`, `useMenuItem(restaurantId, categorySlug, itemSlug)` — all read-only queries with sensible `staleTime` (5 min for menu).
- **admin only**: full mutation set — `useCreateMenuCategory`, `useUpdateMenuCategory`, `useDeleteMenuCategory`, `useReorderCategories`, `useCreateMenuItem`, `useUpdateMenuItem`, `useDeleteMenuItem`, `useToggleItemAvailability`, `useReorderItems`, `useAddMenuItemImage`, `useRemoveMenuItemImage`, `useReorderMenuItemImages`, `useCreateModifierGroup`, `useUpdateModifierGroup`, `useDeleteModifierGroup`, `useCreateModifierOption`, `useUpdateModifierOption`, `useDeleteModifierOption`, `useUpdateRestaurant`, `useOperatingHours`, `useUpdateOperatingHours`, `useUploadImage` (composite hook: calls `uploads.presign`, PUTs the file with `fetch`, returns the public URL).
- All mutations invalidate the right query keys. The `queryKeys` factory in each feature folder is the single source of key strings.

### 2.5 Route files (placeholder)

Create with `return null` + `// TODO(ui):` comments:

- `apps/web/src/app/menu/page.tsx`
- `apps/web/src/app/menu/[category]/page.tsx`
- `apps/web/src/app/menu/[category]/[slug]/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/categories/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/items/page.tsx`
- `apps/admin/src/app/(dashboard)/menu/items/[id]/page.tsx`
- `apps/admin/src/app/(dashboard)/locations/page.tsx`
- `apps/admin/src/app/(dashboard)/locations/[id]/page.tsx`
- `apps/mobile/app/menu.tsx`
- `apps/mobile/app/item/[id].tsx`

### 2.6 Seed data (additive)

Add a `seedRestaurants()` and `seedMenu()` function to `packages/db/seed.ts`. Run them after the existing seed:

- 1 restaurant (slug `the-test-kitchen`, with operating hours for all 7 days, timezone **`Europe/Warsaw`**, currency **`PLN`** — Poland target market).
- 6 categories per §Appendix A of the plan.
- ~30 menu items distributed across categories. Prices in `PLN` (reasonable Polish restaurant pricing — mains 35-65 PLN, drinks 8-15 PLN, etc.).
- 5 items with modifier groups (e.g., a pizza with "Size" required + "Toppings" optional, a burger with "Doneness", a drink with "Size").
- Seed is still idempotent. Use deterministic `cuid`-stable slugs as upsert keys.

### 2.7 Tests

- e2e: `menu.e2e-spec.ts` — public menu read returns expected tree; admin can create category + item; non-admin gets 403; cache invalidation actually happens (set, mutate, read again, assert fresh data).
- e2e: `uploads.e2e-spec.ts` — presign returns a URL; wrong mime is rejected; oversized file is rejected.
- Unit: at least one hook test in admin (`use-create-menu-item`) covering MSW happy + 422 validation error path.

### 2.8 Sprint 2 verification gate

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @repo/api test:e2e
pnpm dev   # all four apps boot, GET /api/v1/restaurants returns the seeded restaurant
curl -X POST http://localhost:4000/api/v1/uploads/presign \
  -H 'Authorization: Bearer <admin-token>' \
  -H 'Content-Type: application/json' \
  -d '{"kind":"menu-item-image","mimeType":"image/jpeg","sizeBytes":204800}'
# → 200 with { uploadUrl, publicUrl, key, expiresIn }
```

Write `.claude/reports/sprint-2-status.md` and **stop**.

---

## SPRINT 3 — Cart, Order Creation, Promotions/Coupons (no payment processing yet)

### 3.1 Backend modules

**`cart`**
- Cart identity:
  - Authed users → cart keyed by `userId + restaurantId`.
  - Guests → cart keyed by `sessionKey` (UUID stored client-side).
- `GET /cart?restaurantId=&sessionKey=` — returns current cart, creates an empty one if none.
- `POST /cart/items` — add item with `{ menuItemId, quantity, modifierSelections: [{ groupId, optionIds: [] }], notes }`. Server validates: item belongs to restaurant, modifier rules satisfied (required groups have selections, `minSelect`/`maxSelect` respected), computes `unitPrice` from menu (NEVER trust client). Stores resolved snapshot in `CartItem.modifierSnapshot`.
- `PATCH /cart/items/:id` — update quantity, modifiers, notes. Recomputes price.
- `DELETE /cart/items/:id`.
- `DELETE /cart` — clear all items.
- `POST /cart/merge` — body: `{ sessionKey }`. Called on login: takes the guest cart's items and merges them into the authed user's cart for the same restaurant (collapses duplicates by `menuItemId + modifierFingerprint`).
- `POST /cart/coupon` — body: `{ code }`. Validates against active promotions, sets `cart.appliedCouponId`.
- `DELETE /cart/coupon` — removes it.
- All endpoints return the recomputed `CartDto` (line items + totals breakdown).

**`orders` (creation + read only — payment in Sprint 4, status transitions in Sprint 5)**
- `POST /orders` — required `Idempotency-Key` header. Pipeline:
  1. Load cart server-side (don't trust client items).
  2. Re-validate every line: item still exists, still available, prices haven't shifted in flight.
  3. Apply coupon discount if present (re-verify all conditions).
  4. Compute totals: `subtotal`, `taxTotal`, `deliveryFee`, `tipAmount`, `discountTotal`, `grandTotal`. Use the `Decimal` helpers in `@repo/utils/money` — never JS numbers.
  5. Generate `orderNumber` (format `R-{YYYY}-{6-digit-sequence}` — implement with a Postgres sequence or a counter table; document your choice).
  6. In one transaction: create `Order` (status `PENDING`), `OrderItem[]` (with `nameSnapshot`, `modifierSnapshot`), record `CouponRedemption` if applicable, append a `PENDING` entry to `OrderStatusEvent`, clear the cart.
  7. Return the order.
- Idempotency: persist a hash of `{userId|sessionKey, idempotencyKey}` → `orderId` for 24h in Redis. Replays return the original order.
- `GET /orders` — list mine (auth required), paginated, filter by status.
- `GET /orders/:id` — full detail; ownership-checked (a customer can only read their own; admin with `order:read` can read any in their restaurant).

**`promotions`** + **`coupons`** (admin)
- `POST/PATCH/DELETE /promotions` — `@Permissions('promotion:write')`.
- `GET /promotions` — list, filter by active.
- `POST /promotions/:id/coupons` — create one or many coupon codes.
- `DELETE /coupons/:id` — soft-disable (don't delete redeemed ones).
- `POST /coupons/validate` — body: `{ code, subtotal, userId? }` — used by cart to validate before applying. Returns `{ valid, discountAmount, reason? }`.

### 3.2 Shared types

- `cart.ts` — `CartDto`, `CartItemDto`, `AddCartItemDto`, `UpdateCartItemDto`, `MergeCartDto`, `ApplyCouponDto`, `CartTotalsDto`.
- `order.ts` — `CreateOrderDto` (with `type`, `deliveryAddressId?`, `pickupAt?`, `notes`, `tipAmount`), `OrderDto`, `OrderListItemDto`, `OrderStatusEventDto`.
- `promotion.ts` — `PromotionDto`, `CreatePromotionDto`, `UpdatePromotionDto`, `CouponDto`, `CreateCouponDto`, `ValidateCouponDto`, `ValidateCouponResponseDto`.
- New permission keys: `order:read`, `order:write`, `promotion:write`. Update role map.

### 3.3 API client

Add resources: `cart.*`, `orders.*`, `promotions.*`, `coupons.*`.

### 3.4 Frontend — Zustand cart store

The cart store is the most interesting piece in Sprint 3. Pattern:

- Source of truth is the server (so server-side price recompute always wins). Store holds a **mirror** for instant UI feedback.
- On boot: read `sessionKey` (or generate one) from `localStorage` (web/admin) / `expo-secure-store` (mobile). Fetch cart.
- Optimistic update pattern via TanStack Query's `onMutate`/`onError`/`onSettled`; the Zustand store is the cache view layer.
- Store state: `cart`, `isLoading`, `pendingMutationCount` (so UI can show a subtle "saving…" indicator later).
- Actions wrap mutations: `addItem`, `updateItem`, `removeItem`, `clearCart`, `applyCoupon`, `removeCoupon`, `mergeOnLogin` (called from auth-store after a successful login).
- Implement in `apps/web/src/stores/cart-store.ts`, `apps/admin/src/stores/cart-store.ts` (admin might not need cart — confirm; if not, skip there), `apps/mobile/src/stores/cart-store.ts`.

### 3.5 Frontend hooks

- `useCart(restaurantId)` — query.
- `useAddToCart`, `useUpdateCartItem`, `useRemoveCartItem`, `useClearCart`, `useApplyCoupon`, `useRemoveCoupon`.
- `useCreateOrder` — generates idempotency key via `crypto.randomUUID()`, holds it in state for retry safety.
- `useOrder(id)`, `useOrders(filter)`.
- Admin only: `usePromotions`, `useCreatePromotion`, `useUpdatePromotion`, `useDeletePromotion`, `useCoupons`, `useCreateCoupon`, `useDeleteCoupon`, `useValidateCoupon`.

### 3.6 Route placeholders

- `apps/web/src/app/(shop)/cart/page.tsx`, `(shop)/checkout/page.tsx`, `(shop)/checkout/success/page.tsx`.
- `apps/web/src/app/(account)/orders/page.tsx`, `(account)/orders/[id]/page.tsx`.
- `apps/admin/src/app/(dashboard)/orders/page.tsx`, `(dashboard)/orders/[id]/page.tsx`, `(dashboard)/promotions/page.tsx`, `(dashboard)/promotions/[id]/page.tsx`.
- `apps/mobile/app/(tabs)/cart.tsx`, `apps/mobile/app/(tabs)/orders.tsx`, `apps/mobile/app/orders/[id].tsx`, `apps/mobile/app/checkout.tsx`, `apps/mobile/app/checkout/success.tsx`.

### 3.7 Seed data

Add to `seed.ts`: `seedPromotions()` — three promos per §Appendix A (`WELCOME10`, `FREEDEL`, `BOGO-PIZZA`).

### 3.8 Tests

- e2e `cart.e2e-spec.ts`: add/update/remove item, modifier validation rejects required-missing, guest→authed merge collapses duplicates, price recompute defeats client tampering.
- e2e `orders.e2e-spec.ts`: idempotent order creation (same key → same order id), order ownership scoping, coupon-applied totals correct.
- e2e `promotions.e2e-spec.ts`: coupon validation rules — expired / min-subtotal / per-user-limit / exhausted-max-redemptions.
- Unit: cart-store `mergeOnLogin` reducer logic + idempotency key retention in `useCreateOrder`.

### 3.9 Sprint 3 verification gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
# Manual: full happy path via curl — register → add to cart → apply coupon → create order
```

Write `.claude/reports/sprint-3-status.md` and **stop**.

---

## SPRINT 4 — Payments (Stripe + COD), Refunds, Receipts

### 4.1 Provider-agnostic architecture

In `apps/api/src/modules/payments`:

```
payments/
├── payments.module.ts
├── payments.service.ts          # orchestrates; calls the right provider
├── payments.controller.ts
├── payments.webhooks.controller.ts   # raw body parsing for signature verification
├── provider.interface.ts        # PaymentProvider abstract
├── providers/
│   ├── stripe.provider.ts
│   └── cod.provider.ts
└── webhook-events.service.ts    # dedupe by event id (table or Redis set)
```

The `PaymentProvider` interface is still abstract so a future provider (PayU, Adyen, etc.) can be added cleanly without refactoring the rest of the system. We're just not implementing one in this run.

`PaymentProvider` interface:

```ts
interface PaymentProvider {
  kind: PaymentMethodKind;
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  confirm?(input: ConfirmInput): Promise<ConfirmResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  parseWebhook(rawBody: Buffer, signature: string): WebhookEvent | null;
}
```

**Stripe configuration for Poland:**

The Stripe provider is configured to enable Polish-relevant payment methods on the PaymentIntent: cards, Apple Pay, Google Pay, **P24 (Przelewy24)**, and **BLIK**. Use Stripe's "automatic_payment_methods" with the restaurant's currency set to `PLN`. Capability check: this requires the Stripe account to have those payment methods enabled in the dashboard — document this in `docs/local-setup.md` under "Stripe setup."

Note on PaymentMethodKind enum: the existing schema has `STRIPE_CARD`, `APPLE_PAY`, `GOOGLE_PAY`, `PAYMOB`, `COD`, `WALLET`. We're not using `PAYMOB`. Leave it in the enum (removing requires a migration and serves no purpose — it's just an unused variant). Add two new values via migration: `P24` and `BLIK`. Flag this migration in your plan before writing it.

### 4.2 Endpoints

- `POST /payments/intent` — `{ orderId, provider: 'stripe' | 'cod', methodKind }`. Validates order is mine + status `PENDING` + payment status `PENDING`. Calls provider. Stores provider ref. For Stripe returns `{ clientSecret, publishableKey }`. For COD: short-circuits — marks `Payment.status = PENDING` (paid on delivery completion), transitions order to `CONFIRMED`, emits the same events Stripe would on webhook (kept for Sprint 5 to consume).
- `POST /payments/webhooks/stripe` — raw body parsing, signature verification, **idempotent dedupe by event id**. On `payment_intent.succeeded`: mark `Payment.status = PAID`, transition `Order` to `CONFIRMED`, append status event, enqueue receipt job, enqueue customer notification. Handle `payment_intent.payment_failed` and `charge.refunded` too.
- `POST /payments/:paymentId/refunds` — `@Permissions('payment:refund')`. Body: `{ amount?, reason }`. Partial refunds supported. On success: write `Refund`, transition order if full-refund to `REFUNDED`, revoke earned loyalty points (queue), enqueue refund email.

### 4.3 Tax + tip + fees

Move totals logic out of `orders.service` into `pricing.service` (shared module):

- `calculateTotals(input)` → returns `{ subtotal, taxTotal, deliveryFee, tipAmount, discountTotal, grandTotal }`.
- Tax: pull rate from `Restaurant.settings` (extend the JSON column or add `taxRate` Decimal — use a new migration if needed, but flag it in the plan). Default to **8% VAT** for the seeded Polish restaurant (Poland's reduced-rate VAT on prepared food, current as of plan date — verify before launch). The system should support per-restaurant configuration since rules change over time.
- Delivery fee: configurable per restaurant (start with a flat fee from settings; polygon zones land in Sprint 7).
- Tip: customer-supplied at checkout, validated >= 0 and ≤ subtotal × 100% (sanity bound). Note: tipping culture is weaker in Poland than US — UI sprint will default tip chips to lower values (5%, 10%, 15%) rather than US-standard (15%, 18%, 20%).
- Order creation in Sprint 3 already calls totals — refactor it to use the new shared service. Backfill tests.

### 4.4 Receipt PDF job

- BullMQ queue `receipt.generate`. Payload: `{ orderId }`.
- Processor renders a React PDF (use `@react-pdf/renderer`) — neutral template, restaurant name + logo, order details, line items, breakdown, payment method, refund note if applicable.
- On success: enqueues `email.receipt` job which sends the PDF as an attachment via Mailer.
- Triggered automatically on order `CONFIRMED` (after payment) and on refund creation.

### 4.5 Mobile-specific plumbing

Wire the **API plumbing** for Apple/Google Pay (the actual native sheet stays for the UI sprint):

- `usePaymentIntent({ orderId, provider, methodKind })` — returns `{ clientSecret, publishableKey }`.
- `useStripePublishableKey()` — fetches `/payments/config` which returns `{ stripePublishableKey, currency }`. Read-only public endpoint.
- Add `@stripe/stripe-react-native` as a mobile dep but don't initialize the provider in `app-providers.tsx` yet — leave a `// TODO(ui):` marker so the UI sprint plugs in `<StripeProvider>` once branding is set.

### 4.6 Shared types

- `payment.ts` — `CreatePaymentIntentDto`, `PaymentIntentResponseDto`, `PaymentDto`, `RefundDto`, `CreateRefundDto`, `PaymentConfigDto`.
- New permission keys: `payment:refund`, `payment:read`. Update role map (owner + manager get refund; cashier gets read).

### 4.7 API client + hooks

- Client: `payments.createIntent`, `payments.getConfig`, `payments.refund`, `payments.byOrderId`.
- Hooks (web + mobile customer-side): `usePaymentConfig`, `useCreatePaymentIntent`.
- Hooks (admin): `useCreateRefund`, `useOrderPayment(orderId)`.

### 4.8 Tests

- e2e `payments.e2e-spec.ts`: create-intent happy path (stripe mocked at the provider layer), webhook signature verification (good + bad signature), webhook idempotency (replay same event id → no double-confirmation), COD short-circuit transitions order to CONFIRMED, refund partial + full paths. Add specific tests for P24 and BLIK payment method types in the intent creation.
- Unit: `pricing.service` totals math — including a Decimal precision test (e.g., 3 items at 9.99 PLN with 8% tax should be exact, no float drift).
- Unit: receipt PDF processor — snapshot-test rendered PDF metadata (page count, first-page text contains order number).

### 4.9 Sprint 4 verification gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
# Full happy path: register → cart → order → create intent → simulate stripe webhook → confirm order is CONFIRMED → check email queue has a receipt job
```

Write `.claude/reports/sprint-4-status.md` and **stop**.

---

## SPRINT 5 — Order Lifecycle, Socket.IO Real-time, Notifications + (Fastify 5 + Swagger)

### 5.1 Pre-work: Fastify 5 bump + Swagger UI

This is the deferred item from Sprint 0+1. Do it first in Sprint 5 because Socket.IO setup interacts with the HTTP server.

- Upgrade `fastify` to `^5.x`, `@nestjs/platform-fastify` to the matching version.
- Wire `@nestjs/swagger@^8.1` with `@fastify/swagger` + `@fastify/swagger-ui`. Use `nestjs-zod` (or `@anatine/zod-openapi`) to derive OpenAPI from Zod schemas — same schemas already in `@repo/types`.
- Swagger UI at `/api/v1/docs`. Auth via "Bearer" scheme so I can paste a token and test.
- Verify all existing endpoints (Sprints 1–4) appear in the docs.

### 5.2 Order state machine

- `apps/api/src/modules/orders/order-state-machine.ts` — pure function: `canTransition(from, to, actor)` returning `true | string` (reason if false).
- Allowed transitions:
  - `PENDING → CONFIRMED` (payment-success or COD on create)
  - `PENDING → CANCELLED` (customer or admin)
  - `CONFIRMED → PREPARING` (kitchen)
  - `PREPARING → READY` (kitchen)
  - `READY → OUT_FOR_DELIVERY` (admin, delivery orders only)
  - `READY → COMPLETED` (admin/customer pickup confirmed, pickup orders only)
  - `OUT_FOR_DELIVERY → DELIVERED` (admin)
  - `DELIVERED → COMPLETED` (auto, after grace period)
  - `* → CANCELLED` (admin only, with reason; pre-payment only — post-payment must go through refund flow)
  - `CONFIRMED|PREPARING|READY|OUT_FOR_DELIVERY|DELIVERED → REFUNDED` (system, triggered by full refund in Sprint 4)
- Endpoint `POST /orders/:id/status` — body `{ to, note?, reason? }`. Permission gated by actor role:
  - `kitchen` may only advance through PREPARING → READY.
  - `cashier` may mark READY → COMPLETED.
  - `manager`/`owner` may do anything legal in the machine.
- On every transition: append `OrderStatusEvent`, emit Socket.IO event, enqueue notification.

### 5.3 Socket.IO gateway

In `apps/api/src/modules/realtime`:

- `@WebSocketGateway` configured with the Fastify HTTP server.
- Auth: handshake reads `auth.token` (or `Authorization` header for tools). Verify via `@repo/auth-core`. Reject connection with code 4401 if invalid/expired.
- Rooms a socket can join (subscribe message): `order:{orderId}`, `restaurant:{id}:orders`, `restaurant:{id}:kitchen`. Gateway checks permission for each room before joining (`order:{orderId}` requires ownership OR `order:read` for that restaurant; `restaurant:*` rooms require staff permissions on that restaurant).
- Emitted events (typed via Zod schemas in `packages/types/realtime.ts`):
  - `order.created`
  - `order.status_changed`
  - `order.cancelled`
  - `order.refunded`
  - `kitchen.ticket_added` (specifically for KDS — fires on CONFIRMED→PREPARING transition or sooner per restaurant settings)
- Service: `RealtimeService` with typed `emit{Event}` methods. Other modules inject and call (orders module emits transitions; payments emits refunds; cart doesn't emit anything customer-facing).

### 5.4 Notification dispatch

Cross-cutting `notifications` module orchestrates the matrix from §9 of the plan:

- `NotificationDispatcher.dispatch(event, payload)` decides which channels fire (email/sms/push/in-app) and enqueues into the right BullMQ queues.
- Persists a row in the `Notification` table for in-app feed (already in schema).
- Replace the Sprint 1 push stub: implement `expo-server-sdk` integration. Send-to-device based on tokens in the `PushToken` table.
- Hook into order lifecycle events emitted by `RealtimeService` — keep the dispatcher decoupled: it subscribes to an internal `EventEmitter` rather than calling realtime directly. Cleaner test surface.
- Templates: extend React Email templates with `OrderConfirmed`, `OrderOutForDelivery`, `OrderDelivered`, `OrderCancelled`, `RefundIssued`.

### 5.5 Kitchen feed endpoint

- `GET /kitchen/tickets?restaurantId=&station=` — admin-only — returns active orders for KDS: status in `(CONFIRMED, PREPARING)`, sorted by `confirmedAt`. Used by the kitchen page to render initial state before subscribing to the live room.

### 5.6 Frontend — socket client + hooks

Create `packages/realtime-client` (new shared package):
- Thin wrapper around `socket.io-client` with auth-aware connection.
- `createRealtimeClient({ url, getAccessToken })` returning a client with: `connect`, `disconnect`, `subscribe(room, handler)`, `unsubscribe`, typed event types matching the gateway.

Per-app:
- `src/lib/realtime-client.ts` — instantiates `createRealtimeClient`.
- Hooks:
  - `useOrderTracking(orderId)` — subscribes to `order:{orderId}`, updates the local TanStack Query cache for that order (`queryClient.setQueryData`) when events arrive. Returns the live order.
  - **Admin**: `useLiveOrders(restaurantId)` — subscribes to `restaurant:{id}:orders`, prepends new orders to the list cache, animates by setting a transient `isNew: true` flag (cleared after 3s).
  - **Admin**: `useKitchenFeed(restaurantId)` — initial fetch via `GET /kitchen/tickets` + subscribe to `restaurant:{id}:kitchen`.
  - `useUpdateOrderStatus()` mutation.
- Connection lifecycle: connect on app boot after auth hydration; disconnect on logout; auto-reconnect with backoff. Implemented inside the client wrapper, exposed via `useRealtimeStatus()` hook for later debug UI.

### 5.7 Route placeholders

- `apps/web/src/app/(account)/orders/[id]/page.tsx` already exists — keep `return null`.
- `apps/admin/src/app/(dashboard)/orders/page.tsx` — already exists, will be the live list.
- `apps/admin/src/app/(dashboard)/orders/kitchen/page.tsx` — new, returns null with TODO.
- `apps/mobile/app/orders/[id].tsx` — already exists.

### 5.8 Tests

- e2e `order-state-machine.e2e-spec.ts`: every legal transition succeeds, illegal transitions return 422 with a clear reason, role-gated transitions enforced.
- e2e `realtime.e2e-spec.ts` (using `socket.io-client` against the running app): unauthenticated connection rejected, authenticated client receives `order.status_changed` after a transition.
- Unit: `order-state-machine` pure function — exhaustive transition matrix table-test.
- Unit: `useOrderTracking` (MSW + a tiny mock socket) — cache patches arrive correctly.
- Unit: `notification-dispatcher` — emitting `order.confirmed` enqueues the right jobs per the matrix.

### 5.9 Sprint 5 verification gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
pnpm dev
# Open http://localhost:4000/api/v1/docs — Swagger UI renders, every endpoint listed
# Manual: connect to socket from a tiny client, transition an order, observe the event
```

Write `.claude/reports/sprint-5-status.md`. Then write the combined final report `.claude/reports/sprints-2-5-complete.md` summarizing all four sprints, decisions made, known gaps, and bring-up updates.

---

## CROSS-CUTTING NON-NEGOTIABLES

- **Idempotency** is mandatory on `POST /orders` and `POST /payments/webhooks/*`. Document the storage choice (Redis key vs `webhook_events` table) — both are fine but pick one and apply consistently.
- **Server-side price authority**: at every cart mutation and every order creation, server recomputes from menu data. The client's numbers are display-only.
- **`Decimal` only** for money. Use `@repo/utils/money` helpers. A single accidental `Number(price) * qty` in this codebase is a bug.
- **Permission decorators** on every protected route. If a new permission key is needed, add it to the `PermissionKey` union and `ROLE_PERMISSIONS` map in one place (`packages/types/permissions.ts`).
- **Cache invalidation** on every menu/restaurant/promotion write. Stale menus shipping to customers is the #1 thing that breaks trust.
- **No new state-management libraries** beyond Zustand + TanStack Query.
- **No raw SQL** unless impossible in Prisma (justify in code comment).

---

## WHAT NOT TO DO

- No UI work. Page/screen files return `null` with `// TODO(ui):` comments. Exception: socket lifecycle integration in `app-providers.tsx` is fine (it's plumbing, not UI).
- No reservations, reviews, loyalty redemption flow, analytics rollups, or marketing pages — those are Sprint 6–8.
- No "kitchen UI" or "KDS layout" — just the data feed.
- Do not change the existing schema unless explicitly called out (e.g., tax-rate field on Restaurant in Sprint 4). Any other schema change must be flagged in the plan and approved before migrating.
- Do not regenerate or alter the existing `init` migration. Add a new migration per sprint if changes are needed (`add-restaurant-tax-rate`, etc.).
- Do not touch authentication flow beyond minor additions (e.g., socket auth uses the existing JWT verifier — don't invent a new mechanism).
- Do not reintroduce passport, axios, react-query v4 syntax, or any other library you might see in other examples online — stick to what's already in the monorepo.

---

## REPORTING

At each sprint gate, write `.claude/reports/sprint-N-status.md` with:
- Files created/modified count by package.
- Verification commands run + outcomes.
- Decisions you made that weren't specified (call them out clearly).
- Known gaps left for the UI sprint or for later backend work.

After Sprint 5 completes, write `.claude/reports/sprints-2-5-complete.md` (final combined report) covering:
- Everything implemented across all four sprints.
- All decisions made.
- Updated bring-up checklist (anything that changed since Sprint 0+1).
- Anything I should know before starting the UI build.

---

## START

1. Read `docs/restaurant-app-project-plan.md`, `docs/sprints/sprint-0-1-claude-code-prompt.md`, `docs/sprints/sprint-0-1-complete.md`, and `CLAUDE.md`.
2. Write the combined plan to `.claude/plans/sprint-2-5.md` organized by sprint with phases, file paths, and verification commands.
3. List open questions.
4. **Stop and wait for my approval before writing any code.**
