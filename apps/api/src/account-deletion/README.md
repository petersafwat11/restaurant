# Account deletion & DSAR runbook (Slice 9 / plan §G2)

Module-local operational note. The authoritative customer-facing privacy text and
the retention matrix live elsewhere (and need lawyer sign-off — see "Owner / lawyer
decisions" below). This file documents how the workflow behaves and how staff
handle requests that don't come through the self-service flow.

## Self-service flow (logged-in customers)

`apps/web` → `/account/delete`:

1. **Request** — `POST /account/deletion/request`
   - `{ method: 'password', currentPassword }` → password reauth, then schedule
     immediately (status `PENDING`).
   - `{ method: 'email' }` → for accounts without a password (OTP/social). The
     server emails a single-use confirmation link (1-hour expiry). Status stays
     `NONE` until confirmed.
2. **Confirm** (email flow only) — `POST /account/deletion/confirm { token }`
   consumes the token and schedules (`PENDING`).
3. **Cancel** — `POST /account/deletion/cancel` during the grace period →
   `CANCELLED`. The scheduled job re-checks status and no-ops.
4. **Status** — `GET /account/deletion` returns
   `{ status, requestedAt, scheduledAt, anonymisedAt, confirmationEmailSent, graceDays }`.

All four routes require a valid session (global `JwtAuthGuard`). They are customer
self-service, so they carry **no `@Permissions`** (the `customer` role has none —
a permission gate would lock customers out). The service only ever acts on the
authenticated user's own account. The three mutating routes are `@RateLimit`-ed.

Grace period: **7 days (PROVISIONAL — owner/lawyer must confirm)**. After it
elapses the BullMQ `account.anonymise` job runs.

## What anonymisation does vs retains

The User row is **pseudonymised, not deleted** (`Review.userId` is FK-restrict and
retained orders keep their user link; the Order already carries an immutable
customer snapshot for receipts/accounting). Because the row survives, **no cascade
fires** — every PII-bearing child row is handled explicitly in
`AccountDeletionService.anonymise()`.

> **Important — this is account-PROFILE deletion, not full erasure of all PII.**
> Pseudonymising the `User` row does **not** remove the customer identity stored
> on retained orders: `Order.customerName/customerEmail/customerPhone`, the
> `deliveryAddress` JSON, and the `legalSnapshot` JSON remain in plaintext on each
> historical order. That data is kept under the legal-obligation basis
> (accounting/tax/dispute), NOT anonymised — so the data subject is still
> identifiable from their order history. The customer-facing copy must say so
> accurately (it does not claim full anonymisation), and the concrete retention
> period for this order PII is part of the **FLAGGED** lawyer/accountant matrix.

User row itself → email `deleted-<id>@deleted.invalid`, phone/name/avatar/
passwordHash cleared, `isActive=false`, `deletionStatus=COMPLETED`, `anonymisedAt`
set.

Per-relation disposition (every `User` relation in schema.prisma):

| Relation | Disposition | Basis |
|---|---|---|
| RefreshToken | **delete** | sessions revoked immediately |
| UserAddress | **delete** | PII, not needed post-deletion |
| PushToken | **delete** | device identifier |
| NotificationPreference | **delete** | account setting |
| Notification | **delete** | title/body carry order PII (names/addresses) |
| PaymentMethod | **delete** | tokenized refs; no longer needed |
| Cart / CartItem | **delete** | transient (items cascade on cart delete) |
| CustomerNote | **delete** | staff CRM observations about the data subject |
| Reservation | **detach + de-identify** | `userId→null`, contact name/phone anonymised; operational/no-show record retained de-identified |
| Order / OrderItem / OrderStatusEvent | **retain (incl. PII, FLAGGED)** | accounting/tax/dispute. NB: the Order's immutable customer snapshot (name/email/phone) + deliveryAddress/legalSnapshot JSON ARE retained PII — kept under legal-obligation basis, NOT anonymised. Concrete retention period = lawyer/accountant matrix |
| Payment / Refund | **retain** | accounting/fraud/dispute |
| AuditLog | **retain** (not a FK relation) | security/audit trail |
| Review / ReviewImage | **retain (FLAGGED)** | needs lawyer matrix decision |
| LoyaltyAccount / LoyaltyTransaction | **retain (FLAGGED)** | needs lawyer matrix decision |
| ReferralCode / Referral | **retain (FLAGGED)** | code is non-PII; needs lawyer matrix decision |
| CouponRedemption | **retain** | links to retained orders/promotions; `userId` kept behind anonymised row |
| UserRole | **retain** | role membership on the anonymised (inactive) row is harmless |
| UserTag | **retain** | non-PII segmentation tag |

**FLAGGED** rows (reviews, loyalty, referrals) are retained behind the
identity-severed user row pending the lawyer/accountant retention matrix (plan
§G1). Flip them to delete/detach once the matrix is signed off.

## Manual / guest & non-account DSAR requests

Guests (and anyone who can't use the self-service flow — e.g. phone-only accounts
with a synthetic `@phone.local` email and no password, who can neither reauth by
password nor receive a confirmation email) must contact the privacy address
published in the Privacy Policy (the restaurant `privacyEmail` field). Staff
handling such a request:

1. **Verify identity** before acting — confirm control of the email/phone on file
   (e.g. order numbers + the email/phone used). Do **not** collect or store extra
   identity documents beyond what's needed to verify.
2. **Respond within the statutory deadline** (one month under GDPR Art. 12(3),
   extendable per the regulation — confirm the exact operational promise with the
   lawyer).
3. **Audit trail** — the resulting anonymisation is captured by `deletionStatus`/
   `anonymisedAt` on the User row plus existing audit logging; record the manual
   verification out-of-band per the lawyer-approved DSAR procedure.

## Owner / lawyer decisions still required

- **Retention/anonymisation matrix** (plan §G1), especially reviews/loyalty/
  referrals for an anonymised account. Defaults here are provisional.
- **Grace-period length** (default 7 days).
- **Reauth policy** — password vs email-token vs both (both are implemented).
- **DSAR response-time promise** and identity-verification standard.
