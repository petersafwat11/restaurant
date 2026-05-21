# Reseed menu — Szef Donald (Polish kebab/falafel)

Replace the current generic Polish demo menu with the real Szef Donald menu transcribed from the storefront photo.

## Scope (single file change)

- **Edit only:** `packages/db/seed.ts`
- **No schema changes.** Restaurant is already `Europe/Warsaw` + `PLN` — only `name`, `description`, `phone`, `email`, `address` change.
- **No frontend changes** (assuming Decision 1 = option A below).

## Decisions to confirm before I write code

### 1. Restaurant slug — keep or rename?

`the-test-kitchen` is hardcoded as `DEFAULT_RESTAURANT_SLUG` in 6 web files:
`menu-app.tsx`, `checkout-app.tsx`, `cart-container.tsx`, `site-chrome.tsx`, `featured-dishes.tsx`, `testimonials.tsx`.

- **(A) Keep slug `the-test-kitchen`**, only change displayed `name` to "Szef Donald", description, phone, email, address. → 0 frontend files touched. **Recommended.**
- **(B) Rename slug to `szef-donald`** → I edit those 6 constants + any sprint reports/docs that reference the slug.

### 2. Variant modeling — one item + size modifier (recommended)

Schema gives us `MenuItemModifierGroup`. I'll model each dish family as **one `MenuItem`** with a required `Size` group:

- `basePrice` = smallest size's price.
- `Size` group `priceDelta` = `(this size) − (smallest size)`.
- Size sets are inconsistent (most dishes have 4 sizes Standard/Średni/Duży/Mega; Kapsalon has only Duży/Mega; Talerz has Mały/Duży/Mega) — each item gets its own tailored size group.

Alternative would be one `MenuItem` per size (~30 items instead of ~12). Less elegant; I recommend modifier groups.

### 3. Modifier groups for kebab/falafel items

- **Mięso** (Meat) — required, +0 zł, options: `Kurczak`, `Wołowina`, `Mieszane`. (Kebab only — not falafel.)
- **Sos** (Sauce) — required, +0 zł, options: `Łagodny`, `Ostry`, `Mieszany`.
- **Dodatki** (Add-ons) — optional, multi-select:
  - `Ser żółty` +4 zł
  - `Ser feta` +4 zł
  - `Dodatkowy sos` +1 zł
  - `Opakowanie` +1 zł

### 4. Combo deals as separate `MenuItem`s (not promotions)

Two combos are board-priced (not coupon discounts):
- `Kebab Tortilla Średni + Coca-Cola 0.5L` — 34 zł
- `Kapsalon Duży + Coca-Cola 0.5L` — 43 zł

I'll model these as their own items in a "Zestawy" (Combos) category. Confirm or override.

### 5. One missing price

`Burn 0.25L` energy drink — price not visible in photo. **TBD — please confirm price** (or omit).

## Cleanup strategy (the hard part)

The current `seedMenu` is upsert-only — editing `CATEGORIES` alone would leave orphan categories/items behind. I'll do this in order at the top of `seedMenu`:

1. `prisma.menuCategory.deleteMany({ where: { restaurantId } })` — cascades to: items → images, modifier groups, modifier options, favorites. (All via Prisma `onDelete: Cascade`.)
2. `prisma.cartItem.deleteMany({ where: { cart: { restaurantId } } })` — `CartItem.menuItemId` is a plain `String` with **no FK**, so cascade misses it. Without this, any active cart in the dev DB would hold dead menu IDs and break checkout. Carts are session state, safe to clear.
3. **`OrderItem` rows are left alone.** `OrderItem.menuItemId` is also FK-less, but `nameSnapshot`/`unitPrice`/`modifierSnapshot` make historical orders self-contained. Old receipts stay readable; only thing you'd lose is "re-order" linking back to a live menu item. Acceptable for a reseed.
4. Seed the new categories/items/modifiers (idempotent upsert by `(restaurantId, slug)` still — so subsequent runs after this one are fine).

## Restaurant updates

```
name        Szef Donald
slug        the-test-kitchen   (kept — Decision 1A)
description Kebab i falafel — Warsaw kebab shop
phone       (kept or update — please confirm)
email       (kept or update — please confirm)
address     (kept — Warsaw — please confirm if real address available)
currency    PLN  (already)
timezone    Europe/Warsaw  (already)
```

Operating hours: leave as-is unless you have real values.

## Full menu (transcribed from photo — please correct any wrong digits)

Some falafel column prices were hand-written and a couple are slightly ambiguous; please verify the column under **Bułka-Falafel** especially.

### Category: Kebab

