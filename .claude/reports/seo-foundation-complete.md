# SEO Foundation — Completion Report

**Date:** 2026-05-26
**Branch:** main
**Scope:** Research + strategy + phased backlog + infra (robots, JSON-LD, metadata defaults, noindex on private route groups)
**Project state assumed:** `apps/web` is **feature-complete through all 12 master-plan sprints** — every page is built. This report and the strategy/backlog are written against the shipped surface, not against the stub-pages state.

---

## What shipped in this run

### Strategy + planning docs
- `docs/seo/seo-geo-strategy.md` — comprehensive 2026 SEO + GEO/AEO strategy (Parts A–H) with cited sources (Whitespark 2026, Bing AI Performance Feb 2026, GenOptima 2026, Princeton GEO, Core Web Vitals 2026, Next.js docs/bug refs). Updated to reflect the **actual page architecture** — no `/menu/[cat]/[slug]` routes; menu is a single-page SPA with a sheet/modal for item detail.
- `docs/seo/seo-implementation-backlog.md` — audit-first backlog grouped as Phase A (JSON-LD on existing pages), Phase B (architectural decision on item URLs), Phase C (OG images + DTO enrichment + breadcrumbs), Phase D (reviews surface), Phase E (GEO content), Phase F (owner actions), Phase G (measurement). Marks what's already shipped vs what's left.
- `docs/seo/json-ld-examples/` — 8 hand-validated JSON-LD blocks (Restaurant, WebSite+SearchAction, Menu graph, MenuItem+Offer, BreadcrumbList, FAQPage, AggregateRating+Review, ReserveAction). All parse cleanly with `@context: https://schema.org`.

