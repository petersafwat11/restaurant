# Sprint 11 — i18n + RTL + Loyalty + Reviews + Favorites + Referral — Completion Report

**Date:** 2026-05-15
**Scope:** Full EN/AR message catalogs + typed i18n runtime, loyalty
earn/redeem/reversal, favorites, referral program, review owner-reply +
public aggregate. Backend + frontend **data layer**. **NO UI** (pages/screens
return `null` + `// TODO(ui):`). RTL *visual* audit deferred to the UI sprint
(data-layer direction primitive delivered).

---

## Summary

Delivered. 1 new migration (`add_sprint_11_tables`), 3 new NestJS modules
(`favorites`, `referrals`, `i18n`), loyalty upgraded from read-only to full
earn/redeem/reversal + quote, `@repo/i18n` filled in (catalogs + typed
translator + plural + negotiation + Intl formatters), `@repo/utils/loyalty`
pure economics, 3 new shared-type files + extensions, api-client resources,
web/mobile/admin data hooks, additive seed, localized in-app notification
copy, 2 new BullMQ job names + push branch, 5 new/extended e2e specs.

Pipeline: **typecheck 19/19 · lint 19/19 · unit suites all green**
(i18n 9 new · utils 21→27 · api 43 · auth-core 12 · web 10 · admin 10).
e2e specs written, not executed here — see "Environment / verification".

---

## Files created / modified

### `packages/db/`
- `prisma/schema.prisma` — `LoyaltyAccount.lifetimePoints`;
  `LoyaltyTransaction.kind` + `@@unique([accountId, orderId, kind])`;
  `Cart.loyaltyPointsToRedeem`; `Review.ownerReply/ownerReplyAt`; new
  `Favorite`, `ReferralCode`, `Referral`; User/MenuItem relations
- **NEW** `prisma/migrations/20260515130000_add_sprint_11_tables/migration.sql`
- `seed.ts` — `seedFavorites`, `seedReferrals`, `seedLoyalty` extended
  (lifetimePoints + kinds), wired into `main()`

### `packages/i18n/`
- `src/locales/en.json` + `ar.json` — full parallel namespaced catalogs
- **NEW** `src/locale.ts` (primitives moved out of index), `src/catalog.ts`
  (typed `MessageKey` dot-paths, `getMessageCatalog`), `src/translator.ts`
  (`createTranslator`, `{var}` + ICU plural via `Intl.PluralRules`),
  `src/negotiate.ts` (`negotiateLocale`, `resolveUserLocale`),
  `src/format.ts` (Intl number/currency/date/relative)
- `src/index.ts` re-exports; `package.json` + `vitest.config.ts` test wiring
- **NEW** `src/i18n.test.ts` (9 tests: key-parity, plural en/ar, negotiate, format)

### `packages/utils/`
- **NEW** `src/loyalty.ts` (earn rate, redemption value, tier thresholds,
  referral rewards — pure) + `src/loyalty.test.ts` (6 tests); re-exported

### `packages/types/`
- **NEW** `src/favorite.ts`, `src/referral.ts`, `src/i18n.ts`
- `src/loyalty.ts` — txn `kind`, account `lifetimePoints/nextTier`,
  `LoyaltyRedeemQuote*`
- `src/review.ts` — `OwnerReply*`, `ReviewSummary*`, `ownerReply*` on `ReviewDto`
- `src/cart.ts` — `loyaltyPointsToRedeem`, `SetCartLoyaltySchema`
- `src/auth.ts` — optional `referralCode` on register
- `src/order.ts` — `loyaltyPointsUsed/Earned` on `OrderDto`
- `src/index.ts` — re-exports

### `packages/jobs/`
- `src/queues.ts` — `JOB_PUSH_LOYALTY`, `JOB_EMAIL_REFERRAL_INVITE`
- `src/payloads.ts` — `PushLoyaltyPayloadSchema`, `EmailReferralInvitePayloadSchema`

### `packages/api-client/`
- `src/client.ts` — `favorites.*`, `referrals.*`, `i18n.messages`,
  `loyalty.redeemQuote`, `cart.setLoyalty`, `reviews.reply/summary`

