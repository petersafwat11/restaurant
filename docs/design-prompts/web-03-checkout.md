# Web · Page 3 — Checkout (review → contact → delivery → payment → success)

This is the **third and final** design-heavy page of the customer website for **Szef Donald**. Page 1 (Landing) locked the brand language. Page 2 (Menu) locked the ordering pattern and built the cart. Page 3 is the **revenue page** — where intent becomes money.

Checkout locks the **form language** for the customer site. Every field design, every validation pattern, every input behaviour you settle here gets reused across Account, Auth (sign in / register / password reset), Address book, Loyalty signup, Reviews submission, and Contact form. Build the form primitives like you're publishing them.

The page also introduces the **post-purchase moment** — the confirmation/success view and an entry point to live order tracking. Both ship here so we end with a complete customer journey.

Reuse the locked design language and **every primitive** from pages 1+2. Don't redesign anything settled.

---

## 1. Recap — what's already locked

Don't change any of this. Refer to `web-01-landing.md` §1 and `web-02-menu.md` §1 for full specs.

- **Theme:** warm cream + copper signature + serif display (Fraunces) + sans body (Inter). Light only.
- **Palette:** `--bg` cream, `--surface` lighter cream, `--surface-elevated` white, `--surface-warm` darker beige band. `--accent` copper is the only loud color. Status: `--positive` olive, `--negative` brick, `--warning` amber, `--info` navy.
- **Typography scale** as in landing §1.2.
- **Card radius 16px**, input radius 12px, button radius 16px.
- **Motion**: 200ms ease-out color/opacity, 300ms ease-out transform.

