# Sprint 11 + 12 — Combined Plan (NO UI)

> Continues the established process: backend + frontend **data layer** only.
> No JSX, no Tailwind/NativeWind, no shadcn, no design tokens. Page/screen
> files are `return null` + `// TODO(ui):`. UI is a later, separate phase.
> Final two master-plan sprints.

## Context snapshot (verified against live code)

- Master plan §12: **Sprint 11 = i18n + RTL + Loyalty + Reviews + Favorites
  + Referral**, **Sprint 12 = Hardening + Launch** (Sentry, PostHog, k6
  load test, pen-test pass, backup/DR runbook, feature-flag soft launch).
- Sprints 0–10 + pre-sprint-6 hardening + cross-sprint audit complete and
  green (typecheck 15/15, lint 4/4, unit suites green). e2e specs written,
  run in a DB-enabled environment.
- **Environment limitation persists:** no Postgres / no Redis in this
  container. Migrations hand-authored as SQL matching the existing
  `prisma/migrations/*/migration.sql` pattern; executable gates are
  `prisma validate` + `prisma generate` + `pnpm typecheck` + `pnpm lint` +
  pure-unit tests. e2e specs are written + committed for a DB run. Both
  reports restate this caveat.
- Verified facts driving the plan:
  - `LoyaltyAccount` (points, tier) + `LoyaltyTransaction` (delta, reason,
    orderId?) exist. `loyalty` module is **read-only** (`/loyalty/me`,
    `/loyalty/me/history`) — earn/redeem deferred here by design.
  - `Order.loyaltyPointsUsed` / `Order.loyaltyPointsEarned` columns already
    exist (no migration needed for those).
  - Order lifecycle is event-driven: `applyTransition` emits
    `order.status_changed`; listeners use `@OnEvent` (realtime gateway +
    notification dispatcher). Loyalty earn/revoke hooks the same bus.
  - Pricing math is centralized in `PricingService.calculateTotals`
    (subtotal, tax, delivery, tip, discount, grand). Loyalty redemption is
    a server-recomputed discount, never client-trusted.
  - `packages/i18n` exists but `en.json`/`ar.json` are empty `{}`;
    `getDir`/`isLocale`/`LOCALES` helpers present. `User.locale` exists.
  - No `Favorite`, `Referral`, `ReferralCode`, `FeatureFlag` models.
  - `reviews` module: create (+images, 2-URL auto-hide), list (restaurant /
    mine / admin), moderate visibility. No owner-reply, no helpful votes,
    no aggregate endpoint.
  - Conventions confirmed: controller+service+module, `@Permissions`,
    `ZodValidationPipe(Schema)`, `@Public`, `@CurrentUser`, cursor
    pagination, Redis idempotency, BullMQ queue/job names in `@repo/jobs`,
    processors in `apps/api/src/jobs/`, api-client resources in
    `packages/api-client/src/client.ts`, hooks in
    `apps/{web,admin,mobile}/src/features/<domain>/hooks/`, env via
    `createEnv` (empty-string optional → stub behaviour, e.g. R2/Stripe).

## DEFAULTS — applied automatically (noted in reports)

1. **i18n catalogs are data, RTL audit is UI.** Populate `en.json` + `ar.json`
   with a single structured namespaced message catalog (auth, validation,
   menu, cart, checkout, order/status, account, loyalty, reviews,
   referral, notifications, errors, marketing, common). Add typed i18n
   runtime to `@repo/i18n`: a `MessageKey` union derived from `en.json`,
   `createTranslator(locale)` with `{var}` interpolation + simple
   ICU-style `{n, plural, ...}` for EN/AR plural rules, `negotiateLocale`
   (Accept-Language), and Intl currency/number/date formatters. The
   **visual RTL layout audit** is a UI concern → deferred to the UI sprint;
   the data-layer primitive (`getDir`, persisted-locale resolution) is
   delivered and documented as the audit's foundation.
2. **Server-side localized copy.** Backend notification/email/sms order-status
   copy resolves through the i18n catalog keyed off `User.locale` (fallback
   `DEFAULT_LOCALE`). `notification-matrix` copy becomes key-based; the
   dispatcher translates per recipient. No behaviour change when locale=en.
