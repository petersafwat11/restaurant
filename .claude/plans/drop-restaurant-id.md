# Plan: Drop `restaurantId` everywhere — single-restaurant refactor

## Goal

This project is for **one** restaurant. Eliminate `restaurantId` from the schema, API, web app, admin app, mobile app, realtime, jobs, audit log, seed, and tests. After this lands:

- No `restaurantId` column on any child table.
- No `restaurantId` field on any DTO/Zod schema.
- No `restaurantId` argument in any hook, route, query, or socket room.
- No "active restaurant" UI/state in the admin shell.
- The audit log shows every action in one flat list (fixes the `staff:deactivate / reactivate / role_change` invisibility).

Per CLAUDE.md scope-strict rule and the user's standing instruction (sweeping instructions mean 100% coverage): nothing is "kept by design." Every reference goes.

---

## Decisions

### D1 — Keep a `Restaurant` row, drop the FK web

Two options:

- **A.** Delete the `Restaurant` model entirely; fold its config fields (name, phone, email, address, timezone, currency, taxRate, delivery zones, holidays, accepts flags, hours) into a singleton `Settings` table.
- **B.** **(chosen)** Keep the `Restaurant` model as a singleton config row (one row, fetched via `findFirst()`), but **drop the `restaurantId` column / FK / index from every other table**. `Restaurant.id` is never referenced anywhere outside the row itself.

Why B:
- Smaller data-shape diff. `Restaurant` already holds the config the API and frontends need (slug, name, currency, accepts*, delivery fee, etc.) plus a `hours` relation. Folding everything into a new `Settings` table is a much larger move with no payoff once the FKs are gone.
- The `OperatingHours` table is still useful as a row-per-weekday — we just drop its FK and replace `@@unique([restaurantId, dayOfWeek])` with `dayOfWeek @unique`.
- App code reads/writes the singleton via `prisma.restaurant.findFirst()` / a cached `getRestaurant()` helper. No active-id plumbing anywhere.

### D2 — Routes lose the id segment

Public:
- `GET /restaurants` (list) → **delete**
- `GET /restaurants/:slug` → `GET /restaurant`
- `GET /restaurants/:id/hours` → `GET /restaurant/hours`
- `GET /restaurants/:id/menu` → `GET /menu`
- `GET /restaurants/:id/menu/categories/:cat/items/:slug` → `GET /menu/categories/:cat/items/:slug`
- `GET /restaurants/:id/reviews`, `/reviews/summary` → `GET /reviews`, `/reviews/summary`

Admin:
- `POST /restaurants`, `PATCH /restaurants/:id`, `PUT /restaurants/:id/hours` → `PATCH /admin/restaurant`, `PUT /admin/restaurant/hours`
- `GET/PATCH /admin/restaurants/:id/settings` → `GET/PATCH /admin/settings`
- `…/holidays`, `…/delivery-zones`, `…/delivery-zones/check` → drop the id segment
- `GET /admin/restaurants/:id/tables`, `POST …/tables` → `/admin/tables`

Cart, kitchen, marketing, reports, analytics, audit-log, contact, customers, exports, promotions, reservations, reviews, orders, seo:
- Every query/body parameter named `restaurantId` is removed.
- Every list endpoint stops filtering by it server-side (single restaurant → no filter needed).

### D3 — Realtime rooms lose the prefix

- `restaurant:{id}:orders` → `orders`
- `restaurant:{id}:kitchen` → `kitchen`
- Order tracking room `order:{orderId}` is unchanged.
- `ROOMS` helpers in `packages/types/src/realtime.ts` become string constants.

### D4 — Admin: no active-restaurant state, no switcher

- Delete `apps/admin/src/stores/restaurant-store.ts`.
- Delete `apps/admin/src/components/shell/restaurant-switcher.tsx` and remove it from the topbar.
- Delete `useActiveRestaurantId()` calls (22 files). Replace by removing the `restaurantId` argument from the hook below.
- Delete `apps/admin/src/features/restaurants/hooks/use-restaurants.ts` and `apps/admin/src/app/(dashboard)/restaurant/page.tsx` if it's the multi-restaurant picker; the "restaurant settings" page (already a singleton) keeps working but reads from the new `/admin/settings` route.

