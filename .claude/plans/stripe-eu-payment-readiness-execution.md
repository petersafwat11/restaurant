# Execution tracker — Stripe / EU payment readiness

Source plan: `.Codex/plans/stripe-eu-payment-readiness.md`
Owner: Claude Code · Started: 2026-06-27

This tracks the **code-shaped** implementation. Sequenced by the source plan's §15
deployment order (not the A→J lettering). External/legal/owner items are listed at the
bottom and handed back to the user — they block the §1 release gate, not the code.

## Ground rules (from plan + advisor)
- Migrations **additive/nullable only**. Defer every column drop + mobile/push table drop
  to a later migration (plan §15 rollback principle). Run `prisma generate` + commit after
  each schema change.
- Leave `legalName`/`krs`/`regon`/`registryCourt`/`shareCapital` **NULL** — candidate KRS
  values in the plan are explicitly unverified. Backfill only `nip` + provisional
  support/complaints/privacy contacts from existing phone/email.
- Phase D: build *structure* (version constant, hashes, archive, MDX scaffold, server
  snapshot/hash logic). Binding PL/EN legal prose needs the lawyer — do not invent it.
- One sub-phase per commit; typecheck + relevant tests before moving on. §14 is the done-spec.
- Postgres unreachable locally → hand-author migration SQL; `prisma generate` runs offline.

## Sequence & status

### Slice 1 — Additive schema foundation  ✅ DONE (typecheck green)
- [x] B1: Restaurant legal-entity + support fields (Prisma, nullable) + migration + seed
- [x] C1: Order customer snapshot fields (`customerName/Email/Phone`, `checkoutLocale`)
- [x] C2: Order legal-bundle fields (`legalAcceptedAt`, `legalBundleVersion`,
      `legalSnapshot`, `legalSnapshotHash`) — keep `acceptedTermsAt` for now, drop later
- [x] `prisma generate` + format + typecheck

### Slice 2 — Types / API / admin for legal entity (Phase B3, B4, B5)
- [x] B3: Zod `legal` block on public+admin schemas; strict format validation (NIP/REGON/KRS
      digit-normalized, ISO currency, Stripe descriptor); service mapping; cache key v4→v5;
      `@AuditAction('restaurant:write')`; shared `getRestaurantLegalReadiness()` helper
- [x] B4: Admin restaurant settings — Legal entity + Payments/support sections (PL/EN) + live
      non-editable "Payment provider readiness" checklist (shared `getRestaurantLegalReadiness`);
      registered-address-same-as-trading toggle; verify-against-KRS warning. Admin typecheck green.
- [x] B5: Public consumers — `getCompanyInfo()` now DB-sourced (no hardcoded NIP / inferred
      legal name); shared `<SellerIdentity>` on terms+privacy (null-omitting); footer copyright
      from DB legal name; SSR `initialRestaurant` wired through all 4 marketing layouts; removed
      hardcoded `bottom.copyright` from both footer locales. **P0 placeholder blocker cleared.**

### Slice 3 — Checkout: kill mocks + client money math (Phase E)  ✅ DONE (E1/E2; E3 partial)
Implemented as `POST /orders/quote` (not /cart/quote) reusing the shared `priceCheckout`
pipeline in orders.service.ts so the quoted total == the charged total.
- [x] E2 backend: `CheckoutQuoteSchema`/`CheckoutQuoteRequestSchema`; `POST /orders/quote`
      (Public; optional user + `sessionKey`) reusing `priceCheckout`; added to api-client.
      Confirmed `priceCheckout` is read-only (safe as a public endpoint).
- [x] E1 frontend: `useApplyCoupon`/`useRemoveCoupon` wired into `PromoCodeInput`;
      deleted `MOCK_PROMOS`, `AppliedPromo` state, delay, `promo.mock.*` keys; coupon rendered
      from `cart.appliedCoupon`.
