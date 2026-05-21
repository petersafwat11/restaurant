# Web · Page 1 — Landing (Home)

This is the **first** page of the customer-facing website for **Szef Donald**, a kebab + falafel restaurant. It's the brand's biggest single impression — everything else on the site composes against the language we lock here.

You'll build two more design-heavy pages after this one (page 2: Menu browse + item detail + cart, page 3: Checkout). Page 1's job is to **lock the visual language and extract the chrome + section primitives** so pages 2 and 3 just compose. Every remaining page (About, Locations, Account, Order history, Auth, Order tracking) is downstream composition work on what we settle here.

The customer site has a **completely different palette and tone from the admin dashboard** — warm cream, copper signature, serif display, food-magazine feel. Both apps share `@repo/ui` primitives, but the primitives reference *semantic* tokens (`bg-surface`, `text-primary`, `accent`) — never literal hex. The palette below is the web app's `:root` block; admin has its own.

---

## 0. Brand context

- **Name:** Szef Donald. "Szef" = "Chef" in Polish.
- **Cuisine:** Middle-Eastern street food (kebab, falafel, shawarma, tacos, kapsalon) with a Polish customer base.
- **Location:** Poland. Primary locale Polish (PL), secondary English (EN). Use English for all mock copy in this build — translations land in `@repo/i18n` during port.
- **Existing brand asset:** a hexagonal copper logo with white "Szef Donald" lockup. Treat copper as the brand's signature color — it should appear on every page as the only loud accent.
- **Voice:** confident, warm, slightly editorial. Not "fun fast-food" (no exclamation marks, no neon). Not "luxury fine-dining" either (no overwrought serif). Think *Tartine Bakery* or *Roberta's Pizza* on the web — generous photography, big confident type, prices visible, easy to order.
- **What customers want:** see what's on the menu, see prices, know it's good (reviews), know if you're open, order. In that order.

---

## 1. Design system (lock this — pages 2 and 3 reuse without redesign)

### 1.1 Color tokens (CSS variables on `:root`)

Write to a global stylesheet. RGB triples so `<alpha-value>` modifiers work in Tailwind.

```css
:root {
  /* Backgrounds */
  --bg:                 242 234 217;   /* #F2EAD9 — warm cream, slightly golden */
  --surface:            251 247 238;   /* #FBF7EE — lighter cream for cards */
  --surface-elevated:   255 255 255;   /* #FFFFFF — drawers, modals, image bg */
  --surface-warm:       229 212 184;   /* #E5D4B8 — darker warm band (newsletter, etc.) */

  /* Borders (espresso at alpha) */
  --border:             42 31 24;      /* used as rgb(var(--border) / 0.08) */
  --border-strong:      42 31 24;      /* used as rgb(var(--border-strong) / 0.16) */

  /* Text */
  --text-primary:       42 31 24;      /* #2A1F18 — espresso */
  --text-secondary:     107 93 82;     /* #6B5D52 — warm taupe */
  --text-tertiary:      154 142 131;   /* #9A8E83 */
  --text-disabled:      199 189 179;   /* #C7BDB3 */
  --text-on-accent:     255 255 255;   /* white on copper */

  /* Accent — copper, the ONLY loud color */
  --accent:             194 65 12;     /* #C2410C — matches the hexagon logo */
  --accent-hover:       154 51 10;     /* #9A330A */
  --accent-muted:       194 65 12;     /* use rgb(var(--accent-muted) / 0.10) for soft chips */

  /* Status (food-world cues, not tech-world) */
  --positive:           79 123 60;     /* #4F7B3C — olive (herbs / falafel) */
  --negative:           185 28 28;     /* #B91C1C — brick red */
  --warning:            217 119 6;     /* #D97706 — amber */
  --info:               30 64 175;     /* #1E40AF — deep navy */
}
```

### 1.2 Typography

- **Display (H1 / Hero / large section headers):** **Fraunces** variable.
  - Optical size 96 (slight softness).
  - Weight 500–600.
  - Tracking `-0.02em` on hero, default elsewhere.
  - This gives the "food-craft / editorial magazine" feel — critical to the brand voice.
- **Body / UI / buttons / small headings:** **Inter** variable.
  - Weight 400 body, 500 UI, 600 emphasis.
  - `font-feature-settings: "tnum", "ss01"` on `body`.
- Load via Google Fonts CDN in the mock.

