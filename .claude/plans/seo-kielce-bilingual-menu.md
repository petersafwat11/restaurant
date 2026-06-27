# SEO fix — Re-target to Kielce/Szef Donald + bilingual (PL/EN) menu

**Problem.** The SEO/GEO strategy + foundation (`docs/seo/*`, written 2026-05-26) were
authored against a *placeholder* restaurant — **"The Test Kitchen" in Warsaw**. The real
data seeded later (`reseed-szef-donald-menu.md`, 2026-06) is **"Szef Donald" in Kielce**.
The strategy targets the wrong city, the wrong brand, and assumes bilingual menu content
that the data model can't store. Result: weak/incorrect SEO and a broken English site.

**Goal.** Make SEO honest and effective for the *actual* restaurant, and deliver correct
**PL + EN** content for the **whole menu** and structured data.

**Decisions locked (owner):**
- i18n storage = **`*_en` columns** (PL is the source/default; EN falls back to PL when blank).
- Deliver the full plan for **all 3 phases** before coding; get approval before implementing.

---

## Ground-truth data (from `packages/db/seed.ts`)

| Field | Value |
|---|---|
| Name | **Szef Donald** |
| Slug | `the-test-kitchen` (legacy placeholder slug, hardcoded in 6 web files — keep) |
| Address | `ul. Ks. Piotra Ściegiennego 68a, 25-115 Kielce, PL` |
| Geo | `50.8505, 20.6275` |
| Phone / Email | `+48 883 953 589` / `mahmodrasul123@gmail.com` |
| Hours | Daily 11:00–23:00, **Mon closed**; tz `Europe/Warsaw` (correct — PL timezone) |
| Cuisine | Kebab, Falafel (+ box strips/tacos, sides, drinks, combos) |
| `servesCuisine` / `priceRange` / `sameAs` | **columns exist but seed leaves them empty** |

Menu = **6 categories / 29 items**, all Polish-only:
`kebab` (8), `falafel` (4), `strips-tacos` (2), `zestawy` (2), `dodatki` (3), `napoje-zimne` (10).
Modifier groups/options (Mięso/Sos/Dodatki/Rozmiar + options) are Polish-only too.

---

## Phase 0 — Re-target to reality *(no schema change; ~half day)*

Highest ROI, zero risk. Makes the existing SEO assets truthful.

### 0.1 Seed the discovery fields
`packages/db/seed.ts` restaurant upsert (lines ~189-224), set in **both** `create` and `update`:
- `servesCuisine: ['Kebab', 'Falafel', 'Middle Eastern', 'Turkish', 'Vegetarian']`
- `priceRange: '$$'` (cheap-eats kebab shop; schema.org `$`–`$$$$`)
- `sameAs: [...]` — **owner to provide** real Facebook / Instagram / Google Maps URLs
  (leave `[]` until provided; the builder already omits empty arrays).

These flow automatically into the `Restaurant` JSON-LD via the existing
`toPublic()` mapper → `buildStructuredData()`. No code change beyond the seed.

### 0.2 Re-target the SEO docs (Warsaw → Kielce, Test Kitchen → Szef Donald)
Rewrite city/brand/keyword references in:
- `docs/seo/seo-geo-strategy.md` (Parts A/B/E/F + llms.txt draft + 40-query baseline)
- `docs/seo/seo-implementation-backlog.md`, `.claude/reports/seo-foundation-complete.md`
- `docs/seo/json-ld-examples/*` if any hardcode "Warsaw"/"The Test Kitchen"

Substitutions:
- City: **Warsaw → Kielce**; districts Mokotów/Śródmieście/Praga → **Centrum, Szydłówek,
  Ślichowice, Barwinek, Baranówek**; landmarks → **Galeria Echo, Kadzielnia, Rynek, KSW,
  ul. Ściegiennego**; transit → Kielce bus lines (no metro).
- Brand: **The Test Kitchen → Szef Donald**; branded query „szef donald kielce".
- Dishes: drop „kebab z jagnięciny" (no lamb); real meats = kurczak / wołowina / mieszane
  (chicken / beef / mixed). Rebuild keyword tables around "kebab Kielce",
  "falafel Kielce", "kebab na dowóz Kielce", "kebab Ściegiennego".

