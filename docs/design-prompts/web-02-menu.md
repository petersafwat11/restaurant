# Web · Page 2 — Menu (browse + item detail + cart)

This is the **second** page of the customer website for **Szef Donald**. Page 1 (Landing) locked the visual language and extracted ten chrome + section primitives. Page 2 is the workhorse — customers spend most of their time here. It's where the cuisine becomes orderable.

Page 2's job is to **lock the ordering pattern** — search, filter, category navigation, item customization, cart — and extract the primitives that page 3 (Checkout) consumes wholesale. The Cart Sheet you build here is the same cart that opens during checkout. The modifier picker is reused on every item.

Reuse the locked design language from page 1. **Don't redesign anything** that was settled — palette, typography, spacing, motion, photography treatment, `SiteNav`, `SiteFooter`, `Container`, `SectionHeader`, `DishCard`, `formatMoney`. Compose the existing primitives. Then extract the new order-pattern primitives below.

---

## 1. Recap — what's already locked

Don't change any of this. Refer to `web-01-landing.md` §1 for full specs.

- **Theme:** warm cream + copper signature + serif display (Fraunces) + sans body (Inter). Light only — no dark mode.
- **Palette:** `--bg` cream, `--surface` lighter cream, `--surface-elevated` white, `--surface-warm` for accent bands. `--accent` copper is the only loud color. Status tokens: `--positive` olive, `--negative` brick, `--warning` amber, `--info` navy.
- **Typography scale** as in §1.2 of landing. Hero size not used on this page; H1 is the page title (56/500 Fraunces desktop, 36/500 mobile).
- **Spacing:** 8pt grid. Card radius 16px. Image radius 12px on dish thumbnails, 16px on cards, 20px on detail-sheet hero image.
- **Elevation:** `shadow-sm` sticky bars (sub-nav once stuck, floating cart), `shadow-md` card hover + sticky cart button, `shadow-lg` sheet/drawer.
- **Motion:** 200ms ease-out color/opacity, 300ms ease-out transform. Sheet open: 300ms slide + opacity backdrop. Toast: 200ms slide-up.
- **Photography:** consistent warm-tone food shots. Top-down or 3/4 angle, neutral plate, no stock-looking compositions.

**Primitives already extracted in page 1 (compose, don't rebuild):**

`SiteNav` · `SiteFooter` · `Container` · `Hero` (not used here) · `SectionHeader` · `CategoryCard` (not used here) · `DishCard` · `TestimonialCard` (not used here) · `HoursTable` (not used here) · `NewsletterForm` (not used here) · plus the `formatMoney(amount, currency)` helper from `@repo/utils` (PLN renders as `24,00 zł`, comma decimal, space thousands).

**Cross-app primitive:** `FilterPillGroup` exists in `@repo/ui` from a sibling admin build. For this page, design and build a customer-facing pill group as if it didn't exist — slightly different visual treatment (round-pill copper border vs admin's rectangular chip), and a leading icon slot. We'll dedupe / extend during port.

**Carry-over fixes from page 1 (apply here too):**

1. Featured-grid card heights varied because the flags row was optional. **On this page, the dish grid is the entire page** — always reserve flags-row vertical space on every `DishCard` (24px min-height when empty) so the grid stays even.
2. `GF` flag must render in `--positive` olive, **not** `--info` navy. Dietary flags (V, Vegan, GF) all live in `--positive`. `Spicy` stays in `--warning` amber. `Featured` stays in `--accent` copper. Document this mapping as `DISH_FLAG_TOKENS` in `packages/ui/src/tokens/dish-flags.ts`.
3. Testimonial card heights varied — n/a here (no testimonials).

---

## 2. Extraction directive — new primitives from this page

Build the Menu page and **extract these ten primitives into `@repo/ui`**. Each is generic, typed, and used by 2–4 future pages. Build them as if you were publishing the package.