**Scale (web is content-first; bigger and airier than the admin dashboard):**

| Token   | Size (desktop) | Size (mobile) | Weight | Family   | Use                                          |
| ------- | -------------- | ------------- | ------ | -------- | -------------------------------------------- |
| Hero    | 88 / 1.05      | 48 / 1.1      | 500    | Fraunces | The single hero headline                     |
| H1      | 56 / 1.1       | 36 / 1.15     | 500    | Fraunces | Section openers                              |
| H2      | 40 / 1.15      | 28 / 1.2      | 500    | Fraunces | Sub-section headers                          |
| H3      | 22 / 1.3       | 20 / 1.3      | 600    | Inter    | Card titles, list group headers              |
| Eyebrow | 13 / 1.0       | 12 / 1.0      | 500    | Inter    | UPPERCASE, tracking 0.12em, accent color     |
| Body L  | 19 / 1.55      | 17 / 1.55     | 400    | Inter    | Long-form, item descriptions, About section  |
| Body    | 16 / 1.55      | 16 / 1.55     | 400    | Inter    | Default                                      |
| Small   | 14 / 1.5       | 14 / 1.5      | 400    | Inter    | Meta, captions, helper text                  |
| Caption | 12 / 1.4       | 12 / 1.4      | 500    | Inter    | UPPERCASE, tracking 0.08em                   |

### 1.3 Layout, spacing, motion