### 0.3 Verify on-page NAP copy
Confirm `/locations`, `/contact`, `/about`, footer render Kielce address + Szef Donald
brand (these read i18n messages + the restaurant DTO — flag any hardcoded Warsaw/Test
Kitchen strings in `apps/web/messages` / `packages/i18n/messages`).

---

## Phase 1 — Bilingual menu data + locale-aware APIs *(~1–2 days)*

This is the structural fix so `/en` serves real English and the Menu JSON-LD is per-locale.

### 1.1 Schema — add `*_en` columns
`packages/db/prisma/schema.prisma` (PL columns stay as the source/default):

| Model | New column(s) |
|---|---|
| `Restaurant` | `descriptionEn String?` (name "Szef Donald" is a proper noun — unchanged) |
| `MenuCategory` | `nameEn String?`, `descriptionEn String?` |
| `MenuItem` | `nameEn String?`, `descriptionEn String?` |
| `MenuItemModifierGroup` | `nameEn String?` |
| `MenuItemModifierOption` | `nameEn String?` |

Then:
```
pnpm --filter @repo/db migrate:dev --name add_en_translation_columns
pnpm --filter @repo/db generate   # commit generated client
```

### 1.2 Seed the EN copy for everything
`packages/db/seed.ts`: add `nameEn`/`descriptionEn` to every category, item, modifier
group, and option, plus `descriptionEn` on the restaurant. PL stays the source field.
Full EN translation table (29 items + 6 categories + modifiers) drafted in **Appendix A**
below — owner reviews wording before seeding.

Examples:
- `Kebab Tortilla` → `nameEn: 'Kebab Tortilla (Wrap)'`,
  `descriptionEn: 'Döner kebab in a tortilla wrap — chicken, beef or mixed meat with fresh salad and your choice of sauce.'`
- Category `Danie Vege — Falafel` → `nameEn: 'Vegetarian — Falafel'`.
- Modifiers: `Mięso→Meat`, `Sos→Sauce`, `Dodatki→Add-ons`, `Rozmiar→Size`;
  `Kurczak→Chicken`, `Wołowina→Beef`, `Mieszane→Mixed`, `Łagodny→Mild`, `Ostry→Spicy`,
  `Mały→Small`, `Średni→Medium`, `Duży→Large`, `Mega→Mega`, `Ser żółty→Cheese` …

### 1.3 Resolve locale in the API (PL fallback)
Introduce a tiny helper, e.g. `apps/api/src/common/i18n/localize.ts`:
`pick(locale, pl, en) => locale === 'en' && en ? en : pl`. Locale comes from a
`?locale=` query param (default `pl`); validate against `['pl','en']`.

Wire it into the three read paths so output is localized **and** falls back to PL:

1. **Menu tree** — `apps/api/src/menu/menu.controller.ts` `getTree()` (line ~52) accepts
   `@Query('locale')`; `menu.service.ts` `loadTreeFromDb()` + mappers `toCategoryDto`/
   `toItemDto`/`toGroupDto`/`toOptionDto` (lines ~501-585) select the `_en` columns and
   apply `pick()`. **Cache note:** `getTree()` is cached — key the cache by locale
   (`menu:tree:${locale}`) so PL/EN don't collide.
2. **Public restaurant** — `apps/api/src/restaurants/restaurants.service.ts` `toPublic()`
   (lines ~199-229): `description = pick(locale, row.description, row.descriptionEn)`.
   Controller for `/restaurant` accepts `?locale=`.
3. **Structured data** — `apps/api/src/seo/seo.service.ts` `structuredData(slug)` (lines
   ~27-95): add a `locale` arg; select `_en` columns; localize restaurant `description`,
   category `name`, item `name`/`description` before `buildStructuredData()`. Controller
   route `/seo/structured-data/:slug` accepts `?locale=`.

`buildStructuredData()` in `packages/utils` needs **no change** — it just receives already-
localized strings. Types in `packages/types` (`MenuItemSchema`, `MenuCategorySchema`,
`RestaurantPublicSchema`, modifier schemas) stay the same shape — the `_en` columns are an
API-internal detail; the DTO still exposes a single localized `name`/`description`.