- [x] E2 frontend: `useCheckoutQuote` hook (requotes on orderType/tip/cart.updatedAt); summary
      renders server quote strings; CTA/COD gate use `quote.grandTotal`. No client money math.
- [~] E3: existing `applies the coupon discount` e2e + new legal/snapshot tests cover part.
      FULL promo matrix (remove/expiry/global+per-user limits; displayed==Order==Payment) STILL OWED.

### Slice 4 — Order identity + legal evidence (Phase C wiring)  ✅ DONE (C1+C2; C3 deferred)
- [x] C1 wiring: `OrderContactSchema` (optional in DTO; required for guests server-side);
      snapshot `customerName/Email/Phone`+`checkoutLocale` on Order; admin customer/list/export
      prefer snapshot (guest id=null); search by customer name/email/phone; guest email/SMS via
      dispatcher snapshot fallback; guest receipt via `order.customerEmail`. Unit: legal-snapshot.
- [x] C2 wiring: `LEGAL_BUNDLE_VERSION` (packages/types/legal.ts); `legalAccepted`+
      `legalBundleVersion` required; server validates version → `LEGAL_VERSION_CHANGED` 409;
      server-built immutable `legalSnapshot`+SHA-256 `legalSnapshotHash` (pure builder + unit test).
      Web sends contact/locale/legal + handles the version-changed conflict (re-accept).
- [ ] C3: durable PL/EN legal copy attached to first confirmed-order email (guest-safe).
      DEFERRED → Slice 6: needs the versioned MDX legal sources (lawyer prose) to attach.

### Slice 5 — Secure guest Stripe + PaymentIntent lifecycle (Phase F)  ✅ DONE (expiry-job = owner)
F5/F1/F3/F2 + F6 + F4-core landed. Only the abandoned-order expiry *policy* (cutoff)
is left — an owner decision, noted below.
- [x] F1: `/payments/intent` + `/payments/by-order` are `@Public()`; authorize by authed
      owner / `payment:read` / valid signed `X-Order-Token` whose orderId matches. Token
      threaded through api-client + `StripePaymentForm` (never logged). e2e: guest-ok,
      no/invalid/wrong-order token → 403.
- [x] F2: server-derived deterministic Stripe idempotency key
      (`pi:order:method:minor:ccy`) → same-method retries reuse one intent; method switch
      cancels the old + creates a new one; TOCTOU-safe `updateMany where status!='PAID'`;
      P2002 create-race falls back to the conditional update. Reject PAID/REFUNDED. (Unit:
      stripe-intent. e2e: reuse, method-switch, already-paid.) NOTE: did NOT add a breaking
      client `Idempotency-Key` header — the server key + unique Payment(orderId) is the guarantee.
- [x] F3: `stripePaymentMethodTypes` (card/blik/p24; wallets→card) → `payment_method_types`;
      removed `automatic_payment_methods`. Stub returns a method-distinct ref. (Unit-tested.)
- [x] F5: central `currencyMinorUnitExponent`/`toMinorUnits`/`fromMinorUnits` in
      @repo/utils/money (Decimal, reject unsupported ccy); stripe.provider uses them. (Unit-tested.)
- [x] F6: webhook guard — late/out-of-order `payment_failed`/`canceled` can't clobber a
      settled (PAID/refunded) payment; added `canceled` handling. Reconciliation BullMQ job
      (`reconciliation` queue, 15-min repeat) compares non-terminal Stripe payments to
      `retrieveIntentStatus`, repairs missed-webhook → PAID (+confirm) / dead → FAILED, alerts
      on unexpected via captureException. Pure `reconcileAction` unit-tested (6); e2e:
      failed + out-of-order-after-succeeded. (Repair path only runs with a live Stripe key.)
