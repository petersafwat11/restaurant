# Estimated pickup/delivery times → ranges, surfaced on checkout success

## Problem
1. The checkout success page (`/checkout/success/[orderId]`) shows a hardcoded ETA
   ("~12 min" / "~25 min") — it's the `eta.pickupDefault` / `eta.deliveryDefault`
   i18n string, never the admin-configured value.
2. Admin estimated times are a single fixed number. User wants a **range** (min–max).

## Decisions
- **Data model:** replace the two single columns (`estimatedDeliveryMinutes`,
  `estimatedPickupMinutes`, both added today, nullable, no real data) with four:
  `estimatedDeliveryMinutesMin/Max`, `estimatedPickupMinutesMin/Max`.
- **Display format:** `~12–18 min` (range); `~12 min` when min===max or only min set.
- **Validation:** both-or-neither + `min ≤ max`, enforced server-side
  (`BadRequestException` in `restaurants.service.update`) — NOT a Zod `.refine`
  (would break `CreateRestaurantSchema.partial().extend()`). Admin Save button gated too.
- **Source on success page:** `useRestaurant()` (already used in this route group by
  `checkout-app.tsx`), reading the live config.

## Fallback chain on success page (unchanged where noted)
1. `order.pickupAt` set (scheduled order) → clock time — unchanged.
2. else DB estimate configured for order type → `~min–max min`.
3. else → existing hardcoded `eta.*Default`. DINE_IN always stays on `dineInDefault`.
(Hold the hardcoded fallback until `useRestaurant()` settles to avoid a one-frame flash.)

## Files
**DB / types / API**
- `packages/db/prisma/schema.prisma` — 2 fields → 4. Then `migrate:dev` + `generate`.
- `packages/db/seed.ts` — seed sample ranges (delivery 30–45, pickup 12–20).
- `packages/types/src/restaurant.ts` — Public/Create/Update schemas: 2 fields → 4.
- `apps/api/src/restaurants/restaurants.service.ts` — `toPublic` mapping + `update`
  write mapping + min≤max/both-or-neither guard.

**Admin**
- `apps/admin/.../restaurant/page.tsx` — FormState, fromDto, diff, two min/max input
  pairs, gate Save when a pair is half-filled or min>max.
- `packages/i18n/messages/{en,pl}/admin/restaurant.json` — min/max labels.

**Web**
- `apps/web/.../checkout/components/confirmation-app.tsx` — `useRestaurant()`, build
  ranged ETA text.
- `apps/web/.../(marketing)/terms/page.tsx` — render range in prose (en + pl).
- `packages/i18n/messages/{en,pl}/web/shop/checkout-success.json` — `eta.minutesRange`
  (`~{min}–{max} min`) + `eta.minutesSingle` (`~{min} min`).

## Test
- Update/extend API e2e or unit for the min≤max guard if a restaurants spec exists;
  otherwise a focused happy-path check. Typecheck + lint web/admin/api.
