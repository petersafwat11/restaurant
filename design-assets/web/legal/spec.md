# Legal pages — design / style spec

**Pages:** Privacy Policy · Terms (Regulamin) · Cookie Policy
**App:** `apps/web` (customer). PL is the default locale; EN is a secondary locale.
**Status:** spec only — pages not built yet. Build after you approve content (see `EU-COMPLIANCE.md`).

> These are long-form legal text pages. They share ONE layout (a centered reading column) and differ only in content. This spec defines that shared layout + the per-page content outline. Treat `exported.tsx` style references as N/A — build with `packages/ui` primitives.

---

## 1. Routes & slugs

Localized, under the marketing group so they get the site header/footer:

| Page | EN slug | PL slug | File |
|---|---|---|---|
| Privacy | `/privacy` | `/polityka-prywatnosci` | `apps/web/src/app/[locale]/(marketing)/privacy/page.tsx` |
| Terms (Regulamin) | `/terms` | `/regulamin` | `…/(marketing)/terms/page.tsx` |
| Cookies | `/cookies` | `/polityka-cookies` | `…/(marketing)/cookies/page.tsx` |

- If localized slugs are too much wiring, ship `/privacy`, `/terms`, `/cookies` for both locales (content still localized). Localized slugs are the nicer SEO option via next-intl `pathnames`.
- Wire the footer + checkout links (currently `#`) to these. See `EU-COMPLIANCE.md` §Footer.

## 2. Layout — the "reading column"

Match the landing's calm, editorial feel but optimized for reading, not marketing.

```
┌───────────────────────────── (marketing) header ─────────────────────────────┐
│  Container (page-max)                                                          │
│   ┌──────────────────────────── max-w-[760px] mx-auto ──────────────────────┐ │
│   │  eyebrow:  "Legal"                                                       │ │
│   │  h1:       Page title (font-display, text-h1 sm:text-hero)               │ │
│   │  <time>:   "Last updated 21 June 2026"  (text-small text-fg-subtle)      │ │
│   │  ── hairline divider ──                                                  │ │
│   │  [desktop ≥lg only] sticky table of contents in a left rail OR inline    │ │
│   │  <Prose> … h2 sections, paragraphs, lists, tables … </Prose>            │ │
│   │  ── divider ──                                                           │ │
│   │  "Questions? Contact us" → /contact   (accent link)                      │ │
│   └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────── footer ──────────────────────────────────┘
```

- **Width:** body column `max-w-[760px]` (≈70–80 chars/line). The page wrapper still uses `Container`.
- **Vertical rhythm:** `py-section-y-mobile sm:py-section-y` on the section; `space-y-*` inside Prose.
- **Background:** `bg-bg`; section cards (e.g. the cookie table) on `bg-surface` / `bg-surface-elevated`.

## 3. New components to build (in `packages/ui`)

There is **no `Prose`/long-text component today** — add one (reused by all 3 pages + future content).

- **`Prose`** — typography wrapper. Styles descendant elements via tokens:
  - `h2`: `font-display text-h2 text-fg mt-12 mb-4 scroll-mt-24`
  - `h3`: `text-h3 font-semibold text-fg mt-8 mb-3`
  - `p`: `text-body text-fg-muted leading-relaxed mb-4`
  - `ul/ol`: `list-disc/decimal pl-6 space-y-2 text-fg-muted`
  - `a`: `text-accent underline-offset-2 hover:underline`
  - `table`: bordered, `text-small`, header `bg-surface-2` (used for the cookie table)
  - `strong`: `text-fg font-semibold`
- **`LegalPageHeader`** (optional) — eyebrow + h1 + `<time dateTime>` last-updated.
- **`TableOfContents`** (optional, desktop ≥lg) — anchors to each `h2`; sticky `top-site-nav`. On mobile, omit or render a `<details>` accordion at top.

Reuse existing: `Container`, `SectionHeader` (not ideal for body — prefer the LegalPageHeader), and the `HoursTable`-style table look for the cookie table.

## 4. Tokens (no hardcoded values)

Colors `bg / surface / surface-2 / surface-elevated / fg / fg-muted / fg-subtle / accent / border`; type `text-hero/h1/h2/h3/body/small/caption/eyebrow`, `font-display`, `font-body`; radius `rounded-card`; spacing the 8pt scale + `py-section-y`. Same set the landing uses — see `tooling/tailwind-config/tailwind.preset.ts`.

