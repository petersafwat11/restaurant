# Stripe / EU payment-provider readiness implementation plan

**Project:** Szef Donald restaurant ordering platform  
**Production:** `https://szefdonald.pl` · `https://admin.szefdonald.pl` · `https://api.szefdonald.pl`  
**Hosting:** Contabo VPS, Docker Compose, Caddy, PostgreSQL, Redis  
**Plan date:** 2026-06-27  
**Implementation owner:** Claude Code  
**Status:** Planning only — no implementation is authorized by this document.

> This is an engineering and operational implementation plan, not legal advice. Final Polish and English legal text, the withdrawal-right analysis, complaint rules, retention schedule, cookie-consent decision, and company disclosures must be approved by a Polish lawyer before production publication.

## 1. Outcome and release gate

The release is complete only when:

1. The public website contains verified seller identity, customer support details, a complete menu with PLN prices, and prominent, professional policies in Polish and English.
2. Every public legal identity value comes from the restaurant record managed in the admin dashboard; no placeholder, inferred legal name, or duplicated hardcoded NIP remains.
3. The order and payment totals shown to the customer are derived from the same server-authoritative cart/promotion/loyalty calculation that is charged by Stripe.
4. Guest and authenticated card/BLIK payments both work securely and idempotently.
5. Each order stores server-generated evidence of the exact legal bundle accepted by the customer and sends a durable copy by email.
6. Stripe live-mode setup, webhooks, domain registration, PCI attestation, public profile, and statement descriptor are complete.
7. The unused mobile application and its genuinely unused Expo/push infrastructure are removed without breaking web/admin notifications.
8. CI, API e2e, payment sandbox tests, production smoke tests, and a lawyer/content sign-off all pass.

Do **not** enable the `payments.stripe_elements` flag or add live Stripe keys until all P0 gates in section 14 pass.

## 2. Verified current state

### Production observations

- The live domain is public, HTTPS-enabled, and does not require login.
- The live menu loads 29 items in six categories with images, descriptions, and PLN prices.
- Address, phone, email, hours, delivery radius, delivery/pickup ETA ranges, and channel toggles already come from the singleton `Restaurant` record.
- The live Terms and Privacy pages still expose literal KRS and REGON placeholders.
- `GET /api/v1/payments/config` currently returns an empty Stripe publishable key; online payments are therefore not live yet.
- The English route contains Polish database-driven menu/category content. The interface is translated, but commercial content is not consistently translated.
- The initial homepage HTML can show mock featured dishes/testimonials while real API data loads. A payment-provider crawler could therefore see products/prices that are not the live catalog.
- The reservations route says “coming soon” while the production restaurant record has `acceptsReservations=true`.
- The production response lacks HSTS, CSP, `nosniff`, frame restrictions, referrer policy, and permissions policy, and exposes `X-Powered-By: Next.js`.

### Existing code to reuse

- `Restaurant` already owns trading address, public phone/email, currency, delivery fee, minimum order, radius, ETA ranges, hours, and channel toggles.
- Promotion CRUD, coupon validation, guest coupon support, cart persistence, and order-time coupon revalidation already exist.
- Order creation already recomputes menu prices, coupons, loyalty, delivery, tax, and totals on the server.
- Guest order creation already uses the cart session and returns a seven-day HMAC-signed order token.
- Order creation already requires an idempotency key; Stripe webhook events already have database deduplication.
- Refunds, partial refunds, Stripe-dashboard refund ingestion, audit logging, queues, receipt PDFs, email, Twilio SMS, and realtime order updates already exist.
- The admin restaurant page already uses `restaurant:read` / `restaurant:write` and has a reusable sectioned settings pattern.
- Menu allergens and weights already exist in Prisma/types/admin/web. The old compliance document saying they do not exist is stale.

### Confirmed gaps

- No legal-entity fields exist in Prisma, DTOs, API mapping, or admin restaurant settings.
- Checkout contact name/email/phone are validated in the form but are never sent to or stored by the API. Guest receipts therefore cannot be emailed.
- Payment intent creation rejects every guest because ownership is authenticated-user-only.
- Stripe PaymentIntent creation has neither Stripe idempotency options nor safe reuse of the existing `Payment` row.
- Selected card/BLIK is not enforced because `automatic_payment_methods` can display other methods.
- Checkout uses client-only mock promotions and JavaScript `Number` arithmetic.
- Orders store only a client-supplied acceptance timestamp, not a server timestamp, document version, content hash, locale, seller snapshot, or fulfillment snapshot.
- No account-deletion/anonymisation workflow exists.
- Auth/payment/order endpoints do not have comprehensive Redis-backed throttling.
- No payment reconciliation job exists although runbooks claim it does.
- Operational documents conflict with production: some describe Vercel/managed PostgreSQL/R2/mobile while production is a Contabo VPS with local uploads and local PostgreSQL.

## 3. Non-negotiable implementation decisions