**Primitives already extracted (compose, don't rebuild):**

From page 1: `SiteNav` · `SiteFooter` · `Container` · `Hero` · `SectionHeader` · `CategoryCard` · `DishCard` · `TestimonialCard` · `HoursTable` · `NewsletterForm`.

From page 2: `SearchInput` · `MenuSubNav` · `FilterPillGroup` · `ItemDetailSheet` · `ModifierGroup` · `QuantityStepper` · `CartSheet` · `CartLineItem` · `FloatingCartButton` · `EmptyState`.

Plus the `formatMoney(amount, currency)` helper, `DISH_FLAG_TOKENS` map, and the `useCartStore` Zustand store with `localStorage` persistence.

**Carry-over fixes from pages 1+2 (apply here too):**

1. `QuantityStepper` — the + button was missing in the page-2 build. **Render both `−` and `+` here** on any quantity control inside the order summary (if editable). Add a regression test: a `QuantityStepper` mounted in isolation must show `− value +` with both buttons functional.
2. Empty state icon was a placeholder square in page 2's empty cart — **use real Lucide icons** for every `EmptyState` on this page (`PartyPopper` on success, `ShoppingBag` if cart empty, `MapPinOff` if no address).
3. Cart line dedup — when the same item with the same modifier hash is added, combine into one line with `qty += n`. The checkout summary inherits whatever the cart store produces, so the fix lives in `useCartStore.addLine`.
4. Mobile logo wrap — **use the `mark` variant** of `Logo` below 480px throughout the checkout / success pages too.

**Cart-empty edge case:** if a user navigates directly to `/checkout` with an empty cart, render the full-page `EmptyState`:
- Icon: `ShoppingBag` 64px tertiary.
- Title: `Your cart is empty`.
- Description: `Add something tasty before checking out.`
- Action: `Browse menu` → `/menu`.

---

## 2. Extraction directive — new primitives from this page

Build the Checkout page and **extract these ten primitives into `@repo/ui`**. Each is generic, typed, and used by 2–8 future pages. Build them as if you were publishing the package.

| Primitive              | Path                                       | Used by Checkout + …                                                                          |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `FormField`            | `packages/ui/src/form-field/`              | Every form across customer site — sign in, register, password reset, address book, account profile, reviews, contact form. |
| `RadioCardGroup<TId>`  | `packages/ui/src/radio-card-group/`        | Checkout (order type, payment), Account preferences, Loyalty tier picker.                     |
| `AddressAutocomplete`  | `packages/ui/src/address-autocomplete/`    | Checkout, Address book (add/edit), Account profile.                                           |
| `TimeSlotPicker`       | `packages/ui/src/time-slot-picker/`        | Checkout (delivery + pickup), future Reservations.                                            |
| `PromoCodeInput`       | `packages/ui/src/promo-code-input/`        | Checkout, Loyalty page, Account vouchers.                                                     |
| `OrderSummaryPanel`    | `packages/ui/src/order-summary-panel/`     | Checkout (sticky rail), Order detail, Order tracking, Order confirmation page.                |
| `CheckoutSection`      | `packages/ui/src/checkout-section/`        | Checkout. Single use — but a clean accordion-section primitive that may unlock future multi-step flows (multi-step Address verification, Verification of Phone, etc.). |
| `TipPicker`            | `packages/ui/src/tip-picker/`              | Checkout. Also reusable in post-meal rating / tip-the-driver flows later.                     |
| `OrderProgressStepper` | `packages/ui/src/order-progress-stepper/`  | Success page, Order tracking page, Order detail (account).                                    |
| `SuccessHero`          | `packages/ui/src/success-hero/`            | Order confirmation, Loyalty enrollment confirmation, Password-reset success, Newsletter confirm. |

**API hints (you'll commit to final signatures in the pre-build reply):**

```ts
type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  helper?: string
  error?: string                       // shown in --negative under the input
  layout?: 'stacked' | 'inline'        // default 'stacked'
  size?: 'sm' | 'md' | 'lg'            // default 'md'
  prefix?: ReactNode                   // e.g. "+48" for phone, "🇵🇱" flag
  suffix?: ReactNode                   // e.g. clear button, info tooltip
  children: ReactNode                  // the actual input — works with any input type, textarea, select
  // Designed to wrap react-hook-form-registered inputs. Doesn't own state.
}

type RadioCardGroupProps<TId extends string> = {
  options: {
    id: TId
    label: string
    description?: string
    icon?: ReactNode
    badge?: ReactNode                  // e.g. "Recommended" pill, "~25 min" chip
    disabled?: boolean
    disabledReason?: string            // tooltip when disabled
  }[]
  value: TId | null
  onChange: (next: TId) => void
  layout?: 'horizontal' | 'vertical' | 'grid'   // default 'horizontal' on desktop, 'vertical' on mobile
  columns?: 1 | 2 | 3                            // when layout='grid'
}

type AddressAutocompleteProps = {
  value: AddressInput | null
  onChange: (next: AddressInput) => void
  country?: string                     // default 'PL'
  error?: string
  // For the mock, autocomplete uses a static list of 8 Warsaw streets that match on prefix.
  // Real impl would wire to Google Places / Mapbox / custom backend later.
}

type AddressInput = {
  street: string                       // "Marszałkowska 102"
  apartment?: string                   // "Apt 5B / Floor 3"
  city: string                         // "Warszawa"
  postalCode: string                   // "00-026"
  country: string                      // "PL"
  notes?: string                       // delivery instructions
  coords?: { lat: number; lng: number } // when geocoded
}

type TimeSlotPickerProps = {
  value: TimeSlotValue
  onChange: (next: TimeSlotValue) => void
  mode: 'delivery' | 'pickup'
  earliestSlotMinutes: number          // 20 for delivery, 10 for pickup
  slotDurationMinutes?: number         // default 15
  slotsAheadHours?: number             // default 4 — slots are generated for the next N hours
  closedReason?: string                // when restaurant is closed, render a banner with this
}

type TimeSlotValue =
  | { kind: 'asap' }
  | { kind: 'scheduled'; iso: string } // ISO datetime

type PromoCodeInputProps = {
  applied: { code: string; discountCents: number; label?: string } | null
  onApply: (code: string) => Promise<{ ok: true; discountCents: number; label?: string } | { ok: false; error: string }>
  onRemove: () => void
  collapsed?: boolean                  // default true — shows "Have a code?" link until clicked
}

type OrderSummaryPanelProps = {
  lines: CartLine[]                    // same shape as page 2
  currency: string
  subtotal: number                     // cents
  delivery: { cents: number } | { label: string }   // e.g. { label: 'Free' } or { cents: 500 }
  discount?: { cents: number; label: string }       // when promo applied
  tip?: number                                       // cents
  total: number                        // cents
  showEditCart?: boolean               // default true on checkout, false on confirmation
  onEditCart?: () => void              // opens CartSheet
  promoInput?: ReactNode               // slot for <PromoCodeInput />
  ctaSlot?: ReactNode                  // slot for Place-order CTA + terms text + payment-logo row
  variant?: 'sticky-rail' | 'inline'   // sticky on desktop checkout, inline on confirmation
}

type CheckoutSectionProps = {
  step: number                         // 1–5 — shown in the circle on the left of the title
  title: string
  status: 'pending' | 'active' | 'complete' | 'error'
  children: ReactNode                  // the section body — only rendered when active or complete
  summary?: ReactNode                  // shown inline when status='complete' (e.g. "Marszałkowska 102, Warszawa")
  onEdit?: () => void                  // shows "Edit" link top-right when complete
  rightSlot?: ReactNode                // e.g. "Sign in" link on the Contact section
}

type TipPickerProps = {
  subtotalCents: number                // base for percent calc
  value: number                        // cents
  onChange: (cents: number) => void
  presets?: number[]                   // default [0, 5, 10, 15] (percents)
  allowCustom?: boolean                // default true — adds "Other" → small input
  currency: string
}

type OrderProgressStepperProps = {
  mode: 'delivery' | 'pickup' | 'eatin'
  status: OrderStatus                  // matches @repo/types enum
  // The stepper computes the steps from `mode`:
  //   delivery: Confirmed → Preparing → On the way → Delivered
  //   pickup:   Confirmed → Preparing → Ready for pickup → Picked up
  //   eatin:    Confirmed → Preparing → Served
}

type SuccessHeroProps = {
  icon?: ReactNode                     // default: hexagonal copper checkmark mark
  title: string                        // e.g. "Order confirmed"
  description?: string                 // e.g. "Order #SD-2026-0042 — thanks!"
  meta?: ReactNode                     // e.g. "Ready in ~25 min" card
}
```

**Mock backend behavior:**

- `useCheckoutSubmit()` hook in `apps/web/src/features/checkout/hooks/`. Resolves after 1200ms with a fake order id (`SD-2026-0042` format).
- `AddressAutocomplete` matches against a hardcoded list of 8 Warsaw streets (Marszałkowska, Nowy Świat, Aleje Jerozolimskie, Krakowskie Przedmieście, Świętokrzyska, Plac Defilad, Plac Trzech Krzyży, Aleja Niepodległości) — debounce 200ms.
- `PromoCodeInput`'s `onApply` mock: accepts `BAKLAVA` (15% off, label `15% off — first order`), `STUDENT` (5 zł off, `5,00 zł off`), anything else returns `{ ok: false, error: 'Code not valid' }`.

**The page (`apps/web/src/app/checkout/page.tsx`) should be thin** — composes the sections. Section bodies live in `apps/web/src/features/checkout/sections/`. Aim for ≤ 250 lines on `page.tsx`.

---

## 3. What customers actually do on this page

In order of frequency:

1. **Glance at the cart, fill phone + address, pay, done.** The dominant flow. Every keystroke matters — autofill aggressively, use platform conventions (Apple Pay / Google Pay / browser autofill), default to ASAP delivery.
2. **Apply a promo code** — they got the baklava code from the landing newsletter or word-of-mouth. The code field must be one click away (collapsed by default but always discoverable).
3. **Switch from Delivery to Pickup** mid-flow because they realised they're nearby. The order-type radio at the top must propagate cleanly — the address section disappears, the time-slot picker re-renders, the delivery fee drops to zero in the summary, the total updates live.
4. **Edit the cart** without losing what they typed. Clicking "Edit cart" reopens the `CartSheet` from page 2 — changes write back to the same store. Returning to checkout, all entered fields are preserved.
5. **Pay with BLIK** (Polish customers heavily prefer BLIK — it must be visually equal to Card, not buried).

---

## 4. Page layout

Route: `/checkout`. File: `apps/web/src/app/checkout/page.tsx`. Two-column on desktop, single-column on mobile with sticky bottom bar.

### 4.1 Page header

Compact — no hero. Below the site nav:

- 48px top padding.
- A simple back link at the top: `← Back to menu` (small ghost link in `--text-secondary`, hover copper) — navigates to `/menu`.
- 16px gap.
- **SectionHeader** (`align: 'left'`, no description, no action):
  - eyebrow `CHECKOUT` in copper.
  - title (H1, Fraunces 48/500 desktop, 32 mobile) — `Almost there.`
- 32px bottom padding before the columns start.

### 4.2 Two-column body (desktop ≥1024)

- Container with two columns: **left 62% / right 38%**, gap 48px.
- Left column: stacked `CheckoutSection`s.
- Right column: sticky `OrderSummaryPanel` (`variant='sticky-rail'`), sticky at top offset `72px + 24px`.

### 4.3 Left column — checkout sections

Each `CheckoutSection` has a numbered circle on the left of its title (`1`, `2`, …), the title, a status indicator (active = copper-muted circle; complete = olive checkmark circle; pending = tertiary outlined circle; error = brick circle with `!`).

Sections in order:

---

**Section 1 — Order type** (`step={1}`, always `active` since it's required first)

- Title: `How do you want it?`
- Body: a `RadioCardGroup` with three options:
  - `delivery` — icon: Lucide `Truck`. Label `Delivery`. Description `20–40 min`. Badge: a chip with the delivery fee (`5,00 zł`) or `Free` if cart total ≥ a threshold.
  - `pickup` — icon: Lucide `ShoppingBag`. Label `Pickup`. Description `Ready in 10–15 min · Marszałkowska 102`. Badge: `No fee`.
  - `eatin` — icon: Lucide `Utensils`. Label `Eat in`. Description `Order from your table`. Badge: none.
- Layout: `horizontal` (3 cards side-by-side) on desktop, `vertical` (3 stacked cards) on mobile.
- Card design (within `RadioCardGroup`):
  - 16px radius, 1px border `--border-strong` when unselected, 2px copper border when selected. Selected card also gets `--accent-muted` background overlay at 30% opacity.
  - 20px padding. Icon top-left (24px Lucide, copper when selected). Label H3 (Inter 600 18px). Description Body small. Badge top-right.
- On change: the section moves to `complete` after a brief tick of "edit-in-place" allowed; the section below adapts (Delivery vs Pickup vs Eat in). The order-type selection itself can always be changed by clicking the section header `Edit` link.

---

**Section 2 — Contact** (`step={2}`)

- Title: `Contact`.
- `rightSlot`: a small ghost link `Already a customer? Sign in →` (links to `/sign-in` — we won't build sign-in here; placeholder route).
- Body: three `FormField`s in a stack:
  - **Name** (text, required, autoComplete `name`, 1–80 chars). Placeholder `Jan Kowalski`.
  - **Phone** (tel, required, autoComplete `tel`, prefix `+48` in the FormField). Placeholder `512 345 678`. Helper text: `We'll text you when your order is on the way.`
  - **Email** (email, required, autoComplete `email`). Placeholder `jan@example.com`. Helper text: `For the receipt and order confirmation.`
- Below: a single checkbox `Save my info for next time` (default unchecked, no persistence in mock — just visual). Caption under it: `Stored in your browser. Not shared.`

---

**Section 3 — When + Where** (`step={3}`)

- Title: depends on `orderType`:
  - `delivery` → `Where + When`
  - `pickup`   → `When to pick up`
  - `eatin`    → `Your table`

- Body when `orderType === 'delivery'`:
  - `AddressAutocomplete` field at the top — full-width, placeholder `Start typing your street…`. As user types, dropdown of matches appears (250ms after last keystroke, with hover/keyboard highlight). Selecting a match populates the structured fields below in a 2-column subgrid:
    - Street (autofilled, read-only after autocomplete) + Apartment / floor (optional, editable, placeholder `Apt 5B / Floor 3`).
    - City (autofilled) + Postal code (autofilled).
  - Optional textarea: `Delivery instructions` (Body, 3 rows, placeholder `Gate code, doorman, where to leave it…`, 200 char max).
  - Separator hairline.
  - **`TimeSlotPicker`** (`mode='delivery'`, `earliestSlotMinutes=20`). UI:
    - Two large pill toggles at the top: `ASAP · 20–40 min` (default-selected) and `Schedule for later`.
    - When `Schedule for later` is selected, reveal a slot grid below: 3 columns × 4 rows = 12 slots covering the next ~3 hours in 15-min increments, starting `earliestSlotMinutes` from now. Each slot is a pill chip showing the time (e.g. `19:30`). Disabled past-time and outside-hours slots render in tertiary with strikethrough.
    - When restaurant is closed (mock: pretend closed Mon 23:30–11:00), render a banner instead: `We're closed right now. Earliest delivery: tomorrow 11:00.` and show only tomorrow slots.

- Body when `orderType === 'pickup'`:
  - Pickup location card (read-only):
    - Brand hexagon icon + `Szef Donald — Marszałkowska 102` (Inter 600 16px) + below it `00-026 Warszawa` (Body small tertiary).
    - On the right of the card: a small ghost link `Get directions →` to a maps URL.
  - **`TimeSlotPicker`** (`mode='pickup'`, `earliestSlotMinutes=10`). Same UI pattern as delivery, just different earliest slot.

- Body when `orderType === 'eatin'`:
  - A single `FormField` for table number (number input, required, 1–99). Placeholder `12`. Helper: `Look for the number on your table, or scan the QR.`
  - Below it, small ghost button `Scan QR instead →` (placeholder — opens an alert in the mock).
  - No `TimeSlotPicker`.

---

**Section 4 — Order notes** (`step={4}`, `optional` — appears with title `Anything else? (optional)`)

- Body: a single textarea, 3 rows, placeholder `Special instructions for the kitchen…`, 200 char max with counter.
- This is in addition to the per-cart-line notes from page 2; this textarea is for the order as a whole.
- Collapsed by default if cart's notes field is empty — shows just a small `+ Add a note` ghost link. Clicking expands the textarea.

---

**Section 5 — Payment** (`step={5}`)

- Title: `Payment`.
- Body: a `RadioCardGroup` (`layout='vertical'`, `columns=1`) of payment methods:
  - `card` — icon: Lucide `CreditCard`. Label `Card`. Description `Visa, Mastercard, Amex.`. Default selected.
  - `blik` — icon: a 24px BLIK wordmark SVG (text logo, copper). Label `BLIK`. Description `Enter the 6-digit code from your bank app.`
  - `applepay` — icon: Apple logo SVG. Label `Apple Pay`. Description `One-tap on your iPhone or Mac.`. **Disabled (greyed out) when not on Apple device**; `disabledReason='Available on Apple devices.'`
  - `googlepay` — icon: Google G SVG. Label `Google Pay`. Description `One-tap with your Google account.`. **Disabled when not on Chrome/Android**.
  - `cod` — icon: Lucide `Banknote`. Label `Cash on delivery`. Description `Pay the driver in cash when it arrives.`. **Conditional**: only present when `orderType === 'delivery'` AND total < 100 zł. `disabledReason='Available for delivery orders under 100 zł.'` when present-but-disabled. Hidden otherwise.

- Below the radio group, the inline form for the selected method:
  - `card` selected → 4 `FormField`s in a 2-col grid:
    - Card number (12 cols, autoComplete `cc-number`, placeholder `1234 1234 1234 1234`, with a credit-card-brand icon suffix that updates as user types).
    - Expiry (6 cols, autoComplete `cc-exp`, placeholder `MM/YY`).
    - CVC (6 cols, autoComplete `cc-csc`, placeholder `123`, suffix info-tooltip `3-digit code on the back of your card.`).
    - Cardholder name (12 cols, autoComplete `cc-name`).
    - Below: small caption `Secured by Stripe.` + lock icon.
    - **In real impl, this becomes Stripe Elements.** Mock with bare inputs styled to match.
  - `blik` selected → a single large input (6 segmented digit boxes, each 56×56, 16px gap), labelled `BLIK code`. Helper: `Open your bank app and tap "BLIK" to get a code.`
  - `applepay` / `googlepay` selected → centered black/white pay-with button (placeholder, doesn't actually trigger). Caption: `You'll confirm on your device.`
  - `cod` selected → caption: `The driver will collect {total} zł in cash. Please have it ready.`

---

**Section 6 — Tip** (`step={6}`, optional, appears below Payment without a numbered circle — render as a normal `CheckoutSection` but use `step={6}` with a `Heart` icon overlay on the circle to set it apart visually)

- Title: `Add a tip for the team? (optional)`.
- Body: `TipPicker`:
  - Presets `0% · 5% · 10% · 15%` as inline chips (rounded pills, copper outline on hover, copper fill on selected). `No tip` is the default selection (rendered as the leftmost chip).
  - To the right of the chips: `Other` chip → reveals a small `CurrencyInput` (max 100 zł, suffix `zł`) when clicked.
  - Caption below: `100% of tips go to the team.`

---

### 4.4 Right column — Order summary

The `OrderSummaryPanel` (`variant='sticky-rail'`) sits in the right column, sticky at top offset `72px + 24px`.

- 16px radius, 1px hairline border, 24px padding, `--surface-elevated` (white) background. Max-width fits the column.
- Header row: H3 `Order summary` (Inter 600 20px) + on the right, a small ghost link `Edit cart` (`showEditCart=true`) → opens the `CartSheet` from page 2.
- Cart line list — uses `CartLineItem` (`variant='readonly'`) — each shows: 56×56 thumbnail, name, modifier summary, `× 2` count on the right, line total. No quantity stepper. Click on a line opens the item detail sheet from page 2 in readonly mode (or skip for the mock — just no-op).
- After the list, a hairline.
- **`PromoCodeInput`** (collapsed by default) — caption `Have a code?` ghost link; click expands to input + `Apply` button. When applied, render an `--accent-muted` chip with the code + label + a small X to remove.
- Hairline.
- Price stack (Body 15px, tabular):
  - `Subtotal` + value.
  - `Discount` (only if promo applied) + value in `--positive` olive, prefixed with `−`.
  - `Delivery` + either `Free` (italic tertiary) or value.
  - `Tip` (only if tip > 0) + value.
  - Hairline.
  - `Total` (Fraunces 24/500 espresso both label and value).
- The `ctaSlot` at the bottom:
  - Primary button `Place order · {total}` — full width, copper, 56px, 16px radius, white text. Right-aligned Lucide `ArrowRight` 18px.
  - Below: small terms caption (Body small, tertiary, centered): `By placing this order, you agree to our Terms and Privacy Policy.` (both links underlined).
  - Below: a small horizontal row of payment-method logos (Visa, Mastercard, BLIK, Apple Pay, Google Pay) at 60% opacity. Centered, 16px tall, 16px gap.

### 4.5 Place-order flow

- Click `Place order`:
  - Validate all required sections. If any invalid, the first one scrolls into view with `status='error'`, red border on the section card, an inline error toast at the top of the page (top-right) saying `Please complete the highlighted sections.`
  - If valid: button becomes loading state — Lucide spinner replaces the arrow, label changes to `Placing order…`, button disabled. Backdrop appears at 30% opacity over the whole page to prevent navigation.
  - Mock resolves after 1200ms with order id `SD-2026-0042`.
  - On success: navigate to `/checkout/success/SD-2026-0042` via `router.push`. Cart store clears.
  - On error: backdrop fades, button restores, a brick-red banner appears at the top of the page: `Couldn't place your order — try again.` with a Retry button.

---

## 5. Success page (`/checkout/success/[orderId]`)

Route: `apps/web/src/app/checkout/success/[orderId]/page.tsx`. Stand-alone page — full site nav + footer still render but the body changes completely.

### 5.1 Layout

Single-column, container max-width 720px, centered. 64px top padding, 96px bottom padding.

### 5.2 Sections

**`SuccessHero`**

- Centered. Icon: a 96×96 hexagonal copper mark with a white checkmark inside (composes the brand hexagon — important brand moment).
- Title (Fraunces 56/500 espresso, mobile 36): `Order confirmed`.
- Description (Body L, `--text-secondary`): `Thanks, {firstName} — we got it.`
- Meta block below the description: a small white card (`--surface-elevated`, 16px radius, 1px border, 16px padding, max-width 360px, centered):
  - Caption `ORDER NUMBER` (tertiary, uppercase, 0.08em tracking).
  - Order id `SD-2026-0042` (Fraunces 20/500 espresso, tabular, copy-button on the right that copies to clipboard with a toast `Order number copied.`).

**Estimated time card**

- Below the hero, 48px gap.
- A card (`--surface-elevated`, 16px radius, 1px border, 24px padding):
  - Centered content.
  - Caption `ESTIMATED {DELIVERY|PICKUP|SERVICE} TIME` (depending on mode).
  - Big time (Fraunces 32/500 copper, tabular): `19:45` or `~25 min`.
  - Caption below: `We'll text you when {it's out for delivery | it's ready for pickup | the kitchen starts}.`

**`OrderProgressStepper`**

- Below the time card, 32px gap.
- Horizontal 4-step (or 3-step for eat-in) stepper:
  - Each step has a circle (24px) + label below (caption Inter 500).
  - Connected by 1px line.
  - Current step circle: copper fill, white icon inside.
  - Completed steps: olive `--positive` fill, white check icon.
  - Pending steps: tertiary outline only, tertiary label.
- The stepper is live-but-static for the mock — defaults to step 1 (`Confirmed`).
- Below the stepper, a small ghost link: `Track your order →` (links to `/orders/SD-2026-0042` — placeholder route).

**Order summary**

- Below the stepper, 48px gap.
- An `OrderSummaryPanel` (`variant='inline'`, `showEditCart=false`) — same primitive, no sticky behavior, no edit. Inline at full width.

**Delivery / pickup / table details**

- Below the summary.
- A two-column grid (1fr 1fr on desktop, stacked on mobile), each cell is a small white card:
  - Cell 1: `WHERE` caption + address (delivery) or pickup location (pickup) or table number (eat-in). Includes a `Get directions →` link for pickup.
  - Cell 2: `CONTACT` caption + name + phone + email. Includes a small `Edit contact` placeholder ghost link (no-op in mock).

**Footer actions**

- 48px gap.
- Two-button row centered:
  - Primary: `Track your order` (copper) → `/orders/SD-2026-0042`.
  - Ghost: `Back to menu` → `/menu`.

**Confirmation note**

- Below the buttons, 24px gap, centered.
- Small text (Body small, `--text-secondary`): `We sent a confirmation to jan@example.com.`

---

## 6. Responsive behavior

| Breakpoint   | Behavior                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| ≥1280px      | Two-column 62/38, sticky right rail. Order-type cards horizontal.                                                                 |
| 1024–1279    | Same. Container fluid.                                                                                                            |
| 768–1023     | Single column. `OrderSummaryPanel` collapses to a sticky bottom bar: `View order · 67,00 zł · Place order →`. Tap to expand a bottom sheet with the full summary. Place-order CTA always visible at the bottom edge. |
| 640–767      | Same single-column + sticky bottom bar pattern. Order-type cards stack vertical. Time-slot grid drops to 2 columns.                |
| <640         | All single-column. Slot grid 2 columns. Form fields are full-width (no 2-col subgrids).                                            |

The success page is a single column at all breakpoints — only the inner card grids stack.

---

## 7. States

- **Cart empty on checkout load:** full-page `EmptyState` per §1 carry-over fix.
- **Address autocomplete loading:** small spinner inside the input on the right while debouncing/searching.
- **Address autocomplete no results:** dropdown shows `No matches — enter manually below` with a `Skip autocomplete` link that reveals the structured fields empty for manual entry.
- **Time-slot picker — restaurant closed:** banner replaces the slot grid (per §4.3).
- **Promo code applying:** `Apply` button → spinner, disabled.
- **Promo code accepted:** input collapses, the applied chip animates in (200ms slide + opacity).
- **Promo code rejected:** input gains red border, error text below: `Code not valid.` (or whatever the mock returns).
- **Payment form errors:** each FormField shows its own inline error on blur. Card-brand icon updates as user types.
- **Place-order loading:** described in §4.5. Spinner in button + full-page backdrop.
- **Place-order error:** banner + Retry described in §4.5.
- **Section status:** error states render a brick-red bordered section card + the numbered circle becomes brick with `!`.
- **Form fields:** error state = `--negative` border, error text Body small below in `--negative`, label stays the same color.
- **Reduced motion:** disable section reveal animations + sticky bottom bar slide; instant transitions only.

---

## 8. Keyboard & accessibility

- **Form field labels** are real `<label>`s with `htmlFor`. Errors use `aria-describedby` linking to error text.
- **Required fields** use `aria-required="true"`. Don't rely on the asterisk alone.
- **Radio card groups** use real radio `<input>` semantics: `<fieldset>` + `<legend>`, each option is `<label>` wrapping `<input type="radio">`.
- **Time slot picker** chips are real `<button role="radio">` in a `<div role="radiogroup">`.
- **Tab order** matches visual order top-to-bottom, left-to-right.
- **Focus rings:** copper 2px outline + 2px offset on all interactive elements.
- **The Place order button** has `aria-describedby` pointing to the terms text.
- **Order status announcements:** when a section moves from `active` → `complete`, announce via `aria-live="polite"` in a hidden region: `Section 2 contact complete.`
- **Card form** should support browser autofill — every input has the right `autoComplete` attribute (`name`, `tel`, `email`, `cc-number`, `cc-exp`, `cc-csc`, `cc-name`, `street-address`, `postal-code`, `address-level2`).
- **Keyboard shortcuts:**
  - `Esc` — close any open dropdown (autocomplete, custom selects).
  - `Enter` inside a `FormField` (single input row) — submits the section if all fields valid.
  - On the slot picker grid, arrow keys navigate between slots.
- **Success page** focus moves automatically to the `SuccessHero` heading on mount, so screen readers announce it.

---

## 9. Mock data

Create:

- `apps/web/src/lib/mock/checkout.ts`:

```ts
export const mockSavedAddresses: AddressInput[]    // 2 — for the (out-of-scope here) future "saved addresses" picker
export const mockAddressAutocomplete: AddressInput[]   // 8 Warsaw addresses for the autocomplete
export const mockDeliveryConfig: {
  feeCents: number                  // 500 = 5 zł
  freeOverCents: number             // 8000 = 80 zł
  earliestSlotMinutes: number       // 20
}
export const mockPickupConfig: {
  location: { name: string; address1: string; address2: string; phone: string }
  earliestSlotMinutes: number       // 10
}
export const mockPromoCodes: Record<string, { discountCents?: number; discountPercent?: number; label: string }>
// { BAKLAVA: { discountPercent: 15, label: '15% off — first order' }, STUDENT: { discountCents: 500, label: '5,00 zł off' } }
```

- Mock order id format: `SD-${year}-${4-digit-padded-number}` — for the mock just hardcode `SD-2026-0042`.

- The success page reads `params.orderId` and constructs a mock detail (composes from `useCartStore` state captured right before clear, plus the entered contact + address).
  - **Important:** before clearing the cart on success, snapshot the cart into `sessionStorage` under `szef-donald-last-order` so the success page can hydrate. After 5 min, clear it.

**Reconcile with pages 1+2:**

- Delivery fee `5,00 zł` matches what the order-type card promises.
- `BAKLAVA` promo code matches the landing newsletter copy and the cart-sheet's `Free baklava on first order — code at checkout.` caption.
- Pickup location matches the landing Hours+Location section (`Marszałkowska 102, 00-026 Warszawa`).
- Cart line shapes match page 2's `CartLine` type exactly — no re-shaping in checkout.

---

## 10. Deliverable

1. `apps/web/src/app/checkout/page.tsx` — ≤ 250 lines, composes sections + summary panel.
2. `apps/web/src/app/checkout/success/[orderId]/page.tsx` — ≤ 200 lines, composes the success view.
3. `apps/web/src/features/checkout/`:
   - `sections/order-type-section.tsx`
   - `sections/contact-section.tsx`
   - `sections/where-when-section.tsx` (handles delivery / pickup / eat-in conditionally)
   - `sections/notes-section.tsx`
   - `sections/payment-section.tsx`
   - `sections/tip-section.tsx`
   - `summary/checkout-summary.tsx` (composes `OrderSummaryPanel` + `PromoCodeInput` + place-order CTA + terms + payment logos)
   - `mobile-summary-bar.tsx` (the sticky bottom bar with expand-to-sheet behavior)
   - `hooks/use-checkout-form.ts` (react-hook-form setup + zod schema covering all sections)
   - `hooks/use-checkout-submit.ts` (mock submit — 1200ms delay, returns order id)
4. `apps/web/src/features/checkout/schema.ts` — the zod schema for the full checkout form. (In production this lives in `@repo/types/checkout.ts`; for the mock, co-locate.)
5. `apps/web/src/lib/mock/checkout.ts` per §9.
6. `apps/web/src/components/`:
   - `payment-logos.tsx` — inline SVG row of Visa/Mastercard/BLIK/Apple Pay/Google Pay at 60% opacity.
   - `success-checkmark-hexagon.tsx` — the copper hexagon SVG with a centered white checkmark, 96×96.
7. `packages/ui/src/` — the **10 new primitives** listed in §2, each with a tiny `README.md` showing import + usage example.

**The Checkout page must:**

- Run at `/checkout` from `pnpm --filter @repo/web dev` after seeding the cart with 2 dishes (Box Kebab Frytki, Box Strips Mega) via the page-2 flow.
- Look indistinguishable in finish from pages 1 and 2 — same palette, type, elevation, motion.
- Switch cleanly between Delivery / Pickup / Eat in — the where-when section morphs without page reload, and the summary updates fees live.
- Validate every required field with zod via react-hook-form. Inline errors, no toast spam.
- Persist all entered fields when the user clicks `Edit cart` (opens CartSheet, returns) — use a form state ref or react-hook-form's `getValues` snapshot.
- Submit successfully with the mock; navigate to `/checkout/success/SD-2026-0042`.
- Render the success page with order summary, delivery/contact details, and progress stepper at step `Confirmed`.
- Mobile (<1024) drops the sticky right rail in favour of the sticky bottom bar that expands to a bottom sheet.
- All 10 new primitives genuinely generic.
- Hit Lighthouse Performance ≥ 95, Accessibility ≥ 95.

---

## 11. Pre-build replies — answer these BEFORE writing code

Reply with three things, then I'll greenlight the build:

1. **One-paragraph interpretation.** Confirm the single-page accordion-section layout (vs a multi-step wizard with separate routes). Specifically address two tensions:
   - **Section status (`pending` / `active` / `complete` / `error`)** — should completed sections collapse to a one-line summary with an `Edit` link (current spec), or stay expanded and just turn olive (less click, more scroll)? I've gone collapse-and-summary because it keeps the page short on tall checkouts and matches modern e-commerce conventions (Stripe Checkout, Apple's own checkout). Push back if you'd rather keep them open.
   - **`OrderSummaryPanel` sticky vs inline** — sticky right rail on desktop, sticky bottom bar on mobile. Confirm the bottom bar's expand-to-sheet UX feels right for one-handed phone use, or propose a different mobile pattern.

2. **Signatures of all 10 new `@repo/ui` primitives**, locked. Especially scrutinize:
   - `FormField` — is `children: ReactNode` the right slot model, or should it own the `<input>` and accept `inputProps` (less flexible but enforces label binding)? I've gone slot-children because react-hook-form's `register` returns a props bag that suits this.
   - `RadioCardGroup` — should `value` allow `null` (no default) or be required to start with a selection? I've allowed `null` so it can render unselected (e.g. payment with no default), but the order-type section starts with `delivery` selected.
   - `TimeSlotValue` discriminated union (`{ kind: 'asap' } | { kind: 'scheduled'; iso }`) — confirm this shape works for downstream order creation, or propose an alternative.
   - `OrderSummaryPanel.delivery: { cents } | { label }` — union covers both "5,00 zł" and "Free" cases. Confirm or propose `{ cents: number | null; freeLabel?: string }` (single shape, less ergonomic).
   - `CheckoutSection.status` — does `'error'` need a separate variant from `'active'` with an error prop, or is conflating them fine? I've made it a separate status because the brick-red circle + border treatment is too distinct to overload `active`.

3. **A 5-line snippet** showing how the where-when section conditionally renders the right body based on `orderType`, AND how the `OrderSummaryPanel.delivery` prop is computed (`{ label: 'Free' }` for pickup vs `{ cents: 500 }` for delivery vs `{ label: 'Free' }` for delivery when subtotal ≥ 80 zł). Proves the conditional flow doesn't leak into the primitive and the union API works in practice.

Then build it.
