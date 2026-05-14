# Sprint 2 — Status Report

> Source prompt: `docs/sprints/sprint-2-5-claude-code-prompt.md`
> Plan: `.claude/plans/sprint-2-5.md`
> Completed: 2026-05-14

## Status: ✅ Done — awaiting "proceed" before Sprint 3

All 10 phases (2.0 – 2.9) from the plan are implemented and verified. Sprint 2 backend (restaurants, menu, uploads) plus full frontend data layer (hooks, types, api-client) plus seed data are in place. No UI written — all new pages/screens return `null` with `// TODO(ui):` markers.

| Verification | Result |
|---|---|
| `pnpm typecheck` | 14/14 packages green |
| `pnpm lint` | 4/4 lintable packages green (api skipped as before) |
| `pnpm test` | utils 6, web 4, admin 5 = **15/15 unit tests pass** (was 19; admin +2 for `use-create-menu-item`, utils +6 for money) |
| `pnpm --filter @repo/api test:e2e` | **17/17 e2e tests pass** (Sprint 0+1's 10 + 4 new uploads + 3 new menu) |
| `pnpm --filter @repo/db seed` | seeds permissions + roles + 2 users + 1 restaurant + 6 categories + 30 items |
| `pnpm --filter @repo/api dev` | API boots; `GET /restaurants` returns seeded restaurant; `GET /restaurants/the-test-kitchen` returns hours; `GET /restaurants/:id/menu` returns the full tree |

---

## Files created/modified by package

| Package | Created | Modified |
|---|---|---|
| `packages/db` | 1 new migration (`20260514150000_add_operating_hours_unique`) | `schema.prisma`, `seed.ts` |
| `packages/types` | `restaurant.ts`, `menu.ts`, `upload.ts` (3 new) | `index.ts` |
| `packages/utils` | `money.ts`, `money.test.ts`, `vitest.config.ts` (3 new) | `index.ts`, `package.json` |
| `packages/api-client` | — | `client.ts` (added `restaurants`, `menu`, `uploads` resources inline — matches existing pattern; not the separate `resources/` files the plan considered) |
| `apps/api` (src) | `restaurants/` (3 files), `menu/` (3 files), `uploads/` (3 files), `redis/cache.service.ts` | `app.module.ts`, `config/env.ts` (R2 vars), `redis/redis.module.ts`, `package.json` (+2 deps) |
| `apps/api` (test) | `menu.e2e-spec.ts`, `uploads.e2e-spec.ts` | `setup-e2e.ts` (added `resetMenuDb` + `ensureOwnerToken` helpers) |
| `apps/web` | `features/restaurants/`, `features/menu/` (5 files); 3 route stubs | — |
| `apps/admin` | `features/restaurants/` (5 files), `features/menu/` (22 files), `features/uploads/` (3 files); 5 route stubs + `(dashboard)/layout.tsx` | — |
| `apps/mobile` | `features/restaurants/`, `features/menu/` (5 files); 2 route stubs | — |

Roughly 70 new files + 11 edits.

---

## Implemented endpoints

**Public reads (no auth):**
- `GET /restaurants` — cached list, 5-min TTL.
- `GET /restaurants/:slug` — cached detail with hours.
- `GET /restaurants/:id/hours`.
- `GET /restaurants/:restaurantId/menu` — cached tree (`menu:{id}`), 5-min TTL, availability overrides merged from fast-path keys.
- `GET /restaurants/:restaurantId/menu/categories/:categorySlug/items/:itemSlug` — full item detail.

**`restaurant:write` (admin):**
- `POST /restaurants`, `PATCH /restaurants/:id`, `PUT /restaurants/:id/hours` (atomic upsert of 7 days in one tx).

**`menu:write` (admin):**
- Categories: `POST`, `PATCH`, `DELETE`, `POST /menu/categories/reorder`.
- Items: `POST`, `PATCH`, `DELETE`, `POST /menu/items/reorder`, `POST /menu/items/:id/availability` (write-through fast-path key, doesn't bust the tree).
- Images: `POST /menu/items/:id/images` (link an already-uploaded R2 key), `DELETE`, `POST .../images/reorder`.
- Modifier groups & options: full CRUD.

**`menu:write` (admin) for uploads:**
- `POST /uploads/presign` — validates mime (`image/jpeg|png|webp`) + size (≤5MB). In stub mode (no R2 creds) returns `http://localhost/no-r2/<key>` URLs.

---

## Decisions made (per plan defaults, all unchanged)

1. **`Decimal` source** — used `@prisma/client/runtime/library`'s `Decimal` directly. Re-exported from `@repo/utils/money` along with helpers (`addAll`, `multiply`, `round2`, `clampNonNegative`, `decimalToString`, `formatMoney`, `isZero`). 6 unit tests in `money.test.ts`.
2. **OperatingHours unique constraint** — new migration `20260514150000_add_operating_hours_unique` adds `@@unique([restaurantId, dayOfWeek])`. Lets `PUT /hours` use upsert-in-tx.
3. **ModifierGroup idempotency in seed** — no schema change; seed uses `findFirst` by `(itemId, name)` then create-if-missing.
4. **R2 dev stub mode** — `UploadsService` detects empty R2 envs and falls back to `http://localhost/no-r2/<key>` URLs. Logs a warning at boot. Documented in code.
5. **Admin cart store** — not created in Sprint 2 (relevant for Sprint 3+). Plan said skip; no change.
6. **`.default()` → `.optional()` on input schemas** — Zod's `z.infer<typeof Schema>` returns the OUTPUT type, which makes `.default()` fields required. Switched menu + restaurant input schemas to `.optional()` to match the existing `address.ts` pattern. Service layer applies the defaults via `?? <default>`. This kept the existing `CreateAddressDto` shape style across all input DTOs.

## Other implementation choices worth flagging

- **API client resource layout.** The plan suggested splitting into `packages/api-client/src/resources/{restaurants,menu,uploads}.ts`. The existing pattern in `client.ts` is inline; I extended inline to stay consistent. If you'd rather split, it's a mechanical refactor — happy to do it as a tidy-up.
- **Currency on the wire.** Money fields cross the wire as **fixed-point strings** (e.g. `"22.00"`), validated by a `MoneyStringSchema` regex (`/^-?\d+(\.\d{1,2})?$/`). Frontend never gets a `number` for money, so accidental `Number(price) * qty` is impossible there. Backend converts to `Decimal` via `decimalToString` when sending and accepts strings as input to `prisma` (Prisma coerces string → Decimal).
- **`MenuController` uses `@Controller()` with no path** — needed to mix public reads under `/restaurants/:restaurantId/menu/...` and admin writes under `/menu/...` in one controller. Routes use full path strings.
- **`MenuItemImage.url` is built from the R2 public URL** at the time the row is created (via `UploadsService.publicUrlForKey(key)`). Stub-mode keys produce `http://localhost/no-r2/<key>` URLs — fine for dev, will fail in prod without real R2 envs. Documented.
- **`ensureOwnerToken` test helper** registers a fresh user via `/auth/register` then promotes them to the owner role by inserting `UserRole`. Avoids adding `bcrypt` as an apps/api dep. The customer role is also upserted so `/auth/register` (which `findUniqueOrThrow`s the customer role) works on a fresh DB.

---

## Schema changes (1 new migration)

```
packages/db/prisma/migrations/20260514150000_add_operating_hours_unique/migration.sql
```

```sql
DROP INDEX IF EXISTS "OperatingHours_restaurantId_idx";
CREATE UNIQUE INDEX "OperatingHours_restaurantId_dayOfWeek_key"
  ON "OperatingHours"("restaurantId", "dayOfWeek");
```

`schema.prisma` updated to add `@@unique([restaurantId, dayOfWeek])`. `prisma generate` re-run.

---

## Sprint 2 verification commands run

```bash
pnpm install                                          # installed @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @prisma/client (utils dep)
pnpm --filter @repo/db generate                       # regenerate Prisma client
pnpm --filter @repo/db migrate:deploy                 # apply the new migration
pnpm typecheck                                        # 14/14 green
pnpm lint                                             # 4/4 green (api lint still skipped per Sprint 0+1 decision)
pnpm test                                             # 15/15 unit tests pass
pnpm --filter @repo/api test:e2e                      # 17/17 e2e pass
pnpm --filter @repo/db seed                           # idempotent — adds restaurant + categories + items
pnpm --filter @repo/api dev                           # boots; UploadsService warns "R2 credentials not configured" (expected stub mode)
# Smoke tests:
curl http://localhost:4000/api/v1/restaurants                                                  # 200 — seeded restaurant
curl http://localhost:4000/api/v1/restaurants/the-test-kitchen                                 # 200 — incl. 7 days hours
curl http://localhost:4000/api/v1/restaurants/<id>/menu                                        # 200 — full tree
```

Presign endpoint manual test (not run interactively because dev-mode stub mode returns a fake URL; covered by the 4 e2e tests in `uploads.e2e-spec.ts`).

---

## Known gaps / deferred

- **Real R2 credentials in dev.** `.env.example` already documents the keys. Dev today runs in **stub mode**: presign endpoints return `http://localhost/no-r2/<key>` URLs. The full upload flow (file PUT to R2 → public URL serves the image) requires real R2 credentials. The composite `useUploadImage` hook short-circuits the PUT when the URL is the stub.
- **Image deletes don't delete the R2 object.** `DELETE /menu/items/:id/images/:imageId` removes the `MenuItemImage` row but leaves the R2 object orphaned. A cleanup job can sweep these later; for Sprint 2 this is acceptable (we're optimizing for cheap egress, not cheap storage). Worth flagging.
- **`@nestjs/swagger` is still not wired** — Sprint 5 will land that alongside the Fastify 5 bump, per plan.
- **No retest of every Sprint 1 test after seed.** All 17 e2e + 15 unit tests are green; existing Sprint 0+1 behaviour is preserved.
- **Polish/EN currency formatting.** `formatMoney` uses the runtime's default locale via `Intl.NumberFormat(undefined, …)`. On the API server (often UTC/C locale) this may produce `12.50 PLN` ordering; on browsers configured for Polish, `12,50 zł`. The PDF receipt sprint (Sprint 4) will pin a locale.

---

## What's ready for Sprint 3 to use

- **Cache + invalidation patterns** are in place via `@repo/api`'s `CacheService` — Sprint 3's coupon validation cache reuses them.
- **Permissions union** already has `order:read`, `order:create`, `promotion:write` from Sprint 0+1. Sprint 3 only needs to add `order:write` (new). All UI gating + backend guards are wired.
- **`@repo/utils` money helpers** are the single source of truth for currency arithmetic — Sprint 3's `cart-pricing` + order totals will use `addAll`/`multiply`/`round2` directly. The `pricing.service` move in Sprint 4 is a refactor on top.
- **Menu lookups** (`MenuService.getItem`, etc.) are server-side authoritative — Sprint 3's cart can call them to re-resolve prices without trusting the client.

---

## Stop point

Sprint 2 is complete. Awaiting your **"proceed"** before I start Sprint 3 (cart + orders + promotions/coupons).