| Primitive             | Path                                       | Used by Menu + …                                                                       |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `SearchInput`         | `packages/ui/src/search-input/`            | Menu, Order history, Account addresses, Locations search.                              |
| `MenuSubNav`          | `packages/ui/src/menu-sub-nav/`            | Menu (categories), About (sections), Locations (city tabs). Sticky pill nav + scroll-spy. |
| `FilterPillGroup`     | `packages/ui/src/filter-pill-group-web/`   | Menu, Order history (status filter), Reviews (rating filter). Customer-facing variant. |
| `ItemDetailSheet`     | `packages/ui/src/item-detail-sheet/`       | Menu (customize + add to cart), Order history (item peek), Account favorites.          |
| `ModifierGroup`       | `packages/ui/src/modifier-group/`          | Item Detail Sheet, Checkout (last-mile customization edits).                           |
| `QuantityStepper`     | `packages/ui/src/quantity-stepper/`        | Item Detail Sheet, Cart Sheet, Checkout cart summary.                                  |
| `CartSheet`           | `packages/ui/src/cart-sheet/`              | Every customer page. Drawer that opens from the cart icon.                             |
| `CartLineItem`        | `packages/ui/src/cart-line-item/`          | Cart Sheet, Checkout summary, Order confirmation, Order tracking.                      |
| `FloatingCartButton`  | `packages/ui/src/floating-cart-button/`    | Every customer page where the cart can grow (Menu primarily).                          |
| `EmptyState`          | `packages/ui/src/empty-state/`             | Every list/grid page — no items, no results, no orders, no favourites.                 |