1. **Polish is the authoritative legal language.** English is a professional convenience translation reviewed against the Polish version. The Terms must explain this without limiting mandatory consumer rights.
2. **Legal copy stays version-controlled in the repository.** Admin users manage factual business data and policy parameters, not free-form legal prose. This prevents unreviewed dashboard edits from silently changing contracts.
3. **The server creates legal evidence.** The client sends `legalBundleVersion` plus an explicit acceptance boolean; the server validates the current version, sets the acceptance time, and creates the snapshot/hash.
4. **The existing promotion/cart pipeline is the only discount source.** Delete `MOCK_PROMOS` and never maintain a second checkout calculator.
5. **Guest payment authorization reuses the signed order token.** Do not authorize by order UUID or by a raw cart session after the cart has been cleared.
6. **Payment methods match the UI choice.** Card selection creates a card-only PaymentIntent; BLIK creates a BLIK-only intent. Apple Pay and Google Pay remain wallets presented through the card method after domain registration.
7. **No card data crosses application servers.** Continue using Stripe Elements/Payment Element and store only provider references plus permitted non-sensitive metadata.
8. **No fake production commerce content.** Mock products, promotions, testimonials, ratings, and reviews must be dev/test-only or removed.
9. **No unnecessary KYC data in the application database.** Representative IDs, owner IDs, bank statements, and beneficial-owner documents belong in Stripe’s secure onboarding, not Restaurant/admin fields.

## 4. Phase A — remove mobile and shrink the data-processing surface

### A1. Inventory before deletion

- Confirm no production consumer uses the Expo app and no release exists in Apple/Google stores.
- Query production counts for `PushToken` and push notification preferences; export only if the owner needs a record.
- Confirm web has no service worker/web-push implementation that depends on the Expo push fields.

### A2. Delete application/package surface

- Delete `apps/mobile/**` and `packages/ui-mobile/**`.
- Remove their package references from the lockfile, build cache, CI/build workflows, tsconfig paths, documentation, and any root scripts.
- Remove Expo-specific environment values (`EXPO_PUBLIC_API_URL`, `APP_DEEP_LINK_SCHEME`) when no non-mobile consumer remains.
- Remove `@stripe/stripe-react-native`, Expo dependencies, mobile Docker/build references, EAS references, and mobile design/docs claims.
- Remove the `mobile.push_v2` feature flag and its seed/config entries.

### A3. Remove unused push backend only after dependency proof

- Remove Expo push processor, Expo SDK, push queue/jobs/payloads, `PushToken`, registration endpoints/hooks, and Expo deep-link construction.
- Migrate `NotificationPreference` to remove `orderUpdatesPush` and `promotionsPush` unless web push is explicitly retained and implemented.
- Keep in-app notifications, email, and Twilio SMS.
- Add a migration that safely drops unused token/preference columns after the production count check.
- Update Privacy/Cookie processor inventories to remove Expo after deployment.

**Acceptance:** `rg` finds no Expo/EAS/React Native/ui-mobile/mobile feature-flag references except historical migration notes; full workspace install/typecheck/test succeeds.

## 5. Phase B — legal-entity and support data in Restaurant/admin

### B1. Prisma data model

Add nullable fields first, then require completeness in application validation before Stripe activation:

| Field | Purpose | Exposure |
|---|---|---|
| `legalName` | Exact KRS/Stripe/bank entity name | Public legal DTO |
| `nip` | Polish tax ID, 10 digits | Public |
| `regon` | REGON, 9 or 14 digits | Public |
| `krs` | KRS, normally 10 digits; nullable for non-KRS forms | Public |
| `registryCourt` | Registry court and division | Public |
| `shareCapital` | Decimal capital amount | Public where applicable |
| `shareCapitalCurrency` | Normally PLN | Public |
| `registeredAddress` | JSON using the shared address schema | Public |
| `registeredAddressSameAsTrading` | Admin convenience and validation | Admin |
| `supportEmail` / `supportPhone` | Customer-service channels | Public |
| `complaintsEmail` | Complaint/refund channel | Public |
| `privacyEmail` | GDPR requests | Public |
| `statementDescriptor` | Expected card statement text | Public/admin hint |

Keep existing `Restaurant.name` as the trade/brand name and existing `address` as the trading/fulfilment address. Do not overwrite either with the legal name/address.

Use `Decimal` for share capital. Reuse a single exported address schema instead of duplicating Zod definitions.

### B2. Migration/backfill strategy

1. Add fields as nullable.
2. Backfill `nip` from the current hardcoded value only.
3. Backfill support/complaints/privacy contacts from existing restaurant phone/email as provisional defaults.
4. Leave legal name/KRS/REGON/court/capital unconfirmed until the owner checks an official current KRS extract.
5. Add an admin “Payment provider readiness” completeness check; do not make the production API fail while fields are being populated.
6. After owner verification and production population, remove all hardcoded fallbacks/placeholders from `features/legal/company.ts` and footer translations.

Candidate registry values found during planning, **not authoritative until checked against official eKRS documents**:

- Legal name: `CIOSEK SAMANTA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ`
- KRS: `0000897286`
- REGON: `388771662`
- NIP: `6572959741`
- Registered address appears to match the current restaurant address.
- Share capital appears to be `5,000 PLN`.
- Registry court appears to be Sąd Rejonowy w Kielcach, X Wydział Gospodarczy KRS.

The owner/lawyer must verify those values immediately before entry because registry data can change.