- [x] F4 core: on retry after a Stripe decline the checkout reuses the existing pending order
      (cart was cleared at creation, so no duplicate order) + reuses the intent via the server
      idempotency key; recoverable pending order kept; success redirect preserves locale+token.
      Shared `runStripeConfirm` for first-attempt + retry.
      [ ] abandoned-order/intent **expiry job** still owed — needs the owner's cutoff policy
      (how long a PENDING/unpaid order lives before auto-cancel). Reconciliation already
      settles intents Stripe reports as dead.
- NOTE for Slice 8 §I1: add `/payments/intent` + `/payments/by-order` to the throttle list.

### Slice 6 — Legal/fulfilment page structure (Phase D)  ✅ DONE (typecheck + biome green) [prose = lawyer]
Content moved to typed TSX modules under `apps/web/src/content/legal/` (no MDX — avoids
build config). Each module exports a `*_SECTIONS` list driving both the on-page TOC and
PL/EN heading parity (verified: every section id has exactly 2 `<h2 id>` anchors). Shared
`features/legal/{legal-toc,print-controls,legal-bundle}.tsx`.
- [x] D1: reused `LEGAL_BUNDLE_VERSION`/effective date/`LEGAL_BUNDLE_DOCUMENTS` from @repo/types;
      `legal-bundle.tsx` manifest (title key + sections + `renderBundleBody`); archive route
      `[locale]/legal/archive/[version]/[document]/page.tsx` (generateStaticParams = current
      version × 4 bundle docs, `notFound()` else, `noindex`). Prose relocated out of page TSX.
      Per-doc SHA-256 deferred (its home @repo/types is frozen; C3 deferred).
- [x] D2: new routes `/refunds-complaints`, `/delivery-cancellation`, `/promotion-terms` (metadata
      + TOC + print/Save-as-PDF). Footer `bottom.legal` extended with all 6 legal pages (+ labels
      in footer.json pl/en). Cookies + promotion-terms intentionally NOT bundle docs.
- [x] D5: delivery-cancellation renders DB facts (trading address, channels, radius, delivery fee,
      min order, delivery+pickup ETA, hours via `<HoursTable>`); money via `formatMoney` (display
      only). Snapshot-preserves-purchase-time note included.
- [x] D6: promotion-terms structure (eligibility, timezone from `restaurant.timezone`, code/limits,
      min subtotal, stacking/loyalty, channels, refund reversal, abuse) — LAWYER placeholders for
      binding rules.
- [x] D7: privacy Art. 13/14 processing table (10 data-flow rows × 8 cols incl. transfer
      mechanism). Processor register = actual config (Contabo, Stripe-when-enabled, Resend/SMTP,
      Twilio-if-enabled, OSM/Nominatim, PostHog/Sentry "if enabled"). Expo/push REMOVED. No R2.
- [x] D8: cookies page lists exact first-party cookies (`web_at`/`web_rt`/`cart_session`/
      `NEXT_LOCALE`) + conditional Stripe cookies w/ link; REMOVED the hardcoded "no banner
      required" decision → counsel TODO.
- [x] D9: ODR-closed note (20 Jul 2025) + Polish ADR/UOKiK in terms (`odr`→`disputes` anchor) and
      refunds-complaints; no page links the dead ODR platform.
- [ ] HANDOFF (not code): all binding prose (LAWYER placeholders listed in the slice summary),
      owner-verified legal values, live processor/DPA status, retention matrix, cookie-banner
      decision, and the `EU-COMPLIANCE.md` PKE update (docs — Slice 11).

### Slice 7 — Content integrity + locale (Phase H)  ✅ DONE (owner content/flag remain)
- [x] H1: removed mock featured dishes/testimonials + "free baklava"; live-or-hide. Mock module
      → `__mocks__` (test/demo only) + guard test. Crawler/SSR integrity test added.
- [x] H2: verified `/en` menu already serves `nameEn`/`descriptionEn` (EN→PL fallback); no
      fabricated translations (real EN commercial content = OWNER §18.5).
- [x] H3: reservation UI consistent (no false "available" claims; JSON-LD gated on flag).
      OWNER still sets `acceptsReservations=false` in prod data (§18.4).