- **Container max-width 1280px**, horizontal padding `clamp(20px, 4vw, 48px)`.
- **8pt spacing grid:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- **Vertical rhythm between sections:** 96px desktop / 64px mobile, unless a section explicitly breaks rhythm (the hero, the cream-band newsletter).
- **Card radius:** 16px (larger than admin's 12px — customer surfaces feel softer).
- **Image radius:** 20px on hero/feature images, 16px on cards, 12px on inline thumbs.
- **Border:** hairline `1px solid rgb(var(--border) / 0.08)`. No drop shadow on default cards.
- **Elevation (allowed in light theme, unlike admin):**
  - `shadow-sm` — `0 1px 2px rgb(42 31 24 / 0.06)` — sticky nav once scrolled
  - `shadow-md` — `0 4px 12px rgb(42 31 24 / 0.08)` — card hover, sticky cart button
  - `shadow-lg` — `0 12px 32px rgb(42 31 24 / 0.12)` — open dropdowns, drawers (page 2+)
- **Motion:** 200ms ease-out for color/opacity, 300ms ease-out for transform. Reveal-on-scroll on hero text and first row of dish cards only — 20px translate + opacity, staggered 60ms. No parallax. No hover-scale on dish cards (just shadow + thumbnail zoom inside its rounded mask).
- **Density target:** 1440×900 desktop, works to 1280, full responsive reflow below 1024 (tablet single-column) and 640 (mobile single-column with horizontal scroll-snap on category strip + dish cards).

### 1.4 Photography treatment

This is critical — the design only sings with good food photography. For the mock, use Unsplash food URLs (e.g. `https://images.unsplash.com/photo-...?auto=format&fit=crop&w=1200&q=80`). Specifically pick:

- **Hero:** overhead kebab or shawarma wrap, dramatic lighting, warm tones.
- **Categories:** one image per category (kebab close-up, falafel plate, tacos, big food box, drinks lineup).
- **Dish cards:** clean centered top-down or 3/4 angle on a neutral plate, consistent tone.
- **About section:** restaurant interior or grill in action, warm and human (no stock-looking chef portraits).
- **Footer / band backgrounds:** can be subtle close-ups (herbs, sesame, pita bread texture) at 20% opacity behind cream.

Apply a subtle warm tone-map (don't actually filter — just pick images that already lean warm). Avoid stark white plates.

---

## 2. Extraction directive — new primitives from this page

Build the landing page and **extract these 10 primitives into `@repo/ui`**. Each one is generic, typed, and used by 2–6 future pages. Build them as if you were publishing the package.

| Primitive          | Path                                       | Used by Landing + …                                                                                |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `SiteNav`          | `packages/ui/src/site-nav/`                | Every customer page. Slot-based: logo, links, right cluster.                                       |
| `SiteFooter`       | `packages/ui/src/site-footer/`             | Every customer page.                                                                               |
| `Container`        | `packages/ui/src/container/`               | Every page. `max-w-[1280px]` + responsive horizontal padding. Optional `size: 'narrow' \| 'wide'`. |
| `Hero`             | `packages/ui/src/hero/`                    | Landing, About, Locations, Loyalty.                                                                |
| `SectionHeader`    | `packages/ui/src/section-header/`          | Every section across every customer page.                                                          |
| `CategoryCard`     | `packages/ui/src/category-card/`           | Landing, Menu page.                                                                                |
| `DishCard`         | `packages/ui/src/dish-card/`               | Landing (featured), Menu (grid), Order history (re-order), Account favorites.                      |
| `TestimonialCard`  | `packages/ui/src/testimonial-card/`        | Landing, About, Reviews aggregate page.                                                            |
| `HoursTable`       | `packages/ui/src/hours-table/`             | Landing, Locations, Footer, About, Order confirmation page.                                        |
| `NewsletterForm`   | `packages/ui/src/newsletter-form/`         | Landing, Footer, Loyalty landing.                                                                  |

**API hints (you'll commit to final signatures in the pre-build reply):**

```ts
type SiteNavProps = {
  logo: ReactNode
  links: { href: string; label: string; active?: boolean }[]
  rightSlot?: ReactNode               // cart, language switcher, CTA
  variant?: 'transparent' | 'solid'   // transparent over hero, solid once scrolled
  sticky?: boolean                    // default true
}

type HeroProps = {
  eyebrow?: string
  title: ReactNode                    // can include <em> for accent word
  description?: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  media: ReactNode                    // image, video, or composition
  layout?: 'split' | 'stacked'        // split = 55/45 desktop, stacked = full-width image below
  decoration?: ReactNode              // small floating rating chip, etc.
}

type SectionHeaderProps = {
  eyebrow?: string
  title: ReactNode
  description?: string
  align?: 'left' | 'center'
  action?: { label: string; href: string }  // right-aligned link, e.g. "View full menu →"
}

type CategoryCardProps = {
  href: string
  image: { src: string; alt: string }
  label: string
  itemCount?: number                  // "12 items"
  size?: 'sm' | 'md' | 'lg'
}

type DishCardProps = {
  href: string                        // links to /menu/items/<slug> for full detail
  image: { src: string; alt: string }
  name: string
  description?: string
  price: { amount: number; currency: string }   // formats via formatMoney — same helper as admin
  flags?: ('vegetarian' | 'vegan' | 'gluten-free' | 'spicy' | 'featured')[]
  onAdd?: () => void                  // quick-add. If absent, hide the + button.
  unavailable?: boolean
}

type TestimonialCardProps = {
  quote: string
  author: { name: string; meta?: string; avatar?: string }
  rating: number                      // 1–5, supports 0.5 increments
  source?: 'google' | 'tripadvisor' | 'facebook' | 'internal'
}

type HoursTableProps = {
  hours: { day: 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN'; open: string; close: string; closed?: boolean }[]
  highlightToday?: boolean            // default true — bolds the current day row
  layout?: 'list' | 'compact'         // list = 7 rows, compact = grouped ranges ("Mon–Fri 11–22")
}

type NewsletterFormProps = {
  title?: string                      // optional, omit if parent provides
  description?: string
  placeholder?: string                // default "Your email"
  ctaLabel?: string                   // default "Subscribe"
  onSubmit: (email: string) => Promise<void>
  successMessage?: string             // default "Thanks — check your inbox"
}
```

For the mock, `NewsletterForm.onSubmit` should resolve after a 600ms fake delay and show the success state inline.

**The landing page (`apps/web/src/app/page.tsx`) should be thin** — each section composes the primitives. If `page.tsx` is more than ~250 lines, something is leaking. Sections live in `apps/web/src/features/landing/sections/<section>.tsx`, one file per section.

---

## 3. What customers actually do on this page

In order of frequency:

1. **Look at the menu** — click into `/menu`. Multiple entry points needed: nav link, hero CTA, category cards, "View full menu" link below featured dishes.
2. **Add a featured dish to cart from the landing page** — the quick-add `+` button on featured `DishCard`s adds to cart without leaving the page (cart drawer opens on the right — drawer ships in page 2; on landing, the button just triggers a toast for now).
3. **Find hours / location** — scroll to the Hours + Location section, or read it in the footer.
4. **Read reviews** — testimonial section gives social proof; "View all reviews on Google" link to external.
5. **Switch language** — PL/EN toggle in nav (right cluster) and footer.

No auth on this page. Cart icon shows count if a cart cookie exists, otherwise just the icon. The nav's "Order now" CTA scrolls to featured dishes if cart is empty, otherwise links to `/checkout`.

---

## 4. Page layout

Route: `/`. File: `apps/web/src/app/page.tsx`. Sections in this order:

1. **Sticky nav** (rendered by root layout, not the page — but build it here)
2. **Hero**
3. **Categories strip**
4. **Featured dishes**
5. **Our story** (about teaser)
6. **Hours + Location**
7. **Testimonials**
8. **Newsletter band**
9. **Footer** (rendered by root layout — but build it here)

### 4.1 Sticky nav (`SiteNav`)

Height **72px**. Two states:

- **Transparent** when scroll position is over the hero (Y < hero height). Background `transparent`, text `--text-primary`. Logo full-color. CTA solid copper.
- **Solid** once scrolled past hero. Background `rgb(var(--surface) / 0.92)` with `backdrop-filter: blur(12px)`, `shadow-sm`, hairline bottom border.

**Composition:**

- **Left:** hexagonal copper logo (40px) + wordmark "Szef Donald" (Fraunces 600 20px). Clicking returns to `/`.
- **Center (desktop only, ≥1024):** nav links — `Menu` · `About` · `Locations` · `Contact`. Inter 500 15px, hover = `--accent`. Active link gets a 2px copper underline 4px below the text.
- **Right cluster:** language switcher pill (`PL | EN` — flat text, active side darker), cart icon button (24px Lucide `ShoppingBag` with a copper count-bubble top-right when items > 0), then a primary CTA pill — `Order now` — solid copper, white text, 40px tall, 20px horizontal padding, 12px radius.

**Mobile (<1024):** center links collapse into a hamburger menu (Lucide `Menu` icon) that opens a full-screen overlay with the links stacked + language switcher + CTA at the bottom. Cart icon stays visible in the top bar.

### 4.2 Hero

Full viewport minus nav height (so `min-height: calc(100vh - 72px)`, capped at 800px desktop).

**Layout: `split` (55% left / 45% right) on desktop, stacked on mobile.**

**Left column (text):**

- 80px top padding from nav.
- Eyebrow: `KEBAB · FALAFEL · TACOS · SINCE 2014` in copper, uppercase, tracking 0.12em.
- Hero headline (Fraunces 88px/500): the headline uses a serif italic accent word in copper — for instance:
  > Real kebab. *Made daily*<br>from scratch.
  >
  > (The italic phrase "Made daily" is `<em>` rendered in Fraunces italic + `text-accent`.)
- Sub-paragraph (Body L, `text-secondary`, max-width 480px): "Hand-rolled falafel, marinated overnight. Bread baked through the day. Take-away or eat in — every order is built to order."
- Two CTAs in a row, 16px gap:
  - **Primary** copper pill — `View the menu →` — links to `/menu`.
  - **Secondary** ghost — `Order now` — opens the cart-first checkout flow. (For landing, link to `/menu` too; the real distinction lands in page 2.)
- Below the CTAs, a small inline rating row: `★★★★★ 4.8` (copper stars, espresso text) + `Based on 1,247 Google reviews` (small, tertiary) — separated by a 4px dot.

**Right column (media):**

- A large rounded (20px radius) food photo — overhead shawarma wrap on cream paper or a kebab platter — fills the column, height matches text column.
- **Decoration overlay** (small floating chip, top-left corner of the image, translated -16px / -16px so it overlaps the image edge): a white card with `shadow-md`, 12px padding, containing:
  - A green dot + `Open now` in Inter 600 14px
  - `Closes at 22:00` in Body small, tertiary
- A second small chip overlay (bottom-right of image, translated +16px / +16px): a white card containing the brand hexagon (32px) + `Szef Donald` (Fraunces 14px 500) + `Warszawa Centrum` (small tertiary).
- Background of the whole hero section: `--bg` cream. A very subtle decorative copper hexagon (the brand mark) as an SVG, 600px tall, at 6% opacity, anchored top-right of the section, half-off the right edge.

### 4.3 Categories strip

Below hero. Section padding 96px top / 64px bottom (intentional asymmetry — pulls the eye up out of the hero).

- **SectionHeader** (`align: 'left'`): eyebrow `EXPLORE`, title (H1 size) `What we serve`, action right-aligned `View full menu →` linking to `/menu`.
- Below the header, a **5-up grid of CategoryCards** (desktop). Each card is portrait 4:5 aspect ratio.
- Categories: `Kebab` · `Falafel` · `Tacos` · `Box & Plates` · `Drinks`.
- Each `CategoryCard`:
  - Full-bleed image filling the card with a subtle dark-bottom gradient overlay for legibility.
  - Bottom-left of the card: label in Fraunces 28px white + item count in small white/80%.
  - Hover: image zooms 1.04 inside the card mask, gradient deepens slightly.
  - Card radius 16px.
- **Tablet (768–1023):** 3 columns wrapping (Kebab/Falafel/Tacos top row, Box/Drinks below sized to fill).
- **Mobile (<768):** horizontal scroll-snap row, each card 70vw wide.

### 4.4 Featured dishes

Section padding 96px / 96px. Background `--surface` (slightly lighter than `--bg` — gives the section a visual lift without a border).

- **SectionHeader** (`align: 'left'`): eyebrow `MOST LOVED`, title `Our customers' favourites`, description "The ten things people order over and over." Action right `See all 47 dishes →`.
- Below the header, a **3-column grid of `DishCard`s, 6 cards** (2 rows). Gap 32px.
- Each card:
  - Image at top, 4:3 aspect ratio, 16px top-radius, 0 bottom radius (so it sits flush against the card body).
  - Body padding 20px:
    - Flags row (if any): small inline chips, e.g. `V` (vegetarian) in `--positive`, `🌶 ×2` in `--warning`, `Featured` in `--accent`. 18px tall, surface-warm bg, 8px radius.
    - Dish name in H3 (Inter 600 22px) on first line.
    - Description in Body small `--text-secondary` on two lines, ellipsis after.
    - Bottom row: price on the left (Fraunces 24px 500, espresso, `tnum`) — render with `formatMoney(value, "PLN")`. A `+` quick-add button on the right (40px square, copper fill, white plus icon, 12px radius). Clicking shows a toast `Added to cart`.
  - Hover: card gains `shadow-md`, image zooms 1.03 inside its rounded mask.
- **Tablet:** 2-column grid.
- **Mobile:** horizontal scroll-snap row, each card 80vw wide.
- Below the grid (centered): a single ghost CTA `View the full menu →` linking to `/menu` (redundant with the section header action, but anchors the section's bottom).

### 4.5 Our story (About teaser)

Section padding 96px / 96px. Background `--bg`.

- Two-column layout, **60% text left / 40% image right** on desktop. Stacked on mobile (image first).
- **Left (text column):**
  - Eyebrow `OUR STORY` in copper.
  - H1 headline (Fraunces 56px): `Kebab the way it should be.`
  - Two paragraphs of Body L, `--text-primary`. Sample copy:
    > "We opened Szef Donald in 2014 with one rule: nothing comes out of a freezer. Bread is baked through the day. Falafel is rolled by hand every morning. Meat is marinated for eighteen hours before it touches the grill."
    >
    > "We're a small team — three cooks and a counter — and we keep it that way on purpose. Every wrap is made by someone who's been here long enough to care."
  - Below: an inline `Read our full story →` ghost link to `/about`.
- **Right (image column):**
  - A single 4:5 portrait image, 20px radius — interior of the restaurant or a cook at the grill.
  - Overlapping the bottom-right corner of the image, offset +24px / +24px: a small white card (`shadow-md`, 16px padding, 12px radius) with two stacked stats:
    - `11 years` in Fraunces 32px, then `Open since 2014` in small tertiary.
    - Below it, separated by a hairline: `~1,200 wraps a week` in Fraunces 32px, then small tertiary `In high season`.

### 4.6 Hours + Location

Section padding 96px / 96px. Background `--surface`.

- Two-column layout, **40% left / 60% right** on desktop. Stacked on mobile.
- **Left column (info):**
  - SectionHeader (`align: 'left'`): eyebrow `FIND US`, title (H1) `Open seven days.`, no description.
  - Below: address block:
    - `Marszałkowska 102` (Body L 600).
    - `00-026 Warszawa, Poland` (Body, `--text-secondary`).
    - `+48 22 555 01 23` as a `tel:` link (Body, copper underline on hover).
  - Below address, an inline row of action links (ghost pills): `Get directions →` (opens maps), `Call us →`, `Share location →`.
  - Below action links, the **`HoursTable`** (`layout: 'list'`, `highlightToday: true`) — 7 rows, day on the left (caption uppercase tracking 0.08em), hours on the right (tabular). Closed days render `Closed` in `--text-tertiary`. The current day row is `--surface-warm` background with espresso text and bolder weight.
- **Right column (map):**
  - A 4:3 map image / embed placeholder — 20px radius. For the mock, use a static styled-map image from Mapbox or just a beige-toned rectangle with a copper pin in the center.
  - Below the map, a small caption: `View larger map →` ghost link.

### 4.7 Testimonials

Section padding 96px / 96px. Background `--bg`.

- SectionHeader (`align: 'center'`): eyebrow `REVIEWS`, title (H1) `Trusted by thousands.`, description `4.8 average rating across 1,247 reviews on Google.`
- Below the header, a row of **3 visible `TestimonialCard`s** (desktop, 3-column grid, 24px gap). On smaller screens (<1024), horizontal scroll-snap row.
- Each `TestimonialCard`:
  - Top: 5 copper stars (or partial for half-ratings).
  - Body: the quote in Body L, `--text-primary`, max 3 lines + ellipsis on overflow.
  - Footer: 32px avatar (initial-letter fallback in `--accent-muted` bg + accent text) + author name (Inter 600 14px) + author meta (small tertiary) on a second line. To the right, a small source pill (e.g. `Google` with the G icon at small size).
  - Card has hairline border, no shadow, 16px radius, 24px padding.
- Below the row, centered: `Read all 1,247 reviews on Google →` ghost link (external).

### 4.8 Newsletter band

This section breaks vertical rhythm intentionally — it's a full-width band, not a contained section.

- Background `--surface-warm` (the darker warm beige `#E5D4B8`). Padding 80px top/bottom, full bleed.
- Inside, centered in the container:
  - SectionHeader (`align: 'center'`): eyebrow `STAY IN TOUCH`, title (H1) `Get a free baklava on your first order.`, description `Join the list — occasional emails, never spam. Unsubscribe whenever.`
  - Below the header, the `NewsletterForm` centered, max-width 480px:
    - A single input + button on one row (input takes flex, button pill on the right). 56px tall.
    - On submit, the form replaces itself with a centered success state: a copper checkmark icon + `Welcome! Check your inbox for the code.`

### 4.9 Footer (`SiteFooter`)

Background `--text-primary` (espresso). Text `--surface` (cream) — flips the palette for high contrast. Padding 80px top, 48px bottom.

- Inside container, a **4-column grid** on desktop, stacking to 2x2 on tablet, 1-column on mobile.
- **Column 1 — Brand:**
  - Hexagonal copper logo (40px) + wordmark `Szef Donald` (Fraunces 24px, cream).
  - Tagline below: `Kebab the way it should be.` (Body, cream/80%).
  - Social icons row: Instagram, Facebook, TikTok (24px Lucide icons, cream/60%, hover copper).
- **Column 2 — Menu:**
  - Caption header `MENU` (cream/60%, uppercase, tracking 0.08em).
  - Links: `Kebab` · `Falafel` · `Tacos` · `Box & Plates` · `Drinks` · `View full menu →` (each Body 15px, cream/80%, hover copper).
- **Column 3 — Info:**
  - Caption header `VISIT`.
  - Address block (3 lines, cream/80%).
  - Phone link.
  - A compact `HoursTable` with `layout: 'compact'` — groups consecutive matching ranges into 2–3 lines (e.g. `Mon–Fri 11:00–22:00`, `Sat 12:00–23:00`, `Sun 12:00–21:00`).
- **Column 4 — Company:**
  - Caption header `COMPANY`.
  - Links: `About` · `Careers` · `Press` · `Contact` · `Loyalty` · `Gift cards`.
- **Bottom bar** (above the bottom of the footer, separated by a hairline at cream/10%):
  - Left: `© 2026 Szef Donald sp. z o.o. · NIP 1234567890`.
  - Center: legal links `Privacy` · `Terms` · `Cookies` (small, cream/60%).
  - Right: language switcher `PL | EN`.

---

## 5. Responsive behavior

| Breakpoint   | Behavior                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| ≥1280px      | Full design as specified. Container hits its 1280px cap.                                                              |
| 1024–1279    | Container fluid with side padding. Hero stays split. Categories stay 5-up.                                            |
| 768–1023     | Nav center links collapse to hamburger. Categories → 3-up wrap. Featured dishes → 2-up. Hero remains split but tighter. |
| 640–767      | Hero stacks (text first, image below). Categories → horizontal scroll-snap. Featured → horizontal scroll-snap. About stacks (image first). Hours+Location stacks. |
| <640         | All single-column. Type scale mobile column from §1.2. Container side padding 20px.                                   |

Mobile sticky nav becomes 60px tall (vs 72px desktop). Hamburger menu opens a full-screen `--bg` overlay with the nav links stacked 24px gap, language switcher row at the bottom, and a copper-fill `Order now` CTA spanning the full width.

---

## 6. States

This is a marketing landing page — fewer states than data pages, but still:

- **Initial load:** content is server-rendered. No skeleton needed.
- **Hero image loading:** show a `--surface-warm` placeholder at the correct aspect ratio; fade the image in (200ms opacity) when loaded.
- **Cart count loading:** the cart icon shows without a count bubble until the cart state hydrates client-side; bubble fades in when count > 0. No flicker.
- **Featured dish "Add" interaction:** button shows a 200ms loading spinner (white spinner inside the copper square) → toast appears in the top-right `Added to cart · 1 × Margherita`. The toast is dismissible and has an `Undo` ghost link.
- **Newsletter submission:** input + button morph into the success state in-place (no layout shift). Error state (network failure): inline red text below the input `Couldn't subscribe — try again.`
- **No JS:** the page renders fully (server components everywhere except the cart count, the nav scroll-state, and the newsletter form). The featured dishes' `+` button is hidden when JS is disabled, links to `/menu` instead.

---

## 7. Accessibility & keyboard

- **Landmarks:** `<header>` for nav, `<main>` for sections, `<footer>` for footer. Each section has an `aria-labelledby` pointing to its `SectionHeader` heading.
- **Skip link:** "Skip to content" link visually hidden, focusable, jumps to `<main>`.
- **Tab order:** nav links → hero CTAs → category cards (in DOM order) → featured dish links → quick-add buttons → about read more → hours action links → testimonial source links → newsletter → footer.
- **Focus rings:** copper 2px outline with 2px offset on all focusable elements. Never remove focus.
- **Cart icon:** has `aria-label="Cart, 0 items"` (count updates).
- **Language switcher:** `aria-pressed` on the active language.
- **Hours table:** real `<table>` with proper `<th>` for day names. The "today" highlight is also conveyed via `aria-current="date"`.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables the scroll-reveal animations and the hover zoom on cards/images.
- **Colour contrast:** all text on `--bg` cream and `--surface` cream meets AA. Copper text on cream meets AA at ≥18px or bold — never use copper for body-size text on cream.

---

## 8. Mock data

Create `apps/web/src/lib/mock/landing.ts`:

```ts
export const mockCategories: { slug: string; label: string; image: string; itemCount: number }[]
export const mockFeaturedDishes: DishCardProps[]   // 6 dishes
export const mockTestimonials: TestimonialCardProps[]   // 6 (3 visible + 3 for scroll)
export const mockHours: HoursTableProps['hours']
export const mockLocation: { address1: string; address2: string; phone: string; mapImage: string; coords: { lat: number; lng: number } }
```

**Seed shape:**

- **Categories** (5): Kebab (18 items), Falafel (9), Tacos (4), Box & Plates (8), Drinks (7).
- **Featured dishes** (6): mix of bestsellers — e.g.:
  - `Kebab Tortilla Średni` — `Beef + lamb mix, fresh salad, tahini sauce in a warm tortilla. Our most-ordered.` — `24 zł` — flags `[]`
  - `Falafel Pita Duży` — `Eight hand-rolled falafel, hummus, pickled turnips, parsley.` — `23 zł` — flags `['vegetarian','vegan']`
  - `Kapsalon Duży` — `The Rotterdam classic. Fries, kebab, melted cheese, salad, sauce. Built for two.` — `43 zł` — flags `['featured']`
  - `Tacos x3` — `Three soft tacos, your choice of kebab or falafel, salsa.` — `29 zł` — flags `['spicy']`
  - `Box Strips Mega` — `Crispy chicken strips, fries, slaw, two sauces.` — `39 zł` — flags `[]`
  - `Sałatka Kebab Duży` — `No bread — just greens, kebab meat, tahini, pomegranate.` — `32 zł` — flags `['gluten-free']`
  - All prices in PLN (`currency: "PLN"`, formats as `24,00 zł` with comma decimal — confirm `formatMoney` handles PLN).
- **Testimonials** (6): mix of Google reviews — 5★ except one 4★. Vary length (one short, one long). Polish names (Kasia, Tomasz, Anna, Michał, Ola, Piotr).
- **Hours:**
  ```
  Mon–Thu 11:00–22:00
  Fri      11:00–23:00
  Sat      12:00–23:00
  Sun      12:00–21:00
  ```
  Emit as 7 rows for the list layout; the compact layout in the footer groups consecutive matching ranges.
- **Location:** Marszałkowska 102, Warszawa. Coords `52.2297, 21.0122`. Map image: static styled Mapbox URL or just a placeholder.

Don't worry about correctness of any number — make it look real. Numbers reconcile to themselves only (the rating in the hero matches the rating in the testimonials section).

---

## 9. Deliverable

1. `apps/web/src/app/page.tsx` — ≤250 lines, just composes the sections.
2. `apps/web/src/app/layout.tsx` — root layout with `<SiteNav>`, `<main>`, `<SiteFooter>`. Loads Fraunces + Inter via Google Fonts. Sets the `:root` CSS variables.
3. `apps/web/src/app/globals.css` — Tailwind base + `:root` block from §1.1 + font setup.
4. `apps/web/src/features/landing/sections/`:
   - `hero.tsx`
   - `categories.tsx`
   - `featured-dishes.tsx`
   - `story.tsx`
   - `hours-location.tsx`
   - `testimonials.tsx`
   - `newsletter.tsx`
5. `apps/web/src/lib/mock/landing.ts` — mock data per §8.
6. `apps/web/src/components/`:
   - `logo.tsx` — the hexagonal copper SVG mark + wordmark, with `variant: 'full' | 'mark' | 'inverse'` props.
   - `cart-button.tsx` — the nav cart icon with bubble (mock count = 0 on load).
   - `language-switcher.tsx` — PL/EN pill (mock state).
7. `packages/ui/src/` — the **10 new primitives** listed in §2, each with a tiny `README.md` showing import + usage example.

**The landing page must:**

- Run at `/` from `pnpm --filter @repo/web dev`.
- Match the design system in §1 exactly — no off-token colors or type sizes.
- Be fully responsive per §5; pages work top to bottom at 1440, 1280, 1024, 768, and 375px wide.
- Render with no JS for everything except the cart count, nav scroll state, and newsletter form (use server components).
- Have all 10 new primitives genuinely generic (no Szef-Donald-specific copy or layout baked into them).
- Hit Lighthouse Performance ≥95, Accessibility ≥95 on the mock.

---

## 10. Pre-build replies — answer these BEFORE writing code

Reply with three things, then I'll greenlight the build:

1. **One-paragraph interpretation.** Confirm or push back on the brand voice (warm editorial, copper signature, food-magazine — not fun-fast-food, not luxury). Specifically address the hero's italic-accent-word treatment ("Real kebab. *Made daily* from scratch.") — say whether it lands or whether you'd propose a different way to give the headline its hook.

2. **Signatures of all 10 new `@repo/ui` primitives** in TypeScript, locked. These are the contracts that pages 2 and 3 will compose against — any change here ripples through everything. Especially scrutinize:
   - `SiteNav`'s slot model — is `rightSlot: ReactNode` flexible enough, or do we need named slots (`cart`, `langSwitcher`, `cta`) for the layout to stay consistent across pages?
   - `Hero`'s `media` prop — `ReactNode` lets us pass a video or composition, but should the floating decoration chips be a separate `decoration` slot vs baked into `media`?
   - `DishCard`'s `flags` — is `('vegetarian' | 'vegan' | ...)[]` the right shape, or should it be `{ kind: ...; label?: string }[]` for future localization?
   - `HoursTable`'s `hours` array — is day-of-week as a string enum the right key, or should we accept ISO day numbers (`0=Sun…6=Sat`)?

3. **A 5-line snippet** showing how `DishCard` is composed inside the Featured dishes section grid, with the `formatMoney` call, the quick-add handler, and the flags array — proves the primitive is truly generic and that `formatMoney` is shared with the admin (same helper, `minimumFractionDigits: 2`).

Then build it.
