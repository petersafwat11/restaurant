# Sprints 2-5 Combined Plan — Restaurant/Menu, Cart/Checkout, Payments, Real-time (NO UI)

> Source prompt: `docs/sprints/sprint-2-5-claude-code-prompt.md`
> Reference docs read in full: `docs/restaurant-app-project-plan.md`, `docs/sprints/sprint-0-1-claude-code-prompt.md`, `.claude/reports/sprint-0-1-complete.md`, `CLAUDE.md`.
> Date: 2026-05-14

## Status
- Sprint 0 + Sprint 1: complete (auth, users, addresses, RBAC, frontend hooks/stores/route stubs).
- Full Prisma schema for the entire project is already applied (one `init` migration). All Sprint 2-5 tables exist.
- Existing Sprint 0+1 decisions (hand-rolled `JwtAuthGuard`, Vitest+SWC, `@swc-node/register`, pnpm `@types/react@18.3.18` override, `dotenv -e ../../.env --` prefix, Biome `useImportType` off, Biome lint skipped on `apps/api`, web/admin tokens hybrid, mobile tokens in `expo-secure-store`, `notify` is a no-op) stay in force and are not relitigated.

---

## Conventions confirmed by the existing repo (do NOT diverge)

These are deliberately enumerated so we don't accidentally re-architect Sprint 0+1's choices:

1. **API module layout is flat** — `apps/api/src/auth/`, `apps/api/src/users/`, `apps/api/src/addresses/`. The Sprint 2-5 prompt says `apps/api/src/modules/<name>`, but the existing repo does not use a `modules` parent. New backend modules in this plan are added at the same level: `apps/api/src/restaurants`, `apps/api/src/menu`, etc.
2. **e2e tests** live in `apps/api/test/<name>.e2e-spec.ts` using Vitest + `fastifyApp.inject(...)` (the pattern in `auth.e2e-spec.ts` / `addresses.e2e-spec.ts`). New e2e specs follow that pattern; we don't introduce supertest even though it's a devDep.
3. **Types** are Zod schemas + `z.infer` DTOs in `packages/types/src/<feature>.ts`, re-exported from `packages/types/src/index.ts`.
4. **Permissions** are extended by adding the key to the `PermissionKey` union and the `ROLE_PERMISSIONS` map in `packages/types/src/permissions.ts`, then re-seeded by `pnpm db:seed` (which is idempotent).
5. **api-client** uses the `createApiClient` factory shape from `packages/api-client/src/client.ts`. New resources are added to that factory.
6. **App folder structure** in web/admin/mobile follows Sprint 0+1: hooks in `src/features/<feature>/hooks/`, query-key factories in `src/features/<feature>/hooks/query-keys.ts`, route files in `app/...` returning `null` with a `// TODO(ui):` marker.
7. **No UI**: no JSX content beyond `return null`. No Tailwind utility classes on elements. No shadcn/NativeWind components.

---

## Cross-sprint scaffolding done once at the start of Sprint 2

These items are needed by multiple sprints; doing them upfront avoids re-touching shared files:

- **`packages/utils/money.ts`** — Decimal helpers. The prompt mandates `@repo/utils/money.ts` but the file doesn't exist yet. Add:
  - Re-export `Decimal` from `decimal.js` (or `@prisma/client/runtime/library`'s `Decimal` — decision below in Open Questions).
  - `toDecimal(value: Decimal.Value): Decimal`
  - `addAll(values: DecimalLike[]): Decimal`
  - `multiply(amount, qty)`
  - `sum(...): Decimal`
  - `formatMoney(d: Decimal, currency: string): string` (Intl)
  - `clampNonNegative(d: Decimal): Decimal`
  - Round-half-up to 2 decimals on every result.
- **`packages/utils/src/index.ts`** — re-export `./money`.
- **Cache helper** — add `apps/api/src/redis/cache.service.ts` with `getOrSet<T>(key, ttlSeconds, loader)` + `invalidate(key | keys[])`. Built on the existing `RedisService`. Reused by menu, restaurants, and (later) coupons.
- **Permissions**: extend `packages/types/src/permissions.ts` with all new keys at the time of first use:
  - Sprint 2: `restaurant:write`, `menu:write`
  - Sprint 3: `order:read`, `order:write`, `promotion:write`
  - Sprint 4: `payment:read`, `payment:refund`
  - Sprint 5: `order:status_update` (kitchen workflow), `kitchen:read`
  - Update `ROLE_PERMISSIONS`: owner gets everything; manager gets everything except `staff:write`, `settings:write`; kitchen gets `order:read` + `order:status_update` + `kitchen:read`; cashier gets `order:read` + `order:write` + `payment:read`.
- **Seed extension** — `packages/db/seed.ts` is already idempotent. Each sprint appends a new seeder function (additive) and the top-level `main()` calls them in order.

---

# Sprint 2 — Restaurant + Menu + Uploads

## Phase 2.0 — Cross-cutting scaffolding (above)
**Files:**
- `packages/utils/src/money.ts` (new)
- `packages/utils/src/index.ts` (edit)
- `apps/api/src/redis/cache.service.ts` (new)
- `apps/api/src/redis/redis.module.ts` (edit — provide `CacheService`)
- `packages/types/src/permissions.ts` (edit — add `restaurant:write`, `menu:write`)
- `packages/db/seed.ts` (edit — make seeder support new permissions)

**Verify:** `pnpm --filter @repo/utils test` (we'll add a money unit test in Sprint 4 alongside `pricing.service`).

## Phase 2.1 — Shared types in `packages/types`

**Files:**
- `packages/types/src/restaurant.ts` (new) — `RestaurantPublicDto`, `RestaurantAdminDto`, `CreateRestaurantDto`, `UpdateRestaurantDto`, `OperatingHoursDto`, `UpdateOperatingHoursDto` (array of 7, indexed by `dayOfWeek` 0-6).
- `packages/types/src/menu.ts` (new) — `MenuTreeDto`, `MenuCategoryDto`, `MenuItemDto`, `MenuItemDetailDto`, `ModifierGroupDto`, `ModifierOptionDto`, `MenuItemImageDto` + create/update DTOs for every level + `ReorderDto = { orderedIds: string[] }`.
- `packages/types/src/upload.ts` (new) — `PresignUploadDto` (`kind`, `mimeType`, `sizeBytes`), `PresignedUploadResponseDto`.
- `packages/types/src/index.ts` (edit) — re-export the three new modules.

**Verify:** `pnpm --filter @repo/types typecheck`.

## Phase 2.2 — `apps/api/src/uploads`

**Files:**
- `apps/api/src/uploads/uploads.controller.ts` — `POST /uploads/presign` guarded by `@Permissions('menu:write','restaurant:write')` (either-or — we'll add an `@AnyPermissions(...)` decorator if not present, otherwise check inside the service).
- `apps/api/src/uploads/uploads.service.ts` — wraps `@aws-sdk/client-s3` (R2-compatible endpoint), uses `@aws-sdk/s3-request-presigner` with 5-min TTL. Validates mime (`image/jpeg|png|webp`) and size (≤5MB).
- `apps/api/src/uploads/uploads.module.ts`
- `apps/api/src/config/env.ts` (edit) — extend Zod schema with `R2_PUBLIC_URL` (the public base URL for read access), already has `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Treat empty R2 envs in dev as "stub mode" returning a fake URL so the dev environment doesn't require real R2 credentials — flag this clearly in code and the report.
- `apps/api/src/app.module.ts` (edit) — register `UploadsModule`.

**Add deps:** `@aws-sdk/client-s3@^3`, `@aws-sdk/s3-request-presigner@^3` to `apps/api/package.json`.

**Verify:** module compiles; `test/uploads.e2e-spec.ts` covers presign happy + bad-mime + oversized.

## Phase 2.3 — `apps/api/src/restaurants`

**Files:**
- `apps/api/src/restaurants/restaurants.controller.ts`
- `apps/api/src/restaurants/restaurants.service.ts`
- `apps/api/src/restaurants/restaurants.module.ts`

**Endpoints (all on the global prefix `/api/v1`):**
- `GET /restaurants` — public, list active restaurants. Cached 5-min Redis key `restaurants:list`.
- `GET /restaurants/:slug` — public, full detail + hours. Cached 5-min, key `restaurant:slug:<slug>`.
- `POST /restaurants` — `@Permissions('restaurant:write')`.
- `PATCH /restaurants/:id` — `@Permissions('restaurant:write')`. Invalidates both list cache + slug-specific cache.
- `GET /restaurants/:id/hours` — public.
- `PUT /restaurants/:id/hours` — `@Permissions('restaurant:write')`. Replaces all 7 entries in a single Prisma `$transaction` (delete then create OR upsert by `(restaurantId, dayOfWeek)` — schema needs a unique constraint; see Open Questions).

**Verify:** included in `menu.e2e-spec.ts` (creates a restaurant in the test setup).

## Phase 2.4 — `apps/api/src/menu`

**Files:**
- `apps/api/src/menu/menu.controller.ts` (public reads + admin writes)
- `apps/api/src/menu/menu.service.ts`
- `apps/api/src/menu/menu.module.ts`

**Endpoints:**

Public reads (cached 5-min, key `menu:<restaurantId>`):
- `GET /restaurants/:restaurantId/menu` — full tree (categories → items → modifierGroups → options).
- `GET /restaurants/:restaurantId/menu/categories/:categorySlug/items/:itemSlug` — single item detail.

Availability fast-path (separate cache key `availability:<itemId>` with write-through, no TTL):
- `POST /menu/items/:id/availability` — `@Permissions('menu:write')`. Cheap; doesn't bust the tree cache. On read, the public menu controller checks each item's availability key and merges (only if present — fallback to the row).

Admin (all `@Permissions('menu:write')`, all invalidate `menu:<restaurantId>` on success):
- `POST /menu/categories`, `PATCH /menu/categories/:id`, `DELETE /menu/categories/:id`.
- `POST /menu/categories/reorder` — `{ orderedIds: string[] }`, single transaction.
- `POST /menu/items`, `PATCH /menu/items/:id`, `DELETE /menu/items/:id`.
- `POST /menu/items/reorder` — same pattern, scoped by `categoryId`.
- `POST /menu/items/:id/images` — body `{ key, alt? }` (links an R2 key already uploaded), creates a `MenuItemImage` row.
- `DELETE /menu/items/:id/images/:imageId`.
- `POST /menu/items/:id/images/reorder` — `{ orderedIds: string[] }`.
- `POST /menu/items/:id/modifier-groups`, `PATCH /menu/modifier-groups/:id`, `DELETE /menu/modifier-groups/:id`.
- `POST /menu/modifier-groups/:id/options`, `PATCH /menu/modifier-options/:id`, `DELETE /menu/modifier-options/:id`.

**Verify:** `apps/api/test/menu.e2e-spec.ts`.

## Phase 2.5 — `packages/api-client` additions

**Files:**
- `packages/api-client/src/resources/restaurants.ts` (new)
- `packages/api-client/src/resources/menu.ts` (new — grouped `menu.categories.*`, `menu.items.*`, etc.)
- `packages/api-client/src/resources/uploads.ts` (new)
- `packages/api-client/src/client.ts` (edit) — register the three new resources on the returned client.
- `packages/api-client/src/index.ts` (edit) — re-export resource types if any are needed externally.

**Verify:** `pnpm --filter @repo/api-client typecheck`.

## Phase 2.6 — Frontend hooks per app

For each app, only the hooks the app's surface needs:

**web** (`apps/web/src/features/...`):
- `features/restaurants/hooks/use-restaurant.ts`, `query-keys.ts`.
- `features/menu/hooks/use-menu-tree.ts`, `use-menu-item.ts`, `query-keys.ts`.

**mobile** (`apps/mobile/src/features/...`): same set as web.

**admin** (`apps/admin/src/features/...`):
- `features/restaurants/hooks/use-restaurant.ts`, `use-update-restaurant.ts`, `use-operating-hours.ts`, `use-update-operating-hours.ts`, `query-keys.ts`.
- `features/menu/hooks/` — full admin mutation set as enumerated in the prompt §2.4 (categories CRUD+reorder, items CRUD+reorder+availability, images CRUD+reorder, modifier groups + options CRUD, plus read tree).
- `features/uploads/hooks/use-upload-image.ts` — composite hook: calls `uploads.presign`, PUTs the file with `fetch`, returns `{ publicUrl, key }`.

All mutations invalidate the right `queryKeys` factory. Stale-time on menu queries: 5 min.

## Phase 2.7 — Route placeholders

All return `null` with `// TODO(ui): ...` comments.

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

Note: admin app doesn't yet have a `(dashboard)` route group — create the group's `layout.tsx` returning `<>{children}</>` (no styling).

## Phase 2.8 — Seed data

`packages/db/seed.ts` (edit) — add `seedRestaurants()` and `seedMenu()`:
- 1 restaurant: slug `the-test-kitchen`, timezone `Europe/Warsaw`, currency `PLN`, 7 operating-hours rows.
- 6 categories per §Appendix A (Starters, Mains, Pizzas, Burgers, Desserts, Drinks).
- ~30 items distributed across categories with Polish-market prices (mains 35-65 PLN, drinks 8-15 PLN, etc.).
- 5 items with modifier groups (pizza Size required + Toppings optional, burger Doneness, drink Size, etc.).
- Idempotent: upsert categories by `(restaurantId, slug)`, items by `(categoryId, slug)`. Modifier groups upserted by a deterministic `name+itemId` lookup since the schema has no unique key on those (see Open Questions).

## Phase 2.9 — Tests

- `apps/api/test/menu.e2e-spec.ts`:
  - public menu read returns the expected category/item tree.
  - admin (owner token) can create a category + an item; non-admin (customer) gets 403.
  - cache invalidation: read menu → mutate an item → read again → assert fresh data.
- `apps/api/test/uploads.e2e-spec.ts`:
  - presign returns `{ uploadUrl, publicUrl, key, expiresIn }`.
  - bad mime (`application/pdf`) → 422.
  - oversized (`sizeBytes: 6 * 1024 * 1024`) → 422.
- `apps/admin/src/features/menu/hooks/__tests__/use-create-menu-item.test.ts`:
  - MSW happy path + 422 validation-error path.

## Sprint 2 verification gate

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @repo/api test:e2e
# Smoke (manual):
curl http://localhost:4000/api/v1/restaurants
# → 200 with the seeded restaurant
curl -X POST http://localhost:4000/api/v1/uploads/presign \
  -H 'Authorization: Bearer <owner-token>' \
  -H 'Content-Type: application/json' \
  -d '{"kind":"menu-item-image","mimeType":"image/jpeg","sizeBytes":204800}'
# → 200 with { uploadUrl, publicUrl, key, expiresIn }
```

Write `.claude/reports/sprint-2-status.md` and **stop for approval.**

---

# Sprint 3 — Cart, Order Creation, Promotions/Coupons (no payment processing yet)

## Phase 3.1 — Shared types

**Files:**
- `packages/types/src/cart.ts` (new) — `CartDto`, `CartItemDto`, `AddCartItemDto`, `UpdateCartItemDto`, `MergeCartDto`, `ApplyCouponDto`, `CartTotalsDto`.
- `packages/types/src/order.ts` (new) — `CreateOrderDto` (`type`, `deliveryAddressId?`, `pickupAt?`, `notes?`, `tipAmount`), `OrderDto`, `OrderListItemDto`, `OrderStatusEventDto`.
- `packages/types/src/promotion.ts` (new) — `PromotionDto`, `CreatePromotionDto`, `UpdatePromotionDto`, `CouponDto`, `CreateCouponDto`, `ValidateCouponDto`, `ValidateCouponResponseDto`.
- `packages/types/src/permissions.ts` (edit) — add `order:read`, `order:write`, `promotion:write`. Update role map.
- `packages/types/src/index.ts` (edit).

## Phase 3.2 — `apps/api/src/cart`

Cart identity:
- Authed → keyed by `(userId, restaurantId)`; lookup-or-create.
- Guests → keyed by `sessionKey`; lookup-or-create.

**Endpoints:**
- `GET /cart?restaurantId=&sessionKey=` (auth optional).
- `POST /cart/items` — body `{ menuItemId, quantity, modifierSelections: [{ groupId, optionIds: [] }], notes? }`. Service validates item belongs to restaurant, modifier rules satisfied (required groups satisfied, `minSelect`/`maxSelect` respected), computes `unitPrice` from menu+modifiers (never trust client), stores resolved `modifierSnapshot`.
- `PATCH /cart/items/:id` — qty, modifiers, notes; recomputes.
- `DELETE /cart/items/:id`.
- `DELETE /cart` — clears.
- `POST /cart/merge` — auth required, body `{ sessionKey }`. Merges guest cart items into authed user's cart for the same restaurant; collapses duplicates by `(menuItemId, modifierFingerprint)` where fingerprint is a stable hash of selections.
- `POST /cart/coupon` — body `{ code }`. Validates via `promotions` service. Sets `cart.appliedCouponId`.
- `DELETE /cart/coupon`.

All responses return the recomputed `CartDto` (lines + `CartTotalsDto`).

**Files:**
- `apps/api/src/cart/cart.controller.ts`
- `apps/api/src/cart/cart.service.ts`
- `apps/api/src/cart/cart.module.ts`
- `apps/api/src/cart/modifier-validation.ts` (pure)
- `apps/api/src/cart/cart-pricing.ts` (pure) — subtotal builder used by both cart and orders services. (When Sprint 4 introduces `pricing.service` for full totals, this gets folded into it.)

## Phase 3.3 — `apps/api/src/promotions` + `coupons`

**Files:**
- `apps/api/src/promotions/promotions.controller.ts`, `promotions.service.ts`, `promotions.module.ts`
- `apps/api/src/promotions/coupon-validation.ts` (pure)

**Endpoints:**
- `POST/PATCH/DELETE /promotions` — `@Permissions('promotion:write')`.
- `GET /promotions` — list, query `?active=`.
- `POST /promotions/:id/coupons` — `@Permissions('promotion:write')` — create one or many codes.
- `DELETE /coupons/:id` — `@Permissions('promotion:write')` — soft-disable (set `maxRedemptions=0` if redeemed; else delete safely).
- `POST /coupons/validate` — body `{ code, subtotal, userId? }`. Returns `{ valid, discountAmount, reason? }`. Used by cart.

Validation rules: code matches an active promotion in window (`startsAt`/`endsAt`), `minSubtotal` met, `perUserLimit` not exceeded, `maxRedemptions` not exhausted.

## Phase 3.4 — `apps/api/src/orders` (creation + read only)

`POST /orders`:
1. Requires `Idempotency-Key` header. Persist a hash of `{userIdOrSessionKey, idempotencyKey}` → `orderId` in Redis with 24h TTL. Replay returns the stored order.
2. Load cart server-side; if empty, 422.
3. Re-validate every line (item exists, still available, base price + modifier deltas re-resolved from current menu rows).
4. Validate coupon if present (all the rules above).
5. Compute totals via `cart-pricing` + Sprint 4's `pricing.service` shape (Sprint 3 emits zero tax for now — the slot exists, the rate is 0 — Sprint 4 wires the actual restaurant tax rate).
6. Order number generation: format `R-{YYYY}-{6-digit zero-padded sequence}`. Implementation: a Postgres sequence created via a new migration `add-order-number-sequence` returning the sequence number, then the service formats it. Documented in Open Questions in case there's a preference for a counter table instead.
7. Transaction: create `Order` (status `PENDING`, payment status implicit `PENDING` — the actual `Payment` row is created in Sprint 4), `OrderItem[]` with `nameSnapshot` + `modifierSnapshot`, append `OrderStatusEvent` (`PENDING`), record `CouponRedemption` if applicable, clear the cart (delete its items).
8. Return the order.

`GET /orders` — list mine (auth required), paginated (`?cursor=`/`?limit=`), filter by `status`.
`GET /orders/:id` — full detail. Ownership scoping: customer can only read their own; staff with `order:read` for the restaurant can read any in their restaurant.

**Files:**
- `apps/api/src/orders/orders.controller.ts`, `orders.service.ts`, `orders.module.ts`
- `apps/api/src/orders/order-number.ts` — generator (sequence-backed).
- `apps/api/src/orders/idempotency.service.ts` — Redis-backed.
- `packages/db/prisma/migrations/<ts>_add_order_number_sequence/migration.sql` — `CREATE SEQUENCE order_number_seq` (raw SQL — `prisma migrate diff` won't infer this; this is the rare case where raw SQL is justified, will document in code).

## Phase 3.5 — `packages/api-client` additions

`cart.*`, `orders.*`, `promotions.*`, `coupons.*`.

## Phase 3.6 — Frontend cart store + hooks

**Zustand cart store** in each app — `apps/web/src/stores/cart-store.ts`, `apps/mobile/src/stores/cart-store.ts`. (Admin: confirm in plan — not creating a cart store there. Admin staff don't have a cart; the rare "create order on behalf of customer" flow lands in Sprint 6/7 and uses a different shape.)

Pattern:
- Source of truth = server. Store mirrors for instant feedback.
- On boot: read/generate `sessionKey` (web: `localStorage`; mobile: `expo-secure-store`). Fetch cart.
- Optimistic via TanStack Query `onMutate`/`onError`/`onSettled`.
- State: `cart`, `isLoading`, `pendingMutationCount`.
- Actions: `addItem`, `updateItem`, `removeItem`, `clearCart`, `applyCoupon`, `removeCoupon`, `mergeOnLogin(sessionKey)` — called from `auth-store` after successful login.

**Hooks** (web + mobile):
- `features/cart/hooks/use-cart.ts`, `use-add-to-cart.ts`, `use-update-cart-item.ts`, `use-remove-cart-item.ts`, `use-clear-cart.ts`, `use-apply-coupon.ts`, `use-remove-coupon.ts`.
- `features/orders/hooks/use-create-order.ts` (generates `crypto.randomUUID()` idempotency key, persisted in component state via the hook for retry-safety), `use-order.ts`, `use-orders.ts`.

**Hooks** (admin only):
- `features/promotions/hooks/use-promotions.ts`, `use-create-promotion.ts`, `use-update-promotion.ts`, `use-delete-promotion.ts`.
- `features/coupons/hooks/use-coupons.ts`, `use-create-coupon.ts`, `use-delete-coupon.ts`, `use-validate-coupon.ts`.
- `features/orders/hooks/use-order.ts`, `use-orders.ts` (admin list — full access scoped by permission).

## Phase 3.7 — Route placeholders (all `return null`)

- `apps/web/src/app/(shop)/cart/page.tsx`
- `apps/web/src/app/(shop)/checkout/page.tsx`
- `apps/web/src/app/(shop)/checkout/success/page.tsx`
- `apps/web/src/app/(account)/orders/page.tsx`
- `apps/web/src/app/(account)/orders/[id]/page.tsx`
- `apps/admin/src/app/(dashboard)/orders/page.tsx`
- `apps/admin/src/app/(dashboard)/orders/[id]/page.tsx`
- `apps/admin/src/app/(dashboard)/promotions/page.tsx`
- `apps/admin/src/app/(dashboard)/promotions/[id]/page.tsx`
- `apps/mobile/app/(tabs)/cart.tsx`
- `apps/mobile/app/(tabs)/orders.tsx`
- `apps/mobile/app/orders/[id].tsx`
- `apps/mobile/app/checkout.tsx`
- `apps/mobile/app/checkout/success.tsx`

(`(shop)` route group on web: create `apps/web/src/app/(shop)/layout.tsx` returning children.)

## Phase 3.8 — Seed data

`packages/db/seed.ts` — `seedPromotions()` adds three promos per §Appendix A:
- `WELCOME10` — 10% off, first-order only (`perUserLimit: 1`).
- `FREEDEL` — free delivery, `minSubtotal: 100 PLN`.
- `BOGO-PIZZA` — BOGO type, applies to Pizzas category (encoded in `Promotion.description` for now; rule semantics: when present, halves the cheaper of two Pizza-category items in the cart — implementation in `coupon-validation.ts`).

## Phase 3.9 — Tests

- `apps/api/test/cart.e2e-spec.ts` — add/update/remove item; modifier validation rejects required-missing; guest→authed merge collapses duplicates; client-tampered prices defeated by recompute.
- `apps/api/test/orders.e2e-spec.ts` — idempotent creation (same key → same order id), order ownership scoping (customer 404 on someone else's), coupon discount correctly applied.
- `apps/api/test/promotions.e2e-spec.ts` — coupon validation: expired / min-subtotal not met / per-user-limit reached / max-redemptions exhausted.
- Unit: `apps/web/src/stores/__tests__/cart-store-merge.test.ts` — `mergeOnLogin` reducer.
- Unit: `apps/web/src/features/orders/hooks/__tests__/use-create-order.test.ts` — idempotency-key retention across re-renders.

## Sprint 3 verification gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
# Manual happy path:
# login → POST /cart/items → POST /cart/coupon → POST /orders (with Idempotency-Key)
# → repeat the order POST with the same key → same orderId returned
```

Write `.claude/reports/sprint-3-status.md` and **stop.**

---

# Sprint 4 — Payments (Stripe + COD), Refunds, Receipts

## Phase 4.1 — Schema migration

**Migration:** `<ts>_payment-method-poland`:
- Add enum values `P24`, `BLIK` to `PaymentMethodKind`. `PAYMOB` stays (unused but cheap).
- Add `taxRate Decimal @db.Decimal(5,4) @default(0.08)` to `Restaurant`. (Default 8% Polish VAT; per-restaurant configurable; flagged for legal verification in the report.)
- Add `webhookEvents` table: `id` (provider event id, primary key), `provider`, `type`, `payload Json`, `receivedAt`, `processedAt?`. Used for idempotent webhook dedupe.

Files: `packages/db/prisma/migrations/<ts>_payment-method-poland/migration.sql`, then `packages/db/prisma/schema.prisma` updated to match, `pnpm --filter @repo/db generate`.

## Phase 4.2 — Shared `pricing.service`

`apps/api/src/pricing/pricing.service.ts` — pure-ish service (depends on Prisma for restaurant lookup):

`calculateTotals({ restaurantId, lineItems, couponDiscount, deliveryFee, tipAmount })` → `{ subtotal, taxTotal, deliveryFee, tipAmount, discountTotal, grandTotal }`. All `Decimal`, round-half-up to 2 decimals at every public boundary.

Tax: pulled from `Restaurant.taxRate`. Delivery fee: passed in from caller (orders module) which reads from `Restaurant.settings` JSON (extends an existing column rather than adding another for now — note this in the report). Tip: clamped to `>=0` and `<= subtotal * 1.0`.

Refactor `orders.service` from Sprint 3 to call `pricing.service` instead of `cart-pricing.ts` alone. Backfill the order e2e tests' expected totals.

## Phase 4.3 — `apps/api/src/payments`

Structure:
```
apps/api/src/payments/
├── payments.module.ts
├── payments.service.ts
├── payments.controller.ts
├── payments.webhooks.controller.ts
├── provider.interface.ts
├── providers/
│   ├── stripe.provider.ts
│   └── cod.provider.ts
└── webhook-events.service.ts
```

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

**Endpoints:**
- `POST /payments/intent` — auth required. Body `{ orderId, provider, methodKind }`. Validates order is mine + status `PENDING` + payment status not `PAID`. Stripe: returns `{ clientSecret, publishableKey }`. Stripe `PaymentIntent` uses `automatic_payment_methods: { enabled: true }` with currency `PLN` — enables cards + Apple/Google Pay + P24 + BLIK on a Stripe account that has them enabled (documented in `docs/local-setup.md`). COD: short-circuits — marks `Payment.status = PENDING` (paid on delivery completion), transitions `Order` to `CONFIRMED`, appends status event, emits an internal `order.confirmed` event for Sprint 5's realtime/notification dispatch to consume.
- `GET /payments/config` — public. Returns `{ stripePublishableKey, currency }`.
- `POST /payments/webhooks/stripe` — raw body parsing (Fastify needs `addContentTypeParser` for `application/json` on this route only; alternative is `req.raw` access). Signature verification via Stripe SDK. Dedupe by `event.id` via `webhookEvents` table. On `payment_intent.succeeded`: mark `Payment.status = PAID`, transition `Order` to `CONFIRMED`, append `OrderStatusEvent`, enqueue receipt + notification jobs. Handle `payment_intent.payment_failed` (Payment status `FAILED`, order stays `PENDING`) and `charge.refunded` (sync `Refund` row).
- `POST /payments/:paymentId/refunds` — `@Permissions('payment:refund')`. Body `{ amount?, reason }`. Partial allowed. Writes `Refund`, transitions order to `REFUNDED` if full refund, queues `loyalty:revoke_earned_points` (stub job — actual revoke logic ships with Loyalty sprint), enqueues refund email.

## Phase 4.4 — Receipt PDF job

- New BullMQ queue `receipt.generate` in `packages/jobs/src/queues.ts` + payload schema in `payloads.ts`.
- Processor `apps/api/src/jobs/receipt.processor.ts` — renders a React PDF (`@react-pdf/renderer`). Neutral template: restaurant name + logo, order details, line items, breakdown, payment method, refund note if any.
- On success: enqueues `email.receipt` job (new queue) which sends the rendered PDF as an attachment via the existing mailer. Extend the email processor to handle the receipt template.
- Triggered automatically on `payment_intent.succeeded` webhook handler and on refund creation.

Templates: `apps/api/src/mailer/templates/receipt.tsx` — React Email layout (separate from the PDF, used as the email body).

## Phase 4.5 — Mobile plumbing for native pay sheets

- Add `@stripe/stripe-react-native` to `apps/mobile/package.json` as a dependency. Do NOT initialize `<StripeProvider>` in `app-providers.tsx` — leave a `// TODO(ui): wrap children in <StripeProvider publishableKey={...}>` comment. The native sheet is wired in Sprint 9.
- Hooks: `apps/mobile/src/features/payments/hooks/use-payment-config.ts`, `use-create-payment-intent.ts`. Same hooks on web (`apps/web/src/features/payments/hooks/...`) for card flow.

## Phase 4.6 — Shared types

- `packages/types/src/payment.ts` — `CreatePaymentIntentDto`, `PaymentIntentResponseDto`, `PaymentDto`, `RefundDto`, `CreateRefundDto`, `PaymentConfigDto`.
- `packages/types/src/permissions.ts` — add `payment:read`, `payment:refund`. Update role map (owner+manager get refund; cashier gets read).

## Phase 4.7 — API client + admin hooks

- Client resources: `payments.createIntent`, `payments.getConfig`, `payments.refund`, `payments.byOrderId`.
- Web + mobile customer-side hooks: `usePaymentConfig`, `useCreatePaymentIntent`.
- Admin hooks: `useCreateRefund`, `useOrderPayment(orderId)`.

## Phase 4.8 — Tests

- `apps/api/test/payments.e2e-spec.ts`:
  - Create-intent happy path with the Stripe provider mocked at the provider layer (inject a fake provider in the test module).
  - Webhook signature verification — good signature accepted, bad signature 400.
  - Webhook idempotency — same `event.id` replayed → no double-confirmation.
  - COD short-circuit transitions order to `CONFIRMED`.
  - Refund partial + full paths.
  - Intent creation with `methodKind: P24` and `methodKind: BLIK`.
- Unit: `pricing.service` totals math — 3 items at 9.99 PLN with 8% tax: subtotal 29.97, tax 2.40 (rounded), total 32.37; verify no float drift via Decimal.
- Unit: `receipt.processor` — snapshot first-page text contains `R-` order number and grand-total currency suffix `PLN`.

## Sprint 4 verification gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
# Manual end-to-end:
# register → cart → order → POST /payments/intent → simulate webhook → order is CONFIRMED → mailhog shows receipt
```

Write `.claude/reports/sprint-4-status.md` and **stop.**

---

# Sprint 5 — Order Lifecycle, Socket.IO, Notifications + (Fastify 5 + Swagger)

## Phase 5.0 — Fastify 5 bump + Swagger UI

This is the deferred Sprint 0+1 item. Do it first because the Socket.IO gateway hooks the same HTTP server.

- Bump `fastify` to `^5.x`, `@nestjs/platform-fastify` to the matching `^10` line that supports Fastify 5 (likely `^10.4` releases that bumped or `^11`; will pin during implementation after checking the matrix).
- Bump `@fastify/static` to `^8` (already at 8.0.4 — confirm compatibility with Fastify 5).
- Wire `@fastify/swagger@^9` + `@fastify/swagger-ui@^5` + `@nestjs/swagger@^8.1`.
- Derive OpenAPI from Zod schemas via `nestjs-zod` (already in deps) — confirm it covers the schemas we use, otherwise add `@anatine/zod-openapi` only as needed.
- Mount Swagger UI at `/api/v1/docs` with Bearer auth scheme.
- Smoke-check: every Sprint 1-4 endpoint appears in the UI.

## Phase 5.1 — Order state machine

`apps/api/src/orders/order-state-machine.ts` — pure function:
```ts
canTransition(from: OrderStatus, to: OrderStatus, actor: ActorRole): true | string
```

Allowed transitions (exact set):
- `PENDING → CONFIRMED` — payment-success or COD on create.
- `PENDING → CANCELLED` — customer or admin.
- `CONFIRMED → PREPARING` — kitchen+manager+owner.
- `PREPARING → READY` — kitchen+manager+owner.
- `READY → OUT_FOR_DELIVERY` — admin (manager/owner/cashier), delivery orders only.
- `READY → COMPLETED` — admin (cashier+manager+owner), pickup orders only.
- `OUT_FOR_DELIVERY → DELIVERED` — admin.
- `DELIVERED → COMPLETED` — automatic, fired by a scheduled job after a configurable grace period (24h to start; the actual cron lands later — for Sprint 5 we add the transition + a one-shot BullMQ delayed job enqueued when entering `DELIVERED`).
- `* → CANCELLED` — admin only, with reason, **pre-payment only** (rejected with explicit reason post-payment).
- `CONFIRMED|PREPARING|READY|OUT_FOR_DELIVERY|DELIVERED → REFUNDED` — system only, triggered by full refund in Sprint 4 (the refund handler calls into the state machine via a `forceTransition` for the system actor).

Endpoint `POST /orders/:id/status` — body `{ to, note?, reason? }`. Permission gated by actor role pulled from the JWT (we already attach roles in `me`; need to expose roles on `request.user`). On every transition: append `OrderStatusEvent`, emit a Socket.IO event, enqueue a notification via the dispatcher.

Unit test: exhaustive transition matrix table-test in `apps/api/src/orders/__tests__/order-state-machine.test.ts`.

## Phase 5.2 — `apps/api/src/realtime` (Socket.IO gateway)

- `@WebSocketGateway({ cors: { origin: [APP_URL_WEB, APP_URL_ADMIN] } })` attached to the Nest Fastify HTTP server (Socket.IO 4 has a Fastify adapter; on Nest, we use `IoAdapter` over the Fastify httpServer).
- Auth handshake: read `auth.token` (client `io(url, { auth: { token } })`) or `Authorization: Bearer` header for tools. Verify via `@repo/auth-core.verifyAccessToken`. Reject with code `4401` on invalid/expired.
- Rooms (client sends a `subscribe` message with `{ room }`):
  - `order:{orderId}` — customer who owns the order, or staff with `order:read` for that restaurant.
  - `restaurant:{id}:orders` — staff (manager/owner/cashier).
  - `restaurant:{id}:kitchen` — kitchen + manager/owner.
  Gateway checks permission per-subscribe; rejected subscribes return `{ ok: false, reason }`.
- Emitted events (types in `packages/types/src/realtime.ts`):
  - `order.created`
  - `order.status_changed`
  - `order.cancelled`
  - `order.refunded`
  - `kitchen.ticket_added` — emitted on `CONFIRMED → PREPARING` (or on order `CONFIRMED` if the restaurant has the eager-kitchen setting; for Sprint 5 we go with the simpler on-PREPARING trigger and flag it for revisit).
- `RealtimeService` exposed with typed `emitOrderCreated`, `emitOrderStatusChanged`, etc. Other modules inject it.

## Phase 5.3 — Notification dispatch

- `apps/api/src/notifications/notifications.module.ts`, `notifications.service.ts` (`NotificationDispatcher`).
- `dispatch(event, payload)` decides channels (email/sms/push/in-app) per §9 matrix and enqueues to the right queues. Persists a `Notification` row for in-app feed.
- Replace push stub with `expo-server-sdk` integration: read tokens from `PushToken` table, batch send, log failures.
- Decoupling: dispatcher subscribes to an internal `EventEmitter2` (or Nest's built-in event emitter — already common in Nest 10). Order/payment modules emit; dispatcher listens. Realtime gateway listens to the same emitter for the wire events. No direct cross-module calls between realtime and notifications.

Templates extended: `OrderConfirmed`, `OrderOutForDelivery`, `OrderDelivered`, `OrderCancelled`, `RefundIssued` (React Email).

Add `@nestjs/event-emitter@^2` if not already installed.

## Phase 5.4 — `apps/api/src/kitchen`

`GET /kitchen/tickets?restaurantId=&station=` — `@Permissions('kitchen:read')`. Returns active orders (status in `CONFIRMED, PREPARING`) ordered by `confirmedAt` ASC (`OrderStatusEvent` where status=CONFIRMED). Used by the KDS feed for initial state before subscribing to the realtime room.

## Phase 5.5 — `packages/realtime-client` (new shared package)

- `package.json`, `tsconfig.json`, `src/index.ts`.
- `createRealtimeClient({ url, getAccessToken })` returning `{ connect, disconnect, subscribe(room, handler), unsubscribe, status$ }` (status as a small observable or store). Typed events match `packages/types/src/realtime.ts`.
- Auto-reconnect with backoff (delegated to socket.io-client's built-in).

## Phase 5.6 — Frontend integration

Per app (`apps/web`, `apps/admin`, `apps/mobile`):
- `src/lib/realtime-client.ts` instantiates the client with the env-driven URL + the auth store's access token.
- `src/features/orders/hooks/use-order-tracking.ts` — subscribes to `order:{orderId}`, patches the TanStack Query cache via `queryClient.setQueryData(orderKeys.detail(id), ...)` on events; returns the live order.
- Admin only:
  - `use-live-orders.ts` — subscribes to `restaurant:{id}:orders`, prepends new orders, sets transient `isNew: true` for 3s.
  - `use-kitchen-feed.ts` — initial GET `/kitchen/tickets`, then subscribes to `restaurant:{id}:kitchen`.
- `use-update-order-status.ts` mutation (POST `/orders/:id/status`).
- `use-realtime-status.ts` — exposes the client's connection status for later debug UI.
- Lifecycle: `src/providers/app-providers.tsx` (already exists) gains a small effect that calls `realtimeClient.connect()` after auth hydration and `disconnect()` on logout. This is plumbing, not UI — explicitly allowed.

## Phase 5.7 — Route placeholders

- `apps/admin/src/app/(dashboard)/orders/kitchen/page.tsx` (new, `return null`).
- All other order route files exist from Sprint 3; leave them as `return null` placeholders.

## Phase 5.8 — Tests

- `apps/api/test/order-state-machine.e2e-spec.ts` — every legal transition works; illegals return 422 with a clear reason; role-gated transitions enforced.
- `apps/api/test/realtime.e2e-spec.ts` — using `socket.io-client` connect to the test app; unauthenticated rejected; authenticated client receives `order.status_changed` after a transition.
- Unit: `order-state-machine` — full transition matrix table-test.
- Unit: `use-order-tracking` — MSW + a tiny mock socket; verify cache patches arrive.
- Unit: `notification-dispatcher` — emitting `order.confirmed` enqueues exactly the jobs in the matrix (email + push + in-app).

## Sprint 5 verification gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
pnpm dev
# http://localhost:4000/api/v1/docs renders Swagger with every endpoint
# Connect a small node socket client → transition an order → observe the event
```

Write `.claude/reports/sprint-5-status.md`, then write the combined final report `.claude/reports/sprints-2-5-complete.md`.

---

# Cross-cutting non-negotiables (applied throughout)

- Idempotency: `POST /orders` (Redis 24h), `POST /payments/webhooks/stripe` (`webhookEvents` table). Documented in code + report.
- Server-side price authority on every cart mutation and order creation.
- `Decimal` only for money. `@repo/utils/money` helpers added in Sprint 2 Phase 2.0.
- `@Permissions(...)` on every protected route. Permission union + role map updated in `packages/types/src/permissions.ts` exactly once.
- Cache invalidation on every menu/restaurant/promotion write.
- No new state-management libs beyond Zustand + TanStack Query.
- Raw SQL only for the `order_number_seq` sequence (justified in code comment + report).

# What NOT to do (applied)

- No UI work beyond the realtime-client lifecycle plumbing in `app-providers.tsx`.
- No reservations, reviews, loyalty redemption, analytics rollups, marketing pages, or KDS layout — those are Sprint 6+.
- No schema changes beyond: (a) the new `order_number_seq` sequence migration in Sprint 3, (b) the `payment-method-poland` migration in Sprint 4 (enum + tax rate + webhook_events). Both are flagged here before running them.
- Do not regenerate or alter the existing `init` migration.
- Auth flow not touched beyond exposing user roles on `request.user` (already loaded by `JwtAuthGuard`).
- No passport / axios / react-query v4 / new libs.

---

# Open questions — please confirm before I start

These are the items the prompt left ambiguous in light of the current repo state. They block specific decisions in the plan; I'd like a quick read on each before implementing.

1. **`Decimal` source.** Two options: (a) `decimal.js` as a direct dep of `@repo/utils`, or (b) re-export `Decimal` from `@prisma/client/runtime/library`. Option (b) avoids a second decimal lib in the dep graph and matches Prisma's return type exactly, but couples `@repo/utils` to Prisma's runtime. **Default I'll take if you don't answer: option (b)** — Prisma's `Decimal` is what `Order.subtotal` etc. already return, and unifying types is more valuable than the small coupling cost.

2. **Operating hours unique constraint.** The current `OperatingHours` schema has no `@@unique([restaurantId, dayOfWeek])`. To make `PUT /restaurants/:id/hours` an atomic replace via upsert, this constraint helps. Plan: add a new migration `add-operating-hours-unique` to enforce it. **Default if no answer:** add the migration. (Alternative: delete-then-create in one transaction without the constraint — also fine but slightly heavier.)

3. **`MenuItemModifierGroup` idempotency in seed.** The schema has no natural unique key on `(itemId, name)`. For the seeder to stay idempotent, either (a) add `@@unique([itemId, name])`, or (b) make seed lookup-then-create (read all groups for the item, match by name, then create-if-missing). **Default:** option (b) — no schema change.

4. **Order number generation.** Postgres sequence (raw SQL migration) vs counter table (`OrderNumberCounter` model with `findUniqueOrThrow` + `update`). Sequence is faster and atomic for free; counter table is portable and Prisma-native. **Default:** sequence (raw SQL — only place in this run where raw SQL appears).

5. **Cart store on admin app.** The prompt asks me to confirm. My read: admin staff don't have a customer-style cart. The "create order on behalf" flow is Sprint 6/7. **Default:** skip the cart store in admin entirely.

6. **R2 dev mode.** Local dev usually doesn't have real R2 creds. **Default:** when `R2_ACCESS_KEY_ID` is empty, the uploads service returns a stubbed `{ uploadUrl: 'http://localhost/no-r2', publicUrl: 'http://localhost/no-r2/<key>', key, expiresIn: 300 }` so e2e tests + dev work without real creds. Documented in the status report + `docs/local-setup.md`.

7. **Currency formatting in PDF receipts.** Polish convention is `kwota PLN` (suffix) with comma decimal separator. **Default:** use `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })`. If you'd rather force EN formatting until i18n lands, say so.

8. **Tax rate column on `Restaurant`.** Adding `taxRate Decimal(5,4) @default(0.08)` to `Restaurant` is a schema change, but the prompt flagged it (§4.3 talks about "extend the JSON column or add `taxRate` Decimal"). **Default:** add the column rather than overloading `settings` JSON — easier to query and type.

9. **Webhook event storage.** Prompt says "table or Redis set". **Default:** `webhookEvents` table (added in Sprint 4 migration). The table also gives us a debug trail; Redis-set has none.

10. **Sprint 5 fastify-5 / Nest version matrix.** The current repo is on `@nestjs/common@10.4.15` + `@nestjs/platform-fastify@10.4.15` + `fastify@4.28.1`. Nest 10 supports Fastify 5 via the 10.4+ adapter (`@nestjs/platform-fastify@10.4.x` was published with Fastify-5 support in recent patches; I'll verify the exact min patch during implementation). If Nest 10 cannot land on Fastify 5 cleanly, the fallback is to bump to `@nestjs/*@11` across the board — bigger but the project plan already names "NestJS 11" as the target. **Default:** try Nest 10 + Fastify 5 first; bump to Nest 11 if blockers surface, and report on it.

11. **`@nestjs/event-emitter` for the realtime/notification decoupling.** Not currently installed. **Default:** add it. It's the canonical Nest pattern for this exact decoupling.

---

# Stop point

Per the prompt's required workflow, I'm stopping here and waiting for your approval (and answers to the open questions above) before writing any code.

After approval, I'll implement **Sprint 2** in full, run its verification checklist, write `.claude/reports/sprint-2-status.md`, and **stop again** for your "proceed" confirmation before Sprint 3. Same gate at Sprints 3, 4, and 5.