- [x] H4: image-checker flags Unsplash/external assets for OWNER licensed replacement; alt-text
      softened. Remaining OWNER bits: `/about` rating count + `shop/cart` baklava footer hint.

### Slice 8 — Abuse protection, headers, ops (Phase I)  ⏳ I1+I3 DONE; I2 partial; I4 = docs/owner
- [x] I1: shared `@RateLimit` decorator + global Redis fixed-window `RateLimitGuard`
      (after auth so authed callers key on user id, else IP via trustProxy; 429 + Retry-After;
      fail-open on Redis error; `[RATE_LIMIT]` metric log). Applied to auth
      login/register/refresh/otp/forgot/reset/verify-email, cart coupon, order create/quote,
      order by-token, payment intent + by-order. Webhooks deliberately un-limited. e2e:
      login-throttle (Retry-After) + webhook-never-throttled. resetDb flushes `rl:*`.
- [~] I2: card-testing controls — token/ownership gate (from F1) + per-user/IP intent rate
      limit done. Stripe Radar/3DS/SCA rules + burst-decline alerting are Stripe-side (Phase J,
      owner). CAPTCHA intentionally deferred (plan: only after privacy/cookie review).
- [x] I3: security headers in Caddy (HSTS, nosniff, Referrer-Policy, Permissions-Policy,
      X-Frame-Options DENY, strip X-Powered-By/Server) for all 3 domains; CSP **report-only**
      (web: Stripe+OSM directives; admin stricter; api locked to `default-src 'none'`) — must be
      tuned via violation reports then flipped to enforcing. `poweredByHeader:false` in both Next configs.
- [ ] I4: Contabo offsite backup + monitoring + log retention/redaction — docs/ops (Slice 11), owner.

### Slice 9 — Account deletion + privacy ops (Phase G)  ✅ DONE (retention matrix = accountant/lawyer)
- [x] G2: Zod DTOs + authed `/account/deletion` request/confirm/cancel/status (password OR
      single-use email-token reauth; 7-day grace; `@RateLimit`). BullMQ `account-deletion` queue +
      status-guarded idempotent anonymise job: revokes sessions, deletes PII/transient rows,
      de-identifies reservations, pseudonymises the retained User row; KEEPS order/payment/refund/
      audit intact. Web `/account/delete` UI + guest privacy-email fallback. Hand-authored
      migration `20260627140000_add_account_deletion`. Pure `pseudonymise` unit-tested; e2e added.
      OWNER/lawyer: retention matrix, grace length, reauth policy (defaults documented in code).

### Slice 10 — Mobile/push removal (Phase A)  ✅ CODE DONE (column drop deferred)
- [ ] A1: confirm no prod consumer / app-store release; check prod `PushToken` counts (OWNER)
- [x] A2: deleted `apps/mobile/**`, `packages/ui-mobile/**`, `tooling/tsconfig/react-native.json`,
      `apps/api/src/jobs/push.processor.ts`, `packages/utils/src/deep-link.ts(+test)`, whole
      `apps/api/src/scheduler/**` (its only job was push-token-cleanup → deleting the empty
      module is honest vs. logging "registered" with 0 jobs). Removed `expo-server-sdk` dep,
      `mobile.push_v2` flag (catalog+seed), `APP_DEEP_LINK_SCHEME`/`EXPO_PUBLIC_API_URL`
      (env.ts/turbo/deploy), `.expo`/mobile globs (gitignore/dockerignore/biome/tsconfig).