### D5 — Audit log: drop `restaurantId` from the model, decorator, and interceptor

- `AuditLog.restaurantId` and its index → removed.
- `AuditAction(...)` decorator: remove `restaurantIdFrom` option.
- `AuditInterceptor.extractRestaurantId(...)` and the `restaurantId` field on `AuditWritePayload` → removed.
- `AuditService.write/list` stops reading/filtering by it.
- `AuditLogListQuery` schema loses `restaurantId`.
- `apps/admin/.../audit-log/page.tsx` stops sending `restaurantId` in the query — fixes the original complaint: `staff:deactivate / staff:reactivate / staff:role_change` now appear unconditionally because there is no filter for them to be excluded by.

### D6 — Seed and tests

- `seed.ts` continues to upsert the single `Restaurant` row (now config-only). Its id is no longer referenced anywhere; we can drop the `LEGACY_RESTAURANT_SLUG` migration path while we're here.
- Every e2e test (`apps/api/test/*.e2e-spec.ts` — ~25 files) stops creating per-test restaurants and passing `restaurantId` into requests. Where a test relies on a specific restaurant fixture, replace with a `getOrCreateRestaurant()` helper that ensures the singleton row exists.

### D7 — Mobile / customer web

Same as admin: remove the `restaurantId` argument from every cart, menu, order hook and from the API-client call signatures.

---

## Schema diff (Prisma)

### Drop columns + FKs

| Model | Field/index to drop |
|---|---|
| `OperatingHours` | `restaurantId`, `restaurant` relation, `@@unique([restaurantId, dayOfWeek])` → `dayOfWeek @unique` |
| `MenuCategory` | `restaurantId`, `restaurant` relation, `@@unique([restaurantId, slug])` → `slug @unique` |
| `Cart` | `restaurantId` |
| `Order` | `restaurantId`, `restaurant` relation, `@@index([restaurantId, status, createdAt])` → `@@index([status, createdAt])` |
| `Promotion` | `restaurantId`, `restaurant` relation, `@@index([restaurantId, isArchived])` → `@@index([isArchived])` |
| `Table` | `restaurantId`, `restaurant` relation |
| `Reservation` | `restaurantId`, `restaurant` relation, `@@index([restaurantId, startAt])` → `@@index([startAt])` |
| `StaffInvite` | `restaurantId` |
| `DailyMetric` | `restaurantId`, `@@unique([restaurantId, date])` → `date @unique`, `@@index([restaurantId, date])` → `@@index([date])` |
| `Export` | `restaurantId` |
| `AuditLog` | `restaurantId`, `@@index([restaurantId, createdAt])` removed |
| `ContactMessage` | `restaurantId`, `@@index([restaurantId, createdAt])` → `@@index([createdAt])` |

### Drop relations from `Restaurant`

`hours`, `menus`, `orders`, `reservations`, `tables`, `promotions` — all five relation fields removed. `Restaurant` becomes a flat config row.

> Note: this means `OperatingHours`, `MenuCategory`, etc. are no longer reachable via Prisma `include: { restaurant: …, hours: … }`. Replace any such `include` with a separate `findMany()` call.

### Migration (`packages/db/prisma/migrations/<ts>_drop_restaurant_id/migration.sql`)

