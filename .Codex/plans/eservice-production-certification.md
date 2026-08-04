# eService production-certification plan

## Objective

Bring the existing eService HPP sandbox integration into demonstrable compliance
with Jakub Sienski's 10-point validation checklist, execute the required sandbox
scenarios for every payment method actually offered by the storefront, preserve
evidence, and prepare a truthful production-credentials reply for the merchant.

Production credentials are not available yet, so this plan ends with the
certification reply and a separate post-issuance production smoke-test checklist.

## Scope and declared capabilities

- Storefront payment methods: card, BLIK, and cash on delivery.
- eService methods subject to certification: card and BLIK only.
- Bank Transfer is not offered and will be reported as not applicable.
- Card capture mode is `AUTO`; pre-authorization, delayed/partial capture, and
  pre-authorization voids are not supported and will be reported as not applicable.
- Captured eService payments support full and partial refunds through the Direct API.
- Expiring an unused HPP link is supported, but this is not represented as a card
  transaction void.

## Implementation

1. Add a shared eService notification-signature verifier that correctly handles:
   - POST JSON `status_url` messages signed in the `X-GP-Signature` header over
     the exact/minified body plus the application key;
   - GET `return_url` messages whose first query parameter is `X-GP-Signature`,
     signed over the exact remaining encoded query string plus the application key;
   - the form-encoded POST return shape observed in the sandbox, without
     reordering or re-encoding signed fields.
2. Capture the exact raw URL/body needed for verification on both callback routes.
   Reject missing, malformed, or mismatched signatures without changing payment
   or order state.
3. Generalize return-time provider synchronization so an authenticated return
   handles `CAPTURED`, failure terminal states, and `PENDING` correctly. Continue
   treating `GET /ucp/transactions` as authoritative rather than trusting a
   browser-controllable status value by itself.
4. Keep `status_url` processing idempotent and safe for duplicate/out-of-order
   delivery. Confirm BLIK `PENDING` remains nonterminal and only a final status
   confirms or fails the payment.
5. Give reconciliation a documented final-query policy tied to the 24-hour HPP
   link lifetime: immediate return query, short return retries, 15-minute recovery
   queries, and a final query at/after expiry. Continue accepting authenticated
   late `status_url` notifications after polling ends.
6. Correct local setup/runbook text so `ESERVICE_RETURN_URL` points to the API
   callback endpoint, document the exact polling policy, and add a certification
   evidence checklist without storing credentials or signed payloads.

## Automated verification

1. Unit-test valid and invalid POST JSON signatures.
2. Unit-test valid and invalid GET return-query signatures while preserving raw
   encoding and parameter order.
3. Unit-test form-encoded POST returns if supported by the observed sandbox shape.
4. Test successful, failed, pending, duplicate, and out-of-order callback handling.
5. Add/extend API e2e coverage for the signed `return_url` and `status_url` paths,
   including database/order transitions and rejection of forged messages.
6. Test reconciliation timing/final-expiry decisions and Direct API refunds.
7. Run payment unit tests, API e2e tests, API typecheck, and affected workspace
   checks. Preserve the exact commands and results in the evidence report.

## Real sandbox validation

1. Start PostgreSQL, Redis, API, web, admin, and a stable public HTTPS tunnel.
   Validate both callback URLs from outside localhost before creating HPP links.
2. Run and record at least these eService transactions:
   - card success with normal return;
   - card decline/failure with normal return;
   - BLIK success with redirect enabled;
   - BLIK failure with redirect enabled;
   - BLIK `PENDING` followed by a final status;
   - BLIK final success with the simulator's Redirect option unchecked;
   - BLIK final failure with Redirect unchecked, if the simulator exposes it.
3. For every scenario, record only safe evidence: order number, merchant reference,
   eService `TRN_` identifier, timestamps, callback channel, signature-validation
   result, and final local Payment/Order status. Redact credentials, tokens,
   customer data, complete signed payloads, and application-key-derived digests.
4. Prove the no-redirect BLIK transaction reaches its correct final local state
   solely through `status_url` (with reconciliation disabled/not relied on during
   that observation window).
5. Execute a full and a partial Direct API refund against suitable captured sandbox
   transactions and verify provider response, local Refund rows, Payment status,
   Order status, audit record, and queued customer notification.
6. Verify the public storefront exposes no Bank Transfer method and the created HPP
   link restricts `allowed_payment_methods` to the customer's chosen method.

## Deliverables and exit criteria

- All affected automated checks pass.
- Every applicable sandbox scenario has a transaction identifier and expected
  provider/local result; any provider-side delivery issue is documented rather
  than described as passed.
- `return_url` and `status_url` both reject invalid signatures and accept real
  authenticated sandbox messages.
- Automatic capture, non-support of pre-authorization/void, Direct API refunds,
  polling timings, and Bank Transfer non-availability are stated precisely.
- A concise evidence report is added under `docs/runbooks/` with no secrets.
- A ready-to-send English reply answers all 10 questions and lists the sandbox
  transaction references Jakub can inspect in eService logs.
- A separate post-credential checklist explains secret installation, environment
  switch, deployment, a minimal real-payment smoke test, refund verification, and
  rollback/kill-switch monitoring. No production switch occurs before credentials
  are issued and explicitly installed.

## Safety boundaries

- Never commit sandbox or production credentials, access tokens, customer data,
  raw signed callback messages, or complete signature hashes.
- Use only official sandbox cards and the eService BLIK simulator.
- Do not claim Bank Transfer, pre-authorization, capture, or void support that the
  storefront does not implement.
- Do not send the email on the merchant's behalf; prepare it for review and sending.
- Do not enable production mode or initiate a real charge without the later-issued
  credentials and an explicit production execution step.