### Infra in `apps/web` (additive — no UI changes)
- **`app/robots.ts`** — native `MetadataRoute` robots; disallows private paths (`/cart`, `/checkout`, `/account`, `/track/`, `/staff`, auth routes); AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) intentionally allowed per GEO strategy.
- **`app/robots.txt/route.ts`** — **deleted** (the API-proxy version conflicted with the native robots.ts and added a useless API hop on every crawl; Sprint 10's report anticipated this swap).
- **`lib/seo/json-ld.tsx`** — typed `<JsonLd>` Server Component (XSS-safe `<` escape), `buildRestaurantSchema(RestaurantPublicDto, opts)`, and `buildBreadcrumbSchema(items)` helpers.
- **`lib/seo/fetch-restaurant.ts`** — server-side restaurant fetch with `revalidate: 3600`; fails closed (returns `null`) when the API is unreachable.
- **`app/[locale]/layout.tsx`** — extended `generateMetadata` with `metadataBase`, title template (`%s — Brand`), default OG (`pl_PL` / `en_US`), Twitter card, default `robots` w/ `googleBot.max-image-preview: large`. Injects site-wide `Restaurant` JSON-LD at the **locale root** so it reaches every public surface including `(shop)/menu` (the locale root, not `(marketing)`, is the only place that covers both `(marketing)/*` and `(shop)/menu` — caught by advisor review).
- **`(account)/layout.tsx`**, **`(auth)/layout.tsx`**, **`(public)/layout.tsx`** — each now exports `metadata.robots = { index: false, … }` so the entire group is excluded from SERPs.
- **NEW `(shop)/checkout/layout.tsx`** — checkout-specific noindex wrapper (the `(shop)` group also wraps `/menu` which must stay indexed, so the noindex is scoped to the checkout subtree).

### Files touched

```
NEW   apps/web/src/app/robots.ts
NEW   apps/web/src/app/(shop)/checkout/layout.tsx
NEW   apps/web/src/lib/seo/json-ld.tsx
NEW   apps/web/src/lib/seo/fetch-restaurant.ts
NEW   docs/seo/seo-geo-strategy.md
NEW   docs/seo/seo-implementation-backlog.md
NEW   docs/seo/json-ld-examples/README.md + 8 .json files
MOD   apps/web/src/app/[locale]/layout.tsx             (metadataBase + template + OG + robots + JSON-LD inject)
MOD   apps/web/src/app/[locale]/(account)/layout.tsx   (noindex,nofollow)
MOD   apps/web/src/app/[locale]/(auth)/layout.tsx      (noindex, follow=true)
MOD   apps/web/src/app/[locale]/(public)/layout.tsx    (noindex,nofollow)
DEL   apps/web/src/app/robots.txt/route.ts             (replaced by native robots.ts)
```

---

## Verification

```
pnpm --filter @repo/web typecheck   ✓ clean
pnpm typecheck (full repo)          ✓ 18/18 packages
biome check (new files only)        ✓ apps/web/src/app/robots.ts, lib/seo/* — clean
JSON-LD examples                    ✓ 8/8 parse, all carry @context
```

Pre-existing repo-wide Biome CRLF format warnings exist on ~25 files; they were already failing before this run and are out of scope here.

---

## Project-state audit (because the plan must reflect reality)

| Area | State |
|---|---|
| Marketing pages (`/`, `/about`, `/contact`, `/locations`, `/reservations`) | ✅ built — landing composes 7 RSC sections; about has stats; contact/locations are `'use client'` form/data pages |
| Menu (`/menu`) | ✅ built as **single-page SPA** (`<MenuApp />` = 392 lines): search, dietary filters, sticky category nav, item-detail in a sheet/modal. **No `/menu/[cat]/[slug]` routes** |
| Account/auth/checkout/tracking pages | ✅ all built, all now properly noindexed via layout-level metadata |
| Per-page `generateMetadata` w/ `alternates.languages` | ✅ on `/`, `/about`, `/menu`, `/reservations` via `getAlternates(href)` |
| `metadataBase` + title template + defaults | ✅ added this run |
| Site-wide `Restaurant` JSON-LD | ✅ added this run |
| Robots + sitemap | ✅ native files; sitemap has six routes × two locales w/ hreflang |
| `noindex` on private groups | ✅ added this run |
| Reviews module data layer | ✅ Sprints 7 + 11; whether reviews are rendered on customer pages still TBD (backlog D.1) |
| `Restaurant` DTO completeness | Missing `servesCuisine`, `priceRange`, `sameAs` (backlog C.5) |
| OG images | Static defaults only; no dynamic per-route OG images (backlog C.1–C.3) |
| `Menu` graph JSON-LD on `/menu` | Not yet wired (data exists via API; backlog A.1) |
| `BreadcrumbList` JSON-LD | Helper shipped; not yet wired (backlog C.4) |

---

## Key strategy findings

1. **FAQ rich results deprecated 2026-05-07** — still emit `FAQPage` for AI extraction; don't expect Google to render the accordion.
2. **Core Web Vitals**: LCP <2.5s, **INP <200ms** (43% of sites fail this — most-failed metric in 2026), CLS <0.1 at p75. March 2026 core update strengthened performance weighting.
3. **Bing Webmaster Tools AI Performance** (launched 2026-02-10) is the **only first-party AI-citation telemetry**. ChatGPT and Copilot source from Bing's index.
4. **GEO citation lift**: statistics, cited sources, direct quotations show 30–40% lift (Princeton GEO + GenOptima 2026). 7–14 day freshness window for Perplexity.
5. **Restaurant local SEO**: Whitespark 2026 — GBP primary category is #1 Map Pack signal; 8 of top 10 Map Pack signals come from GBP itself. "Business open at time of search" is now top-5. For restaurants: proximity ~30%, reviews ~14%.
6. **Polish-first**: locale `pl-PL` unprefixed (`as-needed`), English under `/en`. Polish keyword inflection, diacritic handling, district-level naming (Mokotów, Śródmieście).

---

## Open strategic decision the owner needs to make

**Backlog B.1: should the menu add per-item URLs (`/menu/[category]/[slug]`)?**

The current architecture is a single-page menu with a sheet/modal for items. That trades long-tail SEO coverage for app-like UX. The right call depends on the priority:

- **Keep single-page menu** → invest in richer `/menu` JSON-LD (A.1) + deep-link auto-open pattern (B.4) + collage OG image (C.2). Lower effort. Already in shipped architecture.
- **Add item routes** → 1–2 weeks of work for item page + dynamic sitemap + per-item OG generator + per-item `generateMetadata` + breadcrumbs. Higher effort, opens long-tail organic traffic on dish queries.

The strategy doc defaults to "keep single-page, invest in richer JSON-LD" because that's what shipped. Flag this to the owner explicitly — it's a strategic decision, not a default.

---

## Owner actions required (highest leverage, NOT dev work)

1. **Google Business Profile** — claim/create, primary category, attributes, 10+ photos, hours, weekly Posts (backlog **F.1**, impact **very high**).
2. **Bing Webmaster Tools** — verify, submit sitemap, enable AI Performance dashboard (**F.2**).
3. **Google Search Console** — verify, submit sitemap (**F.3**).
4. **Apple Business Connect** (**F.4**) + **Polish directory listings** (**F.5**) + **review-response cadence** (**F.6**).
5. **Baseline AI-citation measurement** (**G.1**) — 20 PL + 20 EN queries through ChatGPT/Gemini/Perplexity/Copilot before any GEO content ships.

---

## Recommended execution order

| When | What |
|---|---|
| This week | Owner: F.1, F.2, F.3 (verification + GBP) |
| This week | Owner: G.1 baseline AI measurement (half-day) |
| Next dev pass (~half-day) | A.1 (Menu JSON-LD on /menu), A.4 (Reservation), A.5 (AggregateRating), C.4 (breadcrumbs) |
| Next dev pass (~1 day) | C.1, C.2 (dynamic OG for `/` and `/menu`) |
| Decision point | B.1 (item URLs yes/no) |
| Reviews audit then surface | D.1 → D.2/D.3 |
| GEO content sprint (1–2 weeks) | E.1, E.3, E.4, E.5, E.7 |
| Ongoing | Off-site (F.4–F.6) + measurement (G.2–G.8) |

---

## Stop point

This run delivered the strategy + audit-correct backlog + the infra that didn't exist (robots, JSON-LD helpers, site-wide schema injection, noindex on private route groups, metadata defaults). The next move is **owner Phase F (GBP, Bing WT, GSC) + decision on B.1 (item URLs) + the ~1-day dev pass to wire Menu/Reservation/AggregateRating JSON-LD into the pages that already exist**.
