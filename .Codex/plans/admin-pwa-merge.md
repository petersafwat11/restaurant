# Admin dashboard PWA integration

## Objective

Merge the useful admin-PWA work from
`origin/claude/order-notifications-management-ko53v6` into the latest `main`, then finish and
verify it so every current admin route continues to work in both a normal browser tab and an
installed standalone window.

This plan interprets "fully working as a PWA" as:

- installable with correct branding on supported desktop, Android, and iOS browsers;
- normal online dashboard behavior in standalone mode, including authentication, locale routing,
  API requests, realtime orders, and every current admin page;
- a safe offline screen when the network is unavailable;
- predictable service-worker updates without stale authenticated pages;
- no claim that order editing or API-backed data works offline.

## Source-branch findings

- Branch: `origin/claude/order-notifications-management-ko53v6`
- Divergence point: `7631906`
- Relevant commits:
  - `73ea5a3` adds an older SMS + WhatsApp + web-push order-alert backend.
  - `be19578` adds the admin manifest, SVG icon, push-only service worker, and web-push toggle.
  - `188cf53` changes the lockfile for the `web-push` dependency.
  - `1bc01ca` fixes a test in that older notification pipeline.
- A dry-run merge against current `main` reports ten content conflicts: `.env.example`, the API
  package, jobs module, three notification files, API client, two shared job files, and lockfile.
- Since the branch split, `main` received the responsive admin overhaul, eService payment work,
  updated notification/realtime code, deployment hardening, and many dashboard changes.
- The old PWA manifest only has an SVG icon and therefore misses the standard 192x192 and 512x512
  PNG checks. Its service worker handles push events only; it has no offline fallback, cache
  versioning, or update policy. Service-worker registration happens only when web push is enabled.
- There is no matching PWA/settings design in `design-assets/admin`; that folder contains only
  `.gitkeep`. Existing admin components and design tokens will therefore be the visual reference.

## Scope decision

The source branch combines two separable concerns: PWA installation and a new alert-delivery
backend. Current repository scope defines supported notification channels as in-app, email, and
Twilio SMS. This integration will merge and finish the PWA concern while retaining current
notifications and realtime alerts. It will not restore the old WhatsApp queue, VAPID subscription
tables/endpoints, or the removed mobile-push infrastructure.

Consequences:

- No Prisma schema change or migration.
- No new API endpoint, permission, BullMQ queue, VAPID secret, or `web-push` dependency.
- Existing foreground order chime/browser notification and Socket.IO behavior remain unchanged.
- Background web push while the dashboard is fully closed is a separate future feature, not a
  prerequisite for installability or standalone operation.

## Merge strategy

1. Confirm `main` and the working tree state, keeping the approved plan file.
2. Create `codex/admin-pwa` from the current `main`.
3. Merge `origin/claude/order-notifications-management-ko53v6` with `--no-commit --no-ff` so the
   final commit records the source branch as a parent.
4. Resolve conflicts in favor of current `main` for API, database, jobs, notification contracts,
   environment configuration, and lockfile.
5. Remove branch-only WhatsApp/web-push backend files and old planning artifacts from the merge.
6. Retain the branch's PWA intent, but replace its incomplete frontend artifacts with the updated
   implementation described below.
7. Commit only after all acceptance checks pass. The resulting merge can be reverted as one merge
   commit if a production rollback is needed.

## Implementation details

### 1. Manifest and metadata

- Add an App Router manifest at `apps/admin/src/app/manifest.ts` using
  `MetadataRoute.Manifest`, rather than a hand-maintained public JSON file.
- Define a stable app `id`, `scope: '/'`, and `start_url: '/'`. The current next-intl middleware
  and `NEXT_LOCALE` cookie will select Polish or English without pinning installation to one locale.
- Set `name`, `short_name`, description, `display: 'standalone'`, theme color, background color,
  portrait/any orientation as appropriate, and `prefer_related_applications: false`.
