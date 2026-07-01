# Plan: Complete the four customer account flows end-to-end

Close the customer-facing gaps in **Referrals, Reviews, Loyalty, Notifications**. Backends are
mostly built; the work is overwhelmingly frontend wiring plus a thin realtime slice for
notifications. Ordered by risk (smallest, surest win first).

## Ground rules
- **Branch first.** Working tree is dirty with unrelated changes (timezone, promotions,
  hours-table). Create `feat/complete-account-flows` and commit per-feature so those aren't
  swept in.
- **Verify per feature, not once at the end.** Each UI flow gets a real run-through; each
  backend change gets/keeps an e2e test. "Typecheck passes" is not "done."
- All strings land in **both** `en` and `pl` i18n JSON.
- New shared UI → `packages/ui`; money via `packages/utils` helpers; DTOs already in `packages/types`.

---

## 1. Referrals — close the signup loop (smallest)
**Problem:** `register/page.tsx` never reads `?ref=` and never sends `referralCode`. Backend is ready.

- `apps/web/.../(auth)/register/page.tsx`:
  - Read `ref` via `useSearchParams()` (mirror login/reset which already do; wrap in `Suspense`).
  - **Sanitize before use** — `RegisterSchema.referralCode` is `min6/max16/^[A-Za-z0-9]+$`, but
    the backend silently ignores bad codes. A malformed `?ref=bad!!!` bound into the validated
    form would block the *entire* signup. So: validate the param against the code shape; if it
    fails, drop it silently (don't bind, don't block). Only pass it through when well-formed.
  - Show a small read-only "Referral applied: `CODE`" note when a valid code is present.
  - Include `referralCode` in the submit payload.
- i18n: `web/auth/register.json` → `referralApplied` note (en + pl).
- **Verify:** register with `?ref=<valid code>` → row in `Referral` (PENDING); complete that
  user's first order → both parties get points. Confirm malformed `?ref=` still lets signup proceed.

## 2. Reviews — add the create flow
**Problem:** read-only page only; `useCreateReview` unused; no rating input, form, or CTA.
Backend enforces COMPLETED/DELIVERED + one-per-order; upload kind `review-image` already exists.

- **New** `packages/ui/src/star-rating-input/` — interactive, keyboard-accessible 1–5 star input
  (the existing `Stars` is display-only). Export from package index.
- **New** `apps/web/src/features/uploads/hooks/use-upload-image.ts` — mirror admin's; wraps
  `apiClient.uploads.upload({ file, kind })`. (No web uploads hook exists yet.)
- **New** `apps/web/src/features/reviews/components/review-dialog.tsx` — `ActionModal` +
  `StarRatingInput` + comment `Textarea` + optional `ImageUploader` (kind `review-image`, max 5).
  Calls `useCreateReview`; on success toast `thanks`, invalidate `['reviews']` + `['orders']`, close.
- **CTAs** (show only when status ∈ {COMPLETED, DELIVERED} and not already reviewed):
  - `features/checkout/components/confirmation-app.tsx` (order detail / post-checkout).
  - `(account)/account/orders/page.tsx` (per-order "Write a review" / "Reviewed ✓").
  - "Already reviewed?" is derived from `useMyReviews()` (`ReviewDto.orderId` exists). **But
    that query is cursor-paginated** — a page-1 Set can miss old orders. So treat the backend
    **400 "already reviewed"** as the real backstop: catch it in the dialog, show a friendly
    "already reviewed" message, refresh, and close.
- i18n: extend `web/account/reviews.json` (several keys like `writeReview/rating/comment/submit/
  thanks` already exist) with modal title, placeholders, photo label/helper, cancel, error copy.
- **Verify:** place → complete an order → write a review w/ image → appears on
  `/account/reviews` and admin moderation. Re-attempt → graceful "already reviewed".

## 3. Loyalty — redeem at checkout (most verification)
**Problem:** earning + display work; no redeem UI. Server path is real:
`setLoyalty` (PATCH /cart/loyalty) → order creation burns via `cart.loyaltyPointsToRedeem`.

- **New** `packages/ui/src/loyalty-redeem-input/` — presentational, mirrors `PromoCodeInput`:
  shows balance, points input (`QuantityStepper`/input), Apply/Remove, resulting discount.