### 1.4 Forward the active locale from the web app
- `apps/web/src/lib/seo/fetch-structured-data.ts` — add `locale` param → `?locale=`.
- `apps/web/src/lib/seo/fetch-restaurant.ts` — add `locale` param → `?locale=`;
  **cache tag per locale** (`restaurant:${locale}`) so revalidation stays correct.
- `apps/web/src/app/[locale]/(shop)/menu/page.tsx` (lines ~42-43) — pass `locale` (already
  in `params`) into both fetchers.
- `apps/web/src/features/menu/hooks/use-menu-tree.ts` — read `useLocale()` and pass
  `locale` to `menu.getTree({ locale })`; include locale in the TanStack Query key.
- `packages/api-client` `menu.getTree` — thread an optional `{ locale }` into the request.

### 1.5 Hreflang/canonical sanity
Already handled by `getAlternates()` + `localePrefix: 'as-needed'` (`/menu` = PL,
`/en/menu` = EN). Verify the menu page emits both `alternates.languages` entries and that
the per-locale JSON-LD now differs between `/menu` and `/en/menu`.

---

## Phase 2 — Content depth (both languages) *(~half day + owner copy)*

- Fill `calories` and dietary flags (`isVegetarian`/`isVegan`) across items where known;
  falafel items already `isVegetarian: true`.
- Richer bilingual `description`/`descriptionEn` with local keywords ("kebab w Kielcach",
  "kebab Ściegiennego" / "best kebab in Kielce") — naturally, no stuffing.
- Bilingual image `alt` text on `MenuItemImage.alt` (currently `String?`, single value —
  if EN alt matters, reuse the `pick()` pattern or keep PL alt; low priority).
- Surface `AggregateRating` once reviews render (existing backlog D.2/D.3) — unblocked but
  out of this plan's core scope.

---

## Files touched (summary)

```
DB / seed
  packages/db/prisma/schema.prisma              + *_en columns (5 models)
  packages/db/prisma/migrations/<new>/          generated migration
  packages/db/seed.ts                           servesCuisine/priceRange/sameAs + all *_en copy
API
  apps/api/src/common/i18n/localize.ts          NEW pick() helper
  apps/api/src/menu/menu.controller.ts          ?locale=
  apps/api/src/menu/menu.service.ts             locale-keyed cache + _en selects + mappers
  apps/api/src/restaurants/restaurants.*.ts     ?locale= + localized toPublic()
  apps/api/src/seo/seo.service.ts               locale arg + _en selects
  apps/api/src/seo/seo.controller.ts            ?locale=
Web
  apps/web/src/lib/seo/fetch-structured-data.ts locale param + per-locale tag
  apps/web/src/lib/seo/fetch-restaurant.ts      locale param + per-locale tag
  apps/web/src/app/[locale]/(shop)/menu/page.tsx pass locale
  apps/web/src/features/menu/hooks/use-menu-tree.ts useLocale() + query key
  packages/api-client/...menu                   getTree({ locale })
Docs (Phase 0)
  docs/seo/seo-geo-strategy.md, seo-implementation-backlog.md,
  docs/seo/json-ld-examples/*, .claude/reports/seo-foundation-complete.md
```

## Test plan
- `pnpm --filter @repo/db generate` clean; `pnpm typecheck` + `pnpm lint` green.
- API e2e (Vitest+supertest, per CLAUDE.md): `GET /restaurants/the-test-kitchen/menu?locale=en`
  returns English names with PL fallback; `?locale=pl` and no-param return Polish.
- `GET /seo/structured-data/the-test-kitchen?locale=en` → Menu graph with EN item names;
  Restaurant node has `servesCuisine` + `priceRange`.
- Web: view-source `/menu` (PL JSON-LD) vs `/en/menu` (EN JSON-LD); MenuApp renders EN
  names/descriptions on `/en`; PL on `/`.
- Re-run a couple of `docs/seo/measurements` baseline queries swapped to Kielce.

## Open items for owner
1. `sameAs` — real FB / IG / Google Business URLs (else ship `[]`).
2. Review the Appendix A EN wording before it's seeded.
3. `priceRange` — confirm `$$` (vs `$`).

---

## Appendix A — EN translation (owner-reviewed copy to seed)

PL is the source/default. These `*_en` values are seeded alongside and served on `/en`
(with PL fallback when blank).