- Do not add manifest shortcuts to permission-sensitive screens; the app will launch at the normal
  authenticated dashboard entry and use existing role/permission navigation.
- Update the locale layout metadata/viewport with the manifest, icon, Apple web-app, and theme
  declarations without changing the provider or next-intl structure.

### 2. Brand assets

- Use the existing Szef Donald brand mark from `apps/web/public/icon.png` / `apple-icon.png`; do
  not introduce a new logo or visual style.
- Generate and inspect these admin assets:
  - 192x192 PNG icon;
  - 512x512 PNG icon;
  - 512x512 maskable PNG with the mark kept inside the safe zone on the admin background color;
  - 180x180 Apple touch icon;
  - browser favicon if the existing metadata does not provide one.
- Record exact dimensions and ensure transparency/background treatment does not clip the mark.

### 3. Service worker and cache safety

- Add `apps/admin/public/sw.js` and register it automatically in production from a small client
  component mounted by `AppProviders`; installation must not depend on enabling notifications.
- Register with root scope and `updateViaCache: 'none'`.
- Use a versioned cache and delete older app-owned caches during activation.
- Cache only public PWA shell assets needed for the offline screen and immutable same-origin
  `/_next/static/` assets.
- Keep API requests, Socket.IO, RSC/Flight requests, auth/session requests, mutations, and normal
  authenticated document responses network-only. Never store dashboard HTML or API payloads in
  Cache Storage.
- For failed document navigation, return a dedicated public-safe offline page. Failed API calls
  continue through the application's existing error handling rather than returning fabricated data.
- Ignore non-GET, cross-origin, browser-extension, and unsupported request schemes.
- Handle activation/controller changes once and surface online/offline/update state without reload
  loops or interruption during an active order edit.

### 4. Offline and installation UX

- Add a localized offline route/page outside the protected dashboard layout. It will use current
  admin tokens/components and provide retry/reload guidance without exposing user/order data.
- Add a localized PWA section to the existing Settings page using `SettingsSectionCard`:
  - show installed/standalone state;
  - expose an Install action only when `beforeinstallprompt` is available;
  - provide concise iOS Safari “Share → Add to Home Screen” guidance when relevant;
  - show an already-installed or browser-managed message otherwise;
  - show online/offline status and a reload action when a new worker is ready.
- Add Polish and English strings in the existing admin settings message files and regenerate the
  merged i18n message module if the repository generator requires it.
- Keep all controls keyboard accessible and avoid asking for notification permission.

### 5. Response headers and production deployment

- Add Next.js route headers for `/sw.js`:
  - `Content-Type: application/javascript; charset=utf-8`;
  - `Cache-Control: no-cache, no-store, must-revalidate`;
  - a same-origin service-worker CSP;
  - `Service-Worker-Allowed: /` if required by the final location/scope.
- Verify the generated manifest is served as `application/manifest+json` and icons are cacheable.
- Confirm Caddy passes the service-worker-specific headers. Change `deploy/Caddyfile` only if an
  end-to-end header check proves the proxy overrides them.
- No new Docker environment variables or production secrets are expected.
- Add/update an admin-PWA runbook covering installation, updates, cache reset/uninstall, HTTPS,
  and the intentionally online-only handling of authenticated data.

## Expected file impact

Likely additions:

- `apps/admin/src/app/manifest.ts`
- `apps/admin/src/app/[locale]/offline/page.tsx`
- `apps/admin/src/components/pwa/pwa-provider.tsx`
- `apps/admin/src/components/pwa/pwa-settings-card.tsx`
- `apps/admin/src/components/pwa/__tests__/pwa-provider.test.tsx`
- `apps/admin/public/sw.js`
- `apps/admin/public/icons/*`
- `docs/runbooks/admin-pwa.md`

Likely modifications:

