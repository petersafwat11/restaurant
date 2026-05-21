# Guest checkout-success refresh fix

## Problem

`/checkout/success/[orderId]` shows the order on first paint because `useCreateOrder` seeds the TanStack Query cache. On refresh the cache is gone, the page calls `GET /orders/:id`, and the backend 404s because guests have no `userId` ownership and no signed token in the URL.

## Approach — token-in-URL (option A)

Reuse the existing `signOrderTrackingToken` HMAC primitive (apps/api/src/orders/order-tracking-token.ts). Issue the token at order creation, embed it in the success URL, and accept it on a new public read endpoint that returns the full `OrderDto`.

## Changes

### 1. Types (`packages/types/src/order.ts`)
Add an optional `trackingToken: z.string().nullish()` to `OrderSchema`. Populated only by the create-order response and the new by-token endpoint; other reads leave it null.

### 2. Backend (`apps/api/src/orders/orders.controller.ts` + `orders.service.ts`)
- In `orders.service.create`, after the existing `getById(..., { bypassOwnership: true })` returns, attach `trackingToken: signOrderTrackingToken(order.id)` to the DTO before returning.
- Add a new controller route, declared **before** the existing `:id` routes so the path isn't swallowed:
  ```ts
  @Public()
  @Get('by-token')
  getOrderByToken(@Query('token') token?: string)
  ```
  Verifies the HMAC via `verifyOrderTrackingToken`, then calls a new service method `getByVerifiedToken(orderId)` that loads the order with `bypassOwnership: true` (no actor needed — the token *is* the proof). Returns the full `OrderDto`. 400/403/404 on missing/expired/invalid tokens, matching the existing `track` endpoint's behavior.

### 3. API client (`packages/api-client/src/client.ts`)
Add `getByToken(token: string): Promise<OrderDto>` calling `/orders/by-token?token=…` with `auth: false`. Returns the full schema, so `responseSchema: OrderSchema`.

### 4. Web — checkout success page
- `apps/web/src/features/orders/hooks/use-create-order.ts`: after success, the cached order already contains `trackingToken` (no hook change beyond the type flowing through).
- `apps/web/src/app/(shop)/checkout/page.tsx` (or wherever the post-create redirect lives): change the redirect target from `/checkout/success/[id]` to `/checkout/success/[id]?t={trackingToken}` when the order is a guest order (no `userId`). For authed users we still skip the token — they can read the order normally.
- `apps/web/src/features/orders/hooks/use-order.ts`: accept an optional `token` parameter. When present, fetch via `orders.getByToken(token)` instead of `orders.getById(id)`. Cache key stays `orderQueryKeys.detail(id)` so the seeded entry still hydrates the first paint.
- `apps/web/src/features/checkout/components/confirmation-app.tsx`: read `t` from `useSearchParams()` and pass it into `useOrderTracking(orderId, token)`.
- `apps/web/src/features/orders/hooks/use-order-tracking.ts`: forward the optional token to `useOrder`.

### 5. Tests
- Backend: extend `orders.controller.spec.ts` (or its e2e analog) with a happy-path test for `GET /orders/by-token?token=…` returning the full DTO and a 403 for an expired token.

## Acceptance

- Place a guest order → land on `/checkout/success/[id]?t=…` → refresh → page still renders with order details and live status indicator.
- Place an authed order → same URL works without `?t=` (the auth header carries ownership).
- Stale/expired token (>7 days) → page shows the existing "Order not found" empty state cleanly.
- No regressions in the existing `/track/[orderId]?token=…` email-deep-link flow.

## Out of scope

- Cookie-bound session ownership (option B) — separate, larger change.
- localStorage persistence (option C) — symptom treatment, doesn't fix root cause.
- Rotating or revoking individual tokens — 7-day TTL is enough for this surface.