### B3. Types/API/cache

- Add a nested `legal` block to `RestaurantPublicSchema` and `RestaurantAdminSchema`; keep Prisma fields flat if that is simpler for migration/querying.
- Add strict format validation with normalized digits for NIP/KRS/REGON, email/phone limits, ISO currency, non-negative Decimal string, and Stripe descriptor rules (5–22 characters and allowed characters).
- Map all fields in `RestaurantsService.toPublic`, `getAdmin`, and `update`.
- Bump the restaurant public cache key version.
- Add `@AuditAction` to the restaurant update route so changes to legal identity are traceable.
- Ensure JSON-LD uses the verified legal name/address while visible brand remains Szef Donald.

### B4. Admin UI

Add two sections to the existing restaurant settings page:

1. **Legal entity:** legal name, legal form helper, NIP, REGON, KRS, registry court, share capital/currency, registered-address-same-as-trading switch, registered address fields.
2. **Payments & customer support:** support phone/email, complaints email, privacy email, statement descriptor, and a non-editable readiness checklist.

Requirements:

- PL and EN labels/help text.
- Inline validation mirroring Zod.
- Explicit warning: values must match KRS, Stripe, and payout-bank ownership records exactly.
- Completeness state must not claim that the application verified external registries.
- Permission remains `restaurant:write`; backend rechecks it.

### B5. Public consumers

- Replace `getCompanyInfo()` construction with the DB legal block.
- Render legal name, brand/trading name, both addresses when different, NIP/KRS/REGON, registry court, share capital, support/complaint/privacy contacts.
- Footer copyright must use legal name from DB, not a translation string.
- SSR the footer legal/contact data from the marketing layout so provider crawlers see it in initial HTML; avoid a client-only blank footer while React Query loads.
- Fail safely: until the record is complete, show no placeholder tokens, but log/alert readiness failure and keep Stripe flag off.

**Acceptance:** no `[KRS — uzupełnij]`, `[REGON — uzupełnij]`, hardcoded NIP, or inferred `${tradeName} sp. z o.o.` remains in public code or translations.

## 6. Phase C — guest/customer order identity and durable legal acceptance

### C1. Immutable customer snapshot

Add to `Order`:

- `customerName`
- `customerEmail`
- `customerPhone`
- optional normalized phone/search columns only if necessary
- `checkoutLocale`

Require contact data in `CreateOrderSchema` for guest checkout. For authenticated checkout, accept the form values but validate and snapshot them independently of later profile edits. Never derive historical receipts solely from the mutable `User` row.

Update:

- Checkout submit payload
- Order creation transaction
- Order DTO/admin customer display
- Orders list search/export
- SMS/email job payload source
- Receipt generation and refund/cancellation notifications
- Tests for guest and authenticated snapshots

### C2. Legal bundle contract

Replace client-supplied `acceptedTermsAt` with:

- DTO: `legalAccepted: z.literal(true)` and `legalBundleVersion`.
- DB: `legalAcceptedAt`, `legalBundleVersion`, `legalSnapshot Json`, and `legalSnapshotHash`.
- Server snapshot fields: locale, effective/version dates, legal entity block, trading address, support contacts, currency, delivery/pickup parameters, policy route/version identifiers, and SHA-256 hashes of the rendered policy sources.

Flow:

1. Web renders the current version beside the checkbox.
2. Customer accepts Terms and acknowledges Privacy/Refund/Delivery policies. Privacy is not framed as consent; newsletter consent remains separate.
3. Server rejects stale versions with a typed `LEGAL_VERSION_CHANGED` conflict.
4. Client refreshes policy text and requires a new checkbox action.
5. Server sets the timestamp and snapshot; the client cannot choose the timestamp/hash.

### C3. Durable copy

- Create immutable PL/EN legal-bundle PDFs or HTML attachments from the exact versioned source.
- Attach the relevant locale’s Terms plus Refund/Complaints and Delivery/Cancellation policy to the first confirmed-order email, alongside the receipt.
- Keep versioned archived routes (`/legal/archive/{version}/{document}`) for audit/support, but do not rely on a mutable URL alone as the durable copy.
- Make receipt/legal email delivery work for guests using `Order.customerEmail`.
- Persist provider delivery status/job id enough to investigate failed emails; retry through BullMQ.

### C4. Contract-formation consistency

Align code, UI, email, and Terms on one reviewed rule. Recommended implementation:

- “Place order” creates a pending order/acknowledgement.
- Successful payment/COD confirmation plus the system’s “Order confirmed” notice forms the contract, subject to the documented exceptional rejection/full-refund path.
- If the restaurant rejects after payment, issue a full refund and notify the customer.

Have Polish counsel approve the exact formation wording and the Polish pay-button wording. For COD, use unambiguous text equivalent to “Order with obligation to pay,” not merely “Place order.”

## 7. Phase D — professional PL/EU legal and fulfilment pages

### D1. Content architecture

