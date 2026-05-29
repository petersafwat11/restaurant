# SEO + GEO Implementation Backlog

> Companion to `docs/seo/seo-geo-strategy.md`. Reflects the **actually-shipped** state of `apps/web` (all 12 sprints complete) — most line-level "bake into UI" items are already done; the remaining work is JSON-LD wiring, OG images, and a deliberate architectural call on item URLs.
> Last revised 2026-05-26.

Notation: **Type** ∈ {infra, component, content, off-site, measurement}. **Effort** ∈ {S ≤ 2h, M ≤ 1d, L > 1d}. **Impact** ∈ {high, med, low}.

---

## What's already shipped in `apps/web` (audit, 2026-05-26)

All 12 master-plan sprints are complete. SEO-relevant pieces already in place:

| Area | State |
|---|---|
| Marketing pages (`/`, `/about`, `/contact`, `/locations`, `/reservations`) | ✅ built; all RSC-shaped; landing composes 7 typed sections |
| Menu page `/menu` | ✅ built as single-page SPA (`<MenuApp />`): search, dietary filters, sticky category nav, **item-detail in a sheet/modal** — there are **no `/menu/[cat]/[slug]` routes** |
| Per-page `generateMetadata` w/ `alternates.languages` | ✅ on `/`, `/about`, `/menu`, `/reservations` via `getAlternates(href)` helper |
| `metadataBase`, title template, default OG, robots defaults | ✅ root locale layout (added in this run) |
| Sitemap with hreflang | ✅ `apps/web/src/app/sitemap.ts` — six static routes × two locales w/ `alternates.languages` |
| Robots (native MetadataRoute) | ✅ `apps/web/src/app/robots.ts` (added in this run; disallows `/cart`, `/checkout`, `/account`, `/track/`, `/staff`, auth routes; AI crawlers intentionally allowed) |
| Site-wide `Restaurant` JSON-LD | ✅ injected at the locale root layout (added in this run) — covers `(marketing)/*` AND `(shop)/menu` |
| `noindex` on private surfaces | ✅ layout `metadata.robots` on `(account)`, `(auth)`, `(public)`, and `(shop)/checkout` subtree (added in this run) |
| API SEO endpoints | ✅ `/seo/structured-data/:slug`, `/seo/sitemap.xml`, `/seo/robots.txt`, `/seo/meta` from sprint 10 |
| Pure JSON-LD builder (`@repo/utils/structured-data`) | ✅ + 3 unit tests |
| `<JsonLd>` Server Component + `buildRestaurantSchema()` + `buildBreadcrumbSchema()` helpers | ✅ `apps/web/src/lib/seo/json-ld.tsx` (added in this run) |
| JSON-LD reference examples | ✅ `docs/seo/json-ld-examples/` 8 validated files |
| i18n PL/EN with `localePrefix: 'as-needed'` | ✅ Polish unprefixed default, English under `/en/` |
| Reviews module (post-order + owner reply + public aggregate) | ✅ data layer ready (Sprint 7 + 11) — rendering surface lives inside the existing UI |
| `Restaurant` DTO carries `acceptsReservations`, hours, address, geo | ✅ — but **`servesCuisine`, `priceRange`, `logoUrl`/social `sameAs`** are not on the DTO yet |
| Self-hosted fonts (Fraunces + Inter) via `next/font/google` | ✅ |

---

## Genuinely remaining work

### Phase A — Content-on-existing-pages JSON-LD (small, no UI change)

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| A.1 | Inject `Menu` graph JSON-LD on `/menu` via existing `/seo/structured-data/:slug` API endpoint | infra | S | high | Server-fetch + `<JsonLd>` in `(shop)/menu/page.tsx`; data already exists |
| A.2 | Inject `MenuItem` + `Offer` JSON-LD into the sheet/modal content (or on `/menu` via the menu graph above) | infra | S | med | The graph in A.1 already covers this — verify no duplicate emission |
| A.3 | Inject `Restaurant` + `WebSite` + `SearchAction` on `/` | infra | S | med | Layout-level `Restaurant` already covers it; only add `WebSite` if the search box matters |
| A.4 | Inject `Restaurant` + `ReserveAction` `potentialAction` on `/reservations` | infra | S | med | Builder + `<JsonLd>`; reservation system is built |
| A.5 | Emit `AggregateRating` once review aggregate is wired into the public landing/about (data exists in `/marketing/landing`, `/marketing/about`) | infra | S | high | Sprint 10's marketing aggregation already exposes the aggregate |
| A.6 | Per-page `generateMetadata` for `/contact` and `/locations` (currently inherit root defaults — fine, but title-per-page is a free win) | component | S | low | Both pages are `'use client'`; needs a small server-export pattern |

