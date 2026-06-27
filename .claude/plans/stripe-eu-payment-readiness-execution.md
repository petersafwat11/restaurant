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

### Slice 5 — Secure guest Stripe + PaymentIntent lifecycle (Phase F)
- [ ] F1: guest auth via signed `X-Order-Token`
- [ ] F2: PaymentIntent idempotency + reuse existing Payment row + concurrency claim
- [ ] F3: enforce selected method (card-only / BLIK-only intents)
- [ ] F4: checkout recovery (no duplicate orders, expiry job)
- [ ] F5: Decimal money conversion in `stripe.provider.ts` + boundary tests
- [ ] F6: webhook tests + reconciliation BullMQ job

### Slice 6 — Legal/fulfilment page structure (Phase D)  [prose = lawyer]
- [ ] D1: `LEGAL_BUNDLE_VERSION`, per-doc hash, archive manifest, MDX scaffold
- [ ] D2: new routes `/refunds-complaints`, `/delivery-cancellation`, `/promotion-terms`
- [ ] D5/D6/D7/D8/D9: DB-backed delivery values, promo terms, RODO table, cookie audit, ODR fix

### Slice 7 — Content integrity + locale (Phase H)
- [ ] H1: remove mock featured dishes/testimonials/baklava from prod; SSR crawler test
- [ ] H2: data-driven PL/EN translations (or hide EN commerce route) — owner decision §18.5
- [ ] H3: reservations consistency (`acceptsReservations=false` until built) — owner decision §18.4
- [ ] H4: media reliability

### Slice 8 — Abuse protection, headers, ops (Phase I)
- [ ] I1: Redis-backed throttling on auth/order/payment/coupon/token endpoints
- [ ] I2: card-testing controls
- [ ] I3: security headers / CSP (Caddy) — report-only → enforce
- [ ] I4: Contabo backup/monitoring docs

### Slice 9 — Account deletion + privacy ops (Phase G)  [retention matrix = accountant/lawyer]
- [ ] G2: deletion request/confirm/cancel/inspect endpoints + BullMQ anonymisation

### Slice 10 — Mobile/push removal (Phase A)  ⚠ DESTRUCTIVE — last, gated
- [ ] A1: confirm no prod consumer / app-store release; check prod `PushToken` counts (OWNER)
- [ ] A2/A3: delete `apps/mobile`, `packages/ui-mobile`, Expo deps, push backend; drop columns
      (separate later migration)

### Slice 11 — Docs (Phase plan §16)
- [ ] Update EU-COMPLIANCE.md, runbooks, .env.example, repo map, etc.

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
