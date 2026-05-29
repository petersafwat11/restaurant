# SEO Phase A + C Implementation Plan

## Scope (from user)
- **A.1** Menu graph JSON-LD on `/menu`
- **A.4** `Restaurant + ReserveAction` on `/reservations`
- **A.5** `AggregateRating` once reviews surface to UI
- **A.6** per-page `generateMetadata` for `/contact` + `/locations`
- ~~B.1~~ owner decision — skip
- **C.1/C.2/C.3** Dynamic OG images for `/`, `/menu`, `/about`, `/locations`, `/reservations`
- **C.4** `BreadcrumbList` JSON-LD on `/menu`
- **C.5** Extend `RestaurantPublicDto` with `servesCuisine`, `priceRange`, `sameAs`

## Implementation order (dependency-aware)

### Step 0 — Pre-req: bake `NEXT_PUBLIC_APP_URL` into Docker build
The sitemap, robots, layout, and (about-to-be-added) OG/breadcrumbs all read
`process.env.NEXT_PUBLIC_APP_URL`. It's a `NEXT_PUBLIC_*` var → inlined at
build time. Currently the web/admin Dockerfiles only get `NEXT_PUBLIC_API_URL`
baked in, so canonical URLs all fall back to `http://localhost:3000` in prod.

- Edit `.github/workflows/build-and-push.yml` step `Compute next.js build args`
  → also emit `NEXT_PUBLIC_APP_URL=https://${DOMAIN}`.
- Verify with `curl https://szefdonald.pl/robots.txt | grep Sitemap` after deploy.

### Step 1 — C.5 DTO enrichment (foundation)
Add three optional fields to `RestaurantPublicDto`:

- `servesCuisine: string[]` — Postgres `String[]` array column
- `priceRange: string | null` — schema.org expects `$` / `$$` / `$$$` / `$$$$`
- `sameAs: string[]` — social profile URLs

Files:
- `packages/db/prisma/schema.prisma` — add fields to `Restaurant` model
- `pnpm --filter @repo/db migrate:dev --name restaurant-seo-fields`
- `pnpm --filter @repo/db generate`
- `packages/types/src/restaurant.ts` — add to `RestaurantPublicSchema`,
  `CreateRestaurantSchema`, `UpdateRestaurantSchema`
- `apps/api/src/restaurants/restaurants.service.ts` — surface in public DTO
- `apps/web/src/lib/seo/json-ld.tsx` — `buildRestaurantSchema` already accepts
  `servesCuisine`, `priceRange`, `sameAs` opts; switch to read from DTO
- `apps/web/src/app/[locale]/layout.tsx` — pass new fields into
  `buildRestaurantSchema()`
- `packages/utils/src/structured-data.ts` — change `servesCuisine` from
  `string | null` to `string[] | null` to match schema.org; emit `sameAs`
- `apps/admin/src/app/[locale]/(dashboard)/restaurant/page.tsx` — add a
  "Cuisine + Discovery" section with multi-input + select + URL list

### Step 2 — A.6 metadata wrappers for `/contact` + `/locations`
Both pages are `'use client'`. Pattern: rename the client component to
`<name>-app.tsx`, create a new RSC `page.tsx` that exports
`generateMetadata` + renders the client component.

Files:
- `apps/web/src/app/[locale]/(marketing)/contact/page.tsx` — split
- `apps/web/src/app/[locale]/(marketing)/locations/page.tsx` — split

### Step 3 — A.1 Menu JSON-LD + C.4 BreadcrumbList
- `apps/web/src/app/[locale]/(shop)/menu/page.tsx` — fetch
  `/seo/structured-data/:slug`, inject as `<JsonLd>`, add
  `<BreadcrumbList>` for `Home → Menu`.
- Add small `fetchStructuredData(slug)` helper next to
  `lib/seo/fetch-restaurant.ts`.
- Slug source: derive from the public `/restaurant` endpoint we already
  fetch in the locale layout. To avoid double-fetching, expose a shared
  cached `getPublicRestaurant()` that returns the slug too.

### Step 4 — A.4 Reservations JSON-LD
- `apps/web/src/app/[locale]/(marketing)/reservations/page.tsx` — fetch
  restaurant, emit `Restaurant` node with `potentialAction: ReserveAction`
  using the same `buildRestaurantSchema()` + a new `buildReserveAction()` helper.
- Add the helper to `lib/seo/json-ld.tsx`.

### Step 5 — A.5 AggregateRating
Per Google Structured-Data policy, `AggregateRating` must reflect content
visible on the page. Reviews are NOT yet rendered on `/` or `/about`
(backlog D.1 confirms). Therefore A.5 cannot ship as JSON-LD-only without
violating policy.

**Decision**: emit `AggregateRating` on the `Restaurant` schema only when
the page surfaces the rating value in user-visible text. The seeded landing
page mentions a `t('stats.ratingValue')` stat — that's a visible rating
display. So A.5 is shippable specifically on the `/about` page (which
renders `t('stats.ratingValue')`) — wire it there.

Files:
- `apps/web/src/app/[locale]/(marketing)/about/page.tsx` — fetch public
  reviews aggregate, emit AggregateRating-augmented Restaurant schema.
- Public API needs an aggregate endpoint. Look for an existing one in
  `apps/api/src/seo/seo.service.ts` (already aggregates inside
  `/seo/structured-data/:slug`) — reuse that.

### Step 6 — C.1/C.2/C.3 Dynamic OG images
Use `next/og` `ImageResponse` for:
- `apps/web/src/app/opengraph-image.tsx` — root brand cover
- `apps/web/src/app/[locale]/(shop)/menu/opengraph-image.tsx` — menu collage
- `apps/web/src/app/[locale]/(marketing)/about/opengraph-image.tsx`
- `apps/web/src/app/[locale]/(marketing)/locations/opengraph-image.tsx`
- `apps/web/src/app/[locale]/(marketing)/reservations/opengraph-image.tsx`

Each uses brand tokens (Fraunces, brand color from Tailwind config) — no
external network fetches at build time. Read restaurant name/cover from
the public restaurant endpoint cached at 3600s.

## Out of scope
- B.1 owner architectural decision
- D.1/D.2 reviews UI surface (rendering UI, separate scope)
- E.* GEO content
- F.* owner off-site actions

## Test plan per step
- Step 0: visit `/robots.txt` and `/sitemap.xml` after deploy → URLs must
  point at `https://szefdonald.pl`, not localhost.
- Step 1: `pnpm db:generate` clean, full `pnpm typecheck` + `pnpm lint`
  green, admin restaurant page renders new section.
- Step 2: `/contact` and `/locations` page source shows distinct
  `<title>` tags.
- Step 3: View page source on `/menu` → contains `application/ld+json`
  with `@type: Menu` graph + `BreadcrumbList`.
- Step 4: View page source on `/reservations` → contains Restaurant
  schema with `potentialAction.ReserveAction`.
- Step 5: View page source on `/about` → Restaurant schema includes
  `aggregateRating` (only if reviewCount > 0).
- Step 6: For each page, set the `og:image` meta tag and visit the OG
  image URL directly — should render a styled PNG.
- Full repo: `pnpm typecheck && pnpm lint && pnpm --filter @repo/web test
  && pnpm --filter @repo/admin test`.