## 5. Content source

Legal copy is long and changes rarely. Two viable approaches — **recommend MDX**:
- **MDX per locale** (recommended): `apps/web/src/content/legal/{privacy,terms,cookies}.{pl,en}.mdx`, rendered into `<Prose>`. Keeps long text out of JSON, easy for a lawyer to edit.
- **i18n JSON** (consistent with the rest of the app, but painful for long multi-paragraph text).

Whichever: the **"Last updated" date and version** must be explicit and bump on every change (legally meaningful).

## 6. Business identity block (shared)

All three pages must surface the controller/seller identity. Pull what we can from the DB restaurant settings (name, address, email, phone) and add the company-registration fields that aren't in the DB yet (see `EU-COMPLIANCE.md` — needs a new settings group OR hardcode):

```
Szef Donald sp. z o.o.
[street, ZIP city]            ← from Restaurant.address (DB)
NIP 6572959741 · REGON ____ · KRS ____   ← NIP known; REGON/KRS needed
e-mail: ____  ·  tel: ____    ← from Restaurant.email / .phone (DB)
```

## 7. Responsive & a11y

- Single column; line length capped for readability. TOC hidden < lg.
- Correct heading order (one `h1`, then `h2`/`h3`). Anchored `h2` with `scroll-mt` so in-page links aren't hidden under the sticky nav (same fix as the menu page).
- `<time dateTime="2026-06-21">` for last-updated.
- Links underlined or clearly distinguished (not color-only).
- Contrast ≥ 4.5:1 (the body text uses `fg-muted` on `bg` — verify token contrast for AA).

## 8. Per-page content outline

> The *content* (what each page must legally say) is detailed, with EU/PL citations and the gaps in our current flow, in **`EU-COMPLIANCE.md`**. Below is just the section skeleton each page renders.

### 8a. Privacy Policy / Polityka Prywatności
1. Who we are (controller identity + contact)
2. What data we collect (account, orders, addresses, payments, contact, reviews, reservations, loyalty, referrals, device/push, usage)
3. Why & legal basis (contract / consent / legitimate interest / legal obligation)
4. Who we share it with (processors: Stripe, Resend, Twilio, Expo, hosting, OpenStreetMap) + international transfers
5. How long we keep it (retention, incl. 5-yr tax retention for invoices)
6. Your rights (access, rectification, erasure, restriction, portability, objection, withdraw consent) + how to exercise
7. Cookies → link to Cookie Policy
8. Complaints → UODO (Polish DPA)
9. Changes & version / last-updated

### 8b. Terms / Regulamin
1. Definitions
2. Seller identity (company, NIP, REGON, KRS, address, contact)
3. Services offered & who can use them (account vs guest)
4. Ordering process (cart → checkout → confirmation), order = contract
5. Prices, VAT, delivery fees, minimum order
6. Payment methods (Stripe card, BLIK, cash on delivery, …)
7. Delivery & pickup (zones, times)
8. Cancellations & **withdrawal right** — note the food/perishable + dated-reservation **exemptions**
9. Complaints (reklamacje / rękojmia) — how & where
10. Liability
11. Out-of-court dispute resolution + EU ODR platform link
12. Governing law (Polish) & jurisdiction
13. Changes & effective date

### 8c. Cookie Policy / Polityka Cookies
1. What cookies are
2. Cookies we use — **table**:

   | Cookie | Purpose | Type | Duration |
   |---|---|---|---|
   | `web_at` | Keeps you signed in (access token) | Strictly necessary | Session/short |
   | `web_rt` | Refresh sign-in (refresh token) | Strictly necessary | ~30 days |
   | `cart_session` | Remembers a guest cart | Strictly necessary | 30 days |
   | `NEXT_LOCALE` | Remembers language choice | Functional | ~1 year |

3. We currently use **no analytics or marketing cookies** (our analytics is server-side & cookieless; the location map uses OpenStreetMap, which sets none).
4. Managing cookies (browser settings) — blocking strictly-necessary cookies breaks sign-in/cart.
5. If this changes (we add analytics/marketing) we'll ask for consent first (see `EU-COMPLIANCE.md`).
6. Changes & last-updated.

---

**Caveat:** this spec covers *design + required structure*. Final legal wording must be reviewed by a Polish lawyer — see the disclaimer in `EU-COMPLIANCE.md`.
