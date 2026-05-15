# Sprint 9 + 10 — Combined Plan (NO UI)

> Continues the established process: backend + frontend **data layer** only.
> No JSX, no Tailwind/NativeWind, no shadcn, no design tokens. Page/screen
> files are `return null` + `// TODO(ui):`. UI is a later, separate phase.

## Context snapshot (verified against live code)

- Master plan §12: **Sprint 9 = Mobile Polish + Push**, **Sprint 10 = Marketing Pages + SEO**.
- Sprints 0–8 + pre-sprint-6 hardening + cross-sprint audit are complete and green
  (typecheck 15/15, lint 4/4, e2e 70). Audit backlog items are tracked, not blockers.
- `PushToken`, `Notification`, `LoyaltyAccount`, `LoyaltyTransaction`, `Review`
  models already exist in `schema.prisma`. No `ReviewImage`, no notification
  preference model, no `ContactMessage`.
- `notifications` module exists but is **dispatch-only** (no controller/service):
  `Notification` rows are written, but there is **no API to read them and no
  push-token registration endpoint**. `push.processor.ts` already sends via the
  real Expo SDK but does not handle `DeviceNotRegistered` receipts.
- No `loyalty` module/endpoint. No `marketing`/`contact`/`seo` modules.
- `uploads` presign supports `menu-item-image|restaurant-logo|restaurant-cover`
  — no `review-image` kind.
- Conventions confirmed: controller+service+module, `@Permissions`,
  `ZodValidationPipe(Schema)`, `@Public`, `@CurrentUser`, cursor pagination,
  Redis idempotency, BullMQ queue names in `@repo/jobs`, processors in
  `apps/api/src/jobs/`, api-client resources in `packages/api-client/src/client.ts`,
  hooks in `apps/{web,admin,mobile}/src/features/<domain>/hooks/`.
- **Environment limitation:** this container has **no Postgres and no Redis**,
  so `migrate:deploy` and the e2e/DB-backed suites cannot execute here.
  Migrations are authored as hand-written SQL following the existing
  `prisma/migrations/*/migration.sql` pattern (same approach Sprints 7 & 8 used);
  `prisma validate` + `prisma generate` + `typecheck` + `lint` + pure-unit tests
  are the executable gates. e2e specs are written and committed so they run in a
  DB-enabled environment. This is called out explicitly in both reports.

## DEFAULTS — applied automatically (noted in reports)

1. **Notification preferences**: new `NotificationPreference` (one row per user,
   lazily created with sensible defaults: order updates on for push/email/sms,
   promotions opt-out by default). In-app feed always written. Dispatcher
   consults prefs before enqueueing email/sms/push.
2. **Deep links**: canonical scheme `restaurant://` (from `APP_DEEP_LINK_SCHEME`).
   Helper `packages/utils/deep-link.ts` builds `restaurant://orders/{id}` etc.
   Push payloads carry `data.url`.
3. **Push token lifecycle**: register = idempotent upsert keyed by unique
   `token`; on Expo `DeviceNotRegistered` ticket the token row is deleted
   inline by the processor; a daily `push.token-cleanup` repeatable job prunes
   tokens unused > 60d. `PushToken` gains `lastUsedAt DateTime?`.
4. **Repeatable job scheduler bootstrap**: implement the
   `OnApplicationBootstrap` scheduler that prior reports deferred — registers
   push cleanup (daily), analytics rollup (hourly + nightly), reports cleanup
   (daily), reservation no-show sweep (every 10 min). Idempotent via stable
   `jobId`s. Closes a known gap; required for "full push integration".
5. **Order tracking snapshot**: `GET /orders/:id/tracking` returns status +
   ordered status timeline + ETA + restaurant/delivery geo points. ETA is a
   documented deterministic heuristic (prep estimate from item `prepMinutes`
   sum capped + status offset + fixed delivery leg). Realtime continues via the
   existing socket; this endpoint is the initial snapshot the map screen reads.