| Item                  | basePrice | Size modifier deltas                                |
|-----------------------|-----------|------------------------------------------------------|
| Kebab Tortilla        | 21 (Mały) | Średni +3 (24), Duży +6 (27), Mega +10 (31)         |
| Kebab Pita            | 21 (Mały) | Średni +3 (24), Duży +6 (27), Mega +10 (31)         |
| Kebab w Bułce         | 22 (Mały) | Średni +3 (25), Duży +6 (28), Mega +10 (32)         |
| Kebab Kapsalon        | 36 (Duży) | Mega +6 (42)                                         |
| Kebab na Talerzu      | 29 (Std)  | Duży +5 (34), Mega +11 (40)                          |
| Kebab Box             | 26 (Std)  | Duży +6 (32), Mega +12 (38)                          |
| Fryto Kebab           | 29        | (single size)                                        |
| Sałatka Kebab         | 26 (Std)  | Duży +6 (32), Mega +12 (38)                          |

All kebab items get **Meat**, **Sauce**, **Add-ons** modifier groups.

### Category: Danie Vege — Falafel

| Item            | basePrice    | Size modifier deltas                                |
|-----------------|--------------|------------------------------------------------------|
| Tortilla Falafel| 19 (Std 2szt)| Średni 3szt +2 (21), Duży 4szt +4 (23), Mega 5szt +6 (25) |
| Bułka Falafel   | 20 (Std 2szt)| Średni 3szt +2 (22), Duży 4szt +4 (24), Mega 5szt +6 (26) |
| Pita Falafel    | 19 (Std 2szt)| Średni 3szt +2 (21), Duży 4szt +4 (23), Mega 5szt +6 (25) |
| Talerz Falafel  | 24 (Mały 3szt)| Duży 4szt +3 (27), Mega 5szt +6 (30)                |

All falafel items get **Sauce** and **Add-ons** modifier groups (no meat). `isVegetarian: true`.

### Category: Box Strips & Tacos

| Item       | basePrice    | Size modifier deltas                          |
|------------|--------------|------------------------------------------------|
| Box Strips | 28 (Std 3szt)| Duży 4szt +5 (33), Mega 5szt +11 (39)         |
| Tacos      | 29           | (single size — 3 strips in tortilla)           |

### Category: Zestawy (Combos)

| Item                                | Price |
|-------------------------------------|-------|
| Kebab Tortilla Średni + Coca-Cola 0.5L | 34 |
| Kapsalon Duży + Coca-Cola 0.5L         | 43 |

### Category: Dodatki (Sides)

| Item          | Price |
|---------------|-------|
| Frytki Małe   | 9     |
| Frytki Duże   | 13    |
| Baklawa       | 7     |

### Category: Napoje Zimne (Cold Drinks)

| Item                       | Size  | Price |
|----------------------------|-------|-------|
| Coca-Cola                  | 0.5L  | 8.50  |
| Coca-Cola Zero             | 0.5L  | 8.50  |
| Coca-Cola Light            | 0.5L  | 8.50  |
| Fanta                      | 0.5L  | 8.50  |
| Sprite                     | 0.5L  | 8.50  |
| Kinley                     | 0.5L  | 8.50  |
| Kropla Beskidu (water)     | 0.5L  | 5.50  |
| Fuze Tea                   | 0.5L  | 8.50  |
| Cappy (juice)              | 0.33L | 7.50  |
| Burn (energy)              | 0.25L | **TBD — confirm** |

## Promotions

The existing seed creates `WELCOME10`, `FREEDEL`, `BOGO-PIZZA`. The first two still make sense; `BOGO-PIZZA` references a non-existent category now. Options:

- Delete `BOGO-PIZZA` promotion + coupon.
- Or replace with `BOGO-KEBAB` (Buy one kebab, get one half off).

Recommend: replace with `BOGO-KEBAB`.

## What this leaves alone

- Users, roles, permissions, staff accounts.
- Tables, reservations.
- Existing **order history** (snapshots preserve them — they remain readable receipts; the "reorder" link to a live menu item is what you lose).
- Loyalty, referrals, notifications, contact messages, feature flags.

## Open questions for you

1. Decision 1: keep slug `the-test-kitchen` (A) or rename to `szef-donald` (B)?
2. Decision 4: combos as items (recommended) or as promotions?
3. Restaurant phone/email/address — keep placeholders or do you have real values?
4. Burn 0.25L price?
5. Any prices above I transcribed wrong from the photo? (Especially the Bułka-Falafel column.)
6. `BOGO-PIZZA` promotion — delete or replace with `BOGO-KEBAB`?

## Implementation order once approved

1. Update `seedRestaurants()` — change `name`, `description`, contact fields.
2. Replace `CATEGORIES` constant with the 6 new categories above.
3. Add cleanup block at top of `seedMenu` (deleteMany on categories + cart items).
4. Update `seedPromotions()` per Decision 6.
5. Run `pnpm --filter @repo/db seed` locally.
6. Manual verification: `curl /restaurants/the-test-kitchen/menu | jq` returns expected tree.

Estimated change: ~250 lines net in `seed.ts`. No migrations.