3. **Loyalty earn.** On `order.status_changed` → `COMPLETED`/`DELIVERED`,
   a `LoyaltyService` listener earns `floor(eligibleAmount * EARN_RATE)`
   points where eligible = `grandTotal - tip` (tips don't earn).
   Idempotent via `LoyaltyTransaction` unique `(accountId, orderId, kind)`
   with `kind='EARN'`. Writes `Order.loyaltyPointsEarned`. Recompute tier
   from `lifetimePoints` thresholds.
4. **Loyalty redeem.** Points apply at checkout as a server-computed
   discount. `POST /loyalty/redeem/quote` returns the max redeemable +
   value for a given subtotal (never trusts client value). Cart carries
   `loyaltyPointsToRedeem`; `OrdersService` re-validates balance, converts
   `points → discount` via `REDEMPTION_VALUE`, folds it into
   `PricingService` discount, writes `Order.loyaltyPointsUsed`, and burns
   points in the order transaction (idempotent, `kind='REDEEM'`).
5. **Loyalty reversal.** On `REFUNDED`/`CANCELLED`: revoke earned points
   (`kind='REVOKE'`, negative, idempotent) and refund redeemed points back
   (`kind='REDEEM_REVERSAL'`). Never drives balance negative (clamp at 0,
   logged). Constants (`EARN_RATE`, `REDEMPTION_VALUE`, tier thresholds)
   live in `@repo/utils/loyalty.ts` (pure + unit-tested), not magic numbers.
6. **Favorites.** New `Favorite(userId, menuItemId)` unique pair. Module
   `favorites`: `GET /favorites` (menu-item-detail join, cursor),
   `PUT /favorites/:menuItemId` (idempotent add), `DELETE
   /favorites/:menuItemId`, `GET /favorites/ids` (light id-set for UI
   heart-state). Customer-scoped (`@CurrentUser`, no new permission).
7. **Referral program.** Each user lazily gets a `ReferralCode` (stable
   8-char base32, derived + collision-checked). New signup may pass
   `referralCode`; creates a `Referral(referrerId, refereeId, status=
   PENDING)`. Referee's **first completed order** flips it to `COMPLETED`
   and grants loyalty points to **both** sides via the loyalty ledger
   (`kind='REFERRAL'`, idempotent). Self-referral + already-referred +
   unknown-code rejected. Endpoints: `GET /referrals/me` (code + link +
   stats), `GET /referrals` (my referrals, cursor). Reward constants in
   `@repo/utils/loyalty.ts`.
8. **Reviews increment (Sprint 11 "Reviews").** Reviews CRUD/moderation/
   photos already shipped (Sprints 7+9). Sprint 11 adds the remaining
   master-plan §8 review surface: **owner reply** (`review:moderate`
   gated, `Review.ownerReply`/`ownerReplyAt`) and a public **aggregate**
   endpoint (`GET /restaurants/:id/reviews/summary` → count + average +
   1–5 star histogram) feeding marketing/SEO `AggregateRating`. No
   helpful-votes (not in master plan).
9. **Sentry.** New `@repo/observability` with a Node init
   (`@sentry/node`, no-op when `SENTRY_DSN` empty — mirrors R2/Stripe
   stub pattern) + a Nest `SentryModule`/global exception filter that
   reports unhandled non-HTTP errors with request context (no PII bodies).
   Frontend (web/admin/mobile) get the init module + `instrumentation`
   wiring + env in `config-runtime`; React error-boundary UI is deferred
   to the UI sprint (documented).
10. **PostHog.** New `@repo/analytics` = typed event catalog (event name
    enum + Zod payload schemas, single source of truth like `@repo/jobs`)
    + a server capture client (no-op when `POSTHOG_KEY` empty). API emits
    key backend events (signup, order_placed, payment_succeeded,
    loyalty_redeemed, referral_completed) via a thin `AnalyticsService`.
    Frontends get a typed client wrapper + `useAnalytics()` hook (no UI,
    no autocapture/session-replay — those are UI-sprint runtime concerns).
11. **Feature flags.** New `@repo/feature-flags` typed flag catalog +
    evaluator (precedence: env override → `FeatureFlag` row → catalog
    default; optional `rolloutPercent` deterministic by userId hash). API:
    `FeatureFlagsModule`, `GET /feature-flags` (resolved map for current
    principal), `@FeatureFlag('key')` guard for gating routes, admin
    `GET/PATCH /admin/feature-flags` under new `settings:write`-adjacent
    `flags:write`. Frontends: `useFeatureFlag(key)` data hook. Safe
    defaults (all launch-gated flags default off).
12. **Hardening artifacts are real deliverables, not UI.** k6 scripts
    under `load/` (`order-flow.js`, `auth-flow.js`) + `load/README.md`
    runbook. `docs/runbooks/backup-dr.md` + `scripts/backup/` pg_dump/
    restore + redis snapshot scripts. `docs/security/pentest-checklist.md`
    produced by running the `security-review` skill over auth+payment;
    findings either fixed in-sprint (small, in-scope) or logged with
    severity + recommendation. New defensive e2e specs
    (`security-hardening.e2e-spec.ts`) assert: price-tamper rejection,
    `Idempotency-Key` replay, JWT tamper/expiry, webhook-signature
    rejection, permission-guard enforcement, loyalty/referral
    double-spend.
13. **Additive migrations only.** Two new migrations
    (`add_sprint_11_tables`, `add_sprint_12_tables`). No existing
    migration altered. `prisma generate` after each.

## Sprint 11 — i18n + RTL + Loyalty + Reviews + Favorites + Referral

### 11.A Schema + types + permissions
- Migration `add_sprint_11_tables`:
  - `Favorite(id, userId, menuItemId, createdAt)` `@@unique([userId,
    menuItemId])`, `@@index([userId])`; `User.favorites`,
    `MenuItem.favoritedBy`.
  - `ReferralCode(id, userId @unique, code @unique, createdAt)`;
    `Referral(id, codeId, referrerId, refereeId @unique, status,
    rewardGranted Boolean, createdAt, completedAt?)`; User relations
    `referralCode`, `referralsMade` (referrer), `referredBy` (referee).
  - `LoyaltyAccount.lifetimePoints Int @default(0)`.
  - `LoyaltyTransaction.kind String @default("ADJUST")`,
    `@@unique([accountId, orderId, kind])` (DB-level earn/redeem
    idempotency; null orderId rows stay distinct in Postgres).
  - `Cart.loyaltyPointsToRedeem Int @default(0)`.
- `prisma generate`.
- Types: NEW `favorite.ts`, `referral.ts`, `i18n.ts` (locale/message-key
  DTOs for the `/i18n/messages` endpoint); extend `loyalty.ts`
  (`LoyaltyRedeemQuoteSchema`, `LoyaltyRedeemQuoteDto`, `kind` on txn,
  `lifetimePoints`/`nextTier` on account); extend `review.ts`
  (`OwnerReplySchema`, `ownerReply`/`ownerReplyAt` on `ReviewDto`,
  `ReviewSummaryDto`); extend `cart.ts` (`loyaltyPointsToRedeem`);
  extend `auth.ts` register (`referralCode?`). Re-export from `index.ts`.
- No new permission keys (owner-reply reuses `review:moderate`;
  favorites/referral/loyalty are current-user-scoped).

### 11.B `@repo/i18n` + `@repo/utils` (pure, unit-tested)
- `@repo/i18n`: full `en.json` + `ar.json` namespaced catalogs (parallel
  key sets, validated equal by a unit test); `createTranslator`,
  interpolation + plural, `negotiateLocale`, Intl formatters,
  `getMessageCatalog(locale)`. Tests: key-parity, interpolation, plural
  (en/ar), locale negotiation, fallback.
- `@repo/utils/loyalty.ts`: `pointsForAmount`, `discountForPoints`,
  `maxRedeemablePoints`, `tierForLifetime`, `REFERRAL_*` — pure +
  `loyalty.test.ts`.

### 11.C Backend modules
1. `loyalty`: extend service — `earnForOrder`, `redeemForOrder`,
   `revokeForOrder`, `quoteRedemption`, tier recompute, idempotent
   ledger; `@OnEvent('order.status_changed')` listener;
   `POST /loyalty/redeem/quote`. `LoyaltyModule` exported for `orders`.
2. `orders`: checkout reads `cart.loyaltyPointsToRedeem`, re-validates
   balance, folds loyalty discount into pricing, writes
   `loyaltyPointsUsed`, burns points inside the order transaction;
   refund/cancel paths trigger loyalty reversal (via emitted event).
3. `cart`: `PATCH /cart/loyalty` to set/clear `loyaltyPointsToRedeem`
   (validated ≤ balance & ≤ subtotal-derived cap at quote time).
4. `favorites`: new module (controller+service+module) per Default 6.
5. `referrals`: new module per Default 7; `AuthService.register`
   consumes `referralCode`; loyalty grant on referee first completed
   order (listener in referrals service, idempotent via
   `Referral.rewardGranted` + loyalty unique key).
6. `reviews`: add `replyToReview` (`review:moderate`) + `getSummary`
   (public aggregate); wire summary into `marketing`/`seo` aggregate
   rating (replace the existing visible-review aggregate call).
7. `notifications`/`mailer`: copy resolves via `@repo/i18n` keyed by
   recipient `User.locale`; add `i18n` module exposing
   `GET /i18n/messages?locale=` (public, cached) so clients can hydrate.

### 11.D Jobs
- `@repo/jobs`: `JOB_PUSH_LOYALTY` (loyalty earn/referral push, push
  queue) + `JOB_EMAIL_REFERRAL_INVITE` (optional, email queue) +
  payload schemas. Processor branches reuse existing transports.
  Loyalty/referral side-effects enqueue (never awaited in handlers).

### 11.E Frontend data layer
- api-client: `favorites.*`, `referrals.*`, `loyalty.redeemQuote`,
  `cart.setLoyalty`, `reviews.reply`, `reviews.summary`,
  `i18n.getMessages`.
- Hooks: web + mobile `features/favorites/hooks`,
  `features/referrals/hooks`, extend `features/loyalty/hooks`
  (redeem-quote), `features/i18n/hooks` (`useMessages`, `useLocale`
  persisted via cookie (web/admin) / SecureStore (mobile) — data only);
  admin `features/reviews/hooks` (owner reply).
- Route placeholders (null + TODO) where missing: web/mobile
  `account/favorites`, `account/referrals`; admin reviews reply is an
  existing-page concern (hook only).

### 11.F Seed (additive)
- `seedFavorites()` (customer ↔ 3 items), `seedReferrals()` (1 completed
  + code for customer), extend `seedLoyalty()` with `lifetimePoints` +
  EARN/REDEEM/REFERRAL ledger rows; guarded/idempotent.

### 11.G Tests
- e2e: `favorites.e2e-spec.ts`, `referrals.e2e-spec.ts`,
  `loyalty-earn-redeem.e2e-spec.ts`, extend `reviews.e2e-spec.ts`
  (reply + summary), `i18n.e2e-spec.ts`.
- unit: `@repo/i18n` catalog/translator suite, `@repo/utils/loyalty`
  suite, loyalty earn/redeem/tier service unit, referral-grant
  idempotency unit.
- Gate: `pnpm typecheck && pnpm lint && pnpm test` (+ e2e where DB).

## Sprint 12 — Hardening + Launch

### 12.A Schema + types + permissions
- Migration `add_sprint_12_tables`: `FeatureFlag(id, key @unique,
  description?, enabled Boolean, rolloutPercent Int @default(0),
  updatedAt)`.
- `prisma generate`.
- Types: NEW `feature-flag.ts`, `observability.ts` (DSN/env-shape
  guards are config-runtime, DTOs here for `/feature-flags`); analytics
  event catalog lives in `@repo/analytics`. Re-export.
- New permission key `flags:write` (owner + manager). Update
  `permissions.ts` ROLE_PERMISSIONS + mirror `seed.ts` ALL_PERMISSIONS.

### 12.B New packages
- `@repo/observability`: `initNodeSentry(opts)` (no-op when DSN empty),
  `captureException`, `withScope` helpers; framework-agnostic.
- `@repo/analytics`: `ANALYTICS_EVENTS` const + per-event Zod payloads,
  `createAnalytics({key,host})` server client (no-op when key empty),
  shared client-config builder.
- `@repo/feature-flags`: `FLAG_CATALOG` (key → default + description),
  `evaluateFlag(key, ctx, {envOverride, dbRow})`, deterministic
  `rolloutBucket(userId,key)`; pure + unit-tested.

### 12.C Backend
- `config-runtime`/`apps/api/src/config/env.ts`: add `SENTRY_DSN`,
  `SENTRY_ENV`, `SENTRY_TRACES_SAMPLE_RATE`, `POSTHOG_KEY`,
  `POSTHOG_HOST`, `FEATURE_FLAG_OVERRIDES` (all optional, empty → off).
- `SentryModule` + global exception filter (composes with existing
  filter; reports 5xx/unhandled only, scrubs auth headers + bodies).
- `AnalyticsModule`/`AnalyticsService`: capture `signup`,
  `order_placed`, `payment_succeeded`, `loyalty_redeemed`,
  `referral_completed` (event-bus listeners; enqueue-safe / fire-and-
  forget, never blocking the request).
- `FeatureFlagsModule`: `GET /feature-flags`, admin `GET/PATCH
  /admin/feature-flags` (`flags:write`), `FeatureFlagGuard` +
  `@FeatureFlag()` decorator. Seed `FLAG_CATALOG` rows.
- Pen-test remediation: apply small in-scope fixes surfaced by the
  `security-review` skill (e.g. missing rate-limit, header hardening);
  larger findings logged in the checklist with severity.

### 12.D Frontend data layer
- `config-runtime`: web/admin/mobile env extended (public Sentry DSN +
  PostHog key vars) with empty-safe defaults.
- web/admin: `instrumentation.ts` + `sentry.*.config.ts` (init only,
  no UI), `lib/analytics.ts`, `features/feature-flags/hooks`
  (`useFeatureFlag`), `features/observability` (typed capture wrapper).
- mobile: `src/lib/observability.ts` + `src/lib/analytics.ts` init
  modules, `features/feature-flags/hooks`.
- api-client: `featureFlags.list`, `featureFlags.adminList/update`.

### 12.E Ops / docs deliverables
- `load/order-flow.js`, `load/auth-flow.js`, `load/README.md`
  (k6 thresholds: p95 latency, error-rate, RPS profile).
- `scripts/backup/pg-backup.sh`, `pg-restore.sh`, `redis-snapshot.sh`
  (+ executable, parameterized by env, no secrets inline).
- `docs/runbooks/backup-dr.md` (RPO/RTO, schedule, restore drill,
  failure modes), `docs/security/pentest-checklist.md` (auth + payment
  matrix, findings, status), `docs/runbooks/soft-launch.md`
  (feature-flag rollout sequence + kill-switch).

### 12.F Seed (additive)
- `seedFeatureFlags()` from `FLAG_CATALOG` (idempotent upsert).

### 12.G Tests
- e2e: `feature-flags.e2e-spec.ts`, `security-hardening.e2e-spec.ts`
  (price-tamper, idempotency replay, JWT tamper, webhook-sig,
  permission guard, loyalty/referral double-spend).
- unit: `@repo/feature-flags` (precedence + rollout determinism),
  `@repo/analytics` (no-op when key empty, payload validation),
  `@repo/observability` (no-op when DSN empty).
- Gate: `pnpm typecheck && pnpm lint && pnpm test` (+ e2e where DB).

## Reporting
- `.claude/reports/sprint-11-complete.md` after Sprint 11 verification.
- `.claude/reports/sprint-12-complete.md` after Sprint 12 verification.
- Each: files by package, verification results (incl. the env DB
  caveat), Decisions Applied table, Open decisions, known gaps, bring-up
  notes (new migrations/seed/env/endpoints/permissions).

## Open questions (none blocking — defaults cover all)
- **OG image rendering / RTL visual audit / Sentry React error
  boundaries / PostHog autocapture + session replay** are runtime/UI
  concerns → deferred to the dedicated UI sprint; data-layer
  foundations (locale resolution, typed catalogs, init modules, event
  capture) are delivered now so the UI sprint is wiring-only.
- **Real pen-test engagement** (external) is out of scope for a
  code/data sprint; the deliverable is the automated hardening suite +
  checklist + in-scope fixes.
- **Multi-currency loyalty**: single-restaurant single-currency today;
  earn/redeem use restaurant currency. Multi-location revisited later.