### Phase B — Architectural decision: item URLs (yes/no)

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| B.1 | Decide whether to add `/menu/[category]/[slug]` routes (currently no item URLs — the menu is a single-page SPA with a sheet) | decision | n/a | **high** | See "Open architectural question" below |
| B.2 | If B.1 = yes: build item-page routes that render `MenuItemDetail` content server-side, with per-item `generateMetadata`, JSON-LD, dynamic OG images, and breadcrumbs | component | L | high | Substantial — would add long-tail item-query coverage |
| B.3 | If B.1 = yes: extend `sitemap.ts` to include `(category, item)` URLs with `lastModified` from `updatedAt` and `export const revalidate = 3600` | infra | M | high | Depends on B.2 |
| B.4 | If B.1 = no: invest harder in the `/menu` JSON-LD `Menu` graph (already covered by A.1) and add a "deep link" pattern (`/menu#item-<slug>` or `/menu?item=<slug>`) so AI engines and shared links land on the relevant item with the sheet auto-opened | component | M | med | Cheaper; reasonable if site-as-app UX is the priority |

### Phase C — OG images + breadcrumb data

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| C.1 | Dynamic OG image for `/` via `app/opengraph-image.tsx` using `next/og` `ImageResponse` (cover photo + brand name) | component | M | med | No new deps — `ImageResponse` is built into Next 15 |
| C.2 | Dynamic OG image for `/menu` (collage of featured items) | component | M | med | Same pattern |
| C.3 | Dynamic OG image for `/about`, `/locations`, `/reservations` | component | M | low | Same pattern |
| C.4 | `BreadcrumbList` JSON-LD on `/menu` (`Home → Menu`) and inside `MenuItemDetail` sheet (`Home → Menu → Category → Item`) | component | S | med | Helper already shipped; just wire it |
| C.5 | Extend `RestaurantPublicDto` to include `servesCuisine: string[]`, `priceRange: string`, `sameAs: string[]` (social URLs) so `buildRestaurantSchema()` emits them | infra | S | med | Schema + types + admin settings UI |

### Phase D — Reviews surface + AggregateRating (data exists, rendering may not)

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| D.1 | Audit whether reviews are actually rendered on customer-facing pages (sprint 11 says data layer; sprint 11 report says "no UI") | audit | S | high | Pre-req for D.2/D.3 |
| D.2 | If not rendered: surface aggregate rating + recent reviews on `/` and `/about` (designs may exist in `design-assets/`) | component | M | high | Drives both classic SEO rich result and AI sentiment signal |
| D.3 | Emit `AggregateRating` + a small `Review` array in JSON-LD once D.2 renders | infra | S | high | Helper trivial |
| D.4 | Post-order review-request email already enqueues — add a Google Review deep link to GBP in the email template | infra | S | med | Email template edit |

### Phase E — Content additions for GEO

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| E.1 | Add a `/faq` page with `FAQPage` JSON-LD (rich result deprecated 2026-05-07 — still AI-extractable) | content + component | M | med | New route + content |
| E.2 | Add dietary landing pages (`/wegan`, `/halal`, `/bezglutenowe`) targeting dietary intent — content pages, not filters | content | L | med | New routes; new content |
| E.3 | Add chef bio block to `/about` with `Person` schema + photo + credentials (E-E-A-T) | content | M | high | Owner-provided content |
| E.4 | Add district/transit paragraph to `/locations` (Mokotów, Śródmieście, nearest metro, landmarks) | content | S | med | Owner-provided content |
| E.5 | Add TL;DR / quick-answer block above the fold on `/about` and any future informational page | content | S | high | GEO-extractor preference |
| E.6 | Add Q&A blocks on `/menu` and key pages (mined from real customer questions) | content | M | med | Needs customer-question data |
| E.7 | Static `llms.txt` at site root (`/public/llms.txt` or `app/llms.txt/route.ts`) | content | S | low | Low-effort hedge despite ~10% adoption / ignored by major crawlers |

### Phase F — Owner actions (off-site, not dev work)

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| F.1 | **Google Business Profile** — claim/create, primary category, attributes, 10+ photos, hours, weekly Posts | off-site | M | **very high** | #1 ranking lever for restaurant local SEO ([Whitespark 2026](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/)) |
| F.2 | **Bing Webmaster Tools** — verify, submit sitemap, enable AI Performance dashboard | off-site | S | high | ChatGPT/Copilot citation telemetry |
| F.3 | **Google Search Console** — verify, submit sitemap | off-site | S | high | |
| F.4 | **Apple Business Connect** — Apple Maps + Siri | off-site | S | med | |
| F.5 | Polish directory listings (NAP-consistent): gastronauci.pl, restauracje.info, smakipolski.pl, Pyszne.pl, Glovo, Wolt | off-site | M | med | Owner |
| F.6 | Google Posts cadence (≥ weekly), photo cadence (3+/month), review-response cadence (≤ 48h) | off-site | recurring | high | Owner |