- [x] A3 (code only): removed push queue/jobs/payloads (`QUEUE_PUSH`, `JOB_PUSH_*`, Push*Payload),
      push-token endpoints+service methods+api-client methods+`RegisterPushToken` DTO, push branch
      in dispatcher, `push` field in notification-matrix ChannelSet, referral-completion push.
      KEPT: in-app+email+SMS untouched; Prisma `PushToken` + `NotificationPreference.*Push`
      columns + DTO push fields + `DEFAULT_PREFERENCE` + account-deletion `pushToken.deleteMany`
      (all inert) with deferred-drop comments. **Column-drop migration still OWED** after the
      owner's prod `PushToken` count (A1). Orchestrator must run `pnpm install` to refresh lockfile.

### Slice 11 — Docs (Phase plan §16)  ✅ DONE
- [x] Corrected EU-COMPLIANCE.md (PKE, ODR closure, allergens/newsletter/legal implemented),
      PROJECT-REPORT + project-plan (Contabo topology, order-before-intent, PaymentIntent
      idempotency, reconciliation job, mobile removed), backup-dr (offsite required), soft-launch
      + pentest-checklist (rate-limit + headers), local-setup, deploy/RUNBOOK, AGENTS.md, CLAUDE.md,
      `.env.example` (Expo vars dropped, Stripe + ORDER_TRACKING_SECRET documented).

## Status: all code-shaped slices (1–11) landed on `feat/stripe-eu-payment-readiness`.
Verification: typecheck 16/16, full unit suite green+stable (api 103, web 109, utils 61, +others),
biome lint error-free. DB-dependent e2e + live-Stripe sandbox run in CI / pre-go-live (see §14 +
the live-Stripe checklist above). What remains is OWNER/lawyer/Stripe-manual (below) + the two
deferred migrations (legal field backfill values; push column drop after prod count check).

## ⚠ Deploy ordering (Slices 1–5)
- **Slice 4's `legalAccepted`+`legalBundleVersion` (and guest `contact`) are REQUIRED on
  POST /orders and are NOT behind the `payments.stripe_elements` flag.** Old web bundles
  will 400 on every order the moment the new API deploys. Web + API MUST deploy together
  (plan §15 step 5). The migrations are additive/nullable and safe to deploy first.
- The migrations (`20260627120000`, `20260627130000`) are hand-authored and have NOT run
  against a real Postgres yet — run `prisma migrate deploy` on a prod-shaped copy first (§14).

## Live-Stripe verification checklist (Slice 5 — integration-UNverified locally; stub mode only)
Pure functions are unit-tested, but the real Stripe SDK calls (`payment_method_types`,
`idempotencyKey` option, `paymentIntents.cancel`/`.retrieve`) never executed in any local
test. Before flipping `payments.stripe_elements` on, run the §14 sandbox matrix, especially:
- guest card + BLIK success via X-Order-Token; 3DS required/success/failure
- duplicate concurrent **same-method** intents → one intent (server idempotency key)
- method switch card→BLIK; **double switch card→BLIK→card** (does the reused original key
  hand back a *canceled* intent? if so add a per-attempt counter to the key)
- concurrent **different-method** requests (two live intents before either cancels — UI is
  sequential so not a normal path, but confirm)
- reconciliation actually repairs a deliberately-dropped webhook against a live key

## External blockers handed back to user (block §1 gate, not code)
1. Owner-verified legal entity: legalName, KRS, REGON, registry court, share capital,
   registered vs trading address (plan §18.1, §B2). Candidate values UNVERIFIED.
2. Final support / complaints / privacy contact addresses (§18.2).
3. Refund initiation promise + cancellation cutoff wording (§18.3).
4. Reservations: launch now or disable? (§18.4)
5. EN commercial content: translate now or hide EN ordering route? (§18.5)
6. Live processor/DPA status: Twilio, Resend/SMTP, PostHog, Sentry, Stripe, Contabo, backups (§18.6).
7. Stripe Link enabled? affects cookies/CSP/domain reg (§18.7).
8. Lawyer approval of PL legal copy + EN translation (§18.8).
9. Accountant/lawyer retention + anonymisation matrix (§18.9).
10. Manual Stripe/KYC/live-keys/webhook/domain/PCI/2FA setup (Phase J).
