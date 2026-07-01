# Plan: Hours/location from DB · mobile lang toggle · mobile menu · Polish default · item grams · delivery-zone z-index

Status: **awaiting approval**
Date: 2026-06-21

This bundles 7 requested items. Each was verified against the codebase first (see "Verification" notes). "Mobile" = the **customer website viewed on a phone** (responsive web); the Expo native app is out of scope (confirmed with user).

---

## Track 1 — Restaurant hours + location from DB everywhere (web)

**Verification:** Only `/locations` is DB-backed (via `useRestaurants()` → `restaurant.get()`). All other surfaces read hardcoded mock data from `apps/web/src/lib/mock/szef-donald.ts` (`mockHours`, `mockLocation`) and hardcoded i18n strings (`messages/{en,pl}/web/marketing/home.json`: `chefLocation`, `addressLine1/2`, `mapAriaLabel`; `contact.json`). `RestaurantPublicDto` already carries `phone/email/address/geoPoint/hours`.

**Hardcoded surfaces to convert (hours and/or location):**
- `apps/web/src/components/site-footer-szef.tsx` — hours table + address + phone (mock) → DB
- `apps/web/src/features/landing/sections/hours-location.tsx` — hours table + address + phone + coords (mock) → DB
- `apps/web/src/app/[locale]/(marketing)/contact/contact-app.tsx` — coords + address (mock/i18n) → DB
- `apps/web/src/features/landing/sections/hero.tsx:49` — hardcoded `'22:00'` "closes at" badge → derive today's `closesAt` from DB hours (or hide if closed)
- i18n `home.json` / `contact.json` location strings: keep generic *copy* in i18n, but inject the **address/city** dynamically from DB (interpolate into `mapAriaLabel`; render `addressLine1/2` from `restaurant.address`). The `chefLocation` badge becomes `restaurant.address.city` (or a derived locality).