6. **Review photos**: `CreateReviewSchema` accepts `imageKeys?: string[]`
   (max 5) obtained via the existing presign flow; new `review-image` upload
   kind; new `ReviewImage` model; images returned in review DTOs.
7. **Loyalty (Sprint 9 = read-only)**: `GET /loyalty/me` (+ lazily create a
   zero/`bronze` account), `GET /loyalty/me/history` (cursor). Earn/redeem stays
   Sprint 11 — not implemented.
8. **Offline cart (mobile)**: persist the existing Zustand cart store to
   `expo-secure-store`/AsyncStorage and add a `useCartSync()` data hook that
   reconciles the local cart with the server cart on reconnect/login. No UI.
9. **Contact form**: public `POST /contact` → `ContactMessage` row +
   `email.contact` job (notify restaurant + autoreply). Admin list/triage under
   new `contact:read` permission. Light Redis idempotency + per-IP throttle.
10. **Marketing aggregation**: `GET /marketing/landing` composes existing data
    (featured items, active promotions = "specials", visible-review aggregate
    rating, active-location summaries). No CMS model — social proof derives from
    `Review`.
11. **SEO**: pure builders in `packages/utils` (`structured-data.ts`,
    `sitemap.ts`). API exposes JSON-LD, `sitemap.xml`, `robots.txt`. Dynamic OG
    **image rendering** is a Next/runtime concern → deferred to the UI sprint;
    a `GET /seo/meta?path=` returns the title/description/image **metadata** the
    UI will need (data layer only).
12. **No new migrations rewritten**; two new additive migrations only
    (`add_sprint_9_tables`, `add_sprint_10_tables`).

## Sprint 9 — Mobile Polish + Push

### 9.A Schema + types + permissions
- Migration `add_sprint_9_tables`: `ReviewImage`, `NotificationPreference`;
  `PushToken.lastUsedAt DateTime?`; `Review.images` relation.
- `prisma generate`.
- Types: NEW `notification.ts`, `loyalty.ts`; extend `review.ts` (+`imageKeys`,
  `ReviewImageDto`, images on `ReviewDto`); extend `upload.ts` (`review-image`);
  add `OrderTrackingDto` to `order.ts`. Re-export from `index.ts`.
- No new permission keys in Sprint 9 (all current-user-scoped).

### 9.B Backend modules
1. `notifications`: add `NotificationsController` + `NotificationsService` —
   feed list (cursor), unread-count, mark-read, read-all, push-token
   register/unregister, preferences get/patch. Update
   `NotificationDispatcherService` to consult prefs. Deep-link in push payload.
2. `loyalty`: read-only controller+service (`/loyalty/me`, `/loyalty/me/history`).
3. `orders`: add `GET /orders/:id/tracking` (controller method + service +
   `order-tracking.ts` ETA helper). Owner-or-admin / order-token access, mirrors
   existing `getById` guard. **Does not touch admin orders route files.**
4. `reviews`: photo support (service creates `ReviewImage`, validates ≤5 keys,
   DTO mapping). `uploads`: add `review-image` to `KIND_PREFIX`.
5. `SchedulersService` (new, in a small `scheduler` module) — `OnApplicationBootstrap`
   repeatable-job registration.

### 9.C Jobs
- `@repo/jobs`: `JOB_PUSH_TOKEN_CLEANUP` (push queue). Payloads as needed.
- `push.processor`: handle Expo tickets → delete `DeviceNotRegistered` tokens;
  set `data.url` deep link; bump `lastUsedAt`. Add cleanup job branch.

### 9.D Frontend data layer
- api-client: `notifications.*`, `loyalty.*`, `orders.getTracking`,
  `reviews.create` (+imageKeys), `uploads.presign` already generic.