- `apps/admin/src/app/[locale]/layout.tsx`
- `apps/admin/src/app/[locale]/(dashboard)/settings/page.tsx`
- `apps/admin/src/providers/app-providers.tsx`
- `apps/admin/next.config.ts`
- `packages/i18n/messages/en/admin/settings/general.json`
- `packages/i18n/messages/pl/admin/settings/general.json`
- possibly generated `packages/i18n/src/messages.ts`

Explicitly unchanged after conflict resolution:

- `packages/db/prisma/schema.prisma` and migrations
- `apps/api/src/**`
- `packages/jobs/**`
- `packages/api-client/**`
- `.env.example` and production secret configuration
- the current notification and payment pipelines

## Verification plan

### Automated checks

1. Add Vitest coverage for service-worker registration, unsupported browsers, install-event state,
   installed display mode, online/offline transitions, and one-time update activation behavior.
2. Add a manifest contract test for `id`, root scope/start URL, display mode, colors, and required
   192/512/maskable icon entries.
3. Validate both locale message trees.
4. Run:
   - `pnpm --filter @repo/i18n test`
   - `pnpm --filter @repo/admin lint`
   - `pnpm --filter @repo/admin typecheck`
   - `pnpm --filter @repo/admin test`
   - `pnpm --filter @repo/admin build`
5. Start the production admin build and verify response codes/content types/cache headers for `/`,
   `/manifest.webmanifest`, `/sw.js`, the offline route, and every icon.

### Browser checks

Use a Chromium-based browser against the production build and inspect the Application panel:

- manifest parses with no installability errors and shows the correct icons/colors;
- service worker installs, controls the root scope, updates cleanly, and owns no stale caches;
- installation launches without browser chrome in standalone mode;
- locale selection persists across launch and direct route navigation;
- login/logout and refresh-token restoration behave exactly as in browser mode;
- realtime status reconnects after resume and current order alerts/chime still work;
- going offline and navigating shows the safe offline page;
- returning online and retrying restores the requested route;
- cached storage contains no API responses, user records, orders, or authenticated page HTML.

### Dashboard regression matrix

Verify representative desktop and mobile/standalone viewports for every current route group:

- authentication: login, forgot/reset, verify;
- overview;
- orders list and order detail;
- kitchen display;
- menu and modifier editing;
- customers and customer detail;
- reservations;
- promotions;
- reviews;
- staff;
- restaurant profile/configuration;
- settings, hours, and holidays;
- reports/exports if present;
- audit log and contact inbox.

For API-backed pages, “passes” means the existing loading/error/permission behavior is unchanged,
no route fails because it is standalone, and no route is incorrectly served from an offline cache.

## Acceptance criteria

- The source branch is represented in the final merge history.
- No unresolved conflict or unrelated working-tree change remains.
- The latest `main` dashboard, payment, deployment, and notification behavior is preserved.
- Manifest meets the current Next.js/Chromium baseline, including 192x192 and 512x512 PNG icons.
- Admin installs from HTTPS and opens under root scope in standalone mode.
- Service worker is registered independently of notifications and updates without a reload loop.
- Offline navigation shows a branded, localized, non-sensitive fallback.
- Cache inspection confirms no authenticated HTML, API response, or mutation is cached.
- Polish and English PWA UI is complete and accessible.
- All targeted checks, tests, production build, endpoint/header checks, and route smoke tests pass.
- Any environment-only limitation that prevents a physical-device/iOS installation check is called
  out explicitly in the final handoff rather than reported as verified.

## Rollback

- All work is isolated on `codex/admin-pwa` until verification succeeds.
- The final integration is one merge commit, so production rollback is a normal revert of that
  merge commit.
- Service-worker cache names are versioned; a rollback worker can delete the PWA-owned caches and
  return the app to network-only behavior.
- There is no database rollback, secret rotation, or queue cleanup because this scope adds none.

## References used to complete the plan

- Next.js App Router PWA guide (manifest, registration, headers, HTTPS/security)
- Next.js manifest metadata-file convention
- MDN installability requirements and manifest scope behavior
- Chrome installable-manifest guidance
