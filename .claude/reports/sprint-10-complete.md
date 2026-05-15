# Sprint 10 — Marketing Pages + SEO — Completion Report

**Date:** 2026-05-15
**Scope:** Contact form (public submit + admin inbox), marketing
landing/about aggregation, SEO (schema.org JSON-LD, sitemap.xml, robots.txt,
meta). Backend + frontend data layer. **NO UI** (pages return `null` +
`// TODO(ui):`; sitemap/robots are data-only route handlers).

---

## Summary

Delivered. 1 new migration (`ContactMessage`), 3 new NestJS modules
(`contact`, `marketing`, `seo`), 3 new shared-type files, 2 pure SEO builders
in `@repo/utils` (+6 unit tests), `email.contact` job + processor branch,
api-client `marketing/contact/seo` resources (+ a `raw` text-response mode for
sitemap/robots), web + admin data hooks, marketing route placeholders +
data-only `sitemap.xml`/`robots.txt` route handlers, additive seed, 3 new e2e
specs.

Pipeline: **typecheck 15/15 · lint 4/4 · unit suites all green** (utils
15→21). e2e specs written, not executed here — see "Environment / verification".

---

## Files created / modified

### `packages/db/`
- `prisma/schema.prisma` — new `ContactMessage` model + 2 indexes
- **NEW** `prisma/migrations/20260515120000_add_sprint_10_tables/migration.sql`
- `seed.ts` — `contact:read` added to ALL_PERMISSIONS mirror; `seedContactMessages`

### `packages/types/`
- **NEW** `src/contact.ts`, `src/marketing.ts`, `src/seo.ts`
- `src/permissions.ts` — `contact:read` (owner + manager via existing filter)
- `src/index.ts` — re-exports

### `packages/utils/`
- **NEW** `src/structured-data.ts` (+ `.test.ts`, 3 tests)
- **NEW** `src/sitemap.ts` (+ `.test.ts`, 3 tests) — re-exported

### `packages/jobs/`
- `src/queues.ts` — `JOB_EMAIL_CONTACT`
- `src/payloads.ts` — `EmailContactPayloadSchema`

### `packages/api-client/`
- `src/client.ts` — `marketing.*`, `contact.*`, `seo.*`; new `raw` request
  mode for text bodies (sitemap/robots); type imports + return wiring

### `apps/api/`
- **NEW** `src/contact/` — module, controller, service (public submit +
  Redis per-IP throttle + email enqueue; admin list/patch under `contact:read`)
- **NEW** `src/marketing/` — module, controller, service (landing/about
  aggregation; tz-aware today-hours)
- **NEW** `src/seo/` — module, controller, service (JSON-LD, sitemap.xml,
  robots.txt, meta)
- `src/jobs/email.processor.ts` — `JOB_EMAIL_CONTACT` branch (notify
  restaurant + sender auto-reply)
- `src/app.module.ts` — `ContactModule`, `MarketingModule`, `SeoModule`
- `test/setup-e2e.ts` — `contact:read` in ALL_PERMISSIONS; `contactMessage`
  cleanup in `resetMenuDb`
- **NEW** `test/contact.e2e-spec.ts`, `test/marketing.e2e-spec.ts`,
  `test/seo.e2e-spec.ts`

### `apps/web/`
- **NEW** `src/features/marketing/hooks/index.ts`,
  `src/features/contact/hooks/index.ts`
- **NEW** `(marketing)/{about,locations,contact}/page.tsx` (null + TODO)
- **NEW** `app/sitemap.xml/route.ts`, `app/robots.txt/route.ts`
  (data-only proxies to the API SEO endpoints — no JSX)

### `apps/admin/`
- **NEW** `src/features/contact/hooks/index.ts`
- **NEW** `(dashboard)/contact/page.tsx` (null + TODO)

---

## Environment / verification

Same constraint as Sprint 9 — **no Postgres / Redis** in this container.

```
pnpm typecheck      ✓ 15/15
pnpm lint           ✓ 4/4
pnpm test (unit)    ✓ api 43 · utils 21 · auth-core 12 · web 10 · admin 10 · mobile 0
prisma validate     ✓ schema valid (dummy DATABASE_URL)
prisma generate     ✓ client regenerated
```