**Approach:**
1. Add a small shared hook `useRestaurant()` in `apps/web/src/features/restaurants/hooks` returning the single `RestaurantPublicDto` (reuse `restaurant.get()`, `staleTime` 5min). Hours come back on the DTO.
2. Add a date/hours formatting helper (e.g. `apps/web/src/features/restaurants/lib/hours.ts`): map `OperatingHoursDto[]` → display rows ordered Mon–Sun, "today's open/close", "open now?" — reuse the logic the locations page already uses (extract/share it so all surfaces format identically).
3. Replace mock reads in the four components with the hook + helper. Server components that can't use hooks: fetch via the existing server data path or convert the small sub-section to a client component (match how `/locations` does it).
4. Retire `mockHours` and `mockLocation` from `szef-donald.ts` once no longer imported. (Leave `mockFeaturedDishes`/`mockCategories`/`mockTestimonials` — they are fallbacks, not hours/location, and out of this request's scope.)

**Verification:** with stack running, every page shows the same DB hours; change hours in admin → all surfaces update.

## Track 7 (folded in) — Remove remaining hardcoded coords / "center of city"

- `apps/web/src/app/[locale]/(account)/account/addresses/page.tsx` — default `city: 'Kielce'` and fallback coords `50.8505/20.6275` → seed from `restaurant.geoPoint`/`address.city`.
- `apps/web/src/features/checkout/components/checkout-app.tsx` — same fallback coords → `restaurant.geoPoint`.
- These reuse the Track 1 `useRestaurant()` hook.

---

## Track 2 — Polish as the real default language

**Verification:** `routing.ts` already sets `defaultLocale: 'pl'` but next-intl defaults `localeDetection: true`, so English-browser visitors are redirected to `/en`. `User.locale` defaults to `"en"` in Prisma.

**Changes:**
1. `apps/web/src/i18n/routing.ts` — add `localeDetection: false` so `/` always serves Polish regardless of browser language. (Users can still switch to EN via the switcher; choice persists in `NEXT_LOCALE` cookie.)
2. `packages/db/prisma/schema.prisma` — `User.locale @default("en")` → `@default("pl")`. Migration + `db generate` + commit generated client.
3. Grep for any other `'en'` default leak in web (none expected beyond the above).

**Verification:** fresh visit (no cookie, EN browser) lands on Polish.

---

## Track 3 — Language switcher + nav usable on mobile web

**Verification:** `site-nav` hides nav links (`lg:flex`), the lang switcher (`hidden lg:block`), and CTA (`hidden sm:block`); the hamburger only renders when `onOpenMobile` is passed — and `site-chrome.tsx` never passes it. Net: phones get no nav and no language control.

**Approach:**
1. In `apps/web/src/components/site-chrome.tsx`: add mobile drawer open state, pass `onOpenMobile` to `SiteNav`, and render a mobile drawer (use existing `Sheet`/dialog primitive in `packages/ui`; add one if absent) containing: the nav links, the `LanguageSwitcher`, and the "Order now" CTA.
2. Ensure the `LanguageSwitcher` is reachable on mobile — simplest correct fix is to surface it inside the drawer (keep desktop placement unchanged). Optionally also show a compact PL/EN control in the bar on small screens.
3. Accessibility: focus trap, `aria-expanded`, close on route change / Esc / backdrop.

**Verification:** at 390px, hamburger opens a drawer; language can be switched; nav links work.

---

## Track 4 — Menu page renders fully on mobile

**Verification:** `menu-app.tsx` renders all categories (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) inside a sticky chrome `sticky top-site-nav z-20`. The category jump uses a hardcoded desktop offset: `goToCategory` `- 200` and sections `scroll-mt-[12rem]`. On mobile the sticky chrome (search col + filter pills + subnav) is taller than 200px, so tapping a category scrolls its heading/first items **behind** the sticky bar — the leading "some menus don't show" hypothesis.

**Approach (confirm live at 390px first, then fix):**
1. Make the scroll offset dynamic: measure the sticky chrome height (ref + `getBoundingClientRect`) and use it for both `window.scrollTo` offset and `scroll-mt`. Or set a CSS var for sticky height and reference it in `scroll-mt-[var(...)]`.
2. Check `MenuSubNav` horizontal overflow on mobile (ensure all category pills are reachable; add edge fade/scroll affordance if needed).
3. Verify search/filter row stacking doesn't clip content.

**Verification:** at 390px, tapping every category lands with its heading visible; all categories/items reachable.

---

## Track 5 — Menu item grams (admin input → user display)

**Verification:** `MenuItem` has no grams/weight field; pattern to mirror is `calories`/`prepMinutes` (optional `Int`, Zod `.number().int().min(0).nullish()`).

**End-to-end changes:**
1. **DB** `packages/db/prisma/schema.prisma` — add `grams Int?` to `MenuItem`. Migration (`db migrate:dev`) + `db generate` + commit.
2. **Types** `packages/types/src/menu.ts` — add `grams` to `MenuItemSchema` and `CreateMenuItemSchema` (`UpdateMenuItemSchema` is `.partial()`, inherits).
3. **API** `apps/api/src/menu/menu.service.ts` — map `grams` in `createItem` and `updateItem` (mirror `calories`).
4. **Admin form** `apps/admin/src/features/menu/components/item-editor-drawer.tsx` — add grams numeric input next to calories/prep; add to `Draft` type + `EMPTY_DRAFT`. i18n label.
5. **Web display** `packages/ui/src/dish-card/index.tsx` — add optional `grams` (or `weight`) prop; render "nicely" (small muted chip/line near name, e.g. `≈ 250 g`, with unit from i18n). Pass it from `apps/web/src/features/menu/components/menu-app.tsx`. Also surface in `ItemDetailSheet` (add `grams` to `DishDetail`, shown alongside calories/prep).
6. **Seed** `packages/db/seed.ts` — add `grams?` to `SeedItem` + example values so it's visible after seeding.
7. **i18n** add `grams` labels/unit to admin + web message files (en + pl).

**Verification:** set grams in admin → appears on the menu card and item sheet (web + mobile-web).

---

## Track 6 — Delivery-zone editor z-index / interaction fix (admin)

**Verification:** Editor at `apps/admin/.../settings/delivery-zones/page.tsx` using `PolygonMapEditor` (Leaflet) inside `TwoPaneLayout`. Leaflet CSS is imported. Toolbar/search are `z-[1000]`. The exact element blocking map clicks needs **live diagnosis** — the earlier "overflow creates a stacking context" theory is not technically sound, so I will not commit to it blind.

**Approach:**
1. Run admin, open delivery-zones, use Playwright/`elementFromPoint` at the map center to identify what actually receives the click (sticky `z-40` topbar? a portal overlay? the search-box wrapper at `top-3` which is **not** `pointer-events-none`? map sizing/`invalidateSize`?).
2. Apply the minimal correct fix for the identified culprit (e.g. `pointer-events-none` on the search wrapper with `pointer-events-auto` on the inner control; correct stacking/`isolation`; call `map.invalidateSize()` after the pane mounts/resizes).
3. Re-test: draw a polygon, edit a vertex, save — confirm it persists via `PATCH /admin/restaurant/settings` (`deliveryZones` JSON).

**Verification:** can draw + save a zone from the dashboard via real interaction and Playwright.

---

## Sequencing & infra

1. Bring up infra: `docker compose up -d postgres redis mailhog`, then `pnpm db:migrate`, `pnpm db:seed`, run `api` + `web` + `admin` dev servers.
2. Implement in this order (low-risk shared pieces first): **T2** (Polish default) → **T5** (grams, DB migration) → **T1/T7** (hours/location from DB) → **T3** (mobile nav/lang) → **T4** (mobile menu) → **T6** (zone z-index, needs live diagnosis).
3. Tests: add/adjust an API e2e for grams (happy path) per CLAUDE.md; visual checks at 390px for T1/T3/T4 and the grams display.

## Risks / notes
- DB migration requires a running Postgres; will use docker compose locally. Generated Prisma client is committed.
- Converting marketing/footer server components to consume a client hook may require small client-component splits — will match the `/locations` pattern.
- Money/decimals untouched here; grams is a plain integer.