**Restaurant**
- `descriptionEn`: "Fresh kebab and falafel in Kielce, on Ściegiennego — everything made to order."

**Categories** (`nameEn` / `descriptionEn`)

| slug | nameEn | descriptionEn |
|---|---|---|
| kebab | Kebab | Meat (chicken, beef or mixed) with fresh salad and sauce. |
| falafel | Vegetarian — Falafel | Falafel and salad with mild, mixed or spicy sauce. |
| strips-tacos | Box Strips & Tacos | Chicken strips and tacos. |
| zestawy | Combo Deals | Kebab + Coca-Cola 0.5L at a combo price. |
| dodatki | Sides | Fries and dessert. |
| napoje-zimne | Cold Drinks | Soft drinks, juices and water. |

**Items** (`nameEn` / `descriptionEn`)

| slug | nameEn | descriptionEn |
|---|---|---|
| kebab-tortilla | Kebab Tortilla (Wrap) | Döner kebab in a tortilla wrap — chicken, beef or mixed meat with fresh salad and your choice of sauce. |
| kebab-pita | Kebab in Pita | Döner kebab in pita bread — meat, fresh salad and sauce. |
| kebab-w-bulce | Kebab in a Bun | Döner kebab in a bun — meat, fresh salad and sauce. |
| kebab-kapsalon | Kapsalon | Meat over fries, topped with melted cheese and sauce. |
| kebab-na-talerzu | Kebab Plate | Döner kebab on a plate — meat, fresh salad and sauce. |
| kebab-box | Kebab Box | Meat, fresh salad, fries and sauce in a box. |
| fryto-kebab | Fryto Kebab | Meat, fresh salad, fries and sauce wrapped in a tortilla. |
| salatka-kebab | Kebab Salad | Salad with kebab meat, fresh veg and sauce. |
| tortilla-falafel | Falafel Tortilla (Wrap) | Falafel in a tortilla wrap with salad and sauce. |
| bulka-falafel | Falafel in a Bun | Falafel in a bun with salad and sauce. |
| pita-falafel | Falafel in Pita | Falafel in pita bread with salad and sauce. |
| talerz-falafel | Falafel Plate | Falafel on a plate with salad and sauce. |
| box-strips | Chicken Strips Box | Chicken strips with fries, fresh salad and sauce. |
| tacos | Tacos | Three chicken strips in a tortilla with cheese, sauce, iceberg lettuce and fries. |
| zestaw-kebab-tortilla-sredni-cola | Medium Kebab Tortilla + Coca-Cola 0.5L | Medium kebab tortilla with a Coca-Cola 0.5L. Save 2 zł. |
| zestaw-kapsalon-duzy-cola | Large Kapsalon + Coca-Cola 0.5L | Large kapsalon with a Coca-Cola 0.5L. Save 2 zł. |
| frytki-male | Small Fries | Small portion of fries. |
| frytki-duze | Large Fries | Large portion of fries. |
| baklawa | Baklava | Traditional baklava. |
| coca-cola | Coca-Cola | 0.5L |
| coca-cola-zero | Coca-Cola Zero | 0.5L |
| coca-cola-light | Coca-Cola Light | 0.5L |
| fanta | Fanta | 0.5L |
| sprite | Sprite | 0.5L |
| kinley | Kinley | 0.5L |
| kropla-beskidu | Kropla Beskidu | Still water 0.5L |
| fuze-tea | Fuze Tea | 0.5L |
| cappy | Cappy | Juice 0.33L |
| burn | Burn | Energy drink 0.25L |

**Modifier groups** (`nameEn`): Rozmiar→Size · Mięso→Meat · Sos→Sauce · Dodatki→Add-ons

**Modifier options** (`nameEn`)
- Sauce: Łagodny→Mild · Ostry→Spicy · Mieszany→Mixed
- Meat: Kurczak→Chicken · Wołowina→Beef · Mieszane→Mixed
- Add-ons: Ser żółty→Cheese · Ser feta→Feta · Dodatkowy sos→Extra sauce · Opakowanie→Packaging
- Sizes: Mały→Small · Średni→Medium · Duży→Large · Mega→Mega · Standard→Standard;
  "(N szt)"→"(N pcs)" (e.g. "Standard (2 szt)"→"Standard (2 pcs)")
