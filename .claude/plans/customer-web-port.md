# Customer Web App — Port from Szef Donald + Phase B Composition

> Target: take everything from `Szef Donald/` (Landing, Menu, Checkout, Confirmation pages + 30 primitives across 3 prompts), bring them into the repo with our architecture, then compose the remaining customer-side pages (About, Locations, Contact, Auth, Account, Order tracking) on top — and end-to-end wire everything to the existing backend.
>
> Scope: **`apps/web` (customer) only.** The warm cream / copper / serif-display palette and tokens defined here are web-exclusive. Mobile (Expo) will get a parallel theme later. Admin stays on its dark mint palette — both apps share `@repo/ui` primitives, which only reference *semantic* tokens.
>
> Sibling plan: `.claude/plans/admin-dashboard-port.md` — admin port followed the same shape; reuse the patterns settled there.
>
> **Decisions log:** `.claude/plans/customer-web-port-decisions.md` — recommendations + rationale for every open decision in §12. All 22 items approved 2026-05-17; this plan reflects the approved positions. Read the decisions file when you need the *why* behind a particular shape; this file is the *what*.

---

## 0. Guiding constraints (non-negotiable)

Pulled from `CLAUDE.md` + `docs/design-prompts/web-01-landing.md` §1 + `web-02-menu.md` §1 + `web-03-checkout.md` §1. Everything below assumes these:

- **Plan-first** — each phase below produces a concrete deliverable list; we approve a phase before starting the next.
- **`@repo/ui` is theme-agnostic.** Primitives only reference *semantic* tokens (`bg-surface`, `text-fg`, `border-border`, `accent`, `surface-warm`), never literal hex. This is what keeps web's copper palette from leaking into admin (dark mint), and admin's dark mint from leaking back into web.
- **All DTOs from `@repo/types`.** No re-declared shapes in web features. `@repo/api-client` is the only HTTP layer.
- **Real-time via `@repo/realtime-client`** for order tracking (`order:{id}`). No polling.
- **Money** uses `Decimal` semantics on the wire (`MoneyStringSchema` in `@repo/types`) + `packages/utils/money.ts` helpers in the UI. `formatMoney` enforces `minimumFractionDigits: 2`. **PLN renders as `24,00 zł`** (comma decimal, space thousands).
- **Side effects (emails, sms, push)** route through BullMQ queues — never `await`'d in handlers.
- **No raw SQL, no client-trusted prices, no hardcoded URLs, no payment card storage.** All in CLAUDE.md. Cart prices are recomputed server-side at checkout; client-side numbers are display-only.
- **Guest carts and accounts coexist.** `apps/web/src/stores/cart-store.ts` is already server-cart-backed with a `sessionKey` for guests and a `mergeCartItems` reducer for guest→user merge on login. **We extend that, we don't replace it with a localStorage-only store.**

---

## 1. Theme architecture (the load-bearing decision)

**Problem:** the admin uses a dark mint/purple palette. The web app uses a warm cream + copper + serif palette. `@repo/ui` is shared — primitives must not embed either app's colors.

**Status from admin port:** `tooling/tailwind-config/tailwind.preset.ts` already exposes semantic CSS-var-backed colors (`bg`, `surface`, `surface-2`, `border`, `border-strong`, `fg`, `fg-muted`, `fg-subtle`, `fg-disabled`, `accent`, `positive`, `negative`, `warning`, `info`, status palette, chart palette). Admin's `:root` overrides land in `apps/admin/src/app/globals.css`. **Web just needs its own `:root` block.**

**Decision: extend the preset minimally, add web-specific `:root` overrides.**

