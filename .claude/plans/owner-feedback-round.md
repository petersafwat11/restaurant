# Plan — Szef Donald owner feedback round (menu · config · branding · payments)

## Root insight (read this first)

Production deploys run `prisma migrate deploy` **but never `seed`**, and the running
app image can lag `main`. Result: **the live site shows stale code + stale menu data.**
Most of the owner's requests are *already correct in the codebase* — the real work is
(1) get production current, and (2) fill the few genuine gaps.

Two delivery channels matter:
- **App code (i18n strings, logo SVG, feature-flag defaults)** ships with the container
  image → fixed by a **redeploy**.
- **DB rows (restaurant config + menu content)** are frozen on prod since launch (seed
  never re-runs) → fixed by an **idempotent backfill migration** (the established pattern:
  `20260627010000_backfill_szef_donald_i18n`, `20260701120000_backfill_menu_grams_and_allergens`).
  The whole menu is *also* editable in the admin UI (`menu:write`), so trivial bits can be
  self-served.

## Mapping: owner request → current state → action

| # | Owner wants | Codebase (seed/i18n) | Production | Action |
|---|---|---|---|---|
| 1 | Tagline "kebab & falafel", drop tacos | Already correct (home eyebrow, layout meta, `servesCuisine` no Tacos) | servesCuisine backfilled; eyebrow/meta stale (old image) | **Redeploy app.** No code change |
| 2 | EST **2019** not 2020 | Already 2019 (`logo.tsx:68`, home/about i18n) | Shows 2020 (old image) | **Redeploy app.** No code change |
| 3 | Hours Mon–Fri 10–21, Sat 12–21, Sun closed | Already exact (`seed.ts:245–259`) | Possibly stale; admin-editable (Hours page) | Backfill migration **or** admin Hours page |
| 4 | Delivery **free (0)** | `defaultDeliveryFee=0` (`seed.ts:224`) | Owner implies a fee; admin-editable | Backfill migration **or** admin Settings |
| 5 | Radius **7 km** | `deliveryRadiusKm=7` (`seed.ts:226`) | Owner sees 8; admin-editable | Backfill migration **or** admin Settings |
| 6 | Online **and** cash payment | `payments.stripe_elements` default **false (OFF)** → online disabled; COD works | Online off | **GENUINE GAP** — enable flag + configure Stripe keys. Needs owner Stripe acct |
| 7 | Set prep time per order | Built: `prepMinutesOverride` + admin `EtaControl` (1–600 min) | Works | **Nothing to build** — show owner how |
| 8 | Where do orders land? (question) | Admin Orders page (any device) + email/SMS | — | **Answer**, not a change |
| 9 | Extra sauce **3 zł** not 1 | `Dodatkowy sos = 3.00` | Frozen launch price (1); prices never backfilled | Backfill option `priceDelta=3` (+ admin) |
| 10 | Add "fries +5" & "swap→Holenderski 9" on tortilla/bułka/plate | tortilla+bułka have both; **plate (na-talerzu) lacks the swap group** | Options may not exist (stale) | Seed: add swap to plate. Backfill: ensure groups/options exist (idempotent) |
| 11 | Extra meat **+10** | `Dodatkowe mięso = 10.00` on kebab add-ons | May not exist | Backfill: ensure exists |
| 12 | Plate = meat+fries+salad+sauce | PL ✓, EN ✓ (`ITEM_EN` line 828 has fries) | EN wrong (i18n backfill omitted fries) | Backfill plate description PL+EN |
| 13 | Box = meat+fries+sauce (no salad) | PL ✓, EN ✓ (`ITEM_EN` line 830, no salad) | EN wrong (i18n backfill says "fresh salad") | Backfill box description PL+EN |
| 14 | "Strips" → **Polędwiczki** (incl. EN); sizes 3/4/5 | PL name `Polędwiczki` ✓; **EN still "Chicken Strips"** (`ITEM_EN` 855); category EN "Strips & Tacos" | EN has "strips" | Seed: fix EN name + category EN. Backfill nameEn. **Q: English wording?** |
| 15 | Zestaw Tortilla+Cola **31** (not 34); Kapsalon+Cola 43 | tortilla combo `31.00` ✓, kapsalon `43.00` ✓ | tortilla shows 34 (frozen launch price) | Backfill `basePrice=31` for tortilla combo |
| 16 | Order: kebab…, falafel 2nd-last, drinks last | positions: kebab0, strips-tacos1, zestawy2, dodatki3, falafel4, napoje5 (already falafel 2nd-last, drinks last) | positions possibly stale | Backfill category `position`. **Q: confirm exact order** |

## Proposed category order (confirm)
Kebab → Polędwiczki i Tacos → Zestawy → Dodatki (sides) → **Falafel** → **Napoje zimne (cold drinks)**.
Within Kebab, item order: wraps (tortilla, pita, bun) → Kapsalon → Plate → Box → Fryto → Salad.

## Phases

- **Phase 0 — decisions** (blocking): Stripe/online-payments status; delivery approach
  (backfill+seed vs admin self-serve); English wording for Polędwiczki; confirm category order.
- **Phase 1 — branding**: already in `main`; a redeploy makes tagline + 2019 live. Verify after deploy.
- **Phase 2 — seed.ts (canonical)**: add salad→fries swap group to `kebab-na-talerzu`; fix
  `ITEM_EN`/`CATEGORY_EN` to drop "Strips"; (optional) align zestaw EN "save" text. Keeps
  dev/CI correct; does not touch prod.
- **Phase 3 — backfill migration (prod sync, idempotent)**: restaurant config (hours,
  fee=0, radius=7); menu descriptions PL+EN (box, plate); option price (`Dodatkowy sos`=3);
  zestaw basePrice=31; ensure fries/swap/extra-meat options exist on tortilla/bułka/plate
  (guarded inserts); Polędwiczki naming; category positions. Verify on a local PG built from
  the full migration history + simulated prod rows before pushing.
- **Phase 4 — online payments** (if owner has Stripe): flip `payments.stripe_elements` on +
  set publishable/secret keys in prod env; smoke-test card + BLIK.
- **Phase 5 — verify + deploy**: e2e/visual check, deploy, smoke, and confirm live with owner.

## Answers to owner's two questions
- **Orders device**: website orders appear in the admin **Orders** page in real time — open
  it on a phone, tablet, or PC by logging in. A dedicated kitchen tablet is nice-to-have, not
  required. Email/SMS notifications also fire.
- **Prep time per order**: already available — the order drawer has an ETA control to set the
  total prep/delivery minutes (1–600) per order; blank = automatic estimate.

## Open questions (need answers before Phase 2+)
1. **Stripe / online payments** — is there a Stripe account with API keys for the restaurant?
   Online card/BLIK is currently OFF. Without keys we stay cash-only for now.
2. **Delivery approach** — tracked code + backfill migration (recommended: reviewable,
   reproducible, applies on deploy) vs. a checklist for the owner to do in the admin panel?
3. **"Polędwiczki" in English** — keep the Polish word "Polędwiczki", or translate to
   "Chicken Tenders" (no "strips")?
4. **Category order** — confirm the proposed order above (or specify changes).
