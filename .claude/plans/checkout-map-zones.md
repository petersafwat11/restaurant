# Checkout map + delivery zones (no autocomplete, flat fee)

## Goal
Replace Google Places autocomplete with a Leaflet map picker on both `/checkout` and `/account/addresses`. Wire the customer side to the existing admin-drawn delivery zones. Move per-zone economics (fee / min order) back to one restaurant-wide pair of values. Drop zip code entirely. Tighten the sequential card UX on checkout so later cards are visually disabled until earlier required ones are complete.

## Final shape

- **Address inputs**: `street`, `apartment (optional)`, `city`. No autocomplete. No zip. Map picker drops `geoPoint: {lat, lng}` into the form.
- **Delivery validation**: every pin move calls `GET /admin/restaurants/:id/delivery-zones/check`. Inline status badge `✓ Delivers here` / `✗ Outside delivery area`. Out-of-zone hard-blocks `Continue` on step 3 and offers a one-tap switch to Pickup.
- **Fees**: one flat `defaultDeliveryFee` + one `minOrderAmount` per restaurant. Zones are pure coverage geometry, no per-zone money.
- **Saved addresses**: same picker. Pre-fill pin from stored `geoPoint` on checkout.
- **Step gating**: cards 2..6 render with `aria-disabled / opacity-50 / pointer-events-none` until the prior required card is complete. Optional cards (4 Notes, 6 Tip) auto-complete and never block the next step.

## Files to change

### `packages/types`
- `src/settings.ts`: `DeliveryZoneSchema` drops `fee` + `minOrderAmount`. `DeliveryZoneCheckResponseSchema` drops `fee` + `minOrderAmount` (just returns `{matched, zone}`).
- `src/checkout.ts`: `CheckoutAddressSchema` drops `zip`, adds `geoPoint: {lat, lng}` (required). `POSTAL_PL_RE` constant removed.
- `src/address.ts`: `CreateAddressSchema` drops the loose `zip`, keeps `geoPoint` (already there).
- `src/order.ts`: `InlineDeliveryAddressSchema` drops `zip`, adds `geoPoint`.

### `apps/api`
- `src/settings/settings.service.ts`: remove `fee` / `minOrderAmount` from `checkDeliveryZone` response (just `{matched, zone}`).
- `src/settings/settings.controller.ts`: new public endpoint `GET /admin/restaurants/:id/delivery-zones` returning `{zones: [{id, name, polygon}]}`.
- `src/orders/orders.service.ts`:
  - When `type === 'DELIVERY'`, require `dto.deliveryAddress.geoPoint` (or read it from saved address); server-side re-call `DeliveryZoneService.findZone` and throw `BadRequestException` if null.
  - Drop `zip` writes from the persisted `deliveryAddress` JSON.
- `src/addresses/addresses.service.ts`: remove `autocomplete()` + `queryGooglePlaces()` + `WARSAW_STUB_MATCHES` + helper. Drop `zip` writes (Prisma column stays nullable).
- `src/addresses/addresses.controller.ts`: remove `@Post('autocomplete')`.

### `packages/api-client`
- New: `settings.getDeliveryZones(restaurantId)` for the public list. Existing `checkDeliveryZone` response narrows.
- Remove `addresses.autocomplete`.

### `packages/ui`
- New: `src/delivery-location-picker/index.tsx`. Read-only zone fills + draggable pin + locate-me + status badge. Reuses Leaflet bootstrap pattern from `polygon-map-editor`.
- Update `src/checkout-section/index.tsx` (or wherever `CheckoutSection` lives): add `disabled?: boolean` prop → `aria-disabled`, `opacity-50`, `pointer-events-none`.
- Re-export `DeliveryLocationPicker` from `src/index.ts`.
- Remove `AddressAutocomplete` from index exports (optional — can leave the file but stop using).

### `apps/web`
- `src/features/checkout/components/checkout-app.tsx`:
  - Remove `AddressAutocomplete`, `useAddressAutocomplete` import.
  - Replace step-3 address block with `street`, `apt`, `city` text inputs + `<DeliveryLocationPicker>`.
  - Fetch zones + restaurant settings via new public endpoints (cached).
  - Replace hardcoded `DELIVERY_FEE` / `FREE_DELIVERY_OVER` with values from the restaurant settings query.
  - `continueFrom(3)` requires `address.geoPoint` and the last zone check to be `matched`.
  - Out-of-zone banner with "Switch to Pickup" button.
  - Min-order banner that blocks `Place order` if `subtotal < minOrderAmount`.
  - Use new `CheckoutSection disabled` prop for gating.
- `src/features/checkout/hooks/use-address-autocomplete.ts`: delete.
- `src/app/(account)/account/addresses/page.tsx`: same picker, drop zip field, drop autocomplete.

### `apps/admin`
- `src/app/(dashboard)/settings/delivery-zones/page.tsx`:
  - Remove `FeeField` component + per-zone fee/min inputs.
  - Zone card shows: color swatch, name (inline-edit), vertex count, delete. That's it.
  - Drop unused `formatMoney` import.

## Build order

1. **Schemas first** — `@repo/types` (settings, checkout, address, order). All downstream code will type-error in a useful way once these change, telling us exactly what to update.
2. **Backend** — settings service (slim check response, new list endpoint), addresses service (rip out autocomplete), orders service (geoPoint check). Verify compile.
3. **api-client** — add `settings.getDeliveryZones`, drop `addresses.autocomplete`.
4. **UI package** — `DeliveryLocationPicker`, `CheckoutSection.disabled`.
5. **Admin** — slim the zones page.
6. **Web** — checkout page, then `/account/addresses` page.
7. **Tests + smoke** — run typecheck across the monorepo, then exercise the checkout flow manually.

## Notes / risks

- Existing `Restaurant.deliveryZones` JSON in the DB has `fee` + `minOrderAmount` per zone. After the slim, Zod parse on read would fail. Mitigation: pre-parse with `.passthrough()` then strip — or just be tolerant at the boundary (`r.deliveryZones as unknown as DeliveryZoneDto[]` already casts without parsing in `settings.service.ts:28`). Leaving the legacy fields in DB JSON is harmless; new writes via `UpdateRestaurantSettingsSchema` won't include them.
- `Restaurant.deliveryFee` already exists as a DB column. No migration needed.
- Existing orders with old `deliveryAddress.zip` in JSON stay untouched (it's just opaque JSON).
- Leaflet bundle: already loaded for admin polygon editor. Customer-side adds ~40KB gz to the checkout chunk — acceptable.