Written + committed for a DB-enabled run: `test/contact.e2e-spec.ts`,
`test/marketing.e2e-spec.ts`, `test/seo.e2e-spec.ts`. Migration SQL is
hand-authored to match the existing `prisma/migrations/*` convention.

---

## Decisions Applied (from plan §DEFAULTS)

| # | Default | How implemented |
|---|---------|-----------------|
| 9 | Contact form | public `POST /contact` → `ContactMessage` + `email.contact` (restaurant notify + sender auto-reply); Redis per-IP throttle (5 / 10 min); admin list/patch under new `contact:read` |
| 10 | Marketing aggregation | `GET /marketing/landing` + `/about` compose featured items / active promotions / visible-review aggregate rating / active-location summaries — no CMS model |
| 11 | SEO | pure `@repo/utils` builders; API serves JSON-LD, `sitemap.xml` (`application/xml`), `robots.txt` (`text/plain`), `meta` (title/description/image/canonical). OG **image rendering** deferred to UI sprint; metadata endpoint provided |
| 12 | Additive migration only | one new migration; no existing migration altered |

---

## Open decisions for review

1. **`contact:read` gates both list AND status-patch.** I did not introduce
   a separate `contact:write` to avoid permission sprawl for a 3-state
   triage field. If you want stricter separation, add `contact:write` and
   swap the `PATCH /admin/contact/:id` decorator.
2. **Restaurant resolution = first active when no `restaurantId`.** Marketing/
   SEO endpoints target a single restaurant; the platform is single-location
   today (per project plan). Multi-location will need an explicit slug/host
   resolver — flagged, not built.
3. **`sitemap.xml` / `robots.txt` exposed as Next route handlers** proxying
   the API (data-only, no JSX). The UI sprint may swap to native
   `MetadataRoute` — the API stays the source of truth either way.

---

## Known gaps / deferred items

- **Dynamic OG image generation** — runtime/Next `ImageResponse` concern;
  deferred to the UI sprint. `GET /seo/meta` returns the image URL/metadata
  the UI needs now.
- **Performance budget (LCP < 2s)** — a frontend/runtime measurement, not
  applicable to a no-UI data-layer sprint; deferred to the UI sprint.
- **Blog/MDX** (optional in master plan §8) — explicitly out of scope.
- e2e specs unexecuted here (no DB) — see "Environment".

---

## Bring-up notes

- **New migration:** `20260515120000_add_sprint_10_tables`. Run
  `pnpm db:migrate:deploy` then `pnpm db:generate`.
- **New seed:** 2 contact messages (idempotent on empty table).
- **New permission:** `contact:read` — auto-granted to `owner` + `manager`
  (existing `manager` filter only excludes `staff:write`/`settings:write`).
  `cashier`/`kitchen` unchanged. Re-run `pnpm db:seed` to sync the
  permission/role rows.
- **New env:** none. SEO absolute URLs use the existing `APP_URL_WEB`.
- **New endpoints:** `POST /contact`, `GET /admin/contact`,
  `PATCH /admin/contact/:id`, `GET /marketing/landing`,
  `GET /marketing/about`, `GET /seo/structured-data/:slug`,
  `GET /seo/sitemap.xml`, `GET /seo/robots.txt`, `GET /seo/meta`.
  Confirm in Swagger `/api/v1/docs`.

## What to know before the next sprint

- The contact email auto-reply + restaurant notification both go through the
  existing `email` queue/mailer (MailHog in dev). No new templates were added
  (inline HTML/text) — a follow-up could move these into
  `apps/api/src/mailer/templates/` for consistency with verification/reset.
- `@repo/utils` now owns the SEO builders; keep schema.org/sitemap shaping
  there (pure + unit-tested) rather than in the controller.
- Sprints 9 + 10 are committed on `claude/sprints-9-10-planning-1pHW0`.
  Remaining master-plan sprints: 11 (i18n/RTL/loyalty/reviews/favorites/
  referral) and 12 (hardening/launch). The concurrency/multi-tenant hardening
  backlog from the Sprint 3–8 audit is still recommended before production.