- Move long legal prose out of page TSX into version-controlled locale files, preferably MDX under `apps/web/src/content/legal/`.
- Introduce one exported `LEGAL_BUNDLE_VERSION`, effective date, per-document hash, and archive manifest.
- Inject only verified DB facts and current policy parameters through typed placeholders.
- Keep Polish and English section structure identical.
- Add metadata title/description/canonical/alternates and JSON-LD where appropriate.
- Add an on-page table of contents and printable/downloadable copy.

### D2. Required pages and prominent links

Maintain:

- `/terms` — Regulamin świadczenia usług drogą elektroniczną and sale/order terms
- `/privacy` — Privacy/RODO information notice
- `/cookies` — Cookie and similar-technology notice

Add:

- `/refunds-complaints` — returns, refunds, complaints, missing/incorrect/unsafe food
- `/delivery-cancellation` — delivery, pickup, delays, failed delivery, cancellation requests
- `/promotion-terms` — general promotion/loyalty/referral conditions plus links/details for active promotions

Link them from:

- Global footer
- Checkout acceptance text
- Contact/help surfaces
- Promotion UI
- Order confirmation and refund emails

### D3. Terms content checklist

Include, with lawyer-reviewed Polish citations/wording:

1. Definitions and seller/legal identity.
2. Scope of website, account, ordering, loyalty, referrals, reviews, contact, and reservation services actually enabled.
3. Technical requirements, prohibition on unlawful content, account security, and termination of electronic services as required by UŚUDE.
4. Customer eligibility and accurate-data duty.
5. Exact ordering steps and correction opportunity before submission.
6. Contract-formation/acceptance/rejection process.
7. PLN/VAT pricing, server-authoritative total, delivery fee, minimum order, tip, coupon, and loyalty treatment.
8. Payment methods, payment failure, authorization, statement descriptor, no card storage, and Stripe role.
9. Delivery/pickup zones, ETA/rates, address errors, customer absence, delays, failed delivery, and risk/collection rules.
10. Prepared/perishable and individualized-food withdrawal exemptions; do not imply that statutory non-conformity rights disappear.
11. Detailed complaint process, required information, channels, evidence, remedies, and response timing.
12. Cancellation request process and when preparation/payment status prevents cancellation; prepaid cancellation must route through the refund workflow.
13. Incorrect, missing, damaged, contaminated, unsafe, or allergen-related orders.
14. Promotion, coupon, loyalty, referral, stacking, expiry, misuse, and reversal terms.
15. Reviews/user content moderation rules if reviews remain enabled.
16. Unavailable items, substitutions only with customer approval, force majeure, and full/partial refunds.
17. Liability that does not unlawfully exclude mandatory consumer rights.
18. Polish ADR/UOKiK/consumer-ombudsman information. Do not link to the discontinued EU ODR platform.
19. Governing law, language, effective date, archive, and change handling for existing orders.

### D4. Refunds and complaints page

State clearly:

- Food cannot be physically “returned” for resale; this is separate from statutory complaint rights.
- Eligible scenarios: non-delivery, incorrect/missing items, material quality/non-conformity, unsafe/contaminated food, approved cancellation, duplicate/incorrect charge.
- How to submit: complaints email, phone, contact form, order number, issue description, and optional evidence.
- Restaurant response deadline consistent with Polish law; do not contractually shorten consumer claim periods.
- Available outcomes: replacement/redelivery where practical, price reduction, partial refund, or full refund depending on the issue and law.
- Approved electronic refunds go to the original method; cash/COD handling is documented separately.
- Separate “we initiate within X business days” from bank/card posting estimates; lawyer/owner must approve the chosen operational promise.
- Chargeback/dispute language must not obstruct statutory or card-network rights.

### D5. Delivery and cancellation page

Render DB-backed current values for:

- Trading location
- Enabled order channels
- Delivery radius/eligible destination method
- Current delivery fee/minimum order
- Delivery and pickup ETA ranges
- Operating hours/holiday exceptions

Explain address accuracy, phone availability, customer absence, traffic/weather delays, pickup collection, cancellation request channel, preparation cutoff, and refund handling. The order snapshot must preserve the values that applied at purchase even if admin settings later change.

### D6. Promotion-specific terms

The existing `Promotion` model needs customer-facing, localized terms rather than using its short admin description alone. Add typed PL/EN public terms or a versioned terms document reference covering:

- eligibility
- start/end timezone
- code and redemption limits
- minimum subtotal
- stacking/loyalty compatibility
- eligible/excluded channels/items
- refund effect and coupon/loyalty reversal
- abuse/cancellation rules that preserve mandatory rights

Show a terms link wherever a promotion is advertised or applied. Remove the homepage “free baklava” promise unless a matching active promotion and terms exist.

### D7. Privacy/RODO page

Build an Article 13/14 processing table by data flow:

- account/authentication
- guest and registered orders
- addresses/geolocation pin
- payments, Stripe Radar/3DS/device/IP signals
- receipts/accounting/refunds/disputes
- contact messages
- newsletter/double opt-in
- SMS via Twilio
- reviews, reservations, loyalty, referrals only if enabled
- security/audit logs, PostHog/Sentry only if actually enabled
- server access logs/backups

For each: data categories, source, purpose, legal basis, whether required/consequence, recipients, transfer mechanism, and retention rule.

Processor register must reflect **actual production configuration**, not every optional dependency:

- Contabo and its confirmed data-center region/DPA
- Stripe and payment-method participants
- Twilio if live
- Resend or SMTP provider actually used
- PostHog/Sentry only if enabled
- OpenStreetMap/Nominatim as applicable
- local Contabo upload/storage and backup destination
- remove Expo after mobile deletion
- do not claim Cloudflare R2 unless production actually uses it

Document Stripe’s controller/processor roles, fraud/device data, cookies, 3DS/payment-method sharing, international safeguards, and links to Stripe privacy information. Add UODO complaint details, rights process, one-month response rule, automated fraud assessment explanation, and account deletion/anonymisation exceptions.

### D8. Cookie/similar-technology page and consent decision

List exact first-party mechanisms:

- `web_at`, `web_rt`
- `admin_at`, `admin_rt` on admin domain where relevant to staff notice
- `cart_session`
- `NEXT_LOCALE`

List conditional Stripe technologies, including current Stripe-documented fraud/Link cookies such as `__stripe_mid`, `__stripe_sid`, `m`, `pay_sid`, Link session values, and other cookies actually observed in sandbox/live testing. Link to Stripe’s current cookie information instead of promising a permanently exhaustive third-party list.

Do not automatically add or omit a consent banner based only on cookie names. Before launch:

1. Run a clean-browser storage/network audit with Stripe card, BLIK, Link on/off, PostHog/Sentry on/off.
2. Classify each technology under current Polish PKE and GDPR with counsel.
3. If any non-essential analytics/marketing storage is enabled, implement prior opt-in with equally easy reject, granular categories, consent logging, withdrawal, and no tag loading before consent.
4. If only strictly necessary fraud/security and user-requested payment functions remain, disclose them accurately and record counsel’s no-banner decision.

Update `EU-COMPLIANCE.md` from old Telecommunications Law citations to the currently applicable PKE analysis.

### D9. ODR correction

- Remove the obsolete recommendation to link the EU ODR platform.
- State that the EU ODR platform closed on 20 July 2025.
- Link to current Polish ADR/UOKiK resources and the current EU dispute-resolution body directory only where counsel confirms relevance.

## 8. Phase E — replace mock promotions and all frontend money arithmetic

### E1. Checkout promotion wiring

- Import and use existing `useApplyCoupon` and `useRemoveCoupon` in checkout.
- Delete `MOCK_PROMOS`, `AppliedPromo` local state, artificial delay, and mock translation keys.
- Render coupon code/amount directly from `cart.appliedCoupon` and totals from `cart.totals`.
- On apply/remove, replace the cart query/store atomically with the API response.
- Preserve guest `sessionKey` support already present in the hooks/API.
- At order creation, retain current server revalidation and typed errors for expiry/limits/minimum subtotal.

### E2. One authoritative quote

Add or extend a server checkout quote DTO so the client receives:

- subtotal
- coupon discount
- loyalty discount
- delivery fee
- tax
- tip
- grand total
- currency
- quote version/timestamp

The server must compute it with `Decimal` helpers. Checkout displays those strings and may format them, but never recomputes chargeable money using `Number.parseFloat`, multiplication, division, or `toFixed`.

Requote when order type/address/tip/coupon/loyalty changes and always recompute inside order creation. If final total differs, return a typed response and require customer review rather than silently charging more.

### E3. Promotion correctness tests

- Guest/auth apply and remove
- Percent/fixed/free-delivery behavior
- Minimum subtotal
- start/end timezone
- global and per-user limits
- promotion expires between display and submission
- coupon plus loyalty clamping
- refund and loyalty/coupon reversal
- UI displayed total equals Order and Payment amount exactly

## 9. Phase F — secure guest Stripe and PaymentIntent lifecycle

### F1. Guest authorization

- Extend the typed API client to send the signed order token in an `X-Order-Token` header for `POST /payments/intent` and payment-status recovery.
- In `PaymentsController/Service`, authorize either:
  - authenticated `order.userId === actor.userId`, or
  - valid unexpired HMAC token whose embedded order id equals `dto.orderId`.
- Do not accept a guest session key or UUID alone.
- Do not log the token; redact it in observability and access logs.
- Pass the token from the returned Order DTO into `StripePaymentForm`, redirect return URL, and recovery page.

### F2. PaymentIntent idempotency and concurrency

- Require an `Idempotency-Key` on payment-intent requests and scope it to order + owner/token fingerprint.
- Before creating, inspect the unique `Payment(orderId)` row:
  - paid/refunded terminal state → reject safely
  - existing reusable pending Stripe intent with same amount/currency/method → retrieve and return it
  - stale/cancelled/incompatible intent → cancel/replace under a documented rule
- Pass a deterministic Stripe idempotency key in request options, not metadata only.
- Use database uniqueness/transactional claiming so concurrent browser requests cannot create multiple active intents.
- Include `orderId`, order number, legal entity/brand reference, and environment in metadata without PII.
- Never overwrite a paid provider reference during an upsert.

### F3. Enforce selected method

Map UI method to Stripe configuration:

- `STRIPE_CARD` → card (wallets may appear through card after domain registration)
- `BLIK` → BLIK only
- `P24` → P24 only if exposed later

