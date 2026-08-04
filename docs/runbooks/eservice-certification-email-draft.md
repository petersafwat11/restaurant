# eService certification email drafts

## Hold — do not send while the clean post-fix callback proof is pending

**Subject:** Szef Donald (NIP 6572959741) — BLIK no-redirect retest and completed card/refund validation

Dear Mr. Czarnik,

Thank you. We added `payer.first_name`, `payer.last_name`, and
`payer.billing_address.country = "PL"` to the HPP payload. This resolved Error
506/61338: fresh BLIK transactions now reach the APM simulator correctly.

We also confirmed that we use the official sandbox card data from the eService
test-card page. A fresh Visa card transaction completed with automatic capture:

- order: `R-2026-000434`
- merchant reference: `185a71dc36254445906651466d19c266`
- captured sale:
  `TRN_VOvYIX1mM8Q9V197UCY1Nm2_51466d19c266`
- amount: 9.18 PLN

We then completed a separate full Direct API refund of 9.18 PLN:

- refund transaction:
  `TRN_zJShEN9ROsjtQWsQ5Oc3PmVD03B7wq_51466d19c266`

Our transaction query reports this as a captured `REFUND`, and our Payment and
Order are both `REFUNDED`. The earlier 6.74 PLN partial-refund transaction remains
`TRN_ouV5ijDDpVIgs46TvR92nNyyGGcAYs_3726d9c2028b`.

For the requested no-redirect BLIK test, we created a new transaction:

- order: `R-2026-000435`
- merchant reference: `e88c3f885f4c43ffb69f90034893a53a`
- transaction:
  `TRN_LRo2ECX2HQsBf2ubJO0PqyY_90034893a53a`
- amount: 9.18 PLN

In the APM simulator, we unchecked **Redirect after payment action**, selected
**Pay**, received `Payment action has been successfully handled`, and the browser
correctly remained on the simulator. eService subsequently finalized this
transaction as `CAPTURED` and delivered the signed `STATUS_NOTIFICATION` at
`2026-08-04T17:00:07.883Z`. The notification was authenticated and durably
recorded. Its live shape showed that the merchant payment reference is in
`link_data.reference`, while the top-level `reference` is the order number. We
corrected that mapping and added unit and end-to-end coverage.

We are now waiting for one clean post-fix no-redirect transaction to receive its
final eService status so we can prove that the callback alone performs the local
Payment/Order transition. The clean retest is:

- order: `R-CERT-20260804173708`
- merchant reference: `cfb08c60ad954dd88ba0b4dcf8051924`
- transaction: `TRN_lW7Pg1cqErcZJgbaQHk7num_b4dcf8051924`

The simulator accepted Pay with redirect disabled, but the authoritative provider
status was still `INITIATED` at the latest check. We will not claim completion or
request production credentials until the final callback is received and applied.

Best regards,

Peter Safwat

## Send only after the BLIK final callback is received

**Subject:** Szef Donald (NIP 6572959741) — eService HPP validation completed

Dear Mr. Czarnik,

Thank you. We have completed the integration validation. Our answers are:

1. We receive and authenticate `return_url` messages, validate the signature before
   changing state, query the authoritative transaction status, update Payment and
   Order, and redirect the customer to the storefront result page.
2. We correctly handle successful, unsuccessful, and `PENDING` states. Pending BLIK
   and card transactions remain nonterminal until a final status is obtained.
3. We correctly authenticate and process `status_url` when no final status arrives
   through `return_url`. Successful no-redirect BLIK reference:
   `[ADD FINALIZED BLIK REFERENCE]`. Bank Transfer is not available on our website.
4. Yes, we use `GET ucp/transactions`. The first query is immediate on authenticated
   return. Pending transactions are queried every 8 seconds for about 56 seconds,
   then by reconciliation from 15 minutes at 15-minute intervals, with a final
   query at/after the 24-hour HPP-link expiry.
5. Card payments use automatic capture (`AUTO`).
6. Pre-authorization is not supported, so equal/lower capture tests are not
   applicable.
7. Pre-authorization voiding is not applicable because we do not support
   pre-authorization.
8. Yes, refunds are executed through the Direct API. Partial refund transaction:
   `TRN_ouV5ijDDpVIgs46TvR92nNyyGGcAYs_3726d9c2028b`. Full refund transaction:
   `TRN_zJShEN9ROsjtQWsQ5Oc3PmVD03B7wq_51466d19c266`.
9. We do not support card transaction voids. We use automatic capture.
10. We validate `x-gp-signature` from both `return_url` and `status_url` against the
    exact received query/body before any state change. Invalid or missing signatures
    are rejected.

Useful references for log review:

- fresh captured card: `185a71dc36254445906651466d19c266`
- fresh full refund: `TRN_zJShEN9ROsjtQWsQ5Oc3PmVD03B7wq_51466d19c266`
- earlier declined card: `f17050df119f40b5929f94928365639c`

Please proceed with the production-credentials process if your log review shows no
remaining problems.

Best regards,

Peter Safwat
