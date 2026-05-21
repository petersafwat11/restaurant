# Customer Web Port — Recommendations for §12 Open Decisions

> Companion to `.claude/plans/customer-web-port.md` §12.
>
> Each decision is followed by a **Recommendation**, the **Why** (grounded in concrete code paths in this repo + the admin port's precedents), and a **Tradeoff** stating what we're giving up. Where research changed my mind from the plan's initial lean, that's called out as **Plan needs an update**.

---

## Top-priority decisions

### A. Seed Szef Donald into `packages/db/seed.ts`?

**Recommendation: NO — keep Szef Donald content as mock fixtures in `apps/web/src/lib/mock/`, replace with API calls in Phase 3.**

**Why.**
- `packages/db/seed.ts` already seeds **"The Test Kitchen"** — a Polish demo restaurant (Marszałkowska 1, Warsaw, PLN, Europe/Warsaw, 6 categories of generic Polish menu: pierogi, kotlet schabowy, pizza, burgers, salads, drinks). It's the canonical test fixture admin uses, every API test depends on it, sprint 12 hardening assumes it.
- The SD seed would either *replace* that (breaks ~43 api e2e tests + admin's seeded state) or *coexist* (now we have two demo restaurants and every test has to pick — adds friction forever).
- Customer site doesn't need a *branded* demo restaurant in the DB — it needs *a* restaurant to render against. The Test Kitchen serves that role today.
- The 47 SD dishes and the brand voice belong in design/marketing collateral, **not** in shared infrastructure. They lock the visual language; the DB doesn't need them.

**Compromise.** During Phase 2 (page port), the web app reads from `useMenuTree()` which hits `GET /menu/categories?include=items` against The Test Kitchen. The dish *names* and *photos* will be pierogi/kotlet/pizza instead of kebab/falafel. **That's fine** — the design system is what we're proving, not the brand. Reviewers can swap `restaurantId` query param to see different real restaurants once we onboard one. The Szef Donald photography/copy from `Szef Donald/data.jsx` lives only in:

1. The landing page hero / story / testimonials (genuinely static marketing copy — belongs in the page anyway, not the DB).
2. A small `apps/web/src/lib/mock/szef-donald.ts` fixture file used **only** by the `_dev/primitives` page and Storybook-equivalent demos.

**Tradeoff.** Demos to non-engineers will say "Pierogi Ruskie" not "Kebab Tortilla Średni" until we onboard a real restaurant. That's a small cost for not forking the seed.

**Plan needs an update.** Section §6.2's mock-data row currently says "the 47 SD dishes become seed data in `packages/db/seed.ts`" — change to "stay as mock; web reads The Test Kitchen via `useMenuTree`."

---

### B. Cart `sessionKey` move to httpOnly cookie (Phase 0.11)

**Recommendation: YES — but scope it as a *separate, small* foundation PR (PR-W0a), not bundled with the theme PR.**

**Why.**
- The current `cart-store.ts:8-17` reads `sessionKey` from `localStorage` synchronously. That means **`useCart()` cannot run server-side** — every page that renders cart count in `<SiteNav>` will paint count=0, then flash to the real count after hydration. On a content-first warm marketing site, that flash is the most visible visual bug we'd ship.
- The backend already accepts `sessionKey` as a query param (`apps/api/src/cart/cart.controller.ts:53`). Wiring it to a cookie on the client + reading the cookie in a Next server action is ~30 lines. Backend changes: zero (it stays accepting `sessionKey` from anywhere).
- Keeps the existing `mergeCartItems` reducer (and its 5 unit tests at `apps/web/src/stores/__tests__/cart-store-merge.test.ts`) intact — only the *transport* changes.

**Concrete approach.**
- Cookie name: `cart_session` (httpOnly, `SameSite=Lax`, no `Secure` in dev). Set via a tiny route handler at `apps/web/src/app/api/cart-session/route.ts` (POST that issues a UUIDv4 if missing).
- `useCart()` reads `sessionKey` from a server-supplied context (`<CartSessionProvider>` in `(shop)/layout.tsx` does `cookies().get('cart_session')` server-side, falls back to a POST to the route handler on first visit client-side).
- Zustand store still holds the in-flight mutation counter; the `sessionKey` move out.

**Tradeoff.** A bit more wiring than `localStorage`. But the alternative is: render cart count *client-only* (skeleton on first paint) — works for marketing pages, but `<SiteNav>` shows on every page including order tracking where count must be authoritative. Cookie is the right architectural call.

---

## Standard decisions

### 1. `Hero.decoration` slot vs baked into `media`

**Recommendation: KEEP as separate `decoration?: ReactNode` slot.**

**Why.** Looking at `Szef Donald/sections.jsx:14-37` the hero has *two* floating chips (top-left "Open now", bottom-right brand hexagon). They're absolutely positioned over the image edge with negative margins. If baked into `media`, every consumer of `Hero` would have to know to build a `position: relative` wrapper and apply the same chip styling. Separate slot lets the primitive own the positioning logic; the consumer just hands over `{<Chip variant="top-left"/>, <Chip variant="bottom-right"/>}`. Two slots is a minor cost; consistent chip placement across About/Locations/Loyalty heroes is the win.

**Tradeoff.** Hero gets a third prop. Acceptable.

---

### 2. `SiteNav.rightSlot: ReactNode` vs named slots `{cart, langSwitcher, cta}`

**Recommendation: NAMED slots `{ cart?, langSwitcher?, cta? }`, with `rightSlot?` retained as an *escape hatch* for one-offs.**

**Why.** Looking at the SD source, every page passes the same right-cluster: `<LanguageSwitcher>` + `<CartButton>` + `<Order now>` CTA. With `rightSlot: ReactNode`, every page composition (landing, menu, checkout, account, auth) has to redeclare the order, the spacing, and the responsive collapse. Pages will drift. Auth pages especially want *just* the language switcher (no cart, no CTA) — easier to write `<SiteNav langSwitcher={…}/>` than to know which inner slots to drop. Named slots also give `SiteNav` a place to apply consistent gap, responsive hide behavior (cart shows on mobile, CTA collapses into hamburger menu, lang stays), and ARIA grouping.

The `rightSlot?` escape stays for the rare page that needs something custom (e.g., the order-tracking page wants a single "Order #SD-…" chip there).

**Plan needs an update.** §5.1's `SiteNav` signature changes to `{ logo; links; cart?; langSwitcher?; cta?; rightSlot?; variant?; sticky?; onOpenMobile? }`.

---

### 3. `<img>` vs `next/image` in primitives

**Recommendation: PRIMITIVES TAKE `image: { src; alt; … }` AND USE `next/image` INTERNALLY — with `priority` and `sizes` props passed through.**

**Why.** Lighthouse perf (the §11 ≥95 goal) on a photography-heavy site requires `next/image` for automatic responsive sizing, AVIF/WebP, lazy loading, and CLS prevention via explicit dimensions. If primitives accept `ReactNode` for image, every consumer has to remember to use `next/image` and pass the right `sizes` for the breakpoint context — easy to forget on the 3rd or 4th caller and lose 5 perf points silently.

`DishCard`, `CategoryCard`, `Hero` and `TestimonialCard` *know* their own aspect ratios and viewport widths (DishCard image is 4:3 at 33vw desktop / 50vw tablet / 100vw mobile — that's a one-liner `sizes` the primitive owns). The escape hatch for custom compositions (e.g., the success page's hexagonal checkmark) is `mediaSlot?: ReactNode` which bypasses `next/image`.

**Tradeoff.** `@repo/ui` now imports from `next/image`. That makes the package web-only (not safe for the mobile Expo app, which already needs `@repo/ui-mobile` anyway, so no real loss). Document the boundary.

**Plan needs an update.** §5.1 `DishCard`, `CategoryCard`, `Hero`, `TestimonialCard` rows — `image` prop accepts `{ src; alt; priority?; sizes?; aspect? }`; primitives compose `<Image>` internally with the right defaults.

---

### 4. Landing route at `/` under `(marketing)` vs root

**Recommendation: PLACE AT `app/(marketing)/page.tsx` (still serves at `/`).**

**Why.** The route-group convention is already established: `(marketing)` for about/locations/contact/reservations, `(shop)` for menu/cart/checkout, `(account)` for everything authed, `(auth)` for login/register. Landing is unambiguously a *marketing* surface (hero + featured dishes as marketing teasers + newsletter signup). Placing it under `(marketing)` means it inherits the same site chrome layout as About/Locations/Contact (consistent SiteNav variant logic, footer, mobile-menu wiring). Leaving it at root means duplicating that layout setup.

URL stays `/`. Convention wins.

---

### 5. `HoursTable.day` key — string enum vs ISO number

**Recommendation: ISO NUMBER (0=Sunday…6=Saturday) — matches the DB and admin's existing convention.**

**Why.**
- `packages/db/prisma/schema.prisma:222` — `OperatingHours.dayOfWeek: Int // 0-6`.
- `packages/types/src/restaurant.ts:24-26` — `OperatingHoursSchema.dayOfWeek: z.number().int().min(0).max(6)`.
- Admin's settings/hours page (planned, not yet built) will consume this same shape. Web's `HoursTable` consuming a different shape forces a translation layer at every call site (and they'll get the offset wrong — Sunday is 0 in JS but 7 in ISO-8601, this is *the* classic date bug).

The SD source's `'MON' | 'TUE' | …` string enum was a design-mock convenience — it converts cleanly to numbers via a `DAY_LABEL` lookup, which is the *display* concern, not the data shape concern.

**Plan needs an update.** §5.1 `HoursTable` signature: `hours: { day: 0|1|2|3|4|5|6; opensAt: string; closesAt: string; isClosed?: boolean }[]`. The primitive renders the abbreviation via an internal `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` lookup. `highlightToday` uses `new Date().getDay()` (which returns 0–6) directly.

This also makes wiring trivial: `useRestaurantInfo().hours` returns the data in the exact shape `HoursTable` wants.

---

### 6. `ModifierGroup.value` shape — `string[]` for both radio and checkbox

**Recommendation: KEEP `string[]`.**

**Why.** Matches the DTO shape: `packages/types/src/cart.ts` `ModifierSelectionSchema = { groupId, optionIds: string[] }` — `optionIds` is already an array regardless of `maxSelect`. A `string | string[]` union forces a runtime type-narrow at every callsite (`Array.isArray(value) ? value[0] : value`), and the assembled `NewCartLine` would still need to flatten it back to `string[]` before the API call. Array everywhere keeps the type discipline clean and matches what the server already accepts.

**Tradeoff.** Radio-with-length-1 feels slightly redundant. Not worth the union.

---

### 7. CartSheet — sheet vs persistent right rail on ≥1440px

**Recommendation: SHEET BOTH BREAKPOINTS.** (As planned.)

**Why.** Per `web-02-menu.md` §10 ¶1 the brand voice is "menu first, ordering second" — editorial breathing room. A persistent right rail (Wolt / UberEats pattern) gives the cart 30% of every page's horizontal space, which is appropriate for *aggregator* apps where users are mid-task. Szef Donald is a *destination* brand — the menu should *be* the page. The cart is a click away (cart icon in nav + floating cart button) and slides in over the content when summoned; nothing about the user-research justifies the always-present rail.

Reuses the same primitive shape on every breakpoint = simpler responsive code = fewer bugs.

**Tradeoff.** Users have to click to see the cart. Mitigated by `FloatingCartButton` always being visible when cart has items.

---

### 8. `FormField.children: ReactNode` (slot-children) vs owning the input

**Recommendation: SLOT-CHILDREN.** (As planned.) Existing primitive at `packages/ui/src/form-field/index.tsx:35-46` is already slot-based via `React.cloneElement` — injecting `id`, `aria-describedby`, `aria-invalid`. We extend, we don't rewrite.

**Why.** The existing implementation already plays nicely with `react-hook-form`'s `register()` (which returns a props bag that gets spread onto the child input). Switching to owning the input means rebuilding integration with RHF, third-party inputs (Stripe Elements `CardElement`, BLIK 6-digit grid), and the autocomplete combobox. Cost vastly outweighs the consistency win.

---

### 9. `RadioCardGroup.value` may be `null`

**Recommendation: YES, `value: TId | null`.** (As planned.)

**Why.** The Payment section per `web-03-checkout.md` §4.3 sets `paymentMethod = "card"` by default; the Order-type section sets `orderType = "delivery"` by default. But if we ever want a primitive that renders unselected (e.g., a future "Choose your loyalty tier" prompt), allowing `null` keeps the API honest. TS narrows on `null` checks; consumers can still default with `value={value ?? 'card'}` if they want strict-non-null at use site.

---

### 10. `TimeSlotValue` discriminated union

**Recommendation: KEEP `{ kind: 'asap' } | { kind: 'scheduled'; iso: string }`.** (As planned.)

**Why.** Maps directly to the server's `CreateOrderDto.pickupAt: string.datetime().nullish()` — `kind === 'asap'` → `pickupAt: null`, `kind === 'scheduled'` → `pickupAt: iso`. Clean, no extra translation. The discriminated union also makes exhaustiveness checks possible (TS will complain if a third `kind` is added later without updating callers).

---

### 11. `OrderSummaryPanel.delivery: { amount } | { label }` union

**Recommendation: KEEP THE UNION.** (As planned.)

**Why.** "Free" is semantically different from "$0.00". The discriminated union forces the consumer to think about which case applies — and the renderer can style "Free" in olive italic (matches the design spec) instead of rendering `formatMoney("0.00")`. The "single shape with `freeLabel?`" alternative loses that semantic distinction and pushes the styling decision into the consumer.

---

### 12. `CheckoutSection.status` — `'error'` as separate status

**Recommendation: KEEP `'error'` as its own status.** (As planned.)

**Why.** The visual treatment is genuinely distinct (brick-red circle + brick-red border + `!` glyph). Conflating with `'active' + hasError` would force every consumer of `CheckoutSection` to remember to pass *both* `status="active"` and `error={…}` to get the styling right — and forget either one in one place and you have a silent bug. A status enum is the right shape.

---

### 13. Map on `/locations` and `/`

**Recommendation: STATIC STYLED SVG FOR V1 (port the SD `MapPlaceholder`), real Mapbox/Google integration deferred to a follow-up.**

**Why.**
- Real interactive map = +120KB JS bundle + an API key tied to a paid tier + CLS hits unless you reserve the viewport perfectly. All three hurt the Lighthouse 95 goal.
- The map's purpose on the landing is *brand atmosphere* — "we are at a real address in Warsaw." A styled SVG with a pin nails that without the cost.
- The map's purpose on `/locations` is *navigation* — for that, a "Get directions →" link that opens Google Maps with the coords is the actually-useful UX (people want directions in their phone's nav app, not embedded). The styled placeholder + the directions link does the real job.

When we later add interactive maps, the `<MapPlaceholder>` component swaps to `<MapEmbed>` at the same call sites; primitives don't change.

**Tradeoff.** Customers who want to look at the surrounding neighborhood without leaving the site don't get that. The "View larger map →" link covers the case.

---

### 14. Seed data approach — covered above (Decision A). Recommendation: NO.

---

### 15. Edit-cart preservation of form state

**Recommendation: USE REACT-HOOK-FORM'S NATIVE PERSISTENCE — `getValues()` snapshot held in a ref + `reset(snapshot)` on `CartSheet` close.** (As planned.)

**Why.** RHF's form state is already the canonical source of truth for the page. `getValues()` is O(1) and synchronous; snapshotting into a `useRef` is one line. The alternative (lifting form state to Zustand or syncing to URL params) buys nothing — the user is on the same page, the same component tree stays mounted, RHF state doesn't reset unless we tell it to. We just don't tell it to.

**Tradeoff.** If the user *adds* something to the cart from the `CartSheet` (e.g., they removed a line item and added a different dish), the snapshot's order-summary numbers are stale until the next `useCart` invalidation fires. That's fine — TanStack Query handles that within ~200ms and the form fields themselves aren't affected.

---

### 16. `FilterPillGroup` extension vs duplicate

**Recommendation: DUPLICATE — keep admin's existing `FilterPillGroup` as-is, add a new `FilterPillMultiGroup` (or similar) for the customer multi-select pill API.**

**Plan needs an update.** I initially recommended extending. Reading `packages/ui/src/filter-pill-group/index.tsx` carefully changed my mind:

- Admin's `FilterPillGroup` is **single-select** (`value: TId; onChange: (next: TId) => void;`) and uses `role="tablist"` semantics. It's effectively a tab strip.
- Web's spec is **multi-select with an "all" sentinel** (`value: TId[]; onChange: (next: TId[]) => void;`) — fundamentally different interaction model (toggle dietary filters on/off), different ARIA (`role="group"` + `aria-pressed`), different selection logic ("toggle off the last one re-asserts 'all'").

Stuffing both into one primitive via a `variant` prop means: two `value` types unioned, two `onChange` types unioned, branching in the click handler, and consumers having to remember which mode they're in. That's a leaky abstraction.

Two primitives is cleaner:

- `FilterPillGroup<TId>` (admin's existing) — single-select tab-strip, stays exactly as-is.
- `FilterPillMultiGroup<TId>` (new, web) — multi-select with `allOptionId` sentinel, `leadingIcon` per option, copper-pill visual treatment.

Both reference the same semantic tokens. Both ~80 LOC. The duplication is the lesser evil.

**Plan needs an update.** §2 collisions table + §5.2 row for `FilterPillGroup (extended)` → change to "new `FilterPillMultiGroup` primitive; admin's `FilterPillGroup` unchanged".

---

### 17. `FormField` extension vs duplicate

**Recommendation: EXTEND.** (As planned.)

**Why.** Confirmed by reading `packages/ui/src/form-field/index.tsx`: it's *already* slot-based, *already* a clean small primitive, *already* used by admin in a way that adding `prefix?: ReactNode`, `suffix?: ReactNode`, `size?: 'sm' \| 'md' \| 'lg'` is purely additive (admin doesn't pass them; nothing breaks). The existing `hint` prop covers the "1–80 chars" right-aligned hint use case; the new `prefix`/`suffix` cover `+48` flag prefixes and clear-button suffixes.

The only thing to also add: a `size?: 'sm'|'md'|'lg'` that tightens the label/input/helper paddings — web's `lg` field is taller than admin's. Same component, more props.

---

### 18. Money on the wire vs in primitives — `MoneyStringSchema` end-to-end

**Recommendation: KEEP `MoneyStringSchema` END-TO-END.** (As planned, and confirmed by reading the codebase.)

**Why.** `packages/utils/src/format.ts:24-31`'s `formatMoney(value: string | number, currency: string)` already handles MoneyString input correctly *and* already produces `"24,00 zł"` for PLN (via `Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 })`). **No `formatMoney` extension is needed** — just a test asserting the PLN output.

`packages/utils/src/money.ts` is the server-side Decimal helper; `format.ts` is the browser-safe formatter. Both already exist and work. Primitives accept `string` for prices, render via `formatMoney`. Zero `Number` arithmetic anywhere in the cart/checkout/order flow.

**Plan needs an update.** §4 Phase 0.5 deliverable currently says "Web `formatMoney` covers PLN" → change to "**Add a regression test** confirming `formatMoney('24.00', 'PLN')` returns `'24,00 zł'` and `formatMoney('1234.50', 'PLN')` returns `'1 234,50 zł'`. No code changes; the helper already works."

---

## Items not in the original §12 but worth raising now

### 19. Cart-line server-side dedup (carry-over fix W3)

**Recommendation: ADD A NEW SERVER-SIDE FIX — `CartService.addItem` must look up an existing line with matching `(menuItemId, modifierFingerprint(snapshot))` and increment its quantity instead of creating a duplicate.**

**Why.** I asserted in the plan that this was "implemented at the API layer." It is **not**. `apps/api/src/cart/cart.service.ts:54-77` `addItem()` always calls `prisma.cartItem.create()` — no fingerprint dedup. The fingerprint helper exists (`apps/api/src/cart/modifier-validation.ts:98`) but is only used in `mergeOnLogin`. Same dish added twice = two cart lines. That contradicts every modern e-commerce expectation and would surface as a real bug the first time anyone adds the same drink twice.

**Concrete fix** (target sprint: Phase 0 alongside the cookie work):

1. In `addItem`, compute `fingerprint = modifierFingerprint(snapshot)`.
2. Query `prisma.cartItem.findFirst({ where: { cartId: cart.id, menuItemId: item.id }, … })` — but indexed lookup needs `modifierFingerprint` stored on the row. Two options:
   - **Option A (preferred):** add `modifierFingerprint String?` column to `CartItem` (migration: backfill from existing rows, then `NOT NULL`). Compound unique `@@unique([cartId, menuItemId, modifierFingerprint])`. `addItem` becomes an `upsert` — `quantity: { increment: dto.quantity }` on hit. Atomic, race-safe, indexed.
   - **Option B (no migration):** fetch all rows for the cart in `addItem`, compute fingerprint per row in memory, find match. Works for small carts; doesn't scale and has a TOCTOU race under concurrent adds.

Go with **Option A**. One small migration, the dedup is correct forever. Same fix benefits the merge-on-login path (which currently dedups in memory).

**Plan needs an update.** §11 row W3 — change from "Server-side at `POST /cart/items`. Test in `apps/api/test/cart.e2e.spec.ts`" to "**NOT YET IMPLEMENTED.** Phase 0 deliverable: new migration `add_cart_item_modifier_fingerprint`, `CartService.addItem` becomes `upsert` on `(cartId, menuItemId, modifierFingerprint)`. Update `mergeOnLogin` to use the same fingerprint column. New e2e test covering 'add same item with same modifiers twice → one line, qty 2'."

---

### 20. `AddressAutocomplete` backend endpoint

**Recommendation: ADD a Phase 0 backend deliverable — `POST /addresses/autocomplete` proxy route.**

**Why.** The plan §5.3 says the primitive takes a `provider` callback; §7 lists a `useAddressAutocomplete()` hook calling `apiClient.suggestAddresses(query)`. **Neither the endpoint nor the api-client method exists.** Confirmed by `grep -rn autocomplete apps/api/src/addresses/ packages/api-client/src/` — nothing.

For v1, the endpoint can return the same 9 Warsaw addresses as the SD mock (so the design phase is unblocked without a real geocoding key). Backend stubs it; real Mapbox/Google integration is wired in once a key is in env. Single integration point keeps the client primitive provider-agnostic.

**Plan needs an update.** §4 Phase 0 — add deliverable 0.12: stub `POST /addresses/autocomplete` returning hardcoded 9 Warsaw matches (filtered by query prefix); add `apiClient.addresses.autocomplete(query)` to `packages/api-client`. Phase 3 row "Address autocomplete" stays as-is (the hook just calls the real endpoint).

---

### 21. `OrderType` enum mismatch

**Recommendation: USE THE EXISTING DB ENUM EVERYWHERE — `'DELIVERY' | 'PICKUP' | 'DINE_IN'`. Drop SD's `'delivery' | 'pickup' | 'eatin'`.**

**Why.** `packages/types/src/order.ts:8` already defines `ORDER_TYPES = ['DELIVERY', 'PICKUP', 'DINE_IN']`. The SD source uses lowercased `'eatin'` which doesn't match. If the checkout form state uses SD's strings, we'd need a translation at the API boundary — easy to forget. Use the canonical values from day one; the display label in the UI (`"Eat in"`, `"Delivery"`, `"Pickup"`) is a separate `LABEL_BY_ORDER_TYPE` lookup.

`OrderProgressStepper.mode` likewise: `'DELIVERY' | 'PICKUP' | 'DINE_IN'` (case-matched with the rest of the codebase).

**Plan needs an update.** §5.3 `OrderProgressStepper` signature — `mode: OrderType` from `@repo/types`. §6.3 form schema — `orderType: z.enum(ORDER_TYPES)`. Where SD source says `'eatin'`, translate to `'DINE_IN'`.

---

### 22. `OrderProgressStepper` status mapping

**Recommendation: USE THE FULL `OrderStatus` ENUM, MAP TO STEPS INTERNALLY.**

**Why.** `packages/types/src/order.ts:14-22` `ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']`. SD's stepper handles a small custom subset ('confirmed', 'preparing', 'on-the-way', …). The real order-tracking page needs to handle all 9 statuses — including `CANCELLED` (stepper goes red), `REFUNDED` (likewise), and `COMPLETED` (final state distinct from `DELIVERED` if the receipt is closed).

Build the status-to-step mapping once, inside the primitive, with explicit handling for terminal-failure statuses. Keeps the truth in one place.

---

## Updated decision summary table

| # | Decision | Recommendation | Plan change required? |
|---|---|---|---|
| A | Seed SD into DB | NO — keep mocks | Yes (§6.2) |
| B | sessionKey to cookie | YES — own PR | Already in plan §4.0.11 |
| 1 | Hero decoration slot | Separate slot | No |
| 2 | SiteNav named slots | Named + escape `rightSlot` | Yes (§5.1) |
| 3 | next/image in primitives | Yes, primitive owns | Yes (§5.1) |
| 4 | Landing under (marketing) | Yes | No |
| 5 | HoursTable day key | **ISO number 0–6** | Yes (§5.1) |
| 6 | ModifierGroup value array | string[] | No |
| 7 | CartSheet sheet vs rail | Sheet both breakpoints | No |
| 8 | FormField slot-children | Slot-children | No |
| 9 | RadioCardGroup nullable | `TId \| null` | No |
| 10 | TimeSlotValue union | Keep union | No |
| 11 | delivery union | Keep union | No |
| 12 | error as own status | Yes | No |
| 13 | Map: static SVG v1 | Yes | No |
| 14 | Seed (= A) | NO | Yes |
| 15 | Edit-cart RHF snapshot | Yes | No |
| 16 | FilterPillGroup | **Duplicate, not extend** | Yes (§2, §5.2) |
| 17 | FormField extend | Yes, extend | No |
| 18 | Money: MoneyString E2E | Yes (already works) | Yes (§4.0.5) |
| 19 | Cart dedup fix | **New Phase 0 deliverable + migration** | Yes (§11 W3) |
| 20 | AddressAutocomplete endpoint | **New Phase 0 deliverable** | Yes (§4) |
| 21 | OrderType enum | Use DB enum `DELIVERY/PICKUP/DINE_IN` | Yes (§5.3, §6.3) |
| 22 | OrderStatus full enum in stepper | Yes | Yes (§5.3) |

**6 "no change" / 14 "yes change to plan"** — most are small wording shifts. The substantive new work surfaced:

- **Item 19 (cart dedup)** — a real backend bug, needs a migration + service change in Phase 0.
- **Item 20 (address autocomplete endpoint)** — missing backend route, needs a stub in Phase 0.
- **Item 16 (duplicate filter pill primitive)** — slightly more `@repo/ui` code than planned, no consumer churn.
- **Item B (cookie sessionKey)** — already flagged but worth re-confirming this is in scope for the foundation PR.

If you approve the recommendations, I'll fold the changes back into `customer-web-port.md` so the plan and the recommendations stay in sync — happy to do that as a single update pass.
