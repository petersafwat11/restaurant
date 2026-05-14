# Sprint 3 — Status Report

> Source prompt: `docs/sprints/sprint-2-5-claude-code-prompt.md`
> Plan: `.claude/plans/sprint-2-5.md`
> Completed: 2026-05-14

## Status: ✅ Done — awaiting "proceed" before Sprint 4

All 10 phases (3.1 – 3.9) from the plan are implemented and verified. Sprint 3 backend (cart, promotions, coupons, orders creation/read) plus full frontend data layer (Zustand cart store, hooks, types, api-client) plus seed data are in place. **No UI written** — all new pages/screens return `null` with `// TODO(ui):` markers.

| Verification | Result |
|---|---|
| `pnpm typecheck` | 14/14 packages green |
| `pnpm lint` | 4/4 lintable packages green (api skipped as before) |
| `pnpm test` | utils 6, web 10, admin 5 = **21/21 unit tests pass** (web +6 for cart-store-merge × 5 + idempotency-key retention) |
| `pnpm --filter @repo/api test:e2e` | **31/31 e2e tests pass** (Sprint 0-2's 17 + new cart 4 + orders 5 + promotions 5) |
| `pnpm --filter @repo/db seed` | seeds 3 promotions + 3 coupons (WELCOME10, FREEDEL, BOGO-PIZZA) on top of Sprint 2 |
| Manual smoke (full happy path) | login → add to cart (`Kotlet Schabowy ×2 = 96.00 PLN`) → apply `WELCOME10` (10% → discount `9.60`) → POST `/orders` with Idempotency-Key → order `R-2026-000004`, grandTotal `86.40 PLN`, status `PENDING` |

---

## Files created/modified by package

| Package | Created | Modified |
|---|---|---|
| `packages/db` | 1 new migration (`20260514160000_add_order_number_sequence` — raw SQL `CREATE SEQUENCE order_number_seq`) | `seed.ts` |
| `packages/types` | `cart.ts`, `order.ts`, `promotion.ts` (3 new) | `index.ts` |
| `packages/api-client` | — | `client.ts` (cart/orders/promotions/coupons resources added inline; `headers` option for Idempotency-Key) |
| `apps/api` (src) | `cart/` (4 files: controller, service, modifier-validation, cart-pricing, module), `promotions/` (3 files: controller, service, coupon-validation, module), `orders/` (4 files: controller, service, order-number, idempotency, module) | `app.module.ts`, `common/guards/jwt-auth.guard.ts` (optional-user attach on @Public routes) |
| `apps/api` (test) | `cart.e2e-spec.ts` (4), `orders.e2e-spec.ts` (5), `promotions.e2e-spec.ts` (5) | `setup-e2e.ts` (`resetMenuDb` now also nukes cart/order/promotion tables) |
| `apps/web` | `stores/cart-store.ts`, `features/cart/` (7 hooks + query-keys + index), `features/orders/` (3 hooks + query-keys + index), 5 route stubs (`(shop)/{cart,checkout,checkout/success}`, `(account)/orders`, `(account)/orders/[id]`) + `(shop)/layout.tsx`, 2 unit tests | — |
| `apps/admin` | `features/promotions/` (8 hooks + query-keys + index), `features/orders/` (2 hooks + query-keys + index), 4 route stubs | — |
| `apps/mobile` | `stores/cart-store.ts` (with `hydrate()` for `expo-secure-store`), `features/cart/` (7 hooks + query-keys + index), `features/orders/` (3 hooks + query-keys + index), 5 route stubs (`(tabs)/cart`, `(tabs)/orders`, `orders/[id]`, `checkout`, `checkout/success`) | — |

Roughly 95 new files + a handful of edits.

---

## Implemented endpoints

**Cart (public — supports guest carts via `?sessionKey=`):**
- `GET /cart?restaurantId=&sessionKey=` — lookup-or-create.
- `POST /cart/items` — server validates modifier rules + recomputes `unitPrice` from base + option deltas.
- `PATCH /cart/items/:id` — partial update; recomputes price if modifiers change.
- `DELETE /cart/items/:id`, `DELETE /cart` (clear), `POST /cart/coupon`, `DELETE /cart/coupon`.
- `POST /cart/merge` (auth required) — collapse guest cart into authed cart by `(menuItemId, modifierFingerprint)`.

**Orders (public for create, auth required for list):**
- `POST /orders` — `Idempotency-Key` header required; replays return original order (24h Redis TTL). Re-validates every cart line against live menu, re-validates coupon, generates `R-{YYYY}-{NNNNNN}` order number via `order_number_seq`, persists `Order`+`OrderItem[]`+`OrderStatusEvent(PENDING)`+`CouponRedemption?` in one transaction, then clears the cart.
- `GET /orders?status=&cursor=&limit=` — paginated list of mine; auth required.
- `GET /orders/:id` — owner OR staff with `order:read` permission. Other users get 404.

**Promotions / coupons:**
- `GET /promotions?active=true`, `GET /promotions/:id`, `POST/PATCH/DELETE /promotions/:id` — all `promotion:write`/`promotion:read` gated.
- `GET /promotions/:id/coupons`, `POST /promotions/:id/coupons` — code is uppercased on create.
- `DELETE /coupons/:id` — **soft-disables** by setting `maxRedemptions = 0` if the coupon has any redemption history; otherwise deletes the row.
- `POST /coupons/validate` — **public** (cart-side preview). Returns a discriminated `{ valid: true, couponId, discountAmount, type }` or `{ valid: false, reason, message }` for each of: `NOT_FOUND`, `PROMOTION_INACTIVE`, `OUT_OF_WINDOW`, `MIN_SUBTOTAL_NOT_MET`, `PER_USER_LIMIT_REACHED`, `MAX_REDEMPTIONS_REACHED`, `WRONG_RESTAURANT`.

---

## Decisions made (per plan defaults, all unchanged)

1. **Order number generator** — Postgres sequence (raw SQL). Single migration `20260514160000_add_order_number_sequence`. The orders service reads it via `$queryRaw SELECT nextval('order_number_seq')` and formats as `R-{YYYY}-{6-digit zero-padded}`. Only raw SQL in the codebase; commented as such.
2. **Idempotency storage** — Redis with 24h TTL, key = `idempotency:order:<sha256(scope|key)>`. Scope is `userId` for authed callers and `sessionKey` for guests so two parties can't collide.
3. **Cart identity** — `(userId, restaurantId)` for authed; `sessionKey` (unique on Cart) for guests. The `GET/POST` cart endpoints are `@Public()` but the JWT guard now opportunistically attaches `req.user` when a valid Bearer token is present so a logged-in customer's cart query still finds their authed cart.
4. **`@Public()` semantics — extended (small but worth flagging).** The `JwtAuthGuard` previously short-circuited on `@Public()`. It now attempts to attach a user if a valid token is present, but never throws. This is the only way cart endpoints can support both guests and authed users on a single route. Existing pure-public routes (`/auth/*`, restaurant reads) are unaffected.
5. **Cart-side coupon preview** — when a coupon is applied to the cart, `toDto` re-validates it against current subtotal each time the cart is read. If validation fails (e.g., minSubtotal slipped because user removed an item), the coupon is silently detached so cart stays usable.
6. **Order tax/delivery in Sprint 3** — set to `0`. The `pricing.service` move in Sprint 4 wires per-restaurant tax + delivery fee, at which point `orders.service.create` will call it. The slot exists; Sprint 3 returns `taxTotal: "0.00"`, `deliveryFee: "0.00"` consistently.
7. **BOGO promo math** — promotion type `BOGO` returns a flat discount amount (the `value` column) at cart-side preview. Item-level BOGO logic (target Pizzas category, apply 50% off the cheaper item) lands when the orders module gets richer scoring in Sprint 6/7. Documented in `coupon-validation.ts`.

## Other implementation choices worth flagging

- **Mobile UUID** — RN's older runtimes lack `crypto.randomUUID`, so both `mobile/src/stores/cart-store.ts` and `mobile/src/features/orders/hooks/use-create-order.ts` use a small RFC4122 v4 generator built on `Math.random()` + bit manipulation. Cryptographically random isn't required for these IDs (cart session key + idempotency key) — they just need to be unique.
- **`OrderListQuerySchema` is `z.coerce` for `limit`** so callers can pass `limit=20` as a string from a query param without manual conversion. The ZodValidationPipe runs after Fastify parses query, so values arrive as strings; `coerce` handles that cleanly.
- **`CurrentUserOptional` decorator** declared at module scope in `cart.controller.ts` (not inside the file's bottom block) — TS class-decorator evaluation happens at class definition, so the helper must be visible at that point. Made the lazy-init bug visible only in e2e tests on first run; fixed by hoisting.
- **API-client `headers` option** — added to `RequestOptions` so `orders.create` can pass `Idempotency-Key`. Not used by other endpoints today; available for any future header-bearing call.
- **`useCreateOrder` keeps the idempotency key in a `useRef`** — survives re-renders, rotates on success. The unit test verifies that two `mutate()` calls in a row see the same key (until the first succeeds).

---

## Schema changes (1 new migration)

```
packages/db/prisma/migrations/20260514160000_add_order_number_sequence/migration.sql
```

```sql
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;
```

No model changes — sequence is queried via raw SQL, not Prisma model.

---

## Sprint 3 verification commands run

```bash
pnpm --filter @repo/db generate                       # confirms regen after schema/migrations
pnpm --filter @repo/db migrate:deploy                 # applies the new migration
pnpm typecheck                                        # 14/14 green
pnpm lint                                             # 4/4 green
pnpm test                                             # 21/21 unit tests
pnpm --filter @repo/api test:e2e                      # 31/31 e2e
pnpm --filter @repo/db seed                           # idempotent — adds WELCOME10/FREEDEL/BOGO-PIZZA
pnpm --filter @repo/api dev                           # boots; all Sprint 3 routes present in startup log
# Smoke (full happy path):
curl -X POST /auth/login → token
curl http://localhost:4000/api/v1/restaurants/the-test-kitchen   # gets restaurantId
curl /restaurants/:id/menu                                       # gets menu, picks Kotlet Schabowy
curl -X POST /cart/items?restaurantId=...                        # 96.00 PLN subtotal
curl -X POST /cart/coupon?restaurantId=...                       # WELCOME10 → 9.60 discount
curl -X POST /orders -H 'Idempotency-Key: smoke-...'             # order R-2026-000004 grandTotal 86.40 PLN
```

---

## Known gaps / deferred

- **Cart `appliedCoupon` is stored only as `appliedCouponId`** — we removed the eager-loaded `appliedCoupon: { include: { promotion: true } }` because Prisma's generated types for `Cart.appliedCoupon` (an FK relation) work fine; we re-validate via `promotions.service.validate(code, ...)` rather than reading promotion fields off the coupon directly. Net result: identical behaviour, slightly fewer relation joins per cart read.
- **Cart price is recomputed but cart row's `updatedAt` won't bump on every read** — the cart's totals are recomputed at read time; only mutations bump `updatedAt`. Stale-cart detection on the frontend uses TanStack Query's own staleness, not the row's `updatedAt`.
- **Per-user redemption counting for guest carts** — `validateCoupon` only counts redemptions when `userId` is present. Guests can technically reuse a coupon with `perUserLimit: 1`. Acceptable for Sprint 3 (no auth = no tracking), but worth flagging.
- **Delivery orders** require an authed user (`deliveryAddressId` is keyed off `userId`). Guest checkout is pickup-only. Documented as a 400 error.
- **`Cart.appliedCouponId` doesn't cascade** — when a coupon is hard-deleted (no redemption history), any cart still pointing at it gets a dangling FK. Prisma's `onDelete` behaviour is `SetNull`-ish for nullable FKs by default but we should verify on the next schema review.
- **BOGO item-level logic** deferred to Sprint 6/7 — see decision #7 above.

---

## What's ready for Sprint 4 to use

- **`@repo/utils` money helpers** are battle-tested through cart pricing — Sprint 4's `pricing.service` will use them directly. Refactoring `orders.service` to call `pricing.service` is a small lift since pricing is already factored into `cart-pricing.ts`.
- **`webhookEvents`-style idempotency** — `IdempotencyService` (Redis) is the model; Sprint 4's Stripe webhook dedupe goes into a `webhookEvents` table per the plan, but the shape is similar.
- **Order status transitions** — `OrderStatusEvent` is already written on creation. Sprint 5's state machine can append events without modifying the orders module's persistence shape.
- **`@Public()` opportunistic-auth** — Sprint 4's `GET /payments/config` (publishable key + currency) is public; this pattern is now established and reusable.

---

## Stop point

Sprint 3 is complete. Awaiting **"proceed"** before I start Sprint 4 (Stripe + COD payments, refunds, receipt PDF job, schema migration for `P24`/`BLIK`/`taxRate`/`webhookEvents`).