### Phase G — Measurement & ongoing

| # | Item | Type | Effort | Impact | Notes |
|---|---|---|---|---|---|
| G.1 | Baseline AI-citation measurement (20 Polish + 20 English queries) — run BEFORE any further GEO content ships | measurement | M | high | See strategy §E for the query list |
| G.2 | Monthly AI-citation re-run with diff tracking | measurement | recurring | high | |
| G.3 | Monthly Bing WT AI Performance dashboard review | measurement | recurring | **very high** | First-party AI citation data |
| G.4 | Monthly Map Pack rank check on 5 priority Polish queries | measurement | recurring | high | |
| G.5 | Weekly GSC + Bing WT sweep (15 min) | measurement | recurring | high | |
| G.6 | Verify Vercel Speed Insights on apps/web (CWV field data) | measurement | S | med | Verify deploy config |
| G.7 | CI test for JSON-LD validity (extend `packages/utils/src/structured-data.test.ts`) | infra | S | low | |
| G.8 | Quarterly content freshness sweep — touch any >60-day GEO-relevant page | content | recurring | med | |

---

## Open architectural question — item URLs

The current menu is a **single-page SPA with a sheet/modal for item details**. There are no `/menu/[category]/[slug]` routes — the route table confirms it (only `(shop)/menu/page.tsx`, no nested `[category]/[slug]`).

**SEO implication.** Long-tail menu-item queries like „kebab z jagnięciny mokotów" or „best lamb kebab in warsaw" lose their natural landing page. Google + AI engines extract individual `MenuItem` nodes from the `/menu` graph JSON-LD (good), but ranking on a long-tail query usually requires a page whose primary purpose is that item. With a single-page menu, every long-tail query competes for the same `/menu` slot.

**Why the current design might be the right call.**
- App-like menu UX with fast filtering and a modal sheet is what Toast / Sweetgreen / DoorDash use.
- The audience is mobile-first; an item URL that opens a separate full page is friction.
- One indexed `/menu` page with rich JSON-LD covers a lot of AI-engine extraction even without item URLs.

**Recommendation.** Treat this as an explicit owner decision, not a default:

- **If the priority is conversion and the existing UX is well-tested** → keep the single-page menu; invest in A.1 (richer JSON-LD), B.4 (deep-link auto-open pattern), and C.2 (collage OG image).
- **If the priority is long-tail organic traffic for dishes** → ship B.2/B.3 (item routes + dynamic sitemap). The Sprint-13+ effort would be on the order of 1–2 weeks of UI work for the item page + the per-item OG image generator.

The strategy document defaults to "single-page menu, invest in richer JSON-LD" as the recommendation, since the project shipped that way. Flag B.1 to the owner as a strategic decision point.

---

## Recommended execution order

| When | Items | Effort |
|---|---|---|
| **This week — owner verification** | F.1, F.2, F.3 | owner |
| **This week — baseline measurement** | G.1 | half-day (run + log) |
| **Next dev pass — JSON-LD wiring on existing pages** | A.1, A.4, A.5, C.4 | ~half-day total |
| **Next dev pass — OG images** | C.1, C.2 | 1 day |
| **Next dev pass — DTO enrichment** | C.5 | half-day |
| **Decision point** | B.1 | owner |
| **Audit before content sprint** | D.1, C.6 (= A.6) | 1 hour |
| **Reviews surface** | D.2, D.3, D.4 | depends on D.1 |
| **GEO content sprint** | E.1, E.3, E.4, E.5, E.7 | 1–2 weeks |
| **Off-site + measurement (ongoing)** | F.4–F.6, G.2–G.8 | recurring |

---

## Hard "must-not" rules

- Never block AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) in robots.
- Never put primary content inside client-only React state — RSC + HTML must contain everything bots and AI engines need.
- Never use PDF-only menus; the HTML menu is the SEO asset.
- Never store the canonical URL with a trailing slash variant inconsistent with what GBP uses.
- Never hardcode the base URL — use `process.env.NEXT_PUBLIC_APP_URL` (already enforced in `sitemap.ts`).
- Never index `/account`, `/cart`, `/checkout`, `/track/*` (covered by route-group layouts as of this run).