- Hooks: mobile-first (`apps/mobile/src/features/notifications`,
  `loyalty`, plus `useRegisterPushToken`, `useOrderTracking` snapshot,
  `useCartSync`); mirror feed/loyalty/tracking hooks on web (account surface).
- Route placeholders (null + TODO): mobile `app/notifications.tsx`,
  `app/account/loyalty.tsx`, `app/account/notifications.tsx`,
  `app/orders/[id].tsx` (if missing); web `(account)/loyalty/page.tsx`,
  `(account)/notifications/page.tsx` (if missing).

### 9.E Seed (additive)
- `seedLoyalty()`, `seedNotifications()`, `seedNotificationPreferences()`,
  `seedReviewImages()` (guarded on existing reviews).

### 9.F Tests
- e2e: `notifications.e2e-spec.ts`, `loyalty.e2e-spec.ts`,
  `order-tracking.e2e-spec.ts`, extend `reviews.e2e-spec.ts` (images).
- unit: `deep-link.spec.ts`, `order-tracking.spec.ts` (ETA),
  preference-gating unit on dispatcher.
- Gate: `pnpm typecheck && pnpm lint && pnpm test` (+ e2e where DB available).

## Sprint 10 — Marketing Pages + SEO

### 10.A Schema + types + permissions
- Migration `add_sprint_10_tables`: `ContactMessage`.
- Types: NEW `contact.ts`, `marketing.ts`, `seo.ts`. Re-export.
- New permission key `contact:read` (owner+manager). Update `permissions.ts`
  + mirror in `seed.ts` ROLE_PERMISSIONS.

### 10.B Backend modules
1. `contact`: public `POST /contact` (idempotent + throttled) → row +
   `email.contact` job; admin `GET /admin/contact` (cursor, `contact:read`),
   `PATCH /admin/contact/:id` (status).
2. `marketing`: public `GET /marketing/landing`, `GET /marketing/about`
   (compose existing menu/promotion/review/restaurant data).
3. `seo`: public `GET /seo/structured-data/:slug` (JSON-LD),
   `GET /seo/sitemap.xml`, `GET /seo/robots.txt`, `GET /seo/meta?path=`.
   Pure builders in `packages/utils`.

### 10.C Jobs
- `@repo/jobs`: `JOB_EMAIL_CONTACT`. `email.processor` branch (restaurant
  notify + customer autoreply via mailer; reuse existing mail transport).

### 10.D Frontend data layer
- api-client: `marketing.*`, `contact.*`, `seo.*`.
- Hooks: web `features/marketing/hooks`, web `features/contact/hooks`,
  admin `features/contact/hooks`.
- Route placeholders (null + TODO): web `(marketing)/{page,about/page,
  locations/page,contact/page}.tsx`; thin data-only `app/sitemap.ts` +
  `app/robots.ts` route handlers proxying the seo endpoints (no JSX).

### 10.E Seed (additive)
- `seedContactMessages()` (2 sample messages).

### 10.F Tests
- e2e: `contact.e2e-spec.ts`, `marketing.e2e-spec.ts`, `seo.e2e-spec.ts`.
- unit: `structured-data.spec.ts`, `sitemap.spec.ts`.
- Gate: `pnpm typecheck && pnpm lint && pnpm test` (+ e2e where DB available).

## Reporting
- `.claude/reports/sprint-9-complete.md` after Sprint 9 verification.
- `.claude/reports/sprint-10-complete.md` after Sprint 10 verification.
- Each: files by package, verification results (incl. the env DB caveat),
  Decisions Applied, Open decisions, known gaps, bring-up notes.

## Open questions (none blocking — defaults cover all)
- Promo/loyalty **push broadcast** (admin-initiated) is *not* in master-plan
  Sprint 9 scope → deferred to Sprint 11 loyalty/promo work. Preferences model
  is built now so it's ready.
- Dynamic OG image rendering deferred to the UI sprint (runtime/Next concern);
  metadata endpoint provided now.