### `apps/api/`
- **NEW** `src/favorites/` (module/controller/service),
  `src/referrals/` (module/controller/service, signup hook + completion
  grant + idempotent claim + push), `src/i18n/` (public catalog endpoint)
- `src/loyalty/loyalty.service.ts` — earn/redeem/reverse/quote/grantPoints,
  `@OnEvent('order.status_changed')`; `loyalty.controller.ts` redeem-quote;
  module unchanged (already exports service)
- `src/orders/orders.service.ts` + `orders.module.ts` — checkout loyalty
  redemption (server-recomputed, burned in the order tx), DTO loyalty fields
- `src/cart/cart.{service,controller}.ts` — `PATCH /cart/loyalty`, DTO field
- `src/auth/auth.{service,module}.ts` — `attachReferralOnSignup`
- `src/reviews/reviews.{service,controller}.ts` — owner reply + summary
- `src/notifications/notification-matrix.ts` + `notification-dispatcher.service.ts`
  — locale-resolved in-app copy via `@repo/i18n`
- `src/jobs/push.processor.ts` — `JOB_PUSH_LOYALTY` branch
- `src/app.module.ts` — Favorites/Referrals/I18n modules
- `package.json` — `@repo/i18n` dependency
- `test/setup-e2e.ts` — new-table cleanup
- **NEW** `test/favorites.e2e-spec.ts`, `test/referrals.e2e-spec.ts`,
  `test/loyalty-earn-redeem.e2e-spec.ts`, `test/i18n.e2e-spec.ts`;
  `test/reviews.e2e-spec.ts` extended (reply + summary)

### `apps/web/` · `apps/mobile/` · `apps/admin/`
- **NEW** web+mobile `features/favorites/hooks`, `features/referrals/hooks`,
  `features/i18n/hooks` (`useMessages`, `useLocale` cookie/SecureStore);
  loyalty hooks extended (`useLoyaltyRedeemQuote`)
- admin `features/reviews/hooks` — `useReplyToReview`, `useReviewSummary`
- **NEW** placeholders: web `(account)/favorites|referrals/page.tsx`,
  mobile `app/account/favorites|referrals.tsx` (null + TODO)
- admin kitchen test fixture updated for new `OrderDto` fields

---

## Environment / verification

Same constraint as Sprints 9–10 — **no Postgres / Redis** in this container.

```
pnpm typecheck      ✓ 19/19
pnpm lint           ✓ 19/19
pnpm test (unit)    ✓ i18n 9 · utils 27 · auth-core 12 · api 43 · web 10 · admin 10
prisma validate     ✓ schema valid (dummy DATABASE_URL)
prisma generate     ✓ client regenerated
```

Written + committed for a DB-enabled run: `favorites`, `referrals`,
`loyalty-earn-redeem`, `i18n` e2e specs + `reviews` extensions. Migration SQL
hand-authored to match the existing `prisma/migrations/*` convention.

---

## Decisions Applied (from plan §DEFAULTS)

| # | Default | How implemented |
|---|---------|-----------------|
| 1 | i18n data, RTL audit UI | full en/ar catalogs + typed `createTranslator`/plural/`negotiateLocale`/Intl in `@repo/i18n`; `getDir` is the data-layer RTL primitive; visual audit deferred |
| 2 | Server-side localized copy | `notificationCopyFor(status, n, locale)` resolves `order.notify.*`; dispatcher keys off `User.locale` via `resolveUserLocale` (in-app feed authoritative) |
| 3 | Loyalty earn | event listener on COMPLETED/DELIVERED, `floor(grandTotal - tip)`, idempotent via unique `(accountId,orderId,'EARN')`, tier from lifetime |
| 4 | Loyalty redeem | `POST /loyalty/redeem/quote`; cart `loyaltyPointsToRedeem`; orders recomputes discount + burns in the order tx |
| 5 | Loyalty reversal | REFUNDED/CANCELLED → REVOKE earned + REDEEM_REVERSAL redeemed, clamped ≥0, idempotent |
| 6 | Favorites | `Favorite` unique pair; list/ids/idempotent add/remove; customer-scoped |
| 7 | Referral | lazy 8-char code; signup attach; first finished order → COMPLETED + dual loyalty grant (atomic claim); self/dup/unknown rejected |
| 8 | Reviews increment | owner reply (`review:moderate`) + public `/reviews/summary` aggregate |
| 13 | Additive migration only | one new migration; none altered |

