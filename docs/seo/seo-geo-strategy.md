# SEO + GEO/AEO Strategy — Restaurant Ordering Platform

> Target market: Poland (Warsaw + other cities), locale `pl-PL` primary, `en` secondary.
> Surface: `apps/web` (Next.js 15 App Router). Admin and mobile are out of SEO scope.
> Written 2026-05-26.
>
> **Status note (audit 2026-05-26):** `apps/web` is **feature-complete through all 12 master-plan sprints** — every marketing, menu, account, auth, checkout, and tracking page is built and shipped. References below that read like "in the UI sprint…" or "once the UI lands…" describe **incremental SEO polish on top of an already-shipped app**, not net-new pages. See `docs/seo/seo-implementation-backlog.md` for the current-state audit and what's actually left.

---

## Part A — Executive summary

This platform competes on **two fronts** that increasingly diverge:

1. **Classic SEO** — Google (still dominant in Poland) + Bing. The traffic that converts today.
2. **Generative Engine Optimization (GEO / AEO)** — ChatGPT Search, Google AI Overviews / Gemini, Perplexity, Microsoft Copilot. The traffic that's eating classic SEO at ~25% per Gartner's 2026 forecast ([Gartner via Bing AI tracking, 2026](https://docdigitalsem.com/bing-indexing-for-ai-search/)).

The two disciplines overlap (good content with structured data helps both) but they're scored differently. Classic SEO rewards backlinks, exact-match relevance, and Core Web Vitals. GEO rewards extractable claims, citations of authoritative sources, freshness windows (7–14 days per [GenOptima 2026](https://www.gen-optima.com/geo/generative-engine-optimization-best-practices-2026/)), and presence in the indices LLMs read from (notably **Bing — ChatGPT and Copilot both source from Bing**, per [Bing Webmaster Tools AI Performance, Feb 2026](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)).

**Restaurant-specific advantage.** Google's local algorithm for restaurants is the most controllable SEO lever in any vertical: the **Google Business Profile primary category is the #1 ranking factor in the Map Pack**, and 8 of the top 10 Map Pack signals come from GBP itself ([Whitespark 2026 Local Search Ranking Factors](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/)). For restaurants specifically, proximity weights ~30% and reviews ~14%. This means an off-site asset the owner controls is more impactful than most on-site work.

**Timeline.** Expect 8–16 weeks for classic SEO rankings on long-tail queries (menu-item × city), 3–6 months for primary queries ("[cuisine] [city]"). For GEO: AI engines cite content with a multi-week lag, and content without 7–14 day freshness signals loses citation priority ([GenOptima 2026](https://www.gen-optima.com/blog/generative-engine-optimization-best-practices-complete-2026-playbook/)). Measurement should start at launch, results at week 4–8.

**Strategic priorities (in order).**
1. Owner sets up & optimizes **Google Business Profile** (off-site, highest ROI).
2. Marketing-page UI sprint bakes in per-page `generateMetadata`, breadcrumbs, image alt discipline, internal linking, and JSON-LD via the existing API-driven structured-data endpoint.
3. Site content structured for AI extraction (TL;DR, Q&A, data tables).
4. Reviews surfaced on-site as `Review` + `AggregateRating` schema.
5. Bing Webmaster Tools submission for AI-search index coverage.

---

## Part B — Keyword & query strategy

### Query taxonomy (Poland, restaurant)

| Query class | Polish example | English example | Page that should win |
|---|---|---|---|
| **Branded** | „szef donald warszawa" | "the test kitchen warsaw" | `/` (home) |
| **Local discovery** | „restauracja blisko mnie" | "restaurants near me" | GBP listing + `/` (home) — site can't win "near me" without proximity match |
| **Cuisine + city** | „kebab warszawa", „falafel śródmieście" | "kebab warsaw", "vegan warsaw" | `/menu` + dedicated cuisine landing page |
| **Menu item long-tail** | „najlepszy kebab z jagnięciny mokotów" | "best lamb kebab in mokotów" | `/menu/[category]/[slug]` item page |
| **Intent: order online** | „zamów kebab online warszawa", „dostawa jedzenia śródmieście" | "order kebab online warsaw" | `/` + `/menu` + structured data with `OrderAction` |
| **Reservations** | „rezerwacja stolika warszawa", „kolacja na walentynki śródmieście" | "book a table warsaw" | `/reservations` |
| **Dietary** | „wegański kebab warszawa", „bezglutenowe falafel" | "vegan kebab warsaw" | dedicated dietary landing pages + filter URLs |
| **Occasion / catering** | „catering firmowy warszawa", „przyjęcie urodzinowe restauracja" | "private dining warsaw" | dedicated occasion pages |
| **Informational (GEO)** | „co to jest prawdziwy kebab", „czym różni się szawarma od kebabu" | "what is real kebab" | About / blog / FAQ — these are where AI engines pick citations |

### Polish-language behavior to respect

- Polish search uses **inflected forms**. "kebab w Warszawie" / "kebab Warszawa" / „kebab w stolicy" all need to be supported by natural copy, not exact-match stuffing.
- District/neighborhood names matter more than city names for proximity queries: „Mokotów", „Śródmieście", „Praga". Location pages and item descriptions should namedrop the actual district + nearby landmarks.
- Diacritics (ą, ę, ł, ó) — Google handles equivalence, but on-page copy should use correct diacritics so it parses as Polish. URLs stay ASCII (we already do this via slug discipline).
- `hreflang="pl-PL"` on Polish pages, `hreflang="en"` on English. We default to `pl` unprefixed (good — matches local user expectation) per `i18n/routing.ts`.

### Page-type → query-type matrix (sprints 10–11 build out)

- **Home (`/`)** — branded + cuisine+city. Hero copy hits the primary cuisine + city, social proof, today's specials.
- **Menu index (`/menu`)** — cuisine+city + dietary. Category headings act as H2s for crawlers and AI extractors.
- **Item page (`/menu/[cat]/[item]`)** — long-tail. Rich description, ingredients, allergens, calories, dietary tags, price.
- **Locations (`/locations`)** — local discovery. Embedded map, district context, transit, parking.
- **About (`/about`)** — E-E-A-T + GEO informational. Chef bio with credentials, food philosophy, sourcing.
- **Reservations (`/reservations`)** — reservation intent.
- **Contact (`/contact`)** — branded support queries, NAP source of truth.
- **Future: dietary pages, neighborhood guides, FAQ, occasion pages** — see Part G.

---

## Part C — Technical SEO architecture (Next.js 15)

### Metadata strategy

- **Root** (`apps/web/src/app/[locale]/layout.tsx`) — sets `metadataBase`, default `title.template`, default OG, locale-aware description. This is currently missing `metadataBase` and a title template; quick-win patch lands in this run.
- **Per-route** — every `(marketing)/*/page.tsx` and `(shop)/menu/[cat]/[item]/page.tsx` exports `generateMetadata({ params })` that:
  - resolves locale + path
  - composes a localized title using next-intl `getTranslations`
  - returns `alternates.canonical` (the absolute URL, no query) + `alternates.languages` via the existing `getAlternates(href)` helper in `apps/web/src/lib/seo/alternates.ts`
  - returns OG image (per-page or fallback to the dynamic OG renderer — see below)

### Known Next.js gotchas to watch

- `alternates.languages` in `generateMetadata` has historical bugs around query-string preservation ([Next.js #72810](https://github.com/vercel/next.js/issues/72810)) and around tag ordering when both `alternates` and `openGraph.url` are set ([Next.js #83267](https://github.com/vercel/next.js/issues/83267)). **Mitigation for us:** marketing pages don't carry query strings in their canonical/hreflang URLs (we control them), so the query-string bug doesn't bite. The body-ordering bug is cosmetic — still emits valid hreflang in HTML and the sitemap is the authoritative source for Google. **We keep `alternates.languages` and add explicit fallback validation in the sitemap.** No need to hand-roll `<link>` tags in the head.
- `viewport` is a separate export (`export const viewport: Viewport`), not part of metadata. Already correct in our root layout (none set today — fine).
- Streaming metadata: bots receive the full `<head>` because Next pauses streaming for crawlers (verified default behavior in Next 15). No action needed.

### Rendering strategy per page type

| Route | Rendering | Indexable | Notes |
|---|---|---|---|
| `/` | RSC, composes 7 typed landing sections | ✅ | Hero + categories + featured + story + hours + testimonials + newsletter |
| `/menu` | RSC shell + `<MenuApp />` client component | ✅ | **Single-page SPA**: search, dietary filters, sticky category nav, item-detail in a sheet/modal. **There are no `/menu/[cat]/[slug]` routes** — see "Open architectural decision: item URLs" in the backlog |
| `/about`, `/locations`, `/contact`, `/reservations` | RSC (locations/contact are client-leaf for forms) | ✅ | |
| `/cart`, `/checkout`, `/checkout/success/*` | RSC + `noindex` via `(shop)/checkout/layout.tsx` | ❌ | Per-user state — must not be crawled |
| `/account/*` | RSC + `noindex` + `nofollow` via `(account)/layout.tsx` | ❌ | Auth-gated; middleware redirects to /login |
| `/login`, `/register`, `/verify-email`, `/reset-password`, `/forgot-password` | RSC + `noindex` via `(auth)/layout.tsx` | ❌ | Discoverable from internal links, not desirable in SERPs |
| `/track/[orderId]` | RSC + `noindex` + `nofollow` via `(public)/layout.tsx` | ❌ | Signed-token deep links |
| `/staff/*` | RSC | n/a | Internal-use; disallowed in `robots.ts` |

`noindex` is set at the route-group `layout.tsx` level via `export const metadata` so it applies to every page under that group without per-page repetition. `robots.ts` blocks the same paths at the crawler level as layer-1 protection.

### `sitemap.ts` (apps/web/src/app/sitemap.ts)

Current state: `MetadataRoute` with the six static routes per locale and proper `alternates.languages`. **The current architecture has no per-item URLs** — the menu is a single-page SPA with a sheet/modal for item detail — so the static six-route sitemap is actually correct for the current architecture.

The dynamic-sitemap upgrade only becomes relevant **if** the owner decides to add `/menu/[cat]/[slug]` routes (backlog item B.1). If that decision lands:
- Fetch menu tree from `/restaurants/the-test-kitchen/menu` at request time (RSC).
- Emit one entry per `(category, item)` per locale.
- `lastModified` from `item.updatedAt`.
- `export const revalidate = 3600` so the sitemap regenerates without full deploy ([Next.js sitemap ISR](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)).
- If the menu grows past ~50k URLs (it won't for one restaurant, but flag for the multi-location case), split via `generateSitemaps()` ([Next.js generateSitemaps](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps)).
- Handle API failure gracefully — return the static routes only. **Do not** crash the build.

### `robots.ts` (apps/web/src/app/robots.ts)

Current state: there is no native `robots.ts`. Instead, `app/robots.txt/route.ts` proxies the API's `/seo/robots.txt` endpoint, which currently emits only the sitemap URL line. **This works** but it adds a runtime dependency to a file Google fetches on every crawl. The native `MetadataRoute` `robots.ts` gives us strongly typed control and removes the API hop.

Quick-win patch lands a native `robots.ts` that:
- `User-agent: *`
- `Allow: /`
- `Disallow: /cart, /checkout, /account, /api, /login, /register, /forgot-password, /reset-password, /verify-email, /track, /staff`
- `Sitemap: ${baseUrl}/sitemap.xml`
- **Does not block AI crawlers** (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended). Allowing them is a precondition for GEO ([GenOptima 2026](https://www.gen-optima.com/geo/generative-engine-optimization-best-practices-2026/)).

The API's `/seo/robots.txt` and the proxy route can be retired or repurposed; the native file is the source of truth for the customer site.

### Internal linking architecture

- **Breadcrumbs** on every deep page: Home → Menu → Category → Item. Emit `BreadcrumbList` JSON-LD with the breadcrumbs. ([BreadcrumbList still produces rich results in 2026](https://richmenu.io/restaurant-schema-markup/).)
- **Related items** on item pages: 3–4 same-category items. Each link uses descriptive anchor text ("Kebab z jagnięciny" not "click here").
- **Footer**: link to every top-level marketing page + privacy/terms.
- **Menu → item → category → menu** loop: every link uses absolute paths via `Link` from `@/i18n/navigation` so locale prefixing stays correct.

### Core Web Vitals (2026 thresholds)

| Metric | "Good" | Our target | Lever |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s at p75 | **< 2.0s** | `next/image` for hero, AVIF/WebP, R2 caching, `next/font` for self-hosted fonts (already done via Fraunces + Inter) |
| **INP** (Interaction to Next Paint) | < 200ms at p75 | **< 150ms** | Code-split TanStack Query devtools out of prod, defer non-critical JS, keep cart drawer lightweight — **43% of sites fail INP** ([Core Web Vitals 2026 report](https://www.corewebvitals.io/core-web-vitals)) |
| **CLS** (Cumulative Layout Shift) | < 0.1 at p75 | **< 0.05** | Reserve `aspect-ratio` for every image, fixed-height skeleton states, avoid late-injected banners |

Per [Google's March 2026 core update](https://www.mewastudio.com/en/blog/seo-core-web-vitals-2026), performance weight increased — passing the thresholds is now a measurable ranking advantage in competitive SERPs.

Next.js-specific levers: `next/image` (we already configure `images.remotePatterns`), `next/font` (Fraunces + Inter already self-hosted via `next/font/google`), streaming + Suspense for below-the-fold sections, `<Link prefetch>` defaults (good), avoid client components when an RSC will do.

### Image strategy

- **All food photos use `next/image`** with width/height set and `priority` on the hero only.
- **Alt text discipline**: food images get descriptive Polish alt text including the dish name + key visual descriptors. „Kebab z jagnięciny z surówką colesław i sosem czosnkowym" not „kebab".
- **R2 → Next image optimizer**: already configured. The optimizer caches to Vercel's CDN edge; cold paths are ~150ms in EU. Acceptable.
- **OG images**: dynamic per-page via `next/og` `ImageResponse` ([Next.js OG image generation](https://nextjs.org/docs/app/api-reference/functions/image-response)) — see Phase-2 backlog. Item-page OG = item photo + name + price.

---

## Part D — Structured data (JSON-LD) plan

### What Google actually renders as rich results in 2026

- **Still rich-result-eligible**: `LocalBusiness` / `Restaurant`, `BreadcrumbList`, `Recipe`, `Review` + `AggregateRating`, `Product`, `Article`, `Video`, `Organization`. ([Schema 2026 rich results audit](https://richmenu.io/restaurant-schema-markup/))
- **`Menu` / `MenuItem` / `MenuSection`** — **not a standalone rich result type**, but Google uses it to populate the restaurant entity card and AI engines extract from it heavily. Keep emitting it.
- **`FAQPage`** — **rich results deprecated May 7, 2026** ([Search Engine Journal](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/)). The schema is still understood by Google and is still useful for AI extraction. Continue emitting; don't expect Google to render the accordion.
- **`Event`**, **`Offer`** — still active.

### Per-page emission plan

| Page | JSON-LD | Status |
|---|---|---|
| Root locale layout (every page) | `Restaurant` w/ `name`, `url`, `logo`, `image`, `address`, `geo`, `telephone`, `email`, `openingHoursSpecification`. **Missing**: `priceRange`, `servesCuisine`, `sameAs` (not on the DTO yet — backlog C.5) | ✅ shipped this run via `<JsonLd>` + `buildRestaurantSchema()` |
| `/` | Add `WebSite` w/ `potentialAction: SearchAction` if menu search is a meaningful entry point | backlog A.3 |
| `/menu` | `Menu` → `MenuSection[]` → `MenuItem[]` from the API's existing `/seo/structured-data/:slug`. Since there are no item URLs, **this is where `MenuItem` nodes get indexed** — extra weight on getting this right | backlog A.1 |
| `/about` | `Restaurant` + `Person` for the chef once chef bio is written (E-E-A-T) | backlog E.3 |
| `/locations` | Inherits `Restaurant` (full address + geo) from layout; add district/transit content | backlog E.4 |
| `/reservations` | Add `Restaurant` + `ReserveAction` `potentialAction` | backlog A.4 |
| Any FAQ block | `FAQPage` (rich result deprecated 2026-05-07 but still AI-extractable) | backlog E.1 |
| `/menu` and (if items exist) item pages | `BreadcrumbList` | backlog C.4 |
| Aggregate review surface (`/` or `/about`) | `AggregateRating` (data exists in `/marketing/landing` and `/marketing/about`) | backlog A.5 / D.3 |

### Data source: API or hand-rolled?

The platform already has `GET /seo/structured-data/:slug` ([apps/api/src/seo/seo.service.ts:27](D:/restaurant/apps/api/src/seo/seo.service.ts)) which:
- pulls `Restaurant`, `MenuCategory`, `MenuItem`, and `AggregateRating` from Prisma
- composes them via `@repo/utils/structured-data.ts` (pure, tested)
- returns a `{ '@context', '@graph' }` envelope

**Strategy:** the marketing layout fetches this endpoint once per locale per `revalidate: 3600` and injects the graph. Per-page JSON-LD (BreadcrumbList, MenuItem Offer) is composed client-free in the page's RSC from the same DTOs the page already uses — no duplicate data fetches.

For the **layout-level site-wide schema** that needs to render fast and cheap on every page, we use a lightweight `buildRestaurantSchema(RestaurantPublicDto)` helper on the web side (lands in this run) that emits just the `Restaurant` node — no menu graph, no DB call needed because the marketing layout already fetches the restaurant DTO via `useRestaurant()` / `restaurantsApi.getBySlug`. This avoids forcing every page through the heavier `/seo/structured-data` endpoint and decouples site-wide schema from menu freshness.

### The `<JsonLd>` component pattern

A typed Server Component lives at `apps/web/src/lib/seo/json-ld.tsx`. It accepts `data: Record<string, unknown> | Record<string, unknown>[]` and emits a `<script type="application/ld+json">` element. JSON encoding uses `JSON.stringify` with the `</script>` escape pattern to prevent breakout. It is a Server Component — no `'use client'`, no hydration cost.

### Validation

- **Dev**: paste any page's JSON-LD into [Google Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org).
- **CI suggestion**: add a Vitest test that loads the structured-data builder output and asserts:
  - top-level `@context` is `'https://schema.org'`
  - every node has `@type`
  - `JSON.stringify(node).includes('</script>')` is `false` after escaping
  - cross-references (`@id`) resolve within the `@graph`
- This goes in `packages/utils/src/structured-data.test.ts` — extending the existing 3 tests there.

---

## Part E — GEO / AEO strategy (the AI-search front)

### How each engine sources

| Engine | Index | Implication |
|---|---|---|
| **ChatGPT Search** (web mode) | **Bing's index** + OpenAI's own crawler (OAI-SearchBot, GPTBot) ([Bing → AI search pipeline, 2026](https://docdigitalsem.com/bing-indexing-for-ai-search/)) | Submit sitemap to **Bing Webmaster Tools** — non-negotiable |
| **Google AI Overviews / Gemini** | Google's index + traditional ranking signals + E-E-A-T + structured data | Win classic SEO first; structured data and named-author content amplify |
| **Perplexity** | Mixed: own crawler + Reddit/community heavy weight + freshness preference | Get mentioned on Polish food blogs / Reddit threads; keep content fresh |
| **Microsoft Copilot** | Bing | Same as ChatGPT — Bing Webmaster Tools is the lever |

### Bing Webmaster Tools — the most underused lever

Microsoft launched **AI Performance reports** in BWT on Feb 10, 2026 ([Bing blog, Feb 2026](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)). For the first time, an engine exposes *which of your URLs were cited in ChatGPT/Copilot answers*, against which grounding queries. **This is the only first-party AI-citation telemetry available in 2026.**

**Owner action (Phase 1):**
1. Create Bing Webmaster Tools account, verify domain ownership.
2. Submit `https://<domain>/sitemap.xml`.
3. Enable AI Performance dashboard.
4. Run baseline AI-query measurement (below) once weekly; cross-reference with BWT citation data monthly.

### Content structure for AI extraction

Per the [Princeton GEO study](https://arxiv.org/abs/2311.09735) (the original empirical work, replicated and extended in 2026 by [GenOptima](https://www.gen-optima.com/blog/generative-engine-optimization-best-practices-complete-2026-playbook/)): citation rate lifts by **30–40%** when content includes:
1. **Statistics with specific numbers** ("28% of Warsaw kebab orders are ordered between 22:00 and 02:00" beats "many people order late").
2. **Cited sources** with inline link references.
3. **Direct quotations** from named experts.

Beyond those three, the proven structural patterns:

- **TL;DR / quick answer above the fold** on every informational page. AI engines extract the first 50–200 tokens preferentially.
- **Q&A blocks** for any question a diner might ask ("Czy mają opcje wegańskie?", "Czy można zamówić bez ostrego sosu?").
- **Data tables** for compare/contrast (dietary matrix: dish × vegan/vegetarian/GF/halal).
- **Heading hierarchy**: one H1, scoped H2s with one topic per section, descriptive H3s. AI extractors lean on this.
- **Visible authorship + dates**: chef bio, "Updated 2026-05-26" stamp. Without dates, content drops out of Perplexity's freshness window after ~14 days.
- **Inline references** when we make a claim: source links to credible Polish food media (e.g., Gazeta Wyborcza food, Kuchnia+, Polski Smak).

### E-E-A-T signals (Experience, Expertise, Authority, Trust)

Google's quality framework, and Gemini relies on it heavily:

- **Real chef bio** on `/about`: name, photo, credentials, years in the kitchen, signature dish.
- **Visible NAP** (Name/Address/Phone) on every page footer — must match GBP exactly.
- **Real reviews** on-site (Sprint 7 review module already built; surface them with schema once UI lands).
- **Published + updated dates** on any content page.
- **About page with real story**: founding date, sourcing philosophy, supplier names (Polish ingredient suppliers carry weight in Polish AI answers).

### llms.txt — recommended low-effort include

Despite low adoption (~10% of domains per [Limy.ai 2026](https://limy.ai/blog/llms.txt-in-2026-the-full-guide)) and major AI crawlers mostly ignoring it ([Search Engine Land, 2026](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/) — same source notes the wider AI-bot behavior), **we still add one**:

- 30-minute investment, zero downside, hedges if standards firm up.
- Useful immediately for developer-tool AI agents (Cursor, Copilot, Claude Code) that pull docs.

Content for our `llms.txt` (Phase 2):
```
# The Test Kitchen — Restaurant in Warsaw, Poland

> Independent restaurant serving kebab, falafel, and tacos in Warsaw. Open daily for dine-in, pickup, and delivery.

## Menu
- /menu — Full menu with prices in PLN, dietary tags
- /menu/[category]/[item] — Per-item pages with ingredients, allergens, calories

## Locations & hours
- /locations — Address, map, hours, contact

## About
- /about — Chef bio, sourcing, story

## Order
- /menu — Browse and add to cart
- /reservations — Table reservations
```

### Off-site authority signals (owner actions, not dev work)

- **Polish food directories**: gastronauci.pl, restauracje.info, smakipolski.pl — add NAP-consistent listings.
- **Local food bloggers**: outreach to Warsaw food bloggers for organic mentions (these are what Perplexity weights heavily).
- **Press**: any restaurant press, even a single local-paper mention, becomes a citable source for AI engines.
- **Wikidata entry**: if the restaurant becomes notable enough, a Wikidata entry feeds Google's Knowledge Graph and is cited by Gemini.

### Baseline AI-citation measurement

Run this **before any GEO work ships** and monthly thereafter:

**Polish queries (run in ChatGPT, Gemini, Perplexity, Copilot):**
- „najlepszy kebab w warszawie"
- „gdzie zamówić falafel w warszawie"
- „restauracja z tacos warszawa centrum"
- „dostawa kebab warszawa mokotów"
- „rezerwacja stolika warszawa kolacja"
- „wegańskie opcje kebab warszawa"
- „kebab z dostawą śródmieście"
- „restauracja na walentynki warszawa"
- „catering firmowy warszawa kebab"
- „[restaurant name] godziny otwarcia"

**English queries (same engines):**
- "best kebab warsaw"
- "where to eat in warsaw"
- "vegan restaurants warsaw"
- "kebab delivery warsaw"
- "warsaw restaurants open late"
- "book a table warsaw"
- "halal restaurant warsaw"
- "private dining warsaw"
- "[restaurant name] reviews"
- "warsaw food guide"

For each query, record: (a) did we appear in the answer body, (b) were we cited with a URL, (c) at what position. Track the **Mention Rate** and **Citation Rate** ([GenOptima KPIs](https://www.gen-optima.com/blog/generative-engine-optimization-best-practices-complete-2026-playbook/)) over time. Store the log in `docs/seo/measurements/baseline-YYYY-MM.md`.

---

## Part F — Local SEO (the single biggest restaurant lever)

### Google Business Profile checklist (owner-driven, must happen Phase 1)

Per [Whitespark 2026 ranking factors](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/), the **primary category is the #1 local-pack ranking signal**, and **8 of the top 10** local-pack signals come from GBP itself.

| GBP field | Restaurant recommendation |
|---|---|
| Primary category | The most specific match available (e.g., "Kebab restaurant" not "Restaurant"). This single choice swings rankings more than any other GBP setting. |
| Secondary categories | Up to 9. Add every relevant: Middle Eastern, Falafel, Mexican, Delivery, Takeout, Vegetarian. Use them all. |
| Name | Exact business name. Don't keyword-stuff ("Szef Donald — Best Kebab Warsaw" violates ToS). |
| Address | Exactly the format used on the website footer. |
| Phone | Exactly the format used on the website footer. |
| Hours | **Accuracy matters more than ever in 2026** — "Business is open at time of search" is now a top-5 Local Pack signal ([Whitespark 2026](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/)). Update for holidays. Special hours for Easter/Christmas. |
| Website | Canonical URL: `https://<domain>/` (no trailing slash variants split signal). |
| Menu URL | `https://<domain>/menu` — Google will surface the menu page in the GBP card. |
| Reservation URL | `https://<domain>/reservations` |
| Order URL | `https://<domain>/menu` (or a future `/order`) |
| Photos | 10+ at launch. Cuisine, interior, exterior, team. Add 3+ monthly — Google measures photo recency. |
| Attributes | Toggle every accurate option: outdoor seating, delivery, takeout, dine-in, accepts reservations, free Wi-Fi, vegan options, accessibility. |
| Products / Menu | Use GBP's native menu editor with the 10–15 hero items. Don't rely solely on the linked menu URL. |
| Google Posts | **Weekly minimum** — promos, events, seasonal items. Posting frequency is a top-tier Local Pack signal in 2026 ([Whitespark 2026](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/)). |
| Q&A | Pre-seed common questions ("Do you have vegan options?" etc.) with owner answers. |

### Other directories (owner actions)

- **Bing Places** — verify, mirror GBP data exactly.
- **Apple Business Connect** — Apple Maps + Siri queries. Free, often-forgotten.
- **Polish directories** — NAP-consistent listings on:
  - gastronauci.pl
  - restauracje.info
  - smakipolski.pl
  - Pyszne.pl (delivery aggregator — converts directly)
  - Glovo / Wolt — listing presence supports local search even if we don't use them as fulfillment

### Review velocity (cross-cuts SEO + GEO)

The Sprint 7 review module is built but not surfaced. Once UI lands:
- **Post-order email/SMS** at T+24h asks for a review (already on the BullMQ matrix).
- **GBP link in the same email** asks for a Google review specifically.
- **On-site reviews surfaced with `AggregateRating` schema** — feeds both classic SERP rich results and AI engines (Gemini weighs sentiment).
- **Owner replies to every review within 48h** — Google measures response rate.

### Location page (`/locations`)

Even single-location: a strong location page outperforms a sparse one for "[cuisine] [neighborhood]" queries.

- Embedded map (Google Maps embed iframe — minimal CWV impact if lazy-loaded).
- Address in `PostalAddress` JSON-LD + visible.
- Hours: visible (today's hours highlighted) + `OpeningHoursSpecification` JSON-LD.
- District/neighborhood paragraph: name the district, nearby landmarks, transit (closest metro/tram stop), parking.
- Photos of the storefront from the street (helps Google verify proximity to the address).
- "Get directions" button using `https://www.google.com/maps/dir/?api=1&destination=...`.

---

## Part G — Content strategy

### Content pages that win both SEO and GEO

| Page | SEO value | GEO value |
|---|---|---|
| HTML menu (not PDF) | Long-tail item queries | AI engines extract item names, prices, dietary info |
| Cuisine overview | Cuisine+city queries | "What is real kebab" informational queries |
| Location / neighborhood | Local discovery | "Where to eat in Mokotów" |
| About / chef bio | E-E-A-T | Author signal for AI engines |
| Dietary pages (vegan, halal, gluten-free) | Dietary intent queries | "Vegan options in Warsaw" — high-conversion AI query |
| Private events / catering | Occasion queries | "Catering in Warsaw" |
| FAQ | Informational queries | Highest AI-extraction rate (Q&A format is preferred) |
| Seasonal content | Event queries | Freshness signal for Perplexity |

### Blog/editorial — is it worth it?

**Yes, light-touch only.** Don't build a full CMS. Recommended pattern:

- 1 post/month, MDX-rendered at `/blog/[slug]`.
- Topics that earn local backlinks + AI citations:
  - "Najlepsze miejsca na kebab w Warszawie" (link-bait listicle that ranks for the broad query and mentions the restaurant naturally)
  - "Skąd pochodzi kebab — historia i regionalne wariacje" (informational, GEO bait)
  - "Mokotów food guide" (neighborhood backlink magnet)
  - Ingredient spotlights (jagnięcina, tahini)
- Each post: 800–1,500 words, statistics + citations + a named author + updated dates.
- **Update each post every 7–14 days** for the first 90 days post-publish to capture AI citation freshness window ([GenOptima 2026](https://www.gen-optima.com/blog/generative-engine-optimization-best-practices-complete-2026-playbook/)).

This is **not in current scope** (master plan defers blog to "optional"); flagged for the marketing-content phase post-launch.

### Hyper-local specificity rule

Every page that has a city or neighborhood mention should also reference:
- exact district (Mokotów, Śródmieście, etc.)
- nearest metro/tram stop
- one to two nearby landmarks ("przy Placu Trzech Krzyży", "obok Stacji Metra Politechnika")
- specific dishes that are local favorites

This is the difference between content that AI engines extract and content that gets generalized away.

---

## Part H — Measurement & monitoring

### Tools

| Tool | Purpose | Cost |
|---|---|---|
| **Google Search Console** | Organic impressions, clicks, CTR, top queries, indexing issues, rich-result coverage | Free |
| **Bing Webmaster Tools** | Same as GSC for Bing + **AI Performance dashboard** (ChatGPT/Copilot citations) | Free |
| **Google Business Profile Insights** | Map Pack impressions, direction clicks, calls | Free (in GBP UI) |
| **Vercel Analytics / Speed Insights** | CWV field data from real users | Included w/ Vercel |
| **Google PageSpeed Insights** | Lab + field CWV | Free |
| **AI-citation tracking** | Manual baseline queries (Part E) — automate later if needed | Free → optional paid (e.g., Profound, Otterly.ai) |
| **PostHog** (already in stack per master plan) | Conversion funnels, session replay (privacy review needed for EU) | Already paying |

### KPIs to track

| KPI | Source | Cadence | Target (T+6 months) |
|---|---|---|---|
| Organic impressions (Polish) | GSC | Weekly | 10k/week |
| Organic clicks | GSC | Weekly | 1k/week |
| Map Pack rank for "kebab warszawa" | Manual / [BrightLocal](https://www.brightlocal.com) | Weekly | Top 3 |
| CWV pass rate (origin) | GSC / CrUX | Weekly | ≥ 90% URLs passing |
| Rich-result coverage | GSC > Enhancements | Weekly | Restaurant, Breadcrumb, Review all green |
| Review count (Google) | GBP | Weekly | +5/week, 4.5+ avg |
| Bing AI citation count | Bing Webmaster Tools AI Performance | Monthly | Measure baseline, beat it monthly |
| AI citation rate (manual queries) | Baseline doc | Monthly | 30% of branded + cuisine queries mention us |
| LCP / INP / CLS at p75 | Vercel Speed Insights | Weekly | < 2.0s / < 150ms / < 0.05 |

### Cadence

**Weekly (15 min)**:
- GSC: new errors, new queries
- GBP: review responses, post one update
- Vercel Speed Insights: any regression?

**Monthly (90 min)**:
- GSC + Bing WT full review, export CSV
- AI-citation baseline re-run (20 Polish + 20 English queries)
- Map Pack rank check on 5 priority queries
- Review GBP photos cadence, hours accuracy
- Content freshness sweep: any page >60 days stale that's GEO-relevant, update

**Quarterly**:
- Re-run keyword research (Polish search behavior shifts)
- Backlink audit (Ahrefs trial / GSC links report)
- Competitive AI-citation analysis (which competitors do AI engines cite for our queries?)

---

## Sources cited

- [Bing Webmaster Tools — AI Performance Public Preview, Feb 2026](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
- [Brightlocal / Whitespark 2026 Local Search Ranking Factors](https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/)
- [Core Web Vitals 2026 thresholds + March 2026 update](https://www.mewastudio.com/en/blog/seo-core-web-vitals-2026)
- [Core Web Vitals 2026 — INP failure rate](https://www.corewebvitals.io/core-web-vitals)
- [Restaurant Schema Markup Guide 2026](https://richmenu.io/restaurant-schema-markup/)
- [Schema.org `Menu` type reference](https://schema.org/Menu)
- [Google Drops FAQ Rich Results — May 2026](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/)
- [GenOptima — GEO best practices 2026 playbook](https://www.gen-optima.com/blog/generative-engine-optimization-best-practices-complete-2026-playbook/)
- [GenOptima — GEO best practices 2026 how-to](https://www.gen-optima.com/geo/generative-engine-optimization-best-practices-2026/)
- [Search Engine Land — Mastering GEO in 2026](https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142)
- [Google — AI search optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Bing → AI search pipeline analysis, 2026](https://docdigitalsem.com/bing-indexing-for-ai-search/)
- [llms.txt adoption status 2026](https://limy.ai/blog/llms.txt-in-2026-the-full-guide)
- [Next.js — `alternates.languages` query bug #72810](https://github.com/vercel/next.js/issues/72810)
- [Next.js — `generateMetadata` alternates ordering bug #83267](https://github.com/vercel/next.js/issues/83267)
- [Next.js — `generateSitemaps` API](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps)
- [Next.js — `sitemap.xml` metadata route](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js — `generateMetadata` API reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [next-intl — Server Actions, Metadata & Route Handlers](https://next-intl.dev/docs/environments/actions-metadata-route-handlers)