1. **Add three missing semantic tokens** to the preset (web needs them, admin doesn't):
   - `surface-warm` — darker warm beige band (newsletter strip, sold-out chip bg). Resolves to `rgb(var(--surface-warm) / <alpha-value>)`.
   - `text-on-accent` — what to render *on top of* `accent` (white on copper for web, near-black on mint for admin). Resolves to `rgb(var(--text-on-accent) / <alpha-value>)`.
   - `accent-muted` already exists in preset (`rgb(var(--accent) / 0.10)`) — reuse, don't duplicate.

   Admin's `globals.css` `:root` block must also define these (point `surface-warm` at `surface-elevated`, `text-on-accent` at `#0B0D12`) so primitives stay portable.

2. **Web app `:root` block** lives in `apps/web/src/app/globals.css` — port the §1.1 palette from `web-01-landing.md` *exactly*, as space-separated RGB triples. The values are in `Szef Donald/globals.css` already; we copy them, renaming to the semantic names the preset expects:

   ```css
   :root {
     --bg:               242 234 217;   /* #F2EAD9 */
     --surface:          251 247 238;   /* #FBF7EE */
     --surface-elevated: 255 255 255;   /* #FFFFFF */
     --surface-warm:     229 212 184;   /* #E5D4B8 */

     --border:           42 31 24;      /* espresso, alpha applied at utility level */
     --border-strong:    42 31 24;

     --fg:               42 31 24;      /* espresso — admin calls this `--text-primary`, we use the preset name */
     --fg-muted:         107 93 82;
     --fg-subtle:        154 142 131;
     --fg-disabled:      199 189 179;
     --text-on-accent:   255 255 255;

     --accent:           194 65 12;     /* #C2410C copper */
     --accent-hover:     154 51 10;

     --positive:         79 123 60;     /* olive */
     --negative:         185 28 28;
     --warning:          217 119 6;
     --info:             30 64 175;

     /* Border alpha defaults — web uses lighter touch than admin */
     --border-alpha: 0.08;
     --border-strong-alpha: 0.16;
   }
   ```

   **Naming note.** The Szef Donald source uses `--text-primary` / `--text-secondary` / `--text-tertiary`. The preset uses `--fg` / `--fg-muted` / `--fg-subtle`. We adopt the **preset's names** so primitives stay portable across both apps. (See §11 carry-over fix #L1.)

3. **Typography.** Web introduces **Fraunces (display, serif)** alongside Inter (body). Load via Next.js `next/font/google` in `apps/web/src/app/layout.tsx`. Expose CSS variables `--font-display` (Fraunces) and `--font-body` (Inter). Add the display family to the Tailwind preset's `fontFamily.display` key (already defaulted to Inter — overridable at the app level via Tailwind config in `apps/web/tailwind.config.ts`).

4. **Type scale.** Web's scale is bigger and airier than admin's (Hero 88px, H1 56px, H2 40px, etc.). Define web's scale **only in `apps/web/tailwind.config.ts`** as `extend.fontSize` keys (`hero`, `h1`, `h2`, `h3`, `eyebrow`, `body-l`, `body`, `small`, `caption`) — these are web-app-local utility classes that don't collide with the admin's `-admin` suffixed keys.

5. **Status palette.** Web doesn't need most of the order-status tokens (no Orders or KDS pages here), but the Order Tracking page does need a subset. The admin's `--status-*` vars stay in the preset; web's `:root` overrides them to use the *warm* equivalents (e.g. `--status-confirmed` → info navy, `--status-out-for-delivery` → info navy, `--status-delivered` → positive olive). Status hex is wrapped as a CSS var; primitives never hardcode.

6. **Mobile note.** NativeWind doesn't read CSS vars. `@repo/ui-mobile` will be a parallel primitive set with the same semantic names but a JS-object theme. Not in scope here; flagged for the eventual mobile port.

**Why this path (not className overrides per app):** every consumer of every primitive would otherwise need to pass theme classes. CSS vars push the variation to one place per app.

---

## 2. Conversion conventions (apply to every primitive port)

The Szef Donald source is **vanilla JSX + global `window.Icon` + raw CSS classes in three monolithic stylesheets** (`globals.css`, `menu.css`, `checkout.css` — 3081 lines total). Each ported primitive needs:

- `.jsx` → `.tsx` with proper props typing. Generics for `FilterPillGroup<TId>`, `RadioCardGroup<TId>`.
- `window.Icon.*` → `lucide-react` (already in `@repo/ui` deps for admin port). Drop the home-made `icons.jsx` set.
- **One source of truth for styling per primitive: Tailwind utilities backed by the semantic tokens.** No co-located CSS files. The few cases that need real CSS (sheet slide-in animations, scroll-snap rows, BLIK digit grid) use Tailwind's `data-[state=open]` patterns or `framer-motion`.
- File layout: `packages/ui/src/<primitive>/index.tsx` (component), `packages/ui/src/<primitive>/types.ts` (only when there's a non-trivial public type), barrel re-export from `packages/ui/src/index.ts`.
- Use shadcn/ui as the **substrate where it adds value** (Sheet, Dialog, Popover, Command, Tooltip) — already scaffolded into `packages/ui/src/_shadcn/` from the admin port. Reuse, don't reinstall.
  - `ItemDetailSheet` and `CartSheet` = shadcn `Sheet` with web-themed styling.
  - `AddressAutocomplete` = headless combobox built on shadcn `Popover` + `Command`.
  - `Tooltip` from shadcn for disabled radio-card hover-reasons.
- All components are server-component-safe by default; mark `"use client"` only where state/refs require it (interactive primitives like sheets, autocomplete, cart steppers do; presentational ones like `CategoryCard`, `DishCard`, `Hero`, `SectionHeader`, `HoursTable`, `TestimonialCard` don't).
- Tests: every primitive gets a `*.test.tsx` (Vitest + Testing Library) covering keyboard nav, ARIA roles, and one render assertion. Visual ground truth = the screenshots in `Szef Donald/screenshots/` plus running the SD HTML locally side-by-side with the React port.

### Collisions with existing primitives — resolved upfront

Six primitives in the SD source share names with primitives already in `packages/ui/` from the admin port. **Decide once, apply consistently:**

| Existing primitive (admin-flavored) | SD spec (customer-flavored) | Decision |
|---|---|---|
| `FilterPillGroup` (single-select tablist) | Customer multi-select pill with `'all'` sentinel + icons | **Duplicate.** The interaction models are fundamentally different: admin is single-select (`value: TId`, `role="tablist"`); web is multi-select with sentinel handling (`value: TId[]`, `role="group"` + `aria-pressed`). Stuffing both into one primitive via a `variant` prop unions the `value` types, the `onChange` types, and forks the click handler — leaky abstraction. Cleaner: keep admin's `FilterPillGroup` unchanged; add a new `FilterPillMultiGroup<TId>` primitive for web. Both ~80 LOC. |
| `FormField` | Web has `prefix`/`suffix` slots, `size` prop, slot-children for any input | **Extend.** The existing admin `FormField` already takes slot `children` (via `React.Children.only` + `cloneElement` for id/aria injection) and has `layout: 'stacked' \| 'inline'` + a `hint` prop. We add `prefix?: ReactNode`, `suffix?: ReactNode`, `size?: 'sm' \| 'md' \| 'lg'` — purely additive. Web composes those; admin doesn't pass them. |
| `InlineEdit` | Not in SD's scope. | **Leave admin-only.** No web use yet. |
| `CurrencyInput` | Web uses one in `TipPicker` "Other" mode. | **Reuse as-is.** Admin's `CurrencyInput` already handles `Decimal`-friendly inputs + currency suffix. |
| `ImageUploader` | Not in SD's scope (customer doesn't upload). | **Leave admin-only.** |
| `SchedulePicker` | Not in SD's scope (no weekly-schedule editing). | **Leave admin-only.** |

**Single new primitive that replaces an admin equivalent:** none. Every SD primitive is genuinely new functionality (Hero, DishCard, CartSheet, etc.), an extension of an existing primitive (`FilterPillGroup`, `FormField`), or a substrate already shared (`shadcn/ui`).

---

## 3. Money & DTO architecture (the second load-bearing decision)

`packages/types/src/cart.ts` and `menu.ts` use `MoneyStringSchema` (fixed-point decimal strings, e.g. `"24.00"`) and `modifierSnapshot: { groupId, groupName, optionId, optionName, priceDelta }`. The SD source uses plain `Number` (`24`) and flat `{ groupName, optionName, priceDelta }` with no ids.

**Decision: adopt `MoneyStringSchema` and `@repo/types/cart.ts` shapes from day one.** The SD source's `Number` arithmetic is the kind of bug CLAUDE.md explicitly forbids ("Money fields use `Decimal`. Use `packages/utils/money.ts` helpers, never Number arithmetic.").

Concretely:

1. **`packages/ui/src/dish-card/` and `packages/ui/src/cart-line-item/` price prop** uses `{ amount: string; currency: string }` (not `{ amount: number }`). The component renders via `formatMoney(amount, currency)` — `formatMoney` accepts the decimal string and does the arithmetic with `Decimal`.

2. **Cart line shape** in the web feature folder uses `CartItemDto` from `@repo/types/cart.ts` directly (`menuItemId`, `quantity`, `unitPrice: string`, `lineTotal: string`, `modifierSnapshot: ModifierSnapshotEntry[]`, `notes`). The SD's local `CartLine` shape becomes the *display projection* the cart-sheet primitive consumes — a thin adapter at the feature boundary maps DTO → display shape (`{ id, name, image, modifierSummary, …}`).

3. **`CartLineItem` primitive accepts a display shape**, not a DTO, so `@repo/ui` stays free of `@repo/types` imports beyond enums. Shape:
   ```ts
   type CartLineDisplay = {
     id: string;
     name: string;
     image?: string;
     unitPrice: string;       // MoneyString
     quantity: number;
     modifierSummary?: string; // pre-joined "Mega · Beef and lamb · Tahini"
     notes?: string;
   };
   ```

4. **`useCartStore` stays server-cart-backed.** Guest carts use the existing `sessionKey` mechanism. Local optimistic state lives in TanStack Query cache, not in Zustand — the Zustand store only holds the session key and pending-mutation count, already implemented. `mergeCartItems` reducer handles guest → user merge on login.

5. **Pre-checkout cart, post-checkout last-order snapshot** — the SD source uses `sessionStorage` to hand off cart contents from `/checkout` to `/checkout/success/[orderId]`. We instead **fetch the order from the API** on the success page (the order id is in the URL; `useOrder(orderId)` returns the canonical record from the server, which is the actual truth). No sessionStorage workaround.

6. **`formatMoney` carry-over from admin port.** `packages/utils/money.ts` already enforces `minimumFractionDigits: 2`. Add **PLN-specific output** (comma decimal, `zł` suffix) — currently the helper only handles USD/EUR-style formatting. Test: `formatMoney("24.00", "PLN")` → `"24,00 zł"`; `formatMoney("1234.50", "PLN")` → `"1 234,50 zł"` (NBSP thousands).

---

## 4. Phase 0 — Foundation (do first, ~1 day)

| # | Deliverable | Path | Notes |
|---|---|---|---|
| 0.1 | Extend Tailwind preset with `surface-warm`, `text-on-accent` | `tooling/tailwind-config/tailwind.preset.ts` | Both apps must define these in their `:root`; admin point `surface-warm` → `surface-elevated`. |
| 0.2 | Web `:root` theme variables + base styles | `apps/web/src/app/globals.css` | Port §1.1 palette from `web-01-landing.md`. Renaming map: SD's `--text-primary` → `--fg`, `--text-secondary` → `--fg-muted`, `--text-tertiary` → `--fg-subtle`, `--text-disabled` → `--fg-disabled`. Add type scale CSS classes (`.t-hero`, `.t-h1`, `.t-h2`, `.t-h3`, `.t-eyebrow`, `.t-body-l`, `.t-body`, `.t-small`, `.t-caption`) only if a primitive can't express them via Tailwind utilities — preference is utilities. |
| 0.3 | Web Tailwind config — fontFamily + fontSize tokens + container | `apps/web/tailwind.config.ts` | Extend the shared preset. Container `max-w-[1280px]`, side padding `clamp(20px, 4vw, 48px)`. Add `borderRadius: { card: '16px', image: '12px', input: '12px', button: '16px' }` overrides. |
| 0.4 | Load Fraunces + Inter via `next/font/google` | `apps/web/src/app/layout.tsx` | Expose as CSS vars `--font-display` and `--font-body`. Apply `font-feature-settings: "tnum","ss01"` to body. |
| 0.5 | `formatMoney` PLN regression test (no code change) | `packages/utils/src/__tests__/format.test.ts` (extend) | `formatMoney('24.00', 'PLN')` already returns `'24,00 zł'` via `Intl.NumberFormat('pl-PL', ...)`. We just add the regression assertions so the PLN behavior is locked. No helper code change. |
| 0.6 | Site chrome scaffolding (route-group layouts) | `apps/web/src/app/(marketing)/layout.tsx`, `apps/web/src/app/(shop)/layout.tsx`, `apps/web/src/app/(auth)/layout.tsx`, `apps/web/src/app/(account)/layout.tsx` | Wrap with `<SiteNav>` + `<main>` + `<SiteFooter>` (built in Phase 1.1). Auth uses a minimal nav (logo only, no links). Account uses the full nav + a sidebar. |
| 0.7 | Toast container (sonner) + provider | `apps/web/src/components/toaster.tsx`, mounted in `apps/web/src/providers/app-providers.tsx` | Sonner configured for warm-palette toasts: `--surface` bg, `--fg` text, `--accent` ring. Replaces SD's home-made toast manager. |
| 0.8 | Cart container (sheet + floating button) | `apps/web/src/components/cart-container.tsx`, mounted in `(shop)/layout.tsx` | Holds the global `CartSheet` + `FloatingCartButton`, reads cart from the existing `useCart()` hook, wires `onCheckout` to `router.push('/checkout')`. Hidden routes set per §1 carry-over `hideOnRoutes`. |
| 0.9 | Logo, CartButton, LanguageSwitcher | `apps/web/src/components/logo.tsx`, `cart-button.tsx`, `language-switcher.tsx` | Brand-specific, **not** in `@repo/ui`. Logo SVG ported from `Szef Donald/icons.jsx` (the copper hexagon + SD monogram + EST·2014 arc). `variant: 'full' \| 'mark' \| 'inverse'`. |
| 0.10 | Route reorganisation | `apps/web/src/app/` | Move `app/menu/page.tsx` → `app/(shop)/menu/page.tsx`. Add `app/(shop)/checkout/success/[orderId]/page.tsx`. Delete root `app/page.tsx` stub and rebuild under `(marketing)/page.tsx` *or* keep at root with the marketing layout — pick one (see decision §12 ¶4). |
| 0.11 | **Cart `sessionKey` moves from `localStorage` to httpOnly cookie** | `apps/web/src/stores/cart-store.ts` + `apps/web/src/app/api/cart-session/route.ts` + `<CartSessionProvider>` in `(shop)/layout.tsx` | Backend unchanged (controller already accepts `sessionKey` from query). Cookie name `cart_session`, `httpOnly`, `SameSite=Lax`. Route handler issues UUIDv4 on first POST if missing. Server components read via `cookies().get('cart_session')`; client hooks read via context. `mergeCartItems` reducer + tests stay intact. |
| 0.12 | **`POST /addresses/autocomplete` stub endpoint** (new) | `apps/api/src/addresses/addresses.controller.ts` + `packages/types/src/address.ts` + `packages/api-client/src/` | The plan's `AddressAutocomplete` primitive expects an `apiClient.addresses.autocomplete(query)` method that doesn't exist. v1 returns the 9 hardcoded Warsaw addresses filtered by prefix. Real Google/Mapbox integration is a follow-up — single integration point keeps the primitive provider-agnostic. |
| 0.13 | **Cart line server-side dedup (W3 fix)** | Prisma migration `add_cart_item_modifier_fingerprint` + `apps/api/src/cart/cart.service.ts` `addItem` becomes `upsert` | Bug discovered during research: `CartService.addItem` does NOT dedup — adding the same dish twice creates two cart lines. The `modifierFingerprint` helper exists at `modifier-validation.ts:98` but is only used in `mergeOnLogin`. Fix: add `modifierFingerprint String` column to `CartItem` with `@@unique([cartId, menuItemId, modifierFingerprint])`; `addItem` becomes `upsert` with `quantity: { increment: dto.quantity }` on hit. Atomic, race-safe, indexed. New e2e test covering "add same item with same modifiers twice → one line, qty 2". |

**Exit gate:** an empty page inside each route group renders with the warm theme, `SiteNav` is sticky and switches `transparent → solid` past 80px scroll, Fraunces loads on `<h1>` and Inter on body, the `formatMoney("24.00", "PLN")` regression test passes.

---

## 5. Phase 1 — Port the 30 primitives

Source column = where it lives in `Szef Donald/`. Target = where it lands. Notes = what to type/extend.

### 5.1 From page 1 — landing chrome + section primitives (10)

Source: `Szef Donald/primitives.jsx` + `Szef Donald/sections.jsx`.

| Primitive | Source | Target | Notes / Type signature |
|---|---|---|---|
| `SiteNav` | `primitives.jsx` `SiteNav` | `packages/ui/src/site-nav/` | `{ logo: ReactNode; links: { href; label; active? }[]; cart?: ReactNode; langSwitcher?: ReactNode; cta?: ReactNode; rightSlot?: ReactNode; variant?: 'transparent' \| 'solid'; sticky?: boolean; onOpenMobile?(): void }`. **Named right-slots** (`cart`, `langSwitcher`, `cta`) keep ordering/spacing/responsive collapse consistent across every page; `rightSlot` is the escape hatch for one-offs (e.g., order-tracking shows an order chip there). Sticky behavior + scroll-state toggling lives in a `useScrollState()` hook inside `apps/web/src/components/site-chrome.tsx` (the consumer that mounts SiteNav, not the primitive). Primitive is pure presentational. |
| `SiteFooter` | `sections.jsx` `SiteFooter` | `packages/ui/src/site-footer/` | `{ brandSlot: ReactNode; columns: { heading: string; links: { href; label }[] }[]; bottom?: { copyright: string; legal: { href; label }[]; rightSlot?: ReactNode } }`. Don't bake Szef Donald copy into the primitive — feature provides content. |
| `Container` | `primitives.jsx` `Container` | `packages/ui/src/container/` | `{ size?: 'narrow' \| 'default' \| 'wide'; children; className?; as?: keyof JSX.IntrinsicElements }`. `narrow=720px`, `default=1280px`, `wide=full`. |
| `Hero` | `primitives.jsx` `Hero` | `packages/ui/src/hero/` | `{ eyebrow?; title: ReactNode; description?: string; primaryCta?; secondaryCta?; media: ReactNode; decoration?: ReactNode; rating?: { value: number; count: number } }`. `decoration` is a separate slot (decision: see §13 ¶1), not baked into `media`. |
| `SectionHeader` | `primitives.jsx` `SectionHeader` | `packages/ui/src/section-header/` | `{ eyebrow?; title: ReactNode; description?; align?: 'left' \| 'center'; action?: { label; href }; id?: string }`. The `id` lets `aria-labelledby` work without extra wrapping. |
| `CategoryCard` | `primitives.jsx` `CategoryCard` | `packages/ui/src/category-card/` | `{ href; image: { src; alt; priority?; sizes? }; label; itemCount?; size?: 'sm' \| 'md' \| 'lg' }`. Primitive composes `next/image` internally with sensible `sizes` defaults for the breakpoint. |
| `DishCard` | `primitives.jsx` `DishCard` | `packages/ui/src/dish-card/` | `{ href; image; name; description?; price: { amount: string; currency: string }; flags?: DishFlag[]; onAdd?(): void; unavailable?: boolean; reserveFlagSpace?: boolean }` — `reserveFlagSpace` is the carry-over from page 2 (always min-height 24px on flag row). |
| `TestimonialCard` | `primitives.jsx` `TestimonialCard` | `packages/ui/src/testimonial-card/` | `{ quote; author: { name; meta?; avatar? }; rating: number; source?: 'google' \| 'tripadvisor' \| 'facebook' \| 'internal' }`. Rating supports 0.5 increments via `<Stars value={rating}/>` sub-primitive. |
| `HoursTable` | `primitives.jsx` `HoursTable` | `packages/ui/src/hours-table/` | `{ hours: { dayOfWeek: 0\|1\|2\|3\|4\|5\|6; opensAt: string; closesAt: string; isClosed?: boolean }[]; highlightToday?: boolean; layout?: 'list' \| 'compact' }`. **ISO day numbers** (0=Sunday…6=Saturday) match `OperatingHoursSchema` in `@repo/types/restaurant.ts` and the DB column `OperatingHours.dayOfWeek: Int`. `useRestaurantInfo().hours` returns the data in this exact shape — no translation needed. Primitive renders day abbreviations via internal lookup. `highlightToday` uses `new Date().getDay()` directly. `compact` layout groups consecutive matching ranges. |
| `NewsletterForm` | `primitives.jsx` `NewsletterForm` | `packages/ui/src/newsletter-form/` | `{ title?; description?; placeholder?; ctaLabel?; onSubmit: (email: string) => Promise<void>; successMessage?; errorMessage? }`. Default labels in English; copy comes from `@repo/i18n` keys at the feature layer. |

### 5.2 From page 2 — menu / order pattern primitives (10)

Source: `Szef Donald/menu-primitives.jsx`.

| Primitive | Source | Target | Notes |
|---|---|---|---|
| `SearchInput` | `menu-primitives.jsx` `SearchInput` | `packages/ui/src/search-input/` | `{ value; onChange; placeholder?; debounceMs?=200; size?: 'sm' \| 'md' \| 'lg'; autoFocus?; shortcutKey?: string }`. `shortcutKey="/"` registers a global key-binding (focus search). Includes clear button. |
| `MenuSubNav` | `menu-primitives.jsx` `MenuSubNav` | `packages/ui/src/menu-sub-nav/` | `{ sections: { id; label; count? }[]; activeId; onSelect; stickyOffsetPx?=72; variant?: 'pill' \| 'underline' }`. Scroll-into-view on active change. Scroll-spy hook is at the feature layer (`useScrollSpy`), not in the primitive — primitive just renders + emits clicks. |
| `FilterPillMultiGroup<TId>` (new) | `menu-primitives.jsx` `FilterPillGroup` | `packages/ui/src/filter-pill-multi-group/` | New primitive (admin's single-select `FilterPillGroup` stays untouched). `{ options: { id: TId; label; icon?: ReactNode; count? }[]; value: TId[]; onChange: (next: TId[]) => void; allOptionId?: TId; ariaLabel? }`. Toggling off the last specific filter re-asserts `allOptionId`. `role="group"` + `aria-pressed` per pill (not tablist semantics — these are toggles, not tabs). Copper-pill visual treatment via semantic tokens. |
| `ItemDetailSheet` | `menu-primitives.jsx` `ItemDetailSheet` | `packages/ui/src/item-detail-sheet/` | `{ open; onOpenChange; item: DishDetail \| null; onAddToCart: (line: NewCartLine) => void; width?=560 }`. Built on shadcn `Sheet`. Modifier-group rendering loops over `item.modifierGroups` and renders `ModifierGroup`. Local state for modifier selections / qty / notes inside the sheet — emits the assembled `NewCartLine` upward. |
| `ModifierGroup` | `menu-primitives.jsx` `ModifierGroup` | `packages/ui/src/modifier-group/` | `{ group: ModifierGroupShape; value: string[]; onChange; error? }`. `value: string[]` for both radio (length 1) and checkbox (length ≤ max) — locked, see decision §13 ¶6. Real `<fieldset>` + `<legend>`. `<input type="radio">` / `type="checkbox">` are real DOM nodes (visually hidden), so browser autofill + form-submit semantics work. |
| `QuantityStepper` | `menu-primitives.jsx` `QuantityStepper` | `packages/ui/src/quantity-stepper/` | `{ value; onChange; min?=1; max?=99; size?: 'sm' \| 'md' \| 'lg'; ariaLabel? }`. Renders both `−` and `+` always (carry-over fix from page-2 build). Regression test: must show `− value +` with both buttons functional. |
| `CartSheet` | `menu-primitives.jsx` `CartSheet` | `packages/ui/src/cart-sheet/` | `{ open; onOpenChange; lines: CartLineDisplay[]; onUpdateQty; onRemove; onCheckout; subtotal: string; currency; notes?: { value; onChange; placeholder? }; emptyState?: { actionLabel?; onActionClick? } }`. Built on shadcn `Sheet`. Empty state composes `EmptyState`. Stays right-side overlay on all breakpoints (decision §13 ¶7). |
| `CartLineItem` | `menu-primitives.jsx` `CartLineItem` | `packages/ui/src/cart-line-item/` | `{ line: CartLineDisplay; onUpdateQty?; onRemove?; variant?: 'editable' \| 'readonly'; currency }`. Readonly variant hides the stepper + remove button; used in checkout summary + order confirmation + order tracking. |
| `FloatingCartButton` | `menu-primitives.jsx` `FloatingCartButton` | `packages/ui/src/floating-cart-button/` | `{ itemCount; total: string; currency; onClick; position?: 'br' \| 'bc'; hidden?: boolean }`. **No router imports inside `@repo/ui`.** The `cart-container.tsx` (Phase 0.8) reads `usePathname()` and passes `hidden={HIDE_CART_ROUTES.includes(pathname)}` down. Keeps the primitive portable to admin / mobile / Storybook. Auto-hides when `itemCount === 0`. **Note:** every primitive accepting an image follows the same convention — primitive composes `next/image` internally and accepts `{ src, alt, priority?, sizes? }`. `@repo/ui` thus depends on `next/image` (web-only; mobile uses `@repo/ui-mobile`). |
| `EmptyState` | `menu-primitives.jsx` `EmptyState` | `packages/ui/src/empty-state/` | `{ icon?: ReactNode; title; description?; action?: { label; onClick?; href? }; size?: 'sm' \| 'md' \| 'lg' }`. Genuinely tiny; covers cart-empty, search-no-results, no-favorites, no-orders, address-book-empty, no-reviews. |

### 5.3 From page 3 — checkout / form / post-purchase primitives (10)

Source: `Szef Donald/checkout-primitives.jsx`.

| Primitive | Source | Target | Notes |
|---|---|---|---|
| `FormField` (extended) | `checkout-primitives.jsx` `FormField` | `packages/ui/src/form-field/` *(existing folder)* | Add `prefix?: ReactNode`, `suffix?: ReactNode`, `size?: 'sm' \| 'md' \| 'lg'`, `layout?: 'stacked' \| 'inline'` to the existing primitive. Slot-children stays (decision §13 ¶8). Auto-injects `id`, `aria-required`, `aria-invalid`, `aria-describedby` via `cloneElement`. |
| `RadioCardGroup<TId>` | `checkout-primitives.jsx` `RadioCardGroup` | `packages/ui/src/radio-card-group/` | `{ options: { id: TId; label; description?; icon?; badge?; badgeTone?: 'positive' \| 'warning' \| 'negative'; disabled?; disabledReason? }[]; value: TId \| null; onChange; layout?: 'horizontal' \| 'vertical' \| 'grid'; columns?: 1 \| 2 \| 3; rowVariant?: boolean; ariaLabel? }`. `value: TId \| null` for unselected starting state (decision §13 ¶9). Real `<button role="radio">` in `<div role="radiogroup">`. Tooltip on disabled uses shadcn `Tooltip`. |
| `AddressAutocomplete` | `checkout-primitives.jsx` `AddressAutocomplete` | `packages/ui/src/address-autocomplete/` | `{ value: AddressInput \| null; onChange; country?='PL'; error?; provider?: AddressProvider }`. **`provider`** is a callback `(query: string) => Promise<AddressMatch[]>` — the primitive doesn't know about the autocomplete backend. Mock provider for design phase is just the 9 Warsaw addresses array; real impl wires to a server route (`POST /addresses/autocomplete`) that proxies Google Places / Mapbox so API keys stay server-side. |
| `TimeSlotPicker` | `checkout-primitives.jsx` `TimeSlotPicker` | `packages/ui/src/time-slot-picker/` | `{ value: TimeSlotValue; onChange; mode: 'delivery' \| 'pickup'; earliestSlotMinutes; slotDurationMinutes?=15; slotsAheadHours?=3; closedReason?: string; restaurantHours?: WeeklySchedule }`. `value: { kind: 'asap' } \| { kind: 'scheduled'; iso: string }` (locked, decision §13 ¶10). Slot generation respects `restaurantHours` so cutoffs aren't hardcoded. |
| `PromoCodeInput` | `checkout-primitives.jsx` `PromoCodeInput` | `packages/ui/src/promo-code-input/` | `{ applied: { code; discountCents?: number; discountAmount?: string; label }; onApply: (code: string) => Promise<{ ok: true; … } \| { ok: false; error: string }>; onRemove(): void; collapsed?=true }`. `discountAmount` (string) preferred over `discountCents` for type consistency with the rest of the cart. |
| `OrderSummaryPanel` | `checkout-primitives.jsx` `OrderSummaryPanel` | `packages/ui/src/order-summary-panel/` | `{ lines: CartLineDisplay[]; currency; subtotal: string; delivery: { amount: string } \| { label: string }; discount?: { amount: string; label }; tip?: string; total: string; showEditCart?=true; onEditCart?; promoInput?: ReactNode; ctaSlot?: ReactNode; variant?: 'sticky-rail' \| 'inline' }`. `delivery` union keeps "Free" labels typed (decision §13 ¶11). |
| `CheckoutSection` | `checkout-primitives.jsx` `CheckoutSection` | `packages/ui/src/checkout-section/` | `{ step: number; title: string; status: 'pending' \| 'active' \| 'complete' \| 'error'; summary?: ReactNode; onEdit?(): void; rightSlot?: ReactNode; children }`. Collapses to summary on `complete`. `'error'` is its own status (decision §13 ¶12). |
| `TipPicker` | `checkout-primitives.jsx` `TipPicker` | `packages/ui/src/tip-picker/` | `{ subtotal: string; value: string; onChange: (next: string) => void; presets?: number[]=[0,5,10,15]; allowCustom?=true; currency }`. Tip values cross the boundary as MoneyString. Uses the existing `CurrencyInput` for "Other". |
| `OrderProgressStepper` | `checkout-primitives.jsx` `OrderProgressStepper` | `packages/ui/src/order-progress-stepper/` | `{ mode: OrderType; status: OrderStatus }`. Imports both enums from `@repo/types/order.ts` (`OrderType = 'DELIVERY' \| 'PICKUP' \| 'DINE_IN'`; `OrderStatus = 'PENDING' \| 'CONFIRMED' \| 'PREPARING' \| 'READY' \| 'OUT_FOR_DELIVERY' \| 'DELIVERED' \| 'COMPLETED' \| 'CANCELLED' \| 'REFUNDED'`). Step labels derived from `mode`; **CANCELLED + REFUNDED render a terminal-failure state (red circle, "Cancelled" label)** rather than progressing the stepper. Mapping table lives inside the primitive. |
| `SuccessHero` | `checkout-primitives.jsx` `SuccessHero` | `packages/ui/src/success-hero/` | `{ icon?: ReactNode; title: ReactNode; description?: ReactNode; meta?: ReactNode }`. The hexagonal copper checkmark is the *default* icon — fallback lives inside the primitive as a small SVG (it's brand-neutral enough; copper color comes from `--accent`). |

### 5.4 Plus tokens

| Asset | Target | Notes |
|---|---|---|
| `DISH_FLAG_TOKENS` | `packages/ui/src/tokens/dish-flags.ts` | `{ vegetarian: { label: 'V'; token: 'positive'; icon: 'leaf' }, vegan: { label: 'Vegan'; token: 'positive'; icon: 'leaf' }, 'gluten-free': { label: 'GF'; token: 'positive'; icon: 'wheat-off' }, spicy: { label: 'Spicy'; token: 'warning'; icon: 'flame' }, featured: { label: 'Featured'; token: 'accent'; icon: 'sparkles' } } as const`. **GF must be `positive` not `info`** — see §11 carry-over fix #W1. |
| `OrderTrackingSteps` | `packages/ui/src/tokens/order-tracking.ts` | Maps `mode` → array of step labels: `delivery: ['Confirmed','Preparing','On the way','Delivered']`, etc. Pulled out of `OrderProgressStepper` so it's queryable by the order-tracking page header. |

**Exit gate for Phase 1:** an "internal" dev page at `apps/web/src/app/(marketing)/_dev/primitives/page.tsx` renders every primitive with sample data, matching screenshots in `Szef Donald/screenshots/`. Delete the dev page before Phase 4. Each primitive has at least one unit test passing.

---

## 6. Phase 2 — Port the 4 design pages

Port in this order: **Landing → Menu → Checkout → Confirmation**. Each consumes only Phase 1 primitives + the cart store. The user explicitly said "3 pages" but the SD folder ships 4 HTML files; the Confirmation page is part of the Checkout port per `web-03-checkout.md` §5.

### 6.1 Landing (`/`)

| File | Source | Target |
|---|---|---|
| Page | `Szef Donald/app.jsx` | `apps/web/src/app/(marketing)/page.tsx` *(after moving `app/page.tsx`)* |
| Sections (one file each) | `Szef Donald/sections.jsx` | `apps/web/src/features/landing/sections/{hero,categories,featured-dishes,story,hours-location,testimonials,newsletter}.tsx` |
| Mock data | `Szef Donald/data.jsx` | `apps/web/src/lib/mock/landing.ts` (replaced in Phase 3 by `apps/web/src/features/{menu,reviews,restaurants}/hooks/`) |
| Reveal-on-scroll | (in `app.jsx`) | `apps/web/src/components/reveal-on-scroll.tsx` — a small `"use client"` wrapper with `useEffect` + IntersectionObserver + reduced-motion gate. The SD source's manual `is-in` class management → a clean React boundary. |
| Map placeholder | `sections.jsx` `MapPlaceholder` | `apps/web/src/features/landing/components/map-placeholder.tsx` — kept as a styled SVG; the real Mapbox/Google integration is a Phase 4 enhancement (decision §13 ¶13). |

**Carry-over fixes at Landing port time:**
- All testimonial cards must reserve a 3-line min-height for the quote so the row stays even (regression from page-1 spec).
- Mix positive and negative deltas — N/A here (no KPIs).
- All numbers reconcile to themselves only (the 4.8 rating in the hero matches what `mockTestimonials.average` returns).

### 6.2 Menu (`/menu`)

| File | Source | Target |
|---|---|---|
| Page | `Szef Donald/menu-app.jsx` | `apps/web/src/app/(shop)/menu/page.tsx` |
| Header + sticky search/filter + sub-nav + category sections + dish-grid | `menu-app.jsx` | `apps/web/src/features/menu/components/{menu-header,menu-search-filter,menu-sub-nav-section,category-section,dish-grid,menu-dish-card,item-detail-container}.tsx` |
| Mock data | `menu-data.jsx` | replaced by `useMenuTree()` hook (already exists at `apps/web/src/features/menu/hooks/use-menu-tree.ts`) wired to `apiClient.getMenuTree(restaurantId)`. **Reads The Test Kitchen** (already seeded in `packages/db/seed.ts`) — we do NOT fork the seed to add Szef Donald. The SD content (kebab/falafel) stays in `apps/web/src/lib/mock/szef-donald.ts` for the `_dev/primitives` dev page only. Real demos render against The Test Kitchen menu. |
| Cart store integration | `useCartStore` in `menu-app.jsx` | The existing `useCart()` hook + the optimistic-update pattern in `useAddToCart()` (already in `apps/web/src/features/cart/hooks/`). The SD localStorage-only flow is replaced; `sessionKey` makes guest carts work without auth. |
| Item Detail Sheet container | `menu-app.jsx` `setSheetItem` flow | `apps/web/src/features/menu/components/item-detail-container.tsx` — owns sheet open state + the local modifier/qty/notes draft. Calls `useAddToCart()` on submit. |
| Scroll-spy + sticky-on-scroll detection | (inline) | `apps/web/src/features/menu/hooks/use-menu-scroll-state.ts` — extracted so it's unit-testable. |
| Toast + browser notifications | `menu-app.jsx` ToastStack | Use `sonner` (Phase 0.7). Add-to-cart success: `toast.success('Added · 1 × Box Strips Mega', { action: { label: 'Undo', onClick: …}})`. |
| Cart line dedup | (missing from SD) | Implemented at the API layer (`POST /cart/items` already dedups by `(menuItemId, modifierFingerprint)` and increments quantity — verify in `apps/api/src/cart/`). Client just calls and refetches; no client-side dedup logic needed. See §11 carry-over fix #W3. |

**Mobile (<640):** the SD source isn't fully mobile-polished (sticky chrome stacking, scroll-snap rows). Port matches the spec in `web-02-menu.md` §5: search/filter stacks to 112px sticky, sub-nav becomes horizontal scroll-snap, sheets full-width, floating cart bottom-center.

### 6.3 Checkout (`/checkout`)

| File | Source | Target |
|---|---|---|
| Page | `Szef Donald/checkout-app.jsx` | `apps/web/src/app/(shop)/checkout/page.tsx` |
| Section bodies | `checkout-app.jsx` (inline) | `apps/web/src/features/checkout/sections/{order-type,contact,where-when,notes,payment,tip}-section.tsx` |
| Summary | `checkout-app.jsx` | `apps/web/src/features/checkout/summary/checkout-summary.tsx` (composes `OrderSummaryPanel` + `PromoCodeInput` + place-order CTA + terms + payment logos) |
| Mobile summary bar | `checkout-app.jsx` | `apps/web/src/features/checkout/components/mobile-summary-bar.tsx` |
| Form state | `useState` × 12 in `checkout-app.jsx` | `apps/web/src/features/checkout/hooks/use-checkout-form.ts` — react-hook-form + zod schema covering all sections. **Zod schema lives at `packages/types/src/checkout.ts`** (single source of truth, server-side validation reuses it). `orderType` uses the canonical `OrderType` enum from `@repo/types/order.ts` (`'DELIVERY' \| 'PICKUP' \| 'DINE_IN'`) — display labels (`"Delivery"`, `"Pickup"`, `"Eat in"`) come from a `LABEL_BY_ORDER_TYPE` lookup. |
| Mock submit | inline `placeOrder` | `apps/web/src/features/checkout/hooks/use-place-order.ts` — wraps `useCreateOrder()` mutation (which calls `apiClient.createOrder(payload)`). On success: clear cart, `router.push('/checkout/success/' + order.id)`. On error: show retry banner via sonner. |
| Address autocomplete provider | SD inline mock | `apps/web/src/features/checkout/hooks/use-address-autocomplete.ts` — wraps `apiClient.suggestAddresses(query)`, returns the `AddressMatch[]` the primitive's `provider` prop expects. |
| Promo apply | inline mock | `useApplyCoupon` hook already exists at `apps/web/src/features/cart/hooks/use-apply-coupon.ts` — promo input wires through it. |
| Payment methods (Apple Pay / Google Pay detection) | `detectPlatform()` in `checkout-app.jsx` | `apps/web/src/features/checkout/hooks/use-payment-availability.ts` — uses `window.ApplePaySession?.canMakePayments()` + `PaymentRequest` feature-detect (real impl, not UA sniffing). Falls back to UA sniff for older browsers if needed. |
| Card form | inline `<input>`s | **Replace with Stripe Elements.** Phase 2 ships the inline-input mock; Phase 3 swaps to `@stripe/react-stripe-js` `<CardElement>` once the publishable key is in env. Locked behind a feature flag `payments.stripeElements` so the mock works in dev without Stripe creds. |
| Auto-seed for cart-empty | inline `SEED_LINES` | **Removed.** Real flow: empty cart on `/checkout` shows the `EmptyState` (already specced) with "Browse menu" CTA. No seeding in production. |

**Section validation flow** in `apps/web/src/features/checkout/hooks/use-checkout-form.ts`:
- One zod schema per section, all composed into a top-level schema.
- `react-hook-form` with `mode: 'onBlur'` for inline errors as the user moves between sections.
- `useFormState` exposes `dirtyFields` so the section-completion logic doesn't need a separate `completed` state. Section status derives from `(errors[section] ? 'error' : isSectionDirty ? 'complete' : 'active')`.
- "Edit cart" navigation preserves form state (decision §13 ¶15).

### 6.4 Confirmation (`/checkout/success/[orderId]`)

| File | Source | Target |
|---|---|---|
| Page | `Szef Donald/confirmation-app.jsx` | `apps/web/src/app/(shop)/checkout/success/[orderId]/page.tsx` |
| Layout | (inline `confirmation-app.jsx`) | `apps/web/src/features/checkout/success/{success-hero-block,eta-card,details-grid,footer-actions}.tsx` |
| Data source | `sessionStorage` snapshot | **`useOrder(orderId)` hook** — fetches the canonical order from `GET /orders/:id` via api-client. **Race-condition handling:** when arriving from `/checkout`, the `useCreateOrder` mutation seeds the TanStack Query cache (`queryClient.setQueryData(['orders', orderId], created)`) before `router.push`ing — so `useOrder` hydrates from cache instantly, no skeleton flash. Direct deep-links (email click) show skeleton (SuccessHero + 3 placeholder cards) for ≤200ms while fetching. 404 → redirect `/account/orders`. |
| Live progress | static (mock step 1) | Subscribe to `order:{orderId}` realtime room via `@repo/realtime-client` — `OrderProgressStepper` re-renders when status changes (preparing → on-the-way → delivered). Caching policy: `useQuery` invalidates on `order.status_changed`. |
| Track link | placeholder `/orders/SD-…` | Real route: `/account/orders/[orderId]` (already a stub at `apps/web/src/app/(account)/orders/`). |

---

## 7. Phase 3 — Wire to backend (mock removal everywhere)

This phase runs *in line with* Phase 2 — i.e. we don't ship a "mock" version of each page, we wire as we port. Listed here as a checklist:

| Surface | Hook | Endpoint(s) | Cache key | Realtime room |
|---|---|---|---|---|
| Landing categories + featured | `useLandingContent` | `GET /menu/categories?include=items&featured=true&limit=6` | `['landing','categories',restaurantId]` | — |
| Landing testimonials | `useReviewsAggregate` | `GET /reviews/aggregate?restaurantId=…&limit=6` | `['reviews','aggregate',restaurantId]` | — |
| Landing hours | `useRestaurantInfo` | `GET /restaurants/:id/public` (returns hours, address, phone) | `['restaurants','public',restaurantId]` | — |
| Menu tree | `useMenuTree` (existing) | `GET /menu/categories?include=items` | `['menu','tree',restaurantId]` | — |
| Menu item detail (on sheet open) | `useMenuItem(id)` (existing) | `GET /menu/items/:id` | `['menu','item',id]` | — |
| Cart fetch | `useCart()` (existing) | `GET /cart` (uses `sessionKey` header for guest) | `['cart',sessionKey \| userId]` | — |
| Cart mutations | `useAddToCart`, `useUpdateCartItem`, `useRemoveCartItem`, `useClearCart` (existing) | `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` | invalidates `['cart',…]` | — |
| Coupon apply / remove | `useApplyCoupon`, `useRemoveCoupon` (existing) | `POST /cart/coupon`, `DELETE /cart/coupon` | invalidates `['cart',…]` | — |
| Address autocomplete | `useAddressAutocomplete` | `POST /addresses/autocomplete` (new — server-side proxy for Google Places / Mapbox) | per-query | — |
| Create order (checkout submit) | `useCreateOrder` | `POST /orders` | invalidates `['cart',…]`, sets `['orders',orderId]` | — |
| Order detail (confirmation + tracking) | `useOrder(orderId)` | `GET /orders/:id` | `['orders',orderId]` | `order:{orderId}` |
| Order list (account) | `useMyOrders` | `GET /orders/me` | `['orders','me',userId,filters]` | — |
| Auth | `useLogin`, `useRegister`, `useForgotPassword`, etc. (existing in `apps/web/src/features/auth/hooks/`) | `POST /auth/login`, etc. | sets `['auth','me']` | — |
| Account profile | `useMe`, `useUpdateProfile` | `GET /me`, `PATCH /me` | `['auth','me']` | — |
| Address book | existing in `apps/web/src/features/addresses/hooks/` | `GET/POST/PATCH/DELETE /addresses` | `['addresses',userId]` | — |
| Favorites | existing in `apps/web/src/features/favorites/hooks/` | `GET/POST/DELETE /favorites` | `['favorites',userId]` | — |
| Loyalty | existing | `GET /loyalty/me` | `['loyalty',userId]` | — |
| Referrals | existing | `GET /referrals/me`, `POST /referrals` | `['referrals',userId]` | — |
| Reviews (account) | existing | `GET /reviews/me`, `POST /reviews` | `['reviews','me',userId]` | — |
| Notifications | existing | `GET /notifications/me`, `PATCH /notifications/:id/read` | `['notifications',userId]` | `user:{userId}:notifications` |

**Auth & guest flow wire-up:**

- `apps/web/src/middleware.ts` (already a stub) reads the `refresh_token` cookie; pages under `(account)` redirect to `/login?next=…` if absent. `(shop)/checkout` works for both guests and users — login is optional but encouraged via a "Sign in" link on the Contact section.
- On successful login, `mergeCartItems` reducer combines the guest cart (by `sessionKey`) into the user cart. The api-client's `POST /cart/merge` endpoint does this server-side; the reducer in `cart-store.ts` is the unit-tested truth for the merge semantics.
- Permission checks aren't strictly needed for customer pages (everything is per-user-scoped) — but `useFeatureFlags()` gates loyalty UI / referrals UI when the flag is off.

---

## 8. Phase 4 — Compose the remaining customer pages

Each page below is a thin composition of Phase 1 primitives + a feature folder that already has hooks. Format: **route → primitives consumed → API hooks → DTOs → e2e**.

### 8.1 About (`/about`)

- **Composition:** `Hero` (no decoration), three `SectionHeader` + photo+text blocks, `TestimonialCard` row, `NewsletterForm` band.
- **Content:** static — copy lives in `apps/web/src/app/(marketing)/about/page.tsx` (English) with `@repo/i18n` keys for PL.
- **e2e:** smoke render.

### 8.2 Locations (`/locations`)

- **Composition:** `Hero` (stacked, map below), per-location card grid (each card = `Container` + photo + address + `HoursTable` (compact) + CTAs).
- **API:** `useRestaurants()` → `GET /restaurants?public=true`.
- **DTO:** `RestaurantPublicDto` from `@repo/types/restaurant.ts`.
- **e2e:** list 1+ locations, click "Get directions" opens correct maps URL.

### 8.3 Contact (`/contact`)

- **Composition:** `Hero` (no decoration), a contact form (`FormField` × 4 — name, email, subject, message), `HoursTable`, address block.
- **API:** `useSubmitContact()` → `POST /contact-messages` (already exists).
- **DTO:** `CreateContactMessageDto` from `@repo/types/contact.ts`.
- **Permission:** none (public).
- **Jobs:** server sends confirmation email via BullMQ `email` queue.
- **e2e:** submit → success state → message appears in admin's `/contact`.

### 8.4 Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`)

- **Layout:** `(auth)/layout.tsx` — minimal nav (logo only, no links), centered container, max-w 480px.
- **Composition per page:** `SectionHeader` + a stack of `FormField`s + a primary CTA + secondary link.
- **API hooks:** all exist in `apps/web/src/features/auth/hooks/` — `useLogin`, `useRegister`, `useForgotPassword`, `useResetPassword`, `useVerifyEmail`.
- **DTOs:** `LoginDto`, `RegisterDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `VerifyEmailDto` from `@repo/types/auth.ts`.
- **Special:** after login, run `mergeCart()` mutation, then `router.push(searchParams.get('next') ?? '/account')`.
- **e2e:** register → verify email → login → me-endpoint returns user.

### 8.5 Account (`/account/*`)

A single layout under `(account)/layout.tsx` with a vertical sidebar nav (uses an admin-style `Sidebar` primitive — but light-themed since it inherits semantic tokens; the same primitive works in both apps). Pages:

| Route | Composition | Hooks | DTO |
|---|---|---|---|
| `/account` (profile) | `SectionHeader` + profile `FormField`s + avatar uploader | `useMe`, `useUpdateProfile` | `UserDto`, `UpdateProfileDto` |
| `/account/orders` | `SectionHeader` + filter `FilterPillGroup` (status) + list of order cards (uses `CartLineItem` readonly + `OrderProgressStepper`) | `useMyOrders` | `OrderListItemDto` |
| `/account/orders/[orderId]` | `SectionHeader` + `OrderProgressStepper` + `OrderSummaryPanel` (inline) + delivery / contact details cards + "Re-order" CTA | `useOrder`, `useReorder` | `OrderDetailDto` |
| `/account/addresses` | `SectionHeader` + list of address cards + add/edit modal using `AddressAutocomplete` + `FormField`s | existing in `features/addresses/hooks/` | `AddressDto` |
| `/account/favorites` | `SectionHeader` + dish grid (uses `DishCard`) | existing in `features/favorites/hooks/` | `FavoriteDto` (joins to menu item) |
| `/account/loyalty` | `Hero` (no decoration, smaller) + points balance card + redemption catalog (dish-card-like) | existing | `LoyaltyAccountDto` |
| `/account/referrals` | `SectionHeader` + invite-code card with copy button + list of redeemed referrals | existing | `ReferralDto` |
| `/account/reviews` | `SectionHeader` + list of past reviews + "Write a review" CTA opens modal w/ `FormField` (rating + text) | existing | `ReviewDto`, `CreateReviewDto` |
| `/account/notifications` | `SectionHeader` + grouped notification list + mark-as-read affordance | existing | `NotificationDto` |

**e2e per group:** profile update + add address + favorite a dish + see referral code.

### 8.6 Order tracking (`/orders/[orderId]`) — public deep-link

Same as `/account/orders/[orderId]` but accessible without auth via signed token in the URL (the email confirmation links here). Shows a strict subset: status stepper, ETA, delivery address (partial), without the re-order button.

### 8.7 Reservations (`/reservations`) — out of scope for v1

Already stubbed at `app/(marketing)/reservations/page.tsx`. Customer-facing reservations is a Phase D follow-up (parallels admin's reservations plan). Just ensure the route renders a "Coming soon" empty state so it doesn't 404.

---

## 9. Phase 5 — Test, a11y, and the carry-over fixes

### Carry-over fix list (from design-prompts + observed in SD source)

| # | Fix | Location |
|---|---|---|
| W1 | `gluten-free` flag must render in `--positive`, NOT `--info`. SD source `primitives.jsx:131` has the bug. | `packages/ui/src/tokens/dish-flags.ts` + `packages/ui/src/dish-card/` — verify at port time, don't carry the bug. |
| W2 | Always reserve flag-row vertical space on `DishCard` (24px min-height) so the grid stays even. | `DishCard` `reserveFlagSpace` prop, defaults true on menu, optional on landing. |
| W3 | Cart line dedup on `addLine` — same item + same modifier hash → increment qty. | **NOT YET IMPLEMENTED.** Phase 0.13 deliverable: new Prisma migration `add_cart_item_modifier_fingerprint` (adds `modifierFingerprint String` column to `CartItem`, compound unique `(cartId, menuItemId, modifierFingerprint)`); `CartService.addItem` becomes `upsert` with `quantity: { increment: dto.quantity }` on hit; update `mergeOnLogin` to use the new column. New e2e test in `apps/api/test/cart.e2e.spec.ts`: "add same item with same modifiers twice → one cart line with quantity 2". |
| W4 | `QuantityStepper` must render both `−` and `+` always; not just on hover. | `packages/ui/src/quantity-stepper/quantity-stepper.test.tsx` regression. |
| W5 | `EmptyState` icons must be real Lucide icons, not placeholder squares. | Verified at composition time. |
| W6 | `formatMoney` enforces 2 decimals; PLN renders as `24,00 zł`. | `packages/utils/money.ts` + tests. |
| W7 | Mobile logo uses `mark` variant below 480px throughout. | `apps/web/src/components/logo.tsx` + responsive variant override. |
| W8 | Testimonial card heights varied because quote was 1–4 lines; reserve 3-line min-height. | `packages/ui/src/testimonial-card/` |
| W9 | Cart-empty edge case on `/checkout` shows full-page `EmptyState` (not 404). | `apps/web/src/app/(shop)/checkout/page.tsx` early return. |
| W10 | Order-progress stepper must reflect the real `OrderStatus` enum, not a custom one. | `packages/ui/src/order-progress-stepper/` imports `OrderStatus` from `@repo/types`. |

### A11y audit

- **Focus trap** in `ItemDetailSheet` + `CartSheet` (Radix `Sheet` handles).
- **Keyboard nav** in `DishCard` (Enter to open sheet), `FilterPillGroup` (arrow keys move between pills), `TimeSlotPicker` (arrow keys navigate grid).
- **`aria-live`** regions for cart updates ("Cart updated — 3 items, 67,00 zł total"), toast announcements, sheet open/close announcements.
- **Real form semantics** everywhere: `<label htmlFor>`, `<fieldset>` + `<legend>`, real `<input type="radio">` / `type="checkbox">` (visually hidden but semantically present), `autoComplete` attributes (`name`, `tel`, `email`, `cc-number`, `cc-exp`, `cc-csc`, `cc-name`, `street-address`, `postal-code`, `address-level2`).
- **Focus ring** is copper `outline: 2px solid rgb(var(--accent))` + `2px` offset — never `outline: none`.
- **Reduced motion** (`@media (prefers-reduced-motion: reduce)`) disables sheet slide animations, reveal-on-scroll, hover zoom; transitions become opacity-only.
- **Color contrast** AA: all text on `--bg` cream and `--surface` cream meets AA. Copper text on cream meets AA at ≥18px or bold only — never use copper for body-size text on cream.
- **Skip link** in every layout: "Skip to content" focusable jumps to `<main>`.

### Tests

- **Unit:** every primitive (Phase 1 already covered).
- **Integration (Vitest + Testing Library):** each composition page renders with mocked api-client and a happy-path interaction. Specifically:
  - Landing: add-to-cart from a featured dish fires the toast and bumps the nav cart count.
  - Menu: search filters dishes live; opening a dish renders the sheet; modifier defaults apply; add submits a `NewCartLine` matching the schema.
  - Checkout: switching order-type morphs the where-when section without losing other fields; promo apply updates summary numbers; place-order with invalid section scrolls to it with red border.
  - Confirmation: hydrates from `useOrder` (mocked), renders all sections.
- **E2E (Vitest + supertest at API layer):** one end-to-end test per major flow:
  - Browse menu → add to cart → checkout (delivery, card payment) → order created.
  - Same but pickup + BLIK.
  - Same but eat-in + cash on delivery.
  - Apply promo `BAKLAVA` → see discount → place order.
  - Guest cart → login → cart merges with user cart correctly.
- **Visual:** capture screenshots in `apps/web/screenshots/` and compare against `Szef Donald/screenshots/` for the 4 design pages at 1440, 1280, 1024, 768, 375 widths.
- **Lighthouse:** target ≥95 Performance, ≥95 Accessibility on Landing + Menu + Checkout + Confirmation. Set as a CI gate on PRs to `apps/web/`.

---

## 10. Out of scope (explicit non-goals for this plan)

- **Mobile app (`apps/mobile`)** — different palette, NativeWind, parallel primitive set. Separate plan.
- **Real Stripe Elements integration** beyond the structural swap (publishable key wiring, webhook handling) — covered by a payments-specific follow-up plan once Phase 3 is up.
- **Google Places / Mapbox real wiring for `AddressAutocomplete`** — Phase 2 ships the mock; real provider lands during Phase 3 with the api-client `/addresses/autocomplete` endpoint.
- **Customer Reservations** UI — stubbed at `(marketing)/reservations/` with "Coming soon"; full booking flow is Phase D in a separate plan (parallels admin's reservations work).
- **Loyalty redemption checkout integration** — list/balance views ship in Phase 4; using points at checkout is a follow-up.
- **i18n PL translations** — `@repo/i18n` keys are added at port time; PL translations land in a translation-pass PR (the architecture is right; the content fills in).
- **SEO meta / Open Graph / structured data** — slot for it exists in `layout.tsx`, full content + dynamic og-images is a follow-up.

---

## 11. Sequencing & rough effort

| Phase | Effort | Blocks on |
|---|---|---|
| 0 — Foundation | 1 day | — |
| 1.1 — Landing primitives (10) | 2 days | Phase 0 |
| 1.2 — Menu primitives (10) | 2.5 days | Phase 1.1 (DishCard reuse) |
| 1.3 — Checkout primitives (10) | 2.5 days | Phase 1.1 + 1.2 (CartLineItem reuse, FormField extension) |
| 2.1 — Landing page | 0.5 day | Phase 1.1 |
| 2.2 — Menu page + cart integration | 1.5 days | Phase 1.2 |
| 2.3 — Checkout page + form schema | 1.5 days | Phase 1.3 |
| 2.4 — Confirmation page + tracking realtime | 0.5 day | Phase 1.3 |
| 3 — Backend wiring (in line with Phase 2) | included in §2 estimates | — |
| 4 — Composition pages (7 page groups) | ~3 days total | Phase 2 |
| 5 — Test + a11y + carry-overs + Lighthouse 95 perf | 2 days | Phase 4 |

**~17 working days total** for a single developer, plus review cycles. That's bigger than admin's ~12 days because there are more primitives (30 vs 18) and more downstream composition pages (~12 vs 7 — auth, account, and tracking are real surface area). The extra Lighthouse-95 day reflects realistic effort on a commerce site with food photography (next/image sizing per breakpoint, `font-display: swap`, preload hints, route prefetch tuning).

**Suggested grouping into reviewable PRs:**

- PR-W0: foundation (theme, fonts, route layouts, money helper)
- PR-W1a: landing primitives (10) + dev page
- PR-W1b: menu primitives (10) + dev page
- PR-W1c: checkout primitives (10) + dev page
- PR-W2a: landing page wired
- PR-W2b: menu page wired
- PR-W2c: checkout page wired
- PR-W2d: confirmation + order tracking realtime wired
- PR-W4a-c: composition pages, one per route group (`(marketing)`, `(auth)`, `(account)`)
- PR-W5: test, a11y, and carry-over polish

---

## 12. Open decisions to confirm before Phase 1

These are the decisions where the SD source / design prompts hint at multiple interpretations. **Lock these explicitly before primitive work starts**, like admin port §11.

**Top-priority — please confirm first:**

- **A. Seed Szef Donald into `packages/db/seed.ts`?** I lean **yes** — the brand *is* the design language and a seeded demo restaurant makes the menu page end-to-end demoable from day one. The alternative is keeping the 47 dishes in `apps/web/src/lib/mock/menu.ts` until a real restaurant onboards. This is a real product fork; pick first. (Also noted at ¶14 below.)
- **B. Cart `sessionKey` move to httpOnly cookie** (Phase 0.11) — fixes SSR hydration flicker on the cart count. Touches both `apps/web` and `apps/api`. Confirm scope is acceptable for the foundation PR.

**Standard locks:**

1. **`Hero.decoration` slot vs `media` slot.** I've kept `decoration` as a separate `ReactNode` slot (per landing prompt §10 ¶2). Confirm.
2. **`SiteNav.rightSlot: ReactNode` vs named slots.** The SD `SiteNav` uses a single `rightSlot`. I've kept it as one slot (page-1 prompt §10 left the choice open). Confirm — if you want consistency enforcement across pages, switch to named `{ cart, langSwitcher, cta }` slots and update §5.1 + every page composition.
3. **`<img>` vs `next/image` inside primitives.** Primitives in `@repo/ui` accept the image as a `ReactNode` (the caller passes `<NextImage>` or `<img>` as appropriate). The `image` *prop* still describes `{ src, alt }` for primitives that synthesize the element themselves (DishCard, CategoryCard) — those use plain `<img>` for now, and we add a `<Image>` adapter pass later. Confirm.
4. **Landing route under `(marketing)` vs at root `/`.** I've placed it under `(marketing)/page.tsx` so the marketing layout group provides the chrome consistently. The route still serves at `/`. Confirm.
5. **`HoursTable.day` key shape.** String enum `'MON' \| 'TUE' \| …` (matches admin's existing schedule shape in `packages/types/i18n.ts`) — locked. Confirm if you'd rather use ISO day numbers (0=Sun…6=Sat).
6. **`ModifierGroup.value` shape.** `string[]` for both radio and checkbox (radio = array of length 1) — locked. Confirm.
7. **CartSheet — sheet vs persistent right rail on ≥1440px.** Sheet, both breakpoints (per landing voice — see web-02 §10 ¶1). Confirm.
8. **`FormField.children: ReactNode`** vs owning the input. Slot-children — locked (matches react-hook-form `register` ergonomics + the existing `FormField` shape in admin).
9. **`RadioCardGroup.value` may be `null`.** Yes — locked (per checkout §10).
10. **`TimeSlotValue` discriminated union** `{ kind: 'asap' } | { kind: 'scheduled'; iso: string }` — locked.
11. **`OrderSummaryPanel.delivery: { amount } | { label }` union** — locked (clearer than `{ amount: number \| null; freeLabel?: string }`).
12. **`CheckoutSection.status` includes `'error'` as a separate status** (not active + errorProp) — locked.
13. **Map on `/locations` and `/`** — static styled SVG for v1 (matches SD's `MapPlaceholder`). Real interactive map is a follow-up. Confirm.
14. **Seed data approach.** Do we seed Szef Donald specifically (47 dishes, 6 categories, Marszałkowska 102, etc.) into `packages/db/seed.ts` under `seedSzefDonald()`, or just keep the 47 dishes in `apps/web/src/lib/mock/menu.ts` until a real restaurant onboards? I lean **seed Szef Donald** since it makes the menu page demoable end-to-end immediately (and the brand is the design language; demo data should match). Confirm.
15. **Edit-cart preservation of form state.** I'll use react-hook-form's `getValues`/`reset` to snapshot before opening `CartSheet` and re-apply on close. Confirm.
16. **`FilterPillGroup` extension vs duplicate.** Extend with `variant: 'chip' \| 'pill'` — confirmed in §2 collisions; flag here for visibility.
17. **`FormField` extension vs duplicate.** Extend with `prefix`/`suffix`/`size`/`layout` — confirmed in §2 collisions; flag here for visibility.
18. **Money on the wire vs in primitives.** `MoneyStringSchema` (decimal string) end-to-end. Primitives accept `string` prices; `formatMoney(string, currency)` does the work. **No `Number` arithmetic in checkout or cart math.** Confirmed in §3.

---

## 13. After approval

Work bottom-up, mirroring the admin port cadence:

1. **PR-W0 (foundation)** lands first as one PR — theme + fonts + route layouts + money helper + collision-resolving primitive extensions.
2. **Primitive PRs** in groups of 10 (one per design page's primitives), each with the dev page (`(marketing)/_dev/primitives/page.tsx`) updated to render the new ones with sample data.
3. **One PR per design page**: landing → menu → checkout → confirmation, each with the e2e test + the carry-over fixes for that page.
4. **Composition page PRs**: one per route group (`(marketing)`, `(auth)`, `(account)`), since they're cheap and the chrome is the same.
5. **Test + a11y + cleanup PR** at the end.

Each PR includes its tests. We can adjust granularity if smaller PRs are preferred (e.g., split primitive PRs into 5-at-a-time).