**API hints (you'll commit to final signatures in the pre-build reply):**

```ts
type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number                 // default 200
  size?: 'sm' | 'md' | 'lg'           // default 'md'
  autoFocus?: boolean
}

type MenuSubNavProps = {
  sections: { id: string; label: string; count?: number }[]
  activeId: string
  onSelect: (id: string) => void      // also scrolls into view
  stickyOffsetPx?: number             // default 72 (nav height) — sub-nav sticks below it
  variant?: 'pill' | 'underline'      // default 'pill'
}

type FilterPillGroupProps<TId extends string> = {
  options: {
    id: TId
    label: string
    icon?: ReactNode                  // e.g. leaf for vegan, chili for spicy
    count?: number                    // optional small count after label
  }[]
  value: TId[]                        // multi-select, includes 'all' sentinel
  onChange: (next: TId[]) => void
  allowMultiple?: boolean             // default true; if false, behaves like radio
}

type ItemDetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: DishDetail | null             // null while closed
  onAddToCart: (line: NewCartLine) => void
  side?: 'right'                      // only right for now; reserved for future
  width?: number                      // default 560
}

type ModifierGroupProps = {
  group: {
    id: string
    name: string
    required: boolean
    min: number
    max: number                       // 1 = radio, >1 = checkbox, Infinity = unlimited
    options: {
      id: string
      name: string
      priceDelta: number              // 0, +200 (=+2.00 zł), -50 etc. Stored as integer cents
      default?: boolean
      unavailable?: boolean
    }[]
  }
  value: string[]                     // selected option ids
  onChange: (next: string[]) => void
  error?: string                      // shown when min not met etc.
}

type QuantityStepperProps = {
  value: number
  onChange: (next: number) => void
  min?: number                        // default 1
  max?: number                        // default 99
  size?: 'sm' | 'md' | 'lg'           // default 'md'
}

type CartSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: CartLine[]                   // empty array shows empty state
  onUpdateQty: (lineId: string, qty: number) => void
  onRemove: (lineId: string) => void
  onCheckout: () => void              // navigates to /checkout
  subtotal: number                    // cents
  currency: string                    // 'PLN'
  notes?: { value: string; onChange: (v: string) => void; placeholder?: string }
}

type CartLineItemProps = {
  line: CartLine                      // image, name, modifiers summary, qty, line total
  onUpdateQty: (qty: number) => void
  onRemove: () => void
  variant?: 'editable' | 'readonly'   // checkout summary uses readonly
  currency: string
}

type FloatingCartButtonProps = {
  itemCount: number                   // 0 hides the button
  total: number                       // cents
  currency: string
  onClick: () => void
  position?: 'br' | 'bc'              // br = bottom-right desktop, bc = bottom-center mobile
  hideOnRoutes?: string[]             // e.g. ['/checkout', '/cart']
}

type EmptyStateProps = {
  icon?: ReactNode                    // 48px illustration / Lucide icon
  title: string
  description?: string
  action?: { label: string; onClick?: () => void; href?: string }
  size?: 'sm' | 'md' | 'lg'           // default 'md'
}
```

**Shared types** (define once, export from `@repo/types/cart.ts`):

```ts
type CartLine = {
  id: string                          // local id (uuid)
  itemId: string
  name: string
  image?: string
  unitPrice: number                   // cents, includes modifier deltas
  quantity: number
  modifiers: { groupName: string; optionName: string; priceDelta: number }[]
  notes?: string                      // per-line notes from the item sheet
}

type NewCartLine = Omit<CartLine, 'id'>

type DishDetail = DishCardProps & {   // extends what landing already passes
  longDescription?: string
  images: { src: string; alt: string }[]   // gallery, 1–4 images
  modifierGroups: ModifierGroupProps['group'][]
  allergens?: string[]
  calories?: number
  prepMinutes?: number
}
```

**For the mock**, cart state lives in a Zustand store at `apps/web/src/stores/cart-store.ts`, persisted via `zustand/middleware/persist` to `localStorage` under the key `szef-donald-cart`.

**The page (`apps/web/src/app/menu/page.tsx`) should be thin** — composes the primitives. If it exceeds ~250 lines, something is leaking. Section content lives in `apps/web/src/features/menu/`.

---

## 3. What customers actually do on this page

In order of frequency:

1. **Scroll, see what's available, click a dish to customize and add to cart.** The single most common action. Every interaction must be one screen deep — never more than one tap before the item is in the cart.
2. **Quick-add a simple dish from its card** (the `+` button on `DishCard`). For items with no modifiers (drinks, sides), this skips the sheet entirely — straight to cart with a toast.
3. **Search by name** when they already know what they want (`Tortilla`, `Kapsalon`).
4. **Filter by dietary preference** (Vegan, Vegetarian, Gluten-free) — a vocal subset of users does this every visit.
5. **Open the cart, adjust quantities, head to checkout.** The cart is the gateway to revenue — every detail matters.

No auth required to browse, add to cart, or check out as a guest. Login is optional on the checkout page (page 3).

---

## 4. Page layout

Route: `/menu`. File: `apps/web/src/app/menu/page.tsx`. The page is a single long-scroll surface with two sticky bars (search/filter, then category sub-nav), category sections, and two slide-in sheets (item detail, cart).

### 4.1 Page header

Compact — this page is about the menu, not about the brand pitch. Below the nav, in the container:

- 64px top padding.
- **SectionHeader** (`align: 'left'`):
  - eyebrow `MENU` in copper.
  - title (H1, Fraunces 56/500 desktop, 36 mobile) — `Built fresh, made to order.`
  - description (Body L, `--text-secondary`) — `47 dishes across six categories. Filter or search to find your usual.`
- No action link on the header (the search + filter row below does the work).
- 48px bottom padding.

### 4.2 Search + filter row (sticky)

Below the header, a full-width row that **becomes sticky** at the top of the viewport once scrolled past, sitting flush under the site nav.

- Background `rgb(var(--surface) / 0.92)` with `backdrop-filter: blur(12px)` when sticky; transparent when not.
- 64px tall sticky, hairline bottom border in `--border` only when sticky.
- Container inside, two slots:
  - **Left:** `SearchInput` (size `md`, max-width 360px) with placeholder `Search the menu…` and a Lucide `Search` icon prefix. Debounced 200ms. Clear button (Lucide `X`) appears when value non-empty.
  - **Right:** `FilterPillGroup` with options:
    - `All` (sentinel — always selected unless others are; toggling off any specific filter re-asserts `All` if nothing remains)
    - `Vegetarian` (leaf icon, olive accent on selected state)
    - `Vegan` (leaf icon)
    - `Gluten-free` (wheat-crossed icon)
    - `Spicy` (flame icon, amber on selected state)
  - On mobile (<768), the filter pills horizontally scroll. Search becomes full-width on its own line above the filters, both inside the same sticky bar (which grows to 112px tall on mobile to accommodate the stacking).

### 4.3 Category sub-nav (sticky)

Below the search/filter bar, another sticky bar that also docks under the nav (stacking under the search/filter — so once both are stuck, the page has 72 + 64 + 56 = 192px of fixed chrome).

- 56px tall. Background `--surface`. Hairline bottom border in `--border` when sticky.
- Container inside; `MenuSubNav` component:
  - **Variant `pill`** — pills with copper-muted background on active, espresso text. Hover: `--surface-warm` background.
  - Sections: `All` · `Kebab` (18) · `Falafel` (9) · `Tacos` (4) · `Box & Plates` (8) · `Drinks` (7) · `Sauces` (1) — small `(count)` after each label in `--text-tertiary`.
  - Click → smooth-scroll to the corresponding section, accounting for the `stickyOffsetPx` so the section header lands just below the sticky chrome (not under it).
  - Scroll-spy via `IntersectionObserver` on the section headings updates `activeId` as the user scrolls.
  - URL hash updates to `/menu#kebab` etc. on click and on scroll-spy change (debounced to avoid history spam).
  - On mobile, horizontal scroll-snap row. The active pill scrolls itself into view (use `scrollIntoView({ inline: 'center', behavior: 'smooth' })`).

### 4.4 Category sections (the main content)

Below the sub-nav, the categories render as a vertical stack of sections. Container max-width applies.

For each category:

- **Section anchor** — `<section id="kebab" aria-labelledby="kebab-heading" class="scroll-mt-[192px]">` so smooth-scrolls land below the sticky chrome.
- **Section header** (intentionally simpler than `SectionHeader` to keep the menu scannable):
  - 64px top padding, 24px bottom.
  - H2 (Fraunces 40/500, espresso) — the category name (`Kebab`, `Falafel`, …).
  - Beside it on the right, in tertiary text, the item count and short description if any: `18 items · The classics — pita, tortilla, plate.`
- **Dish grid** — `DishCard` from `@repo/ui`, 3-column on desktop, 2-column on tablet (768–1023), 1-column on mobile. 32px gap.
- Use the **reserve-flag-row** variant of `DishCard` (per carry-over fix #1) so cards stay aligned even when an item has no flags.
- 64px bottom padding before the next section starts.

**When search is active:** sections that have zero matching items collapse entirely (no heading, no empty grid). The whole page filters live as the user types.

**When filters are active:** same — categories with zero matching items hide.

**When both:** intersection.

**Search-no-results state:** above the (empty) section list, an `EmptyState` (size `md`):
- Icon: a Lucide `SearchX` 48px in `--text-tertiary`.
- Title: `Nothing matches "truffle"` (interpolates the search value).
- Description: `Try a different word, or clear filters.`
- Action: `Clear search` (calls back to clear).

**Filter-no-results state** (search empty, filters return nothing — unlikely but possible):
- Title: `No dishes match your filters`
- Description: `Combine fewer filters to see more options.`
- Action: `Clear filters`.

### 4.5 Dish card interaction

Two interactions per card:

1. **Click the card body or image or name** → opens `ItemDetailSheet` for the dish.
2. **Click the `+` button** in the bottom-right of the card body:
   - **If the dish has no modifier groups** (drinks, sauces, simple sides): adds straight to cart with default options, fires a toast `Added to cart · 1 × Kebab Tortilla Mały`. Toast has an `Undo` action (5s timeout).
   - **If the dish has any modifier group**: opens `ItemDetailSheet` (same as clicking the body) — the `+` becomes a shortcut for "customize and add" rather than a direct add. Visually keep the `+` icon (no need for a different icon — feedback comes from the sheet opening).

### 4.6 Item Detail Sheet (`ItemDetailSheet`)

A right-side slide-in sheet. Width **560px** desktop, full-width mobile. Backdrop is `rgba(42, 31, 24, 0.4)` (espresso at 40%).

**Behavior:**

- Opens with 300ms slide + 200ms backdrop fade.
- Backdrop click, `Esc`, or close X all dismiss.
- Dismissing without adding to cart: no confirmation needed (it's not a form with destructive risk).
- Sheet body scrolls independently; header + footer are sticky within the sheet.

**Header (sticky):**

- 64px tall. Close X (Lucide `X`) on the right.
- No title here — the title lives in the body next to the image, where it has room to breathe.

**Body (scrollable):**

- **Image gallery (top, full-width of sheet, 4:3 aspect ratio, 0 top-radius / 16px bottom-radius — flush with sheet header):**
  - 1 image: just shows it.
  - 2–4 images: large primary image on top, small horizontal scroll of thumbnails below the gallery (each 80×60, 8px radius, 1.5px border, copper border on active).
  - On mobile, swipe between images (native scroll-snap horizontal carousel).
- **Below the gallery, 24px horizontal padding, 24px gap stack:**
  - **Title block:**
    - Flags row (V/Vegan/GF/Spicy/Featured) — same chips as `DishCard`. Always reserves space.
    - H2 (Fraunces 32/500) — dish name.
    - Meta row (Body small, tertiary): category · `· {prepMinutes} min` · `· {calories} kcal` (only the ones that exist).
    - Price (Fraunces 24/500, espresso, `tnum`): `formatMoney(basePrice, 'PLN')`. Updates live as modifiers change.
    - Long description (Body L, `--text-secondary`) — 2–4 sentences.
  - **Allergens** (if any): a small caption-style row `ALLERGENS` in tertiary uppercase, then a wrap of small chips `Gluten` · `Sesame` · `Dairy` in `--surface-warm` background.
  - **Modifier groups stack** — for each `modifierGroup` of the dish, one `ModifierGroup`:
    - Group header row:
      - Left: group name (H3, Inter 600 18px) + below it a small line in tertiary `Choose one` / `Choose up to 3` / `Choose at least 1` (derived from min/max).
      - Right: a `Required` pill (12px caption, copper text on `--accent-muted` bg) if `required` and `min > 0`. Otherwise nothing.
    - Options rendered as:
      - **Radio** when `max === 1`: each option is a row with a 20px copper radio circle on the left, name in Body, price delta on the right (`+2,00 zł` in tertiary if `> 0`, hidden if `0`, `−1,00 zł` in `--positive` if `< 0`). Unavailable options render with strikethrough + a small `Sold out` chip in tertiary; tap is disabled.
      - **Checkbox** when `max > 1`: same row layout but with a 20px copper checkbox.
    - Selected row gets `--accent-muted` background (8px radius) on the whole row.
    - Validation: when `required` and selection count < `min`, render the inline error message under the group: `Please choose at least one.` (in `--negative`, caption size). This error appears only after the user tries to add to cart with the group unfilled — not preemptively.
  - **Special instructions** (textarea, Inter 400 15px, 4 rows, 200 char max with counter): placeholder `Anything we should know? (no onions, extra sauce…)`.
  - **Quantity** (`QuantityStepper` size `lg`): left-aligned, label `Quantity` above.

**Footer (sticky):**

- 80px tall. Hairline top border. Background `--surface-elevated`.
- Container with two slots:
  - **Left:** stacked total — caption `TOTAL` (tertiary uppercase) and below it `formatMoney(unitPrice × quantity, 'PLN')` in Fraunces 24/500 espresso.
  - **Right:** primary button `Add to cart` (copper, 56px tall, 24px horizontal padding, 16px radius, white text Inter 600 16px, Lucide `ShoppingBag` icon 18px on the right). Disabled until all required modifier groups are filled — disabled style is `--accent` at 40% opacity, tooltip on hover lists the unfilled group names.
- On submit: optimistically push the line into the cart store, close the sheet, show a toast `Added · {qty} × {name}` (top-right, 5s timeout, dismissible, with `Undo`).
- On mobile, the footer is full-width fixed bottom; the button takes the full width with the total above it inline-left.

### 4.7 Cart Sheet (`CartSheet`)

A right-side slide-in sheet. Width **480px** desktop, full-width mobile. Same backdrop as the item detail sheet.

**Open triggers:** clicking the cart icon in the site nav, clicking the floating cart button (see §4.8), or programmatically right after adding the first item (only for first-item — subsequent adds use the toast).

**Empty state (when `lines.length === 0`):**

- Centered `EmptyState` (size `lg`):
  - Icon: Lucide `ShoppingBag` 64px in `--text-tertiary`.
  - Title: `Your cart is empty`
  - Description: `Browse the menu and add something tasty.`
  - Action: `Browse menu` (closes the sheet and stays on the page; on other pages would navigate to `/menu`).

**Populated state:**

**Header (sticky):**

- 64px tall. Title `Your cart` (Fraunces 24/500) + a small count chip `(3 items)` in tertiary beside it. Close X on the right.

**Body (scrollable):**

- A vertical list of `CartLineItem`s (variant `editable`), 16px gap between items, 24px horizontal padding.
- Each line item:
  - 80×80 dish thumbnail (12px radius) on the left.
  - Center column (flex 1):
    - Name (Inter 600 16px, espresso).
    - Modifier summary (Body small, `--text-secondary`) — joined by `·`: `Mega · Beef and lamb · Tahini sauce`. If empty, render `—` in tertiary or omit the row.
    - If `line.notes` present: a second small line `Note: no onions` in `--text-tertiary`.
  - Right column:
    - Line total (Inter 600 15px, espresso, tabular) — `formatMoney(unitPrice × qty, 'PLN')`.
    - Below it, `QuantityStepper` (size `sm`).
    - Below the stepper, a small `Remove` ghost link in `--text-tertiary`, hover `--negative`.
- **Notes for the kitchen** (if `notes` prop provided): below the list, a small textarea (3 rows) with caption-label `Notes for the kitchen` and placeholder `Anything we should know about your order?`. 200 char max. Optional — omit entire block if `notes` prop is absent.

**Footer (sticky):**

- ~140px tall. Hairline top border. Background `--surface-elevated`.
- Three rows of summary (16px between rows, Body 15px, tabular):
  - `Subtotal` + value (formatMoney).
  - `Delivery` + `Calculated at checkout` in tertiary italic (no value yet — that lands on page 3).
  - Divider hairline.
  - **Total** + value — both in Fraunces 24/500 espresso.
- Below the summary: primary button `Checkout · {total}` — full-width, copper, 56px, 16px radius, white text. Lucide `ArrowRight` 18px on the right.
- Below the button: a small caption (Body small, tertiary, centered) `Free baklava on first order — code at checkout.` (Soft callback to the landing newsletter copy.)

### 4.8 Floating cart button (`FloatingCartButton`)

A persistent floating CTA that appears whenever the cart has items and the user is *not* on the cart sheet or checkout. Lives outside the sticky chrome.

- **Desktop:** bottom-right of the viewport, 32px from the right edge, 32px from the bottom. Pill shape: copper fill, white text, 56px tall, 24px horizontal padding, 16px radius, `shadow-md`.
  - Content: Lucide `ShoppingBag` icon 20px · `View cart` · count badge `(3)` in slightly faded white · `·` · total `67,00 zł`.
- **Mobile (<768):** bottom-center, 16px from the bottom, takes 90% of viewport width, same content reflowed.
- Hidden when `itemCount === 0`. Slide-up entrance (300ms ease-out + 200ms opacity) when transitioning from 0→1 items. Hidden also on routes listed in `hideOnRoutes`.
- Click opens `CartSheet`.

---

## 5. Responsive behavior

| Breakpoint   | Behavior                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ≥1280px      | 3-col dish grid. Item sheet 560px, cart sheet 480px, both right-side overlays. Floating cart bottom-right.                                     |
| 1024–1279    | Same as 1280+. Container fluid.                                                                                                                |
| 768–1023     | 2-col dish grid. Sheets remain 560/480 (overlay over content). Filter pills wrap if needed.                                                    |
| 640–767      | 1-col grid. Search and filters stack into a 112px sticky bar. Sticky sub-nav becomes horizontal-scroll. Sheets full-width. Floating cart bottom-center. |
| <640         | All single-column. Type scale from mobile column in landing §1.2. Sheets full-width with full-height. Sticky chrome stacks to ~200px tall.     |

---

## 6. States

- **Initial load:** dish grids server-rendered with mock data. Cart hydrates from `localStorage` client-side; floating cart button waits for hydration to render (no flicker).
- **Image loading:** dish thumbnails get a `--surface-warm` placeholder at the correct aspect; fade in on load.
- **Item unavailable:** `DishCard` with `unavailable={true}` renders 60% opacity, the `+` button is hidden, name gets a small `Sold out today` caption-pill chip in tertiary. Clicking the card still opens the sheet (so users can see what they're missing), but the sheet's `Add to cart` button is disabled with tooltip `Sold out today — back tomorrow.`
- **Modifier option unavailable:** rendered in tertiary with strikethrough + `Sold out` chip; tap disabled.
- **Search debounce:** results update 200ms after the last keystroke. While typing, the existing results stay (no skeleton).
- **Filter applied:** instant client-side filter — no spinner.
- **Add to cart:** optimistic. The toast confirms success. If the underlying mock fails (network down later in real life), the toast morphs into an error: `Couldn't add — try again`. For the mock, always succeeds.
- **Cart line qty 0:** `QuantityStepper` blocks at min=1; the only way to remove is the `Remove` link. (Don't auto-remove on minus past 1 — too easy to misclick.)
- **Cart `Checkout` click:** navigates to `/checkout` (page 3 — not built yet; for the mock, render a placeholder `/checkout/page.tsx` that shows the cart contents in a list with `[Checkout flow ships in page 3]`).
- **Reduced motion:** all sheet/drawer transforms become opacity-only transitions; toast still works but with no slide.

---

## 7. Keyboard & accessibility

- **Focus trap** inside any open sheet. `Esc` closes. Focus returns to the trigger element on close.
- **Sheet announces** on open via `aria-live="polite"` on a hidden region: `Item details for Kebab Tortilla Średni opened.`
- **Sticky chrome doesn't hide content from screen readers** — `aria-hidden` is never used on the search/filter or sub-nav.
- **Dish cards** are clickable elements with `role="link"` (not div-with-onclick). The `+` button has `aria-label="Add Kebab Tortilla Średni to cart"`.
- **Search input** has `role="searchbox"` and `aria-label="Search the menu"`.
- **Filter pills** use `aria-pressed` per pill; group has `role="group"` with `aria-label="Dietary filters"`.
- **Modifier groups** are real `<fieldset>` with `<legend>`. Radios are `<input type="radio">`, checkboxes likewise. Required state via `aria-required`. Errors via `aria-describedby`.
- **Cart updates** announce via `aria-live="polite"` on a hidden region: `Cart updated — 3 items, 67 zł total.` Debounce announcements to once per 500ms.
- **Keyboard shortcuts:**
  - `/` — focus search (when not in an input).
  - `Esc` — close any open sheet.
  - `Enter` on a focused dish card — open the item sheet.
  - `Tab` on the search-clear button — works.
  - On cart sheet: `Backspace` on a focused line item removes it (with `aria-live` confirmation `Removed Kebab Tortilla from cart.`).
- **Focus ring:** copper 2px outline + 2px offset, never removed.

---

## 8. Mock data

Create:

- `apps/web/src/lib/mock/menu.ts` — the full menu.
- `apps/web/src/lib/mock/dish-details.ts` — full `DishDetail` objects keyed by dish id.

**Top-level shape:**

```ts
export const mockCategories: { id: string; label: string; description?: string; itemCount: number }[]
export const mockDishes: DishCardProps[]            // 47 dishes flat, with categoryId on each
export function getDishDetail(id: string): DishDetail | null
```

**Seed:**

- **6 categories** (matching landing): Kebab (18), Falafel (9), Tacos (4), Box & Plates (8), Drinks (7), Sauces (1). Total **47** to match the landing's "See all 47 dishes" pill.
- **All dishes have:**
  - `id` (slug-like: `kebab-tortilla-mały`, etc.)
  - `categoryId`
  - `name` (Polish names from the real Szef Donald menu — use the names visible on the menu photo)
  - `description` (one short sentence)
  - `price` (in PLN cents, e.g. `1900` = `19,00 zł`)
  - `image` (Unsplash food URL)
  - `flags` (subset of `vegetarian | vegan | gluten-free | spicy | featured`)
- **~60% of dishes have at least one modifier group** — kebab items have `Size` (Mały/Średni/Duży/Mega with `+0/+200/+400/+700` deltas) and `Meat` (Kurczak/Wołowina/Mieszane, no delta) and `Sauce` (Łagodny/Mieszany/Ostry, multi-select up to 3, no delta). Falafel has `Size` + `Sauce`. Tacos have `Filling` + `Spice level`. Drinks have `Type` (Coca-Cola / Sprite / Fanta / Kropla Beskidu) with `Size` as a sub-group for the bottled ones.
- **~20% have additional optional modifiers** like `Extras` (Extra cheese +400, Extra meat +600, etc.) — multi-select, max 4.
- **2 dishes unavailable today** — one in Kebab, one in Drinks — to exercise the unavailable visual.
- **3 dishes featured** — appear on the landing (use the same 6 from `apps/web/src/lib/mock/landing.ts`, deduped).
- **Allergens** populated on dishes with bread (gluten), tahini (sesame), cheese (dairy).
- **Prep minutes** 6–14 for hot dishes, omitted for drinks.

**Reconcile with landing mock:** the 6 featured dishes on the landing page must be a subset of `mockDishes` here (same `id`, same name, same price, same image). The "47 dishes" claim on landing must equal `mockDishes.length`.

---

## 9. Deliverable

1. `apps/web/src/app/menu/page.tsx` — ≤250 lines, composes the sections.
2. `apps/web/src/features/menu/`:
   - `menu-header.tsx`
   - `menu-search-filter.tsx` — the sticky search + filter row
   - `menu-sub-nav-section.tsx` — the sticky sub-nav (wraps `MenuSubNav` and binds scroll-spy to local state)
   - `category-section.tsx` — one section with heading + grid
   - `dish-grid.tsx` — pure presentational grid
   - `item-detail-container.tsx` — opens `ItemDetailSheet`, owns the local state of selected modifiers / qty / notes
3. `apps/web/src/stores/cart-store.ts` — Zustand store (`useCartStore`) with persist, `localStorage` key `szef-donald-cart`. Exposes `addLine`, `updateQty`, `removeLine`, `clear`, `lines`, `subtotal`, `itemCount`.
4. `apps/web/src/components/`:
   - `cart-container.tsx` — global cart container, mounted in root layout; renders `CartSheet` + `FloatingCartButton`, reads from the store, wires `onCheckout` to `router.push('/checkout')`.
   - `toaster.tsx` — install `sonner`, configure for warm-palette toasts (cream bg, espresso text, copper accent).
5. `apps/web/src/app/checkout/page.tsx` — placeholder page listing cart contents and showing `[Checkout flow ships in page 3]`. So the menu's `Checkout` button has somewhere to go.
6. `apps/web/src/lib/mock/menu.ts` + `apps/web/src/lib/mock/dish-details.ts` per §8.
7. `packages/ui/src/` — the **10 new primitives** listed in §2, each with a tiny `README.md` showing import + usage example.
8. `packages/ui/src/tokens/dish-flags.ts` — exported `DISH_FLAG_TOKENS` map (per carry-over fix #2):

```ts
export const DISH_FLAG_TOKENS = {
  vegetarian:  { label: 'V',       token: 'positive', icon: 'leaf' },
  vegan:       { label: 'Vegan',   token: 'positive', icon: 'leaf' },
  'gluten-free': { label: 'GF',    token: 'positive', icon: 'wheat-off' },
  spicy:       { label: 'Spicy',   token: 'warning',  icon: 'flame' },
  featured:    { label: 'Featured', token: 'accent', icon: 'sparkles' },
} as const
```

**The Menu page must:**

- Run at `/menu` from `pnpm --filter @repo/web dev`.
- Look indistinguishable in finish from the landing — same palette, same type, same elevation, same motion.
- Sticky chrome (search/filter + sub-nav) behaves correctly at all breakpoints — no overlap, no shifts, scroll-spy stays accurate.
- Support quick-add for items without modifiers, full sheet for items with modifiers.
- Cart persists across page reloads via `localStorage`.
- All 10 new primitives genuinely generic.
- Hit Lighthouse Performance ≥95, Accessibility ≥95 on the mock.

---

## 10. Pre-build replies — answer these BEFORE writing code

Reply with three things, then I'll greenlight the build:

1. **One-paragraph interpretation.** Confirm the page composition (header → search/filter sticky → sub-nav sticky → category sections → sheets + floating cart). Specifically address two tensions:
   - Should the cart be a slide-in sheet (current spec) or a persistent right rail on ≥1440px desktop (Wolt/UberEats pattern)? I've chosen sheet because it preserves the editorial breathing room and matches the brand's "menu first, ordering second" voice — but say if you'd push back.
   - The item detail is a right-side sheet (not a centered modal). Confirm — modals fight the brand language and lose mobile fidelity. Sheets win on both.

2. **Signatures of all 10 new `@repo/ui` primitives** in TypeScript, locked. Especially scrutinize:
   - `ModifierGroup.value` — should it be `string[]` (option ids) for both radio and checkbox, or `string | string[]` with the type narrowed by `max`? I've gone `string[]` for consistency (radio = array of length 1). Push back if you disagree.
   - `CartLine.modifiers` — flat `{ groupName; optionName; priceDelta }[]` for fast rendering, OR keep the original `{ groupId; optionIds[] }[]` for re-edit? I've gone flat because cart line item rendering is hot and re-editing-a-cart-line isn't in v1. Confirm or push back.
   - `FloatingCartButton.hideOnRoutes` — should this be the primitive's concern, or should the container that mounts it filter? I've put it on the primitive for ergonomic mounting. Push back if it's leaky.
   - `EmptyState` is intentionally tiny — confirm it covers Order history, no-favourites, and search-no-results without growing.

3. **A 5-line snippet** showing how `ItemDetailSheet` is composed for a kebab dish — passing the dish, the modifier groups, the `onAddToCart` callback that pushes into the Zustand store. Proves the primitive is genuinely decoupled from the store (no direct imports), and that the modifier group rendering doesn't leak through.

Then build it.
