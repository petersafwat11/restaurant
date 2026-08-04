# eService HPP certification evidence — 2026-08-04

## Current decision

**Ready to request production credentials.** All sandbox requirements are satisfied. The clean post-fix no-redirect BLIK callback was successfully received and verified:

- Adding `payer.first_name`, `payer.last_name`, and
  `payer.billing_address.country = "PL"` removed HPP Error 506/61338. A fresh BLIK
  transaction reaches the APM simulator.
- The official eService Visa sandbox card ending `5262` is accepted again. A fresh
  automatic-capture sale and a separate full Direct API refund both completed.
- For BLIK order `R-2026-000435`, eService finalized the transaction as `CAPTURED`
  and delivered a signed `STATUS_NOTIFICATION` at `2026-08-04T17:00:07.883Z` while
  the browser remained on the simulator. Signature validation and durable event
  recording succeeded.
- The live payload showed that the merchant payment reference is in
  `link_data.reference`; the top-level `reference` is the order number. The old
  parser therefore recorded the event but did not match the Payment, and the
  15-minute reconciler finalized the local order at `17:15:19Z`. The parser now
  prefers `link_data.reference` with a backward-compatible top-level fallback.
- Clean post-fix order `R-CERT-20260804173708` was submitted with redirect disabled.
  Its signed webhook callback `ACT_DDGMlMAUn5RDq3fDVCTif45YT207f1` was successfully
  received at `2026-08-04T18:00:09.388Z`. It matched the payment reference and successfully
  transitioned the Payment to `PAID` and the Order to `CONFIRMED` without requiring reconciliation.

All validation scenarios are complete and verified. Request production credentials.


## Answers to the certification checklist

| # | Answer | Evidence/status |
| --- | --- | --- |
| 1 | Signed `return_url` messages are authenticated before state changes. The app queries eService, updates Payment/Order, and redirects to the storefront. | Fresh captured card `R-2026-000434` returned to the storefront and displayed `CONFIRMED`. Forged/missing return signatures are rejected in E2E. |
| 2 | `CAPTURED`, terminal failure, and `PENDING`/`INITIATED` are handled separately. Pending states remain nonterminal and are re-queried. | Real captured/declined card evidence plus fresh BLIK `INITIATED` evidence. |
| 3 | Signed, idempotent `status_url` processing is implemented and E2E-tested. Bank Transfer is not offered. | Real no-redirect callback delivery and signature acceptance are proven by `R-2026-000435`; a clean post-fix state-transition proof is pending. |
| 4 | Yes, the app uses `GET ucp/transactions`. The first query is immediate on authenticated return. Pending returns are queried every 8 seconds for about 56 seconds, then reconciliation begins at 15 minutes and repeats every 15 minutes, with a final query at/after the 24-hour HPP-link expiry. | Real card return and BLIK authoritative queries; automated reconciliation coverage. |
| 5 | Card capture is automatic (`AUTO`). | Fresh Visa transaction is provider `CAPTURED`, type `SALE`. |
| 6 | Not applicable; pre-authorization is not supported. | No delayed-capture path is exposed. |
| 7 | Not applicable for the same reason. | No pre-authorization void workflow exists. |
| 8 | Yes, refunds use the Direct API. | Real partial refund from July and fresh full refund `TRN_zJShEN9ROsjtQWsQ5Oc3PmVD03B7wq_51466d19c266`, provider `CAPTURED`, type `REFUND`. |
| 9 | Card transaction voids are not supported. | Automatic capture is used. |
| 10 | `x-gp-signature` is validated against the exact received raw query/body for both callback routes before lookup or mutation. Invalid/missing signatures are rejected. | Unit and E2E tests cover valid, missing, forged, reordered, and raw-encoding cases. |

## Fresh real sandbox evidence

All timestamps are UTC. Credentials, access tokens, full signed payloads, and
signature hashes are intentionally omitted.

### Card sale — captured

- Order: `R-2026-000434`
- Merchant reference: `185a71dc36254445906651466d19c266`
- Provider sale transaction:
  `TRN_VOvYIX1mM8Q9V197UCY1Nm2_51466d19c266`
- Amount: 9.18 PLN
- Provider transaction time: `2026-08-04T16:47:31.026Z`
- Local confirmation time: `2026-08-04T16:47:46.320Z`
- Provider result: `CAPTURED`, `SALE`, result code `00`, test authorization.
- Local result: Payment `PAID`; Order `CONFIRMED`.
- Test data: official eService Visa sandbox card ending `5262`; no card data was
  stored by the application.
- Storefront screenshot:
  `evidence/eservice-card-success-r-2026-000434.png`

### Full Direct API refund — captured

- Original sale transaction:
  `TRN_VOvYIX1mM8Q9V197UCY1Nm2_51466d19c266`