Remove `automatic_payment_methods` for method-specific radio choices, or alternatively simplify the UI to one “Pay online” choice and let Payment Element display all methods. Do not keep the current hybrid behavior. The recommended path for this UI is method-specific intents.

### F4. Checkout recovery

- Persist the newly created order id/token in session-safe state before mounting Elements.
- On decline/Stripe initialization failure, keep a recoverable pending order and show Retry/Change method/Cancel request; do not create another order.
- Add an expiry job for abandoned pending orders and PaymentIntents; restore/recreate cart only through a deliberate server flow.
- Redirect URLs must preserve locale and signed guest token.
- Confirmation page polls/reads payment state only for short recovery while realtime remains authoritative for order status.

### F5. Server money conversion

- Replace `Number.parseFloat`/`Math.round` in `stripe.provider.ts` with `Decimal` and the shared currency minor-unit helpers.
- Define supported currency exponents centrally and reject unsupported currencies instead of assuming 2dp.
- Add boundary tests for 0, one-cent, large values, rounding, PLN, and zero-decimal currencies if retained.

### F6. Webhook and reconciliation

- Keep raw-body signature verification and event-id deduplication.
- Add tests for delayed, duplicate, out-of-order, unknown, failed, canceled, partial-refund, full-refund, and dashboard-refund events.
- Implement the payment-reconciliation BullMQ job currently described but absent: periodically compare nonterminal local payments to Stripe, repair safe status gaps, and alert on mismatches rather than guessing.
- Store webhook processing failure detail/attempt count and alert when live events fail repeatedly.

## 10. Phase G — account deletion and privacy operations

### G1. Data inventory/retention decision

Before coding, produce a lawyer/accountant-approved retention matrix for:

- user profile/auth tokens
- addresses and delivery geolocation
- guest/registered order contact snapshots
- order/receipt/accounting records
- payment/refund/dispute metadata
- contact messages
- newsletter consent records
- reviews/reservations/loyalty/referrals
- audit/security logs
- backups

The Privacy page must use this actual matrix, not “as long as necessary.”

### G2. Verified deletion workflow

- Add shared Zod DTOs and authenticated endpoints to request, confirm, cancel, and inspect deletion.
- Require recent password reauthentication or a single-use email confirmation token.
- Add a short grace period and an admin-visible status; do not let staff casually delete financial records.
- Queue anonymisation through BullMQ.
- Revoke sessions immediately at execution; deactivate and pseudonymise the User, delete addresses/tokens/preferences, and detach/anonymise optional social data.
- Retain only records required for accounting, fraud, disputes, or legal claims and document the basis/period.
- Ensure deletion does not destroy immutable payment/refund/audit integrity.
- Add account UI with clear consequences and confirmation; also retain a manual privacy-email route for non-account/guest requests.
- Add a documented DSAR runbook, identity verification, response deadline, and audit trail without storing unnecessary identity documents.

## 11. Phase H — production content integrity and locale consistency

### H1. Eliminate mock production content

- Remove runtime mock fallbacks from featured dishes and testimonials/reviews.
- Use server-fetched live data, a neutral empty state, or hide the section.
- Keep fixture data only inside tests/story/demo modules guarded from production bundles.
- Do not show an offer such as free baklava unless backed by an active promotion and linked terms.
- Add a crawler/SSR test asserting production HTML contains current DB identity/menu data and no mock names/prices/testimonials.

### H2. Data-driven translations

Because `/en/menu` currently displays Polish product/category content, choose one of:

1. **Recommended:** add typed PL/EN translations for Restaurant description, menu categories/items/modifiers, and promotion public content, with admin inputs and locale fallback; or
2. Temporarily remove/hide the English commercial route until a complete reviewed translation exists.

Do not present a mixed-language checkout/menu to Stripe. Polish content must remain complete because Poland is the target market.

### H3. Reservations consistency

Until the public reservation flow is implemented and tested:

- Set `acceptsReservations=false` in production.
- Hide reservation navigation/account claims as appropriate.
- Remove reservation-processing statements from Privacy/Terms except a clearly conditional section.

If reservations are retained, implement the actual UI, cancellation rules, confirmation email, data retention, and e2e tests before setting the toggle true.

### H4. Media reliability

- Replace critical Unsplash/mock imagery with owned/licensed assets managed through the existing upload/admin flow.
- Add a production link/image checker for all menu and marketing images.
- Ensure alt text matches the actual image and claims are supportable.

## 12. Phase I — API abuse protection, headers, and Contabo operations

### I1. Redis-backed throttling

Reuse the existing contact limiter pattern or create one shared guard/interceptor compatible with multiple API replicas and `trustProxy`.

Apply separate limits by IP plus user/session/token fingerprint to:

- login/register/refresh/forgot-password/reset/OTP
- contact/newsletter
- cart coupon validation
- order creation
- payment-intent creation and status recovery
- public order-token reads

Return `429`, `Retry-After`, localized safe errors, and security metrics. Never rate-limit Stripe webhooks using customer rules.

### I2. Card-testing controls