One migration, executed in order:
1. `ALTER TABLE` … `DROP CONSTRAINT` for every FK above.
2. `DROP INDEX` for every old composite index.
3. `ALTER TABLE` … `DROP COLUMN restaurant_id` (column name in Postgres is `restaurantId` because Prisma doesn't snake-case unless mapped — verify the exact column casing from current `_prisma_migrations` history before generating; this migration must match what Prisma will emit).
4. `CREATE UNIQUE INDEX` for the new singleton-aware uniqueness (`OperatingHours.dayOfWeek`, `MenuCategory.slug`, `DailyMetric.date`).
5. `CREATE INDEX` for the simplified composite indexes.

Generate via `pnpm --filter @repo/db migrate:dev --name drop_restaurant_id` and then **review/edit the emitted SQL**. Prisma may sequence the unique-index drop after the column drop in ways that conflict on Postgres — the manual review is required.

Pre-migration sanity: confirm `Restaurant` has exactly one row (`SELECT count(*) FROM "Restaurant"`). If multiple rows exist in any environment, abort and decide which to keep before running.

---

## Types diff (`packages/types/src/*.ts`)

Drop `restaurantId` from these Zod schemas (line numbers from current source):

| File | Schemas |
|---|---|
| `analytics.ts` | `AnalyticsBaseQuerySchema`, `CustomerRetentionQuerySchema` |
| `audit.ts` | `AuditLogEntrySchema`, `AuditLogListQuerySchema` |
| `cart.ts` | `CartSchema`, `MergeCartSchema` |
| `contact.ts` | `CreateContactMessageSchema`, `ContactMessageSchema`, `ContactMessageListQuerySchema` |
| `customer.ts` | `CustomerListQuerySchema`, `BulkTagCustomersSchema` |
| `marketing.ts` | `MarketingQuerySchema` |
| `menu.ts` | `MenuCategorySchema`, `MenuItemDetailSchema`, `CreateMenuCategorySchema`, `MenuTreeSchema` (any restaurantId fields therein) |
| `order.ts` | `CreateOrderSchema`, `OrderSchema`, `OrderTrackingSchema`, `OrderListQuerySchema` |
| `payment.ts` | `CreatePaymentIntentSchema` |
| `promotion.ts` | `PromotionSchema`, `CreatePromotionSchema`, `BulkGenerateCouponsSchema` |
| `realtime.ts` | `OrderCreatedEvent`, `OrderStatusChangedEvent`, `KitchenTicketEvent`; `ROOMS.restaurantOrders/restaurantKitchen` → `ROOMS.orders/kitchen` (string constants) |
| `reports.ts` | `CreateExportSchema`, `ExportSchema` |
| `reservation.ts` | `ReservationSchema`, `CreateReservationSchema`, `AvailabilityQueryDto`, list queries |
| `restaurant.ts` | `OperatingHoursSchema` |
| `review.ts` | `ReviewSchema`, list query |
| `seo.ts` | SEO query |
| `settings.ts` | `RestaurantSettingsSchema` |
| `staff.ts` | `InviteStaffSchema`, list queries |

`packages/jobs/src/payloads.ts` — drop `restaurantId` from `AuditWritePayload` and any analytics/email/export job payloads that carry it.

---

## API diff (`apps/api/src/**`)

Per-module changes — the pattern is the same in every service: stop reading `restaurantId` from the request, stop filtering Prisma queries by it.

- `restaurants` — rewrite controller for singleton; `list()` removed; `getBySlug` replaced by `get()`; `getById`/`create` removed (singleton seeded once); `update`/hours operate on the lone row.
- `menu` — drop `restaurantId` from controller routes, service queries, and the cache keys.
- `cart` — drop `restaurantId` from query params; `findOrCreateCart` no longer filters by it.
- `orders` — drop from queries, controllers, exports, and the realtime emit.
- `kitchen` — drop from `tickets` query.
- `promotions`, `coupon-validation`, `pricing` — drop the join condition.
- `payments` — drop from intent creation.
- `reservations` — drop, including the availability spec.
- `reviews`, `seo`, `marketing`, `analytics`, `reports`, `report-generators`, `contact`, `customers`, `settings`, `staff`, `audit-log`, `jobs/analytics.processor` — drop.
- `realtime.gateway` — `restaurant:{id}:orders/kitchen` → `orders/kitchen` rooms; subscribe schema loses the id; event payloads lose the field.

---

## API client diff (`packages/api-client/src/client.ts`)

Roughly these method signatures change (string `restaurantId` argument removed, URL templates simplified):

```
menu.getTree(restaurantId)                         → menu.getTree()
menu.getItem(restaurantId, cat, slug)              → menu.getItem(cat, slug)
cart.get({ restaurantId, sessionKey? })            → cart.get({ sessionKey? })
cart.clear / addItem / updateItem / removeItem
  / applyCoupon / removeCoupon / setLoyalty        → same, restaurantId arg dropped
kitchen.tickets(restaurantId)                      → kitchen.tickets()
tables.list(restaurantId) / create(...)            → tables.list() / create(input)
reviews.forRestaurant(restaurantId, q) / summary   → reviews.list(q) / reviews.summary()
adminRestaurants.* settings/holidays/delivery-zones with id  → adminSettings.* without id
```

`useCart`, `useAddToCart`, etc. on web + mobile lose their `restaurantId` parameter; the query keys in `apps/{web,mobile}/src/features/cart/query-keys.ts` and `apps/{web,mobile}/src/features/menu/query-keys.ts` drop the `restaurantId` slot.

---

## Admin app diff (`apps/admin/src/**`)

Files that read `useActiveRestaurantId()` and pass it down (will be edited to drop the argument):

```
(dashboard)/page.tsx, audit-log/page.tsx, contact/page.tsx, customers (list),
menu/page.tsx, orders/page.tsx, promotions/* , reservations/* , reviews/page.tsx,
settings/page.tsx, settings/hours/page.tsx, settings/holidays/page.tsx,
settings/delivery-zones/page.tsx, staff/page.tsx, (kitchen)/kds/page.tsx,
features/reports/components/create-export-modal.tsx,
features/promotions/components/create-promotion-modal.tsx,
features/staff/components/invite-staff-modal.tsx,
features/reservations/components/reservation-create-drawer.tsx,
features/menu/components/{category-create-modal, delete-category-modal,
  items-list, modifier-groups-editor, categories-pane, item-editor-drawer},
features/customers/components/customers-list.tsx,
features/overview/components/{kpi-row, top-items-card, status-donut,
  revenue-chart, recent-orders-feed, live-panel},
features/kitchen/hooks/{use-kitchen-feed, use-advance-ticket},
features/orders/hooks/{use-admin-orders, use-live-orders, use-live-admin-orders},
features/dashboard/hooks/use-dashboard-overview,
features/analytics/hooks/index,
features/audit/*, features/reservations/*, features/settings/hooks/index,
features/reviews/hooks/index, features/menu/hooks/* (12 files),
features/restaurants/* — delete the directory.
```

Topbar: remove the `<RestaurantSwitcher />` mount; the topbar still shows the restaurant name (read from the singleton `useRestaurant()` hook), just no dropdown.

Tests under `apps/admin/src/app/__tests__/*` and feature `__tests__/*`: update fixtures to stop seeding an active restaurant id and stop asserting it in request mocks. `apps/admin/src/test/render-page.tsx` (test harness) drops the restaurant-store setup.

---

## Customer web diff (`apps/web/src/**`)

```
features/menu/hooks/{use-menu-tree, use-menu-item}        → drop restaurantId arg
features/menu/query-keys.ts                                → drop slot
features/cart/hooks/* (use-cart, use-add-to-cart, etc.)   → drop arg
features/cart/query-keys.ts                                → drop slot
features/orders/hooks/use-create-order                     → drop arg
features/checkout/hooks/{use-zone-check, use-delivery-zones} → drop arg
features/checkout/components/checkout-app.tsx              → stop passing it down
features/reviews/hooks/index.ts                            → drop
features/landing/sections/{featured-dishes, testimonials} → drop
components/{site-chrome, cart-container}                   → drop
features/menu/components/menu-app.tsx                      → drop
```

If the customer site has any restaurant-slug-based route (`/restaurants/[slug]/...`), flatten it. (Verify in step 1 of execution; not yet inspected.)

---

## Mobile diff (`apps/mobile/src/**`)

Same as web:

```
features/cart/hooks/* + features/cart/query-keys.ts
features/menu/hooks/use-menu-tree + features/menu/query-keys.ts (no file
  for query-keys yet? check during execution)
features/orders/hooks/use-create-order
```

---

## Audit-log specific fixes (the original complaint)

1. `AuditLog.restaurantId` column dropped (D5).
2. `AuditInterceptor` no longer computes a restaurantId.
3. `AuditService.list()` `where` clause loses the `restaurantId` branch.
4. `AuditLogListQuerySchema` loses the field.
5. `(dashboard)/audit-log/page.tsx` stops sending it.

Result: `staff:deactivate`, `staff:reactivate`, `staff:role_change`, and every other action are visible in the flat list regardless of any UI state.

---

## Execution order (suggested)

1. **Branch off `main`.**
2. **Schema + migration** — write `schema.prisma` diff, generate migration, hand-edit SQL, `prisma generate`.
3. **Types** — strip `restaurantId` from every Zod schema in `packages/types`.
4. **Jobs payloads** — strip from `packages/jobs/src/payloads.ts`.
5. **API services + controllers + interceptor + realtime gateway** — feature-by-feature, keep typecheck green.
6. **API client** — update method signatures.
7. **Admin app** — remove store, switcher, drop arg from every hook/page.
8. **Customer web** — drop arg from every hook/page.
9. **Mobile** — drop arg from every hook.
10. **Seed** — simplify; one upsert by stable slug; no legacy migration.
11. **Tests** — update every e2e and unit fixture.
12. **Type-check + lint + run e2e** at every layer; `pnpm -w typecheck && pnpm -w lint && pnpm --filter @repo/api test:e2e`.
13. **Manual smoke**: admin loads, audit-log page shows staff actions, customer web menu loads, place an order end-to-end, check kitchen socket receives the event on the new `kitchen` room name.

---

## Risks / things to confirm at execution time

- **Column casing in migration SQL.** Prisma names Postgres columns by the model field name unless `@map` is set. Verify by inspecting one prior migration before writing the new one.
- **`Cart` is a transient table; dropping `restaurantId` is safe.** But the API previously matched the cart by `(userId, restaurantId)` — after the drop, matching is `(userId)` (one cart per user). Need to ensure guest carts (sessionKey) still work — `sessionKey @unique` already covers this.
- **Realtime room renames are not backward-compatible.** Any deployed admin client connected with the old room name stops receiving events after the API redeploys. Fine in dev; surface in PR description.
- **`StaffInvite.restaurantId` was already `String?`** — dropping it is benign.
- **`Export.restaurantId` and `ContactMessage.restaurantId`** were already nullable; dropping is benign.
- **`DailyMetric` uniqueness** changes from `(restaurantId, date)` to `(date)`. If there are duplicate `(_, date)` rows for any reason, the migration will fail. Sanity-check before running.
- The customer-web route layout for restaurant slugs has not yet been read — step 1 of execution must inspect `apps/web/src/app` and decide whether `/restaurants/[slug]/...` collapses to `/` or stays as a placeholder.

---

## What I'm asking for before I start

1. Confirm option **B** (keep `Restaurant` as a singleton config row, drop all FKs) — or pick **A** (delete `Restaurant`, fold config into `Settings`).
2. Confirm the route renames (D2) are acceptable. The customer-facing URL `/restaurants/szef-donald` would go away in favor of `/`.
3. Confirm that the audit-log table losing `restaurantId` permanently (vs. nullable-then-deprecated) is acceptable — there are existing rows in dev with values that will be discarded.
4. Confirm there is no second restaurant in any environment we care about (dev, staging if any).

Once approved I'll execute in the order above and check in after step 2 (schema + migration) before touching app code.
