# Plan — Replace Stripe with eService (Global Payments GP API)

Owner: Claude Code · Drafted 2026-07-08 · Model: **Hosted Payment Page** (chosen 2026-07-08)
Status: **AWAITING BUILD APPROVAL** · Reviewed & hardened against the live sandbox + actual source.

Goal: make **eService** (`eservicegateway.com`, a Global Payments + PKO BP acquirer) the online
card + BLIK processor, fully replacing Stripe. **COD stays untouched** (it is cash, not a processor).

---

## 0. Verified facts — every one checked against the live sandbox or actual source

**Auth / credentials (live `POST /ucp/accesstoken`, HTTP 200):**
- Endpoint `POST /ucp/accesstoken`; header `X-GP-Version: 2021-03-22`; body
  `{app_id, nonce, secret, grant_type:"client_credentials"}`; `secret = SHA512(nonce + app_key)` hex.
  Token TTL `≈86399s` (~24h) and is **reusable** within that window (cache it).
- **Screenshot OCR fix:** `app_id` begins with a capital **`I`** — `AIjinVby4neQWgMeTQpJTrR9qBPeZT2w`.
  `app_key = RQY75DCxeJF35axG`. → Re-confirm from the owner's text copy.

**Accounts / capabilities (from the token's `scope.accounts[]`):**
| account_name | id prefix | purpose | proven permissions |
|---|---|---|---|
| **`ECOMUAT720100031985`** | `TRA_` | transaction processing | card `TRN_POST_Authorize/Capture/Refund/Reverse`, **`TRN_POST_Initiate`** (APM/BLIK), **`AUT_POST_*`** (3-D Secure), **`LNK_POST_Create/Expire`** (HPP) |
| **`tokenization`** | `TKA_` | card-on-file / Payers | `PMT_POST_Create`, `PYR_POST_Create` |

→ Cards + BLIK + 3-DS + HPP **all run on the one `ECOMUAT…` account**. Saved-cards (future) use `tokenization`.

**HPP link creation (live `POST /ucp/links`, HTTP 200, `action_result:"SUCCESS"`):**
- Accepted `allowed_payment_methods: ["CARD","BLIK"]` → **one HPP link presents both**. No APM fallback needed.
- Returns `{id:"LNK_…", status:"ACTIVE", url:"https://apis.sandbox.eservicegateway.com/ucp/hpp/redirect/{uuid}", expiration_date:+24h}`.
- `capture_mode:"AUTO"` (immediate sale — matches current Stripe semantics), amount is a **minor-unit string**
  (`45.50 PLN → "4550"`), `currency:"PLN"`, `country:"PL"`, `channel:"CNP"`, auth `preference:"CHALLENGE_PREFERRED"`.

**Webhook signature (authoritative algorithm — GP API `webhooks.md`; inbound delivery NOT yet verified):**
- **POST** `status_url` notification: header `X-GP-Signature` = **`SHA512(minified_JSON_body + app_key)`** hex.
- **GET** `return_url`: `X-GP-Signature` is the **first** query param = `SHA512(rest_of_query_string + app_key)` hex.
- It is **SHA512(body+key), not HMAC.** ⚠️ The doc says "minified body" (whitespace removed). Hashing the raw
  bytes as received is correct **iff** eService sends a whitespace-free body — unconfirmed until we hash a **real
  captured notification** (needs inbound delivery, see §8). This is the **#1 gating validation of Slice 4**, not settled.

**Reconcile-by-reference (live `GET /ucp/transactions?reference=…`, HTTP 200 — verified):**
- Filtering is honored (returned exactly the matching txn). An HPP link spawns a `TRN_…` in `INITIATED` **immediately**,
  carrying the **same `reference`** — so the outcome is queryable by our reference from creation onward. The
  missed-webhook / BLIK-async safety net (§4.6) is proven, not inferred.

**Base URLs:** sandbox `https://apis.sandbox.eservicegateway.com` · prod `https://apis.eservicegateway.com`.
Portal `portal.sandbox.eservicegateway.com` → `portal.eservicegateway.com`.

**Test cards** (any name / any CVV / future expiry; `/resources/test-cards`):
success `4263970000005262` (Visa) · SCA→3-DS challenge `4242420000000091` (code 111) ·
decline `4000120000001154` (code 101).

**Transaction outcome vocabulary** (from HPP/BLIK samples): txn `status` `CAPTURED`/`DECLINED`/`INITIATED`/`PENDING`;
`payment_method.result` `00`=ok; `authentication.three_ds.value_result`; BLIK is async (`PENDING`→final via `status_url`).

---

## 1. Integration model — ✅ Hosted Payment Page (HPP)

`POST /ucp/links` → hosted `url` → redirect customer (cards / BLIK / 3-DS on eService) →
`status_url` POST delivers the final transaction → we confirm the order.

Why HPP: one integration for all methods (proven above); **lowest PCI scope (SAQ-A)** — no card data
touches us; **maps onto what already exists** (redirect-return page + webhook→realtime); fastest to certify.
Trade-off: cards move from inline (Stripe Elements) to a full-page redirect; BLIK already redirects today.
Drop-in UI remains the fallback if the card redirect proves undesirable (changes only Slice 5).

---

## 2. Current-state code map (verified — exact seams to change)

**Backend** (`apps/api/src/`):
- `payments/provider.interface.ts` — `PaymentProvider { id:'stripe'|'cod'; supports; createIntent; refund; cancelIntent?; retrieveIntentStatus?; parseWebhook? }`. `CreateIntentResult.clientSecret` (repurpose). `ParsedWebhookEvent.type` vocabulary (rename, §4.3). `NormalizedIntentStatus` union (reuse as-is).
- `payments/providers/stripe.provider.ts` — reference impl to mirror (stub-mode, `toMinorUnits`/`fromMinorUnits` from `@repo/utils/money`, `parseWebhook`→null on bad sig). **Delete at Slice 6.**
- `payments/providers/cod.provider.ts` — **keep unchanged.**
- `payments/payments.service.ts` — the orchestration to adapt:
  - `getConfig()` L56 returns `stripePublishableKey` → reshape (§ Slice 1).
  - `createIntent()` L68: `pickProvider` L95; **stripe-gated** method-switch cancel L100–108; **stripe-only** `idempotencyKey` L111–119; DTO return `clientSecret`/`publishableKey` L184–191; TOCTOU-safe payment write L144–171 (**keep**).
  - `refund()` L223: `pickProvider` cast `'stripe'|'cod'` L260; `PAYMOB` guard L257; refund target = `payment.providerRef` L265 (→ TRN, §3); FSM `forceTransition('REFUNDED')` L296–309 (**keep**); guest-aware refund email L311–330 (**keep**).
  - `reconcilePayments()` L401: hardcoded `provider:'stripe'` L407 + `this.stripeProvider` L423 (→ eservice + query-by-reference, §5).
  - `pickProvider()` L465 union `'stripe'|'cod'`; `dispatchEvent()` L489 (event-type switch, §4.3); `syncDashboardRefund()` L542 (portal-refund sync — **keep**, adapt).
- `payments/payments.webhooks.controller.ts` — `@Post('stripe')` L18–34 (add `@Post('eservice')`).
- `payments/payments.module.ts` — provider list (swap StripeProvider→EServiceProvider).
- `payments/stripe-intent.ts` — **delete.**
- `main.ts` — `STRIPE_WEBHOOK_PATH` const L15 + raw-body contentTypeParser L34–50 (generalize to a **set** incl. the eService path).
- `config/env.ts` — `STRIPE_*` L34–39 (replace with `ESERVICE_*`).

**Shared packages:**
- `packages/db/prisma/schema.prisma` — `Payment { provider String; providerRef String?; method PaymentMethodKind; rawWebhook Json? }`; enums `PaymentMethodKind{STRIPE_CARD,APPLE_PAY,GOOGLE_PAY,PAYMOB,COD,WALLET,P24,BLIK}`, `PaymentStatus`, `OrderStatus`. `seed.ts` L1323–1347 seeds `provider:'stripe'|'cod'`, `method:'STRIPE_CARD'`.
- `packages/types/src/payment.ts` — `PAYMENT_PROVIDERS`, `PAYMENT_METHOD_KINDS`, `CreatePaymentIntentSchema`, `PaymentIntentResponseSchema` (`clientSecret`+`publishableKey`), `PaymentConfigSchema` (`stripePublishableKey`). `PaymentSchema.provider` is `z.string()` (old rows read fine); `.method` is an **enum** (needs backfill).
- `packages/types/src/checkout.ts` — `CHECKOUT_PAYMENT_METHODS = ['card','blik','applepay','googlepay','cod']`.
- `packages/jobs` — `QUEUE_RECONCILIATION`, `JOB_PAYMENT_RECONCILE`, `EmailRefundPayloadSchema`, `EmailReceiptPayloadSchema` (**keep**).
- `packages/api-client/src/client.ts` — `payments.{getConfig,createIntent,byOrderId,refund}` (regenerate to new DTOs).
- `packages/feature-flags/src/catalog.ts` — `payments.stripe_elements` flag.
- `packages/i18n/messages/{pl,en}/web/shop/checkout.json` — `stripe.*`, `stripeNotInit` keys.

**Frontend:**
- `apps/web/.../checkout/components/`: `checkout-app.tsx` (orchestration, config fetch, form mount, confirm/recovery), `stripe-payment-form.tsx` (**replace**), `return-app.tsx` (redirect return), `confirmation-app.tsx` (`useOrderTracking` — **keep**), `payment-logos.tsx`.
- `apps/web/src/content/legal/privacy.tsx` + `cookies.tsx` — Stripe Radar / 3-DS / `__stripe_mid`/`__stripe_sid` disclosures.
- `apps/admin/.../orders/components/order-drawer-body.tsx` L37 (`STRIPE_CARD` label), `hooks/use-refund-order.ts` (comment); refund modal + API contract **unchanged**.

---

## 3. Identifier model (the key difference from Stripe)

Stripe conflates one `PaymentIntent` id across creation→webhook→refund. eService splits them:

| id | when known | used for |
|---|---|---|
| **our `reference`** (we mint, unique per attempt, ≤50 chars) | link creation | the **stable join key**; reconcile via `GET /ucp/transactions?reference=…` even if the webhook was missed |
| **`LNK_…`** link id | `POST /ucp/links` response | link reuse / `LNK_POST_Expire`; also on the notification as `link_data.id` |
| **`TRN_…`** txn id | first `status_url` notification | **refund target** + `GET /ucp/transactions/{TRN}` |

**Schema (additive, nullable):** on `Payment` add `providerLinkId String?` (LNK) and `providerTxnId String?`
(TRN). Set `Payment.providerRef` = our **reference** at creation (stable). Populate `providerTxnId` from the
first notification. **Refund** reads `providerTxnId` (guard: "not refundable until captured" = `providerTxnId`
present). **Webhook match:** `findFirst({where:{providerRef: notification.reference}})` (fallback `providerLinkId`).
`prisma generate` + commit.

---

## 4. Backend build

### 4.1 Access-token client (`payments/providers/eservice-client.ts`)
- In-memory token cache keyed by env; refresh on expiry **and** on a `401`/`ACTION_NOT_AUTHORIZED`;
  handle expired/invalid tokens cleanly (a stated eService go-live check). Thin typed `fetch` wrapper with
  `X-GP-Version: 2021-03-22`. Preserve the **stub-mode** pattern (empty keys → deterministic fakes) so dev/e2e
  run without live keys. (SDK `globalpayments-api` optional; a small wrapper is enough and keeps deps lean.)

### 4.2 `EServiceProvider` (`payments/providers/eservice.provider.ts`) implements `PaymentProvider`
- `id='eservice'`; `supports=['CARD','BLIK']`.
- **`createIntent`** → `POST /ucp/links` (`type:"HOSTED_PAYMENT_PAGE"`, `account_name=ESERVICE_ACCOUNT_NAME`,
  unique `reference`, `order.amount`=`toMinorUnits`, `currency:"PLN"`, `country:"PL"`,
  `transaction_configuration.channel:"CNP"`, **`capture_mode:"AUTO"`** (stated), `allowed_payment_methods`
  from methodKind (`["CARD"]`|`["BLIK"]`), `authentication.preference:"CHALLENGE_PREFERRED"`, `payer` from the
  order's customer snapshot (name/email/`language`=checkoutLocale), `notifications.return_url` + `status_url`).
  Returns `{ providerRef: reference, redirectUrl: link.url, linkId: LNK, confirmed:false }`.
- **Dedup/idempotency:** on a same-order/amount retry, reuse the existing ACTIVE, non-expired link instead of
  minting a new one; else new unique `reference`. Never reuse a `reference` (rejected) → satisfies the go-live
  "unique reference per transaction" rule without double-charging.
- **`refund`** → `POST /ucp/transactions/{TRN}/refund` (amount minor units). Partial + full.
- **`retrieveIntentStatus`** → `GET /ucp/transactions?reference={our ref}` (join key we always have) →
  map to `NormalizedIntentStatus` (`CAPTURED`→`succeeded`, `DECLINED`/`EXPIRED`→`failed`,
  `INITIATED`/`PENDING`→`processing`/`requires_action`, unknown→`unknown`, error/none→`null`).
- **`cancelIntent`** → `POST /ucp/links/{LNK}/expire` (best-effort).
- **`parseWebhook`(rawBody, sig)** → verify `X-GP-Signature` (§4.4); on success normalize the notification
  into `ParsedWebhookEvent` (§4.3); on failure return `null` (→ 400). Reuse `fromMinorUnits` for amounts.
- **Pure status-mapping module** (unit-tested): `(status, result, three_ds)` → internal status/event, incl.
  BLIK async `PENDING`→final.

### 4.3 Provider-neutral webhook vocabulary
Rename `ParsedWebhookEvent.type` to `'payment.succeeded' | 'payment.failed' | 'payment.refunded'` and update
`dispatchEvent()` (3 branches) accordingly — removes Stripe-flavored names (strict scope) and lets
`EServiceProvider.parseWebhook` emit the same internal vocabulary so **`dispatchEvent`'s settle/fail/refund-sync
logic and all its terminal-state guards stay intact**. Map: `CAPTURED`+`result 00`→`payment.succeeded` (+persist
`providerTxnId`); `DECLINED`/`EXPIRED`→`payment.failed`; refund notification→`payment.refunded` (→ existing
`syncDashboardRefund`, so portal-issued refunds still sync).

### 4.4 Signature verification (security-critical — GATING validation)
`verifyEserviceSignature(rawBody: Buffer, header: string, appKey) = timingSafeEqual(sha512hex(rawBody + appKey), header)`
using the **raw** bytes exactly as received (captured in `main.ts`; **never re-serialize**), `crypto.timingSafeEqual`
(constant-time). GET `return_url` analogous (first query param vs `SHA512(rest + appKey)`) for defense-in-depth.
**The POST `status_url` notification is the authoritative source of truth — never the browser return.**
⚠️ **Do this FIRST in Slice 4 and validate against a live signed notification** (delivered to a public URL — tunnel
or VPS, see §8): confirm whether hashing raw-bytes-as-received matches, or whether the body must be re-minified.
Getting this wrong rejects every real notification. Freeze the golden fixture from that live sample for the unit test.

### 4.5 Webhook route + raw body
Add `@Post('eservice')` in `payments.webhooks.controller.ts` → `handleEserviceWebhook(raw, sig)`; generalize the
`main.ts` parser (`STRIPE_WEBHOOK_PATH` → a `WEBHOOK_RAWBODY_PATHS` set incl. `/api/v1/payments/webhooks/eservice`).
Reuse `WebhookEvents.recordIfNew/markProcessed` idempotency keyed on the notification `action.id`.

### 4.6 Reconciliation
`reconcilePayments`: query `provider:'eservice'` rows; call `eserviceProvider.retrieveIntentStatus` (which
queries `GET /ucp/transactions?reference=` — **verified live** to filter correctly, §0 — so it works even when we
never learned the TRN); keep the 15-min cadence, the non-terminal update guards, and the `attention` Sentry
capture. This is the **primary safety net** for BLIK (async) + any missed/undeliverable `status_url`.

---

## 5. Frontend build (HPP redirect)
- Delete `stripe-payment-form.tsx`; replace with a minimal submit → `createIntent({methodKind})` →
  `window.location.assign(redirectUrl)`. Remove all `@stripe/*`.
- `checkout-app.tsx`: method radio `card | blik | cod`; **drop the publishable-key fetch/mount** (HPP needs no
  client SDK/key); COD path unchanged.
- **Guest-token continuity (past bug!):** immediately before redirect, persist `{orderId, trackingToken}` to
  `localStorage`; the return/success page restores it and reads status via `useOrderTracking(orderId, token)`.
  **Do not route the token through eService.** Acceptance: hard-refresh + new-tab on return still shows the guest
  their confirmation.
- `return-app.tsx`: parse eService return (`?id=TRN…&status=…`), optionally verify the GET signature, then route
  to `/checkout/success/{orderId}` — but **treat the realtime PAID event (webhook-driven) as truth**, not the
  return params (user may close early / params are spoofable).
- `confirmation-app.tsx`: unchanged (`useOrderTracking` realtime PAID/REFUNDED).
- Update `payment-logos.tsx` + i18n copy (redirect/loading strings; Slice 6).
- Optional `provider` field: derive provider from methodKind **server-side** (card/blik→eservice, cod→cod) and
  drop `provider` from `CreatePaymentIntentSchema` — less client trust, simpler. (Decision, low-risk.)

### Contracts (freeze first, Slice 1)
- `PaymentMethodKind`: `STRIPE_CARD → CARD` via Postgres **`ALTER TYPE … RENAME VALUE 'STRIPE_CARD' TO 'CARD'`**
  — a relabel, so **no row backfill** (existing rows read as `CARD` automatically); update `seed.ts` + type unions.
  Keep `BLIK`, `COD`. **Dropping** the unused `PAYMOB`/`WALLET`/`P24`/`APPLE_PAY`/`GOOGLE_PAY` values is a separate,
  riskier PG operation (enum values can't be dropped in place — requires a type recreate/swap) and is only safe
  after confirming **zero rows use them**. Decision: either (a) verify-zero-then-drop in a dedicated migration, or
  (b) leave them inert (they're not Stripe residue). Recommend (b) now, (a) later — call it out, don't silently drop.
- `PAYMENT_PROVIDERS=['eservice','cod']`.
- `PaymentIntentResponseSchema`: `clientSecret`+`publishableKey` → **`redirectUrl: string().nullable()`** (+`confirmed`).
- `PaymentConfigSchema`: drop `stripePublishableKey` → `{ currency, methods: [...] }`.
- `CHECKOUT_PAYMENT_METHODS=['card','blik','cod']`.

---

## 6. Remove ALL Stripe (strict scope — no "kept by design")
- Delete `stripe.provider.ts`, `stripe-intent.ts` + their unit tests; unregister from `payments.module.ts`.
- Remove `stripe` (apps/api) + `@stripe/stripe-js`/`@stripe/react-stripe-js` (apps/web) from `package.json`; `pnpm i`.
- Remove `STRIPE_*` env (+ `.env.example`, deployment docs). Remove `payments.stripe_elements` flag →
  `payments.online` if a gate is still wanted.
- Rename/replace `stripe.*` + `stripeNotInit` i18n keys (PL **and** EN).
- **Legal/privacy/cookie copy** (`privacy.tsx`, `cookies.tsx`): replace Stripe Radar / 3-DS / `__stripe_mid`/
  `__stripe_sid` with eService / Global Payments equivalents. **Flag for owner/lawyer review — don't invent binding prose.**
- Final `grep -ri stripe` across apps+packages → only historical plan/changelog hits remain.

---

## 7. Edge cases & failure handling (must all be covered)
- **Token expired/invalid** → refresh once, retry; on repeat failure surface a clean 502 and leave the order PENDING.
- **Link-create 4xx/5xx** → user sees "couldn't start payment, try again"; no order confirm; Payment stays PENDING.
- **Customer abandons / closes HPP** → order stays PENDING; reconcile resolves via `GET /transactions?reference`;
  link auto-expires 24h.
- **Decline** → `payment.failed`; order stays PENDING; customer can retry (new link) — never silently CONFIRMED.
- **BLIK async** → `INITIATED/PENDING` then final via `status_url`; reconcile backstops a missed notification.
- **Duplicate / out-of-order notifications** → `WebhookEvent` idempotency + the existing `notIn[PAID,REFUNDED,
  PARTIALLY_REFUNDED]` guards (never flip a settled row).
- **Signature mismatch** → 400, no state change (unit-tested).
- **Pre-settlement void vs post-settlement refund:** `capture_mode:AUTO` settles immediately → refund path.
  (Note reversal `TRN_POST_Reverse` exists if a same-day void is ever needed.)
- **Money:** always `toMinorUnits(order.grandTotal, 'PLN')`; never client-supplied.

---

## 8. Testing (Playwright explicitly requested)

**8a. Unit (run locally + CI, no DB):** secret `SHA512(nonce+app_key)`; token-cache expiry/refresh;
HPP payload builder (minor-units, account_name, allowed methods, reference uniqueness); **`X-GP-Signature`
verifier with a real captured sandbox signature fixture**; status-mapping matrix (card + BLIK async);
reconcile-by-reference decisions; identifier persistence (LNK→TRN).

**8b. e2e (Vitest+supertest, written now, runs in CI** — per `project_e2e_needs_db`, no local PG/Redis here):
create order→`createIntent` returns `redirectUrl` + Payment PENDING; signed `CAPTURED` notification →
order CONFIRMED + Payment PAID + realtime emit + `providerTxnId` persisted; refund (full) → Refund row + order
REFUNDED via FSM; signature-mismatch → 400 no-op; reconcile marks a missed-webhook PAID. eService HTTP mocked.

**8c. Playwright — live sandbox, evidence-based** (agent-loops "evidence, not prose"; screenshots as artifacts).
⚠️ **Environment reality:** eService posts `status_url` **server-to-server to a public URL** — it never reaches
`localhost`. So split the runs:

- **Local run** (browser-observable path): checkout → HPP redirect → pay on eService → `return_url` back to our
  site. This verifies the redirect, return handling, and guest-token continuity. The webhook does **not** arrive,
  so the order flips PAID only on the next **reconcile-by-reference** poll (§4.6) — assert *that* locally (or
  trigger reconcile manually), **not** an instant realtime flip.
- **Public-URL run** (the authoritative inbound path + §4.4 signature validation): expose the API via a tunnel
  (cloudflared/ngrok) or deploy to the **Contabo VPS** (`/opt/restaurant`, see reference memory) and set
  `ESERVICE_WEBHOOK_URL` to it. Only here can you confirm the `status_url` POST arrives, the `X-GP-Signature`
  verifies, and the order flips PAID via realtime in near-real-time. Capture one real signed notification to freeze
  the §8a signature fixture.

Scenarios (local for redirect/return + guest-token; public-URL for the PAID-via-webhook assertion):
1. **Card success** — `4263970000005262` → return → (webhook) PAID via realtime.
2. **3-DS challenge** — `4242420000000091` → complete challenge → PAID.
3. **Decline** — `4000120000001154` → failure, order stays PENDING, retry works (local-observable).
4. **BLIK** — method=BLIK → sandbox BLIK auth → `INITIATED`→PAID (async; needs public URL or reconcile).
5. **Portal confirmation** — log into `portal.sandbox.eservicegateway.com` (Client ID `MerchantTestPL031`) and
   visually confirm each txn (amount + reference) — the acceptance proof (works regardless of environment).
6. **Admin refund** — refund from admin → confirm in portal + order shows REFUNDED.
7. **Guest journey** — repeat card-success as a guest → verify the tracking token survives the redirect round-trip
   (local-observable).

**8d. Journey acceptance matrix (all must pass):** `{guest, logged-in} × {card, BLIK} × {success, decline, 3-DS,
refund}` + guest-token continuity. (Directly targets the catalogued past bugs "guests blocked from BLIK" and
"refund bypassed the FSM".)

---

## 9. Cutover, rollback & data
- **Additive migrations first** (nullable `providerLinkId`/`providerTxnId`); `STRIPE_CARD→CARD` via enum
  `RENAME VALUE` (no backfill, §5); `prisma generate` + commit after each schema change.
- **Existing Stripe payments:** system is code-complete **but not live** (single restaurant) → expected **zero**
  real Stripe transactions to refund. **Confirm with owner.** If any exist: refund via the Stripe dashboard
  before removing the key, or keep a read-only Stripe refund path for one release.
- **Rollback** = revert the single batched commit (per "batch big tasks, push once at end"). Optionally keep a
  `payments.online` flag to disable online payments (COD-only) as a fast kill-switch during cutover.
- **Sandbox creds are burned** (shared in chat/screenshot) — regenerate in the portal before go-live regardless.

## 10. Compliance / observability
- HPP = **PCI SAQ-A** (no PAN touches our servers/client). Update privacy/cookies accordingly.
- Sentry already initialised; add breadcrumbs + `warn` on link-create + signature-verify failures; keep the
  reconcile `attention` `captureException`.

---

## 11. Go-live / certification (owner + eService — after sandbox is green)
1. Merchant Service Agreement (owner — in progress).
2. Testing requirements incl. expired-token handling + unique reference (built in).
3. **Integration Validation** — owner emails eService Integration Support; confirm the certification checklist for
   HPP + BLIK + 3-DS.
4. Receive **production** app_id/app_key + production account_name/MID + prod portal access.
5. Flip `ESERVICE_ENV=production` + paste prod creds into server env — **no code change.** Confirm whether prod
   requires **IP-allowlisting** our API egress with the account manager.
6. **Penny test:** one real low-value txn → funds settle to the owner's bank → refund it → enable for customers.

---

## 12. Open items / decisions for you
1. ✅ Integration model — **HPP** (done).
2. **Method-kind trimming:** OK to drop `APPLE_PAY`/`GOOGLE_PAY`/`P24`/`WALLET`/`PAYMOB` from the enum now
   (eService supports Apple/Google Pay via HPP + open-banking; wire later), keeping `CARD`/`BLIK`/`COD`?
3. Confirm **PLN** is the only currency (it is in seed/config — affects minor-units + HPP `currency`).
4. Confirm **zero live Stripe payments** exist (see §9), so full removal is safe.
5. Owner: resend credentials **as text**; kick off eService Integration Validation.

## 13. Sequence
Slice 1 (contracts+migration, freeze) → 4 (provider+webhook+reconcile, the bulk) → 5 (frontend) → admin →
6 (Stripe removal) → 8 (tests + Playwright evidence). Backend-heavy; frontend light (redirect/return/realtime
scaffolding already exists). Single batched commit+push to `main` once the journey matrix + Playwright evidence are green.