- Require a valid nonempty order and verified ownership/token before an intent.
- Limit active intents and attempts per order/session/IP.
- Enable/configure Stripe Radar and 3DS/SCA rules appropriate for Poland/EU.
- Alert on bursts of low-value declines, many cards per IP/order, and repeated intent creation.
- Add challenge/CAPTCHA only as a risk-triggered later control after privacy/cookie review; do not add third-party tracking casually.

### I3. Security headers

Implement centrally in Caddy or consistently in Next/API:

- HSTS after confirming all subdomains are HTTPS-ready
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- CSP with `frame-ancestors` and current Stripe.js/Elements/Link/3DS directives
- remove `X-Powered-By`

Roll out CSP report-only first, collect violations, then enforce. Cover `szefdonald.pl`, `admin.*`, and `api.*` appropriately; admin should be more restrictive.

### I4. Contabo resilience

- Replace same-VPS-only seven-day database backups with encrypted offsite backups and perform a restore drill.
- Update RPO/RTO documentation to match self-hosted PostgreSQL; do not claim managed PITR unless purchased/configured.
- Back up `/opt/restaurant/uploads` offsite or migrate to versioned object storage.
- Monitor disk, certificate renewal, container health, queues, failed jobs, webhook failures, backup age, and API latency.
- Add production log retention/redaction policy; do not log order tokens, Stripe secrets, auth cookies, full contact forms, or payment method details.

## 13. Phase J — Stripe/account operational setup

These are manual Stripe/owner tasks and must be tracked separately from code:

### Business/KYC pack

- Current official KRS extract
- NIP/REGON and proof of legal entity/address
- Authorized representative identity/authority
- Directors and beneficial owners requested by Stripe
- Payout bank-account ownership evidence
- Website/domain ownership and same-domain support/privacy email where possible
- Accurate business/product description, average order value, expected volume, fulfilment timing, delivery radius, and refund/dispute expectations
- Licences only if regulated goods such as alcohol are later offered

Do not upload those documents to this application.

### Stripe public/business settings

- Legal name/address/tax identity exactly match the verified admin data and bank account.
- Public brand: Szef Donald; URL: `https://szefdonald.pl`; support URL/contact/address populated.
- Statement descriptor matches the admin/legal page and recognizable brand.
- Enable card/BLIK/P24 only after eligibility and sandbox testing.
- Register `szefdonald.pl` as a payment-method domain for Link/Apple Pay/Google Pay as applicable.
- Enable passkey/security-key 2FA for every Stripe team member and use least-privilege team roles.
- Configure payment/dispute/payout/critical account notifications.
- Complete the Stripe-requested annual PCI SAQ/attestation.
- Create the live HTTPS webhook endpoint, select only handled events, store secret in production secrets, and test it.
- Rotate any development/live keys that were shared outside the production secret store.

## 14. Test matrix and P0 launch gates

### Automated tests

#### Database/types/admin

- Migration deploy on a production-shaped copy; Prisma generate committed.
- Legal field Zod validation and DTO round-trip.
- Admin legal settings load/diff/save, permissions, audit record, same-address toggle.
- Public DTO never exposes private KYC documents.

#### Legal/content

- PL/EN pages render all required headings and verified DB identity.
- No placeholders, mock company name, obsolete ODR link, or unavailable-service claims.
- Archive/version/hash deterministic tests.
- Stale legal version rejected; accepted server snapshot immutable after admin changes.
- Confirmation email contains the exact locale/version attachments.

#### Orders/promotions

- Guest contact snapshots stored and receipt emailed.
- Auth profile changes do not alter historical order snapshots.
- Real coupon apply/remove/expiry/limits and exact displayed/order/payment totals.
- No client money arithmetic in checkout/payment conversion.

#### Stripe API e2e/sandbox

- Guest card success with signed token
- Guest BLIK success/redirect/return
- Auth card/BLIK success
- invalid, expired, wrong-order, and missing guest token rejected
- duplicate concurrent intent calls return one provider intent
- method choice enforced
- 3DS required/success/failure
- decline, insufficient funds, processing error, timeout
- refresh/back/double-click/retry/abandoned checkout
- delayed/duplicate/out-of-order webhook
- partial/full/admin-dashboard refunds
- failed webhook followed by reconciliation repair
- no charge amount differs from Order grand total

#### Security

- Endpoint-specific rate limits and proxy IP correctness
- CORS and cookie attributes
- security headers/CSP on all three domains
- secret/token/PII log redaction
- card-testing burst simulation

#### Removal/regression

- workspace install, lint, typecheck, unit, API e2e, builds after mobile deletion
- email, Twilio SMS, in-app notifications, realtime, admin refunds, receipts unaffected
- no dead Expo/push jobs scheduled

### Manual production/staging acceptance

- Lawyer signs off PL text and EN parity.
- Owner verifies legal fields against official current KRS/bank/Stripe records.
- Fresh-browser cookie/storage audit performed with each payment method.
- Stripe sandbox test order → payment → webhook → confirmation → receipt/legal attachments → refund.
- Mobile and desktop visual comparison against design assets.
- Keyboard/screen-reader checkout and legal page pass.
- SSR/crawler view shows real menu, contact, identity, currency, and policies.
- Production webhook, wallet domain, Radar, 2FA, PCI, bank, statement descriptor, and notifications checked in Dashboard.
- Offsite backup and restore drill completed.