---

## Open decisions for review

1. **Loyalty constants** (`1 pt / unit`, `100 pt = 1 unit`, tier 0/500/2000/
   5000, referral 200/100) live in `@repo/utils/loyalty.ts`. Tune there;
   no schema/migration needed.
2. **Email/SMS/push transports still emit English copy.** The in-app feed
   (authoritative record) is localized; the three async processors build
   their own strings and were left English to keep the change contained.
   Catalog keys (`order.notify.*`) exist — wiring each transport to
   `createTranslator(user.locale)` is the mechanical follow-up.
3. **`JOB_EMAIL_REFERRAL_INVITE`** name + payload are defined but no
   send-invite endpoint is exposed yet (referral is link/code based today).
   Reserved so an "email a friend" action needs no `@repo/jobs` change.
4. **RTL visual audit** (web + mobile layout mirroring) is a UI-sprint
   concern; `getDir`/persisted-locale resolution are delivered as its base.

---

## Known gaps / deferred items

- Email/SMS/push copy localization (see Open #2).
- Referral invite email send path (see Open #3).
- RTL visual audit, locale-switcher UI — UI sprint.
- e2e specs unexecuted here (no DB) — see "Environment".

---

## Bring-up notes

- **New migration:** `20260515130000_add_sprint_11_tables`. Run
  `pnpm db:migrate:deploy` then `pnpm db:generate`.
- **New seed:** 3 favorites, 1 completed referral (`WELCOME8`), loyalty
  lifetimePoints + typed ledger — idempotent/guarded.
- **New env:** none. Referral links use existing `APP_URL_WEB`.
- **New endpoints:** `POST /loyalty/redeem/quote`, `PATCH /cart/loyalty`,
  `GET|PUT|DELETE /favorites[...]`, `GET /referrals[/me]`,
  `POST /admin/reviews/:id/reply`, `GET /restaurants/:id/reviews/summary`,
  `GET /i18n/messages`. Confirm in Swagger `/api/v1/docs`.
- **Permissions:** none added (owner-reply reuses `review:moderate`).

## What to know before Sprint 12

- Loyalty/referral economics are centralized in `@repo/utils/loyalty.ts`.
- `@repo/i18n` is now the translation source of truth (typed `MessageKey`);
  add keys to **both** locale JSONs (a unit test enforces key parity).
- `OrderDto` gained `loyaltyPointsUsed/Earned` (default 0) — any new order
  fixture must include them if explicitly typed `: OrderDto`.
- Sprint 12 (hardening/launch) is the final master-plan sprint.

---

## Post-review correction (cross-sprint audit, 2026-05-15)

Review of Sprints 9–12 found two Sprint 11 bugs; both fixed:

1. **Loyalty/coupon over-burn (HIGH, money).** `OrdersService.create` quoted
   loyalty redemption against the full subtotal, ignoring an applied coupon.
   `PricingService` clamps the *combined* coupon+loyalty discount to the
   subtotal, so a large coupon+loyalty clamped the loyalty discount away
   while the full points were still burned (lost point value). **Fix:** quote
   loyalty against the post-coupon basis (`subtotal − couponDiscount`, floored
   at 0). New e2e case in `loyalty-earn-redeem.e2e-spec.ts` locks it.
2. **Favorite of a missing item → 500 (LOW).** `favorites.add` used
   `findUniqueOrThrow` (Prisma P2025 → 500). **Fix:** explicit
   `NotFoundException` (404).

Feature-flag `enabled:true + rolloutPercent:0 = "nobody"` was reviewed and
confirmed **intentional** (matches the canary step in
`docs/runbooks/soft-launch.md`; seed sets default-on flags to 100%).