- `packages/ui/src/order-summary-panel/` — add optional `loyaltyDiscount?: {amount,label}` row
  (distinct from the promo `discount` slot).
- `features/checkout/components/checkout-app.tsx`:
  - Load `useLoyaltyAccount()` (auth-gated); only render redeem UI when logged in & `points > 0`.
  - `handleApplyLoyalty(points)`: `loyalty.redeemQuote({points, subtotal})` → use server
    `appliablePoints` + `discountAmount`; `cart.setLoyalty({points: appliablePoints})`; set state.
  - Fold `discountAmount` into `computeSummary` total + pass the loyalty line to the summary.
  - **Re-quote / clamp on cart change.** `burnForOrderTx` throws `ConflictException` and rolls
    back the whole order if the basis shifted after quoting. So when cart items change, re-run
    the quote (or clear the applied points) to avoid a confusing checkout failure.
  - On remove: `cart.setLoyalty({points: 0})`, clear state.
- i18n: add `loyalty` namespace to `web/shop/checkout.json` (en + pl).
- **Verify the charge, not the display (CLAUDE.md "never trust client prices"):** read
  `orders.service` payment path and confirm the order `grandTotal` / Stripe PaymentIntent is
  reduced server-side by the burned points — assert it in an e2e test, don't infer it. Then run
  the flow: earn points → redeem at checkout → discount shows → order total + charge match →
  points decrement; cancel/refund restores them.

## 4. Notifications — badge, realtime, preferences (most surface)
In-app feed already works (order-status notifications written on `order.status_changed`).

**Scope note (confirm up front):** "realtime" here = **Socket.IO live in-app updates** (badge +
feed refresh), *not* browser/OS push (service workers / FCM) — that's a separate, much larger
track and is **out of scope**.

- **Realtime types** `packages/types/src/realtime.ts`: add `'notification.created'` to event
  names + a payload schema; add `ROOMS.user = (id) => \`user:${id}\``.
- **Realtime client** `packages/realtime-client`: add `notification.created` to the event map so
  `.on()` is typed.
- **Gateway** `apps/api/src/realtime/realtime.gateway.ts`: allow `canJoin` for
  `ROOMS.user(user.id)` (self only); add `@OnEvent('notification.created')` → emit to that room.
- **Dispatcher** `notification-dispatcher.service.ts`: after writing the in-app row, emit
  `notification.created` (decoupled from the gateway).
- **Client hook** `features/notifications/hooks/use-notification-realtime.ts`: when logged in,
  subscribe to `ROOMS.user(userId)`; on event invalidate `['notifications']` (list + unread-count).
  Mirror `useOrderTracking`.
- **Badge** `apps/web/src/components/notification-bell.tsx` (mirror `CartButton`): `useMe` gate +
  `useUnreadCount`; Bell icon + count; links to `/account/notifications`; mounts the realtime hook.
  Render in `site-chrome`/`SiteNav` next to the cart, **only when authenticated**.
- **Preferences** — panel on the existing notifications page using
  `useNotificationPreferences` / `useUpdateNotificationPreferences` + `Switch`.
  - **Don't ship dead switches.** Per the audit, push has no sender and promo notifications are
    never generated. So first **verify which workers actually deliver** (email/sms/push). Expose
    toggles only for channels with a real delivery path; hide or mark the rest "coming soon."
    In-app order updates are always on (informational).
- i18n: extend `web/account/notifications.json` (en + pl) with preferences labels + bell aria.
- **Verify:** trigger an order status change → toast/feed updates live without refresh, badge
  increments; mark-read clears it; toggling a (functional) preference suppresses that channel.

---

## Out of scope (explicit)
- Browser/OS push notifications (service workers, FCM/APNs).
- The pre-existing **promo code is client-side mock** (computed in `computeSummary`, not applied
  server-side). Noted as a separate bug; not fixed here unless you want it added.

## Validation before "done"
- `pnpm typecheck`, `pnpm lint`, build for `web` + affected packages.
- e2e: keep/extend referrals + reviews specs; **add** a loyalty-redemption-at-checkout charge test.
- Manual run-through of each of the four flows in `apps/web`.
- One commit per feature on the new branch.
