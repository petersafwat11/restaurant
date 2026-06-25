# Replace delivery zones with a fixed 7 km radius

## Goal
Remove the entire polygon "delivery zone" feature (UI + backend + data) and replace it
with a single rule: **we deliver within a 7 km circle centred on the restaurant.**
Applies to the account → addresses map and the checkout location step. The map defaults
to the restaurant (centre + marker); the user searches/drops a pin for their real address,
and we check whether that pin is inside the 7 km circle.

## Key decisions
- **Radius lives in the DB, no admin UI.** Add `deliveryRadiusKm` (default `7`) to the
  Restaurant model + seed. Expose it **read-only** on the public restaurant DTO so the map
  can draw the circle and run the check. Do **not** add it to any admin editable field
  (the request is to remove all zone UI).
- **One radius value drives both the drawn circle and the pass/fail test** so the visual
  boundary and validation always agree. (`L.circle` radius is in metres → `km * 1000`.)
- **Server stays authoritative.** UX check is client-side (instant, no API), but order
  creation re-checks server-side with the same haversine helper (CLAUDE.md "never trust the client").
- **Shared haversine helper** in `packages/utils` (browser-safe, no Prisma) imported by both API and web.
- **Default pin safety:** the map centres on the restaurant and shows the restaurant
  marker (this satisfies "default = restaurant"), but the user's *delivery* pin stays
  `null` until they actually place it. We must never let an unmoved/absent pin be submitted
  as a delivery address — otherwise an out-of-area user would silently save the restaurant's
  own coordinates (distance 0, always "in range"). Submit stays gated on a placed pin that is in range.
- **Null restaurant geoPoint → no restriction** (mirrors today's "no zones → no limit"); skip enforcement rather than crash.

## Changes

### 1. Database (`packages/db`)
- `prisma/schema.prisma` Restaurant: remove `deliveryZones Json @default("[]")`; add
  `deliveryRadiusKm Float @default(7)`.
- New migration via `pnpm --filter @repo/db migrate:dev` (drops column, adds column).
- `pnpm --filter @repo/db generate` and commit client.
- `seed.ts`: remove `deliveryZones` seeding; rely on `deliveryRadiusKm` default (7).

### 2. Shared utils (`packages/utils`)
- New `src/geo.ts`: `distanceKm(a, b)` (haversine) + `isWithinRadiusKm(center, point, km)`.
- Export from barrel `src/index.ts` (browser-safe; no Prisma import).
- Add a small `geo.test.ts` (known distances, inside/outside boundary).

### 3. Types (`packages/types/src`)
- `settings.ts`: delete `PolygonSchema`, `DeliveryZoneSchema`, `PublicDeliveryZone*`,
  `PublicDeliveryZonesResponse*`, `DeliveryZoneCheckQuery*`, `DeliveryZoneCheckResponse*`.
  Remove `deliveryZones` from `RestaurantSettingsSchema` and `UpdateRestaurantSettingsSchema`.
- `restaurant.ts`: add `deliveryRadiusKm: z.number().positive()` to `RestaurantPublicSchema`
  (read-only; not added to create/update input).

### 4. API (`apps/api/src`)
- Delete `settings/delivery-zone.service.ts` and `settings/__tests__/delivery-zone.spec.ts`.
- `settings/settings.module.ts`: drop `DeliveryZoneService` provider/export.
- `settings/settings.service.ts`: remove DI of `DeliveryZoneService`, remove
  `checkDeliveryZone()` and `getPublicDeliveryZones()`, remove `deliveryZones` from `get()`/`update()`.
- `settings/settings.controller.ts`: remove `GET .../delivery-zones` and `.../delivery-zones/check` routes.
- `orders/orders.service.ts`: replace polygon `findZone` check with `isWithinRadiusKm(restaurant.geoPoint, snapshot.geoPoint, restaurant.deliveryRadiusKm)`; skip if geoPoint null. Update the loaded `select` (drop `deliveryZones`, add `deliveryRadiusKm`).
- `restaurants/restaurants.service.ts` `toPublic()`: add `deliveryRadiusKm: row.deliveryRadiusKm`.
- `test/orders.e2e-spec.ts`: replace zone tests with radius tests (one inside accept, one outside reject); remove public-zones-list test.

### 5. API client (`packages/api-client/src/client.ts`)
- Remove `settings.checkDeliveryZone` and `settings.getDeliveryZones` + their type imports.

### 6. UI package (`packages/ui/src`)
- `delivery-location-picker/index.tsx`: replace `zones: DeliveryZoneShape[]` prop with
  `radiusKm?: number`; draw one `L.circle` (radius `km*1000`) instead of polygons; keep
  the restaurant marker + status badge. Remove `DeliveryZoneShape` export.
- Delete `polygon-map-editor/` directory.
- `index.ts`: drop `PolygonMapEditor`/`MapZone`/`GeoJsonPolygon`/`DeliveryZoneShape` exports.

### 7. Web (`apps/web/src`)
- Delete `features/checkout/hooks/use-zone-check.ts` and `use-delivery-zones.ts`.
- `account/addresses/page.tsx` and `features/checkout/components/checkout-app.tsx`:
  - drop the two zone hooks; compute `inRange` locally with `isWithinRadiusKm(restaurant.geoPoint, geoPoint, restaurant.deliveryRadiusKm)`.
  - pass `radiusKm={restaurant.deliveryRadiusKm}` to the picker; keep `center={restaurant.geoPoint}`.
  - drive the status badge / submit-gating from `inRange` instead of `zoneCheck`.
  - keep pin `null` until placed; submit/continue stays blocked unless pin placed AND in range.

### 8. Admin (`apps/admin/src`)
- Delete `app/[locale]/(dashboard)/settings/delivery-zones/page.tsx`.
- `app/[locale]/(dashboard)/settings/page.tsx`: remove the delivery-zones HubCard (and `s.deliveryZones.length` usage).
- `features/settings/hooks/index.ts`: remove `useCheckDeliveryZone`.

### 9. i18n (`packages/i18n`)
- Delete `messages/{en,pl}/admin/settings/delivery-zones.json`.
- Remove zone keys from `{en,pl}/admin/settings/general.json`, web `addresses.json` /
  `checkout.json` (out-of-zone strings) — re-word to "out of delivery range".
- Update the namespace registry in `src/messages.ts` (drop the delivery-zones namespace).
- Inspect (don't blind-delete) `locations.json` / `contact.json` zone hits — likely prose.

## Verification
1. `pnpm --filter @repo/db generate` committed.
2. Workspace-wide typecheck/build (turbo) — catches dangling imports across all three apps + dropped shared types/client/UI exports.
3. API: run orders e2e (inside-radius accept, outside-radius reject) + utils geo.test.
4. Visual pass on `/account/addresses` and checkout location step: map centres on restaurant,
   7 km circle drawn, pin inside → can save/continue, pin outside → blocked with "out of range".

## Out of scope / not touched
- Restaurant `geoPoint` field (still the circle centre).
- Address/checkout `geoPoint` collection & required-pin validation.
- Marketing `locations`/`contact` copy unless it's actual zone feature code.