### P0 blockers that must be zero before live keys

- Any legal placeholder/inferred company name
- Any fake product/promotion/testimonial in public production HTML
- Any mixed displayed/charged total
- Guest payment failure or UUID-only authorization
- Duplicate active PaymentIntents for one order
- Missing guest email/SMS snapshot
- Missing legal version/snapshot/durable copy
- Missing refund/cancellation/delivery/complaint policies
- Unreviewed cookie/Stripe disclosure
- Missing auth/payment rate limits
- Missing live webhook/signature verification test
- Missing Stripe KYC/public profile/domain/PCI setup

## 15. Deployment sequence and rollback

1. Create a production database backup and verified offsite copy.
2. Deploy additive nullable legal/order fields with old code compatibility.
3. Deploy API/types/admin capable of populating fields; keep Stripe disabled.
4. Owner enters and verifies legal/support data in admin.
5. Deploy public legal pages, SSR footer, real promotions, contact snapshots, and legal evidence/email attachments.
6. Deploy guest Stripe/idempotency/method restriction/recovery behind `payments.stripe_elements=off`.
7. Run sandbox and full staging acceptance against a production data copy with anonymised customer data.
8. Deploy mobile/push removal only after counts/dependency checks and a backup.
9. Deploy throttling and CSP report-only; tune; then enforce headers.
10. Complete Stripe manual activation tasks and live webhook/domain setup.
11. Enable Stripe for internal staff, then a small controlled rollout, then full rollout while monitoring declines, duplicate intents, webhook lag, queue failures, refunds, and disputes.

Rollback principles:

- Keep migrations additive until the new code has run successfully for one release; drop old columns/mobile tables in a later migration.
- Payment feature flag is the immediate kill switch; COD remains available only if operational/legal policy permits.
- Never roll back payment state by restoring PostgreSQL alone without reconciling against Stripe.
- Retain old legal versions and accepted snapshots permanently for the approved retention period.

## 16. Documentation updates required in the same implementation

Update:

- `design-assets/web/legal/EU-COMPLIANCE.md`
- `design-assets/web/legal/spec.md`
- `docs/PROJECT-REPORT.md`
- `docs/restaurant-app-project-plan.md`
- `docs/runbooks/backup-dr.md`
- `docs/runbooks/soft-launch.md`
- `docs/security/pentest-checklist.md`
- `docs/local-setup.md`
- `deploy/RUNBOOK.md`
- `.env.example`
- AGENTS/repo map and READMEs that mention mobile/ui-mobile/Expo/R2/Vercel/managed PITR

Corrections must include:

- Actual Contabo/Caddy/Postgres/Redis/local-upload topology
- Actual enabled processors and DPAs
- ODR closure and current PKE cookie-law reference
- Allergens/newsletter/legal pages now implemented rather than missing
- Actual checkout order-before-intent flow
- PaymentIntent idempotency versus only order idempotency
- Real reconciliation job status
- Removed mobile/push scope
- Offsite backup reality and restore procedure

## 17. External sources to re-check at implementation/sign-off

- Stripe website checklist: `https://docs.stripe.com/get-started/checklist/website`
- Stripe go-live checklist: `https://docs.stripe.com/get-started/checklist/go-live`
- Stripe security/PCI/CSP guide: `https://docs.stripe.com/security/guide`
- Stripe privacy/cookie disclosures: `https://stripe.com/legal/privacy-center`
- Stripe payment-method domain registration: `https://docs.stripe.com/payments/payment-methods/pmd-registration`
- GDPR, especially Articles 12–14 and 15–22: Regulation (EU) 2016/679
- Food information/distance selling: Regulation (EU) 1169/2011, especially Articles 9, 14, 15, and 44
- Polish Consumer Rights Act current consolidated text, including Articles 12, 17, 38, 43d, and 7a as applicable
- Polish UŚUDE current consolidated text, especially Article 8
- Polish Electronic Communications Law (PKE), current consolidated text, for cookies/direct marketing
- UOKiK current consumer complaint and ADR guidance
- UODO current privacy-notice/rights guidance
- European Commission notice confirming the EU ODR platform closed on 20 July 2025

## 18. Owner decisions required before implementation can be declared complete

These decisions cannot be safely inferred from code:

1. Official verified legal entity/court/capital/address details and whether registered/trading addresses differ.
2. Final support, complaints, and privacy contact addresses.
3. Refund operational promise (initiation time) and cancellation cutoff/process.
4. Whether reservations will launch now or be disabled.
5. Whether English commercial content will be fully translated now or the English ordering route temporarily hidden.
6. Actual production activation and DPA status for Twilio, Resend/SMTP, PostHog, Sentry, Stripe, Contabo, and any offsite backup/storage provider.
7. Whether Link is enabled; this affects cookies, privacy disclosure, CSP, and domain registration.
8. Lawyer approval of Polish legal copy and English translation.
9. Accountant/lawyer-approved retention/anonymisation matrix.

Once those are answered, implementation can proceed phase-by-phase without introducing a second planning pass.