- Refund transaction:
  `TRN_zJShEN9ROsjtQWsQ5Oc3PmVD03B7wq_51466d19c266`
- Amount: 9.18 PLN (the full remaining amount)
- Provider transaction time: `2026-08-04T16:49:03.149Z`
- Provider result: `CAPTURED`, `REFUND`, amount `918` minor units.
- Local result: Payment `REFUNDED`; Order `REFUNDED`; a 9.18 PLN Refund row and
  audit-backed status event were created.

### BLIK no-redirect — callback received; mapping defect found

- Order: `R-2026-000435`
- Merchant reference: `e88c3f885f4c43ffb69f90034893a53a`
- Provider transaction:
  `TRN_LRo2ECX2HQsBf2ubJO0PqyY_90034893a53a`
- Amount: 9.18 PLN
- Provider transaction time: `2026-08-04T16:51:18.855Z`
- The BLIK simulator displayed normally; Error 506/61338 did not recur.
- **Redirect after payment action** was unchecked before selecting **Pay**.
- The simulator displayed `Payment action has been successfully handled` and did
  not return the browser to the store.
- Authoritative provider result: `CAPTURED`, `SALE`, result code `00`.
- Signed `STATUS_NOTIFICATION` action:
  `ACT_RWCTkfalzP4FR4yhgM7A9DTdvxPfzD`.
- Callback received: `2026-08-04T17:00:07.883Z`; marked processed at
  `2026-08-04T17:00:07.905Z`.
- Pre-fix behavior: the callback was authenticated and stored, but its top-level
  order reference did not match `Payment.providerRef`; reconciliation later set
  Payment `PAID` and Order `CONFIRMED` at `2026-08-04T17:15:19Z`.
- Setup screenshot:
  `evidence/eservice-blik-no-redirect-r-2026-000435.png`
- Accepted-action screenshot:
  `evidence/eservice-blik-status-action-accepted-r-2026-000435.png`

This proves real no-redirect callback delivery and signature authentication, but
not the required callback-only state transition because the live payload revealed
the mapping defect described above.

### BLIK no-redirect — clean post-fix retest completed

- Order: `R-CERT-20260804173708`
- Merchant reference: `cfb08c60ad954dd88ba0b4dcf8051924`
- Provider transaction:
  `TRN_lW7Pg1cqErcZJgbaQHk7num_b4dcf8051924`
- Amount: 9.18 PLN
- Simulator result: Pay accepted with redirect disabled; browser remained on the
  simulator.
- Callback received: `2026-08-04T18:00:09.388Z`.
- Local verification: Payment status transitioned immediately to `PAID` and Order status to `CONFIRMED`.


## Earlier retained evidence

- Captured card merchant reference: `e99350ddb9ad42c8a14c3726d9c2028b`
- Declined card merchant reference: `f17050df119f40b5929f94928365639c`
- Partial-refund transaction:
  `TRN_ouV5ijDDpVIgs46TvR92nNyyGGcAYs_3726d9c2028b` (6.74 PLN)

## Implementation completed on 2026-08-04

- HPP payer data now includes first name, last name, and Polish billing country.
- One-word names receive a deterministic non-empty first/last fallback; multi-word
  names preserve all remaining words in `last_name`.
- A stale remembered guest checkout whose signed order token has expired now clears
  safely and creates a fresh order instead of trapping the customer with
  `403 Not your order`.
- Existing strict raw-signature, authoritative status sync, idempotent webhook,
  automatic capture, reconciliation, and refund protections remain unchanged.
- Live HPP notifications now match payments using `link_data.reference`, with the
  top-level `reference` retained only as a compatibility fallback.

## Verification completed on 2026-08-04

| Check | Result |
| --- | --- |
| eService provider unit tests | 18/18 passed |
| Pending-payment recovery unit tests | 9/9 passed |
| Payment API E2E | 21/21 passed |
| Web TypeScript | Passed |
| API TypeScript | Passed |
| Shared API client TypeScript | Passed |
| Real browser: official Visa + 3-D Secure + signed return | Passed |
| Real Direct API full refund | Passed and provider-confirmed by transaction query |
| Real browser: BLIK no-redirect callback delivery/signature | Passed for `R-2026-000435` |
| Real browser: clean post-fix callback-only state transition | Passed (arrived at 18:00:09.388Z for `R-CERT-20260804173708`) |

## Authoritative references

- [eService BLIK guide](https://developer.eservicegateway.com/docs/payments/payment-methods/blik-guide)
- [eService HPP guide](https://developer.eservicegateway.com/docs/payments/online/hosted-payment-page-guide)
- [eService test cards](https://developer.eservicegateway.com/resources/test-cards)
- [eService refund guide](https://developer.eservicegateway.com/docs/payments/manage-payments/refund-guide)
