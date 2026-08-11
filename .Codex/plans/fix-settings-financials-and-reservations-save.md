# Amended Implementation Plan: Financials & Reservations Settings & Save Buttons

This plan details the implementation for extracting `FinancialsSettingsCard` and `ReservationsSettingsCard`, fixing tax rate validation schemas, adding dedicated Save & Discard controls per card with independent baselines, inline error messages, and full automated test coverage.

## Key Amendments & Technical Decisions

1. **Component Extraction for Hook Ordering**:
   - Extract `FinancialsSettingsCard` and `ReservationsSettingsCard` into separate components under `apps/admin/src/features/settings/components/`.
   - Prevents React hook ordering violations in `AdminSettingsPage` (`page.tsx:236`) after conditional early returns for loading/error.

2. **TaxRateStringSchema Range (0 to 1) & Validation**:
   - `TaxRateStringSchema` in `packages/types/src/settings.ts`:
     ```ts
     export const TaxRateStringSchema = z
       .string()
       .regex(/^-?\d+(\.\d{1,4})?$/)
       .refine(
         (val) => {
           const n = Number(val);
           return !Number.isNaN(n) && n >= 0 && n <= 1;
         },
         { message: 'Tax rate must be between 0 and 1 (0% to 100%)' },
       );
     ```
   - Enforces 0–1 decimal range and up to 4 decimal places (e.g. `0.0825` for 8.25%). Rejects negative numbers, values > 1, and > 4 decimal places.

3. **Normalized Values for Dirty Checking & Inline Validation**:
   - Tax rate displayed as percentage (e.g. `8.25%`), normalized to decimal string (e.g. `0.0825`).
   - Financial & Reservation drafts normalized before comparing against server baselines to prevent false dirty states (e.g., `8.00` vs `0.0800`).
   - Payloads validated with `UpdateRestaurantSettingsSchema.safeParse()`. If invalid, inline error messages are displayed under the relevant input fields.

4. **Independent Section State & Save Behavior**:
   - Financials and Reservations cards maintain isolated draft & baseline states.
   - On successful save, only that section's baseline is updated. On failure, draft values are preserved.
   - Discard is disabled during active mutations for that card (`update.isPending`).
   - Financial updates will never mutate or discard pending Reservation changes.

5. **E2E & Admin Component Test Coverage**:
   - API e2e test at `apps/api/test/settings.e2e-spec.ts` using `/api/v1/admin/restaurant/settings`, `ensureOwnerToken()`, and `ensureRestaurant()`.
   - Admin component test at `apps/admin/src/features/settings/components/__tests__/settings-cards.test.tsx` testing percentage conversion, dirty state, Save payload, inline error messages, and Discard behavior.
   - Unit tests for `TaxRateStringSchema` in `packages/types/src/__tests__/settings.test.ts`.

6. **i18n & Build Verification**:
   - Regenerate i18n types with `pnpm --filter @repo/api generate:i18n-types`.
   - Run e2e tests: `pnpm --filter @repo/api test:e2e -- test/settings.e2e-spec.ts`
   - Run admin build: `pnpm --filter @repo/admin build`
   - Visual verification against existing Settings page and responsive layout (no `preview.png` in `design-assets`).

---

## Proposed Changes

### `packages/types`

#### [MODIFY] [settings.ts](file:///d:/restaurant/packages/types/src/settings.ts)
- Add `TaxRateStringSchema` (0–1 range, max 4 decimal places).
- Update `RestaurantSettingsSchema` and `UpdateRestaurantSettingsSchema` to use `TaxRateStringSchema` for `taxRate`.

#### [NEW] [settings.test.ts](file:///d:/restaurant/packages/types/src/__tests__/settings.test.ts)
- Unit tests verifying `TaxRateStringSchema` with `0.0825`, >4 decimals, negative numbers, and values > 1.

---

### `packages/i18n`

#### [MODIFY] [general.json (EN)](file:///d:/restaurant/packages/i18n/messages/en/admin/settings/general.json)
#### [MODIFY] [general.json (PL)](file:///d:/restaurant/packages/i18n/messages/pl/admin/settings/general.json)
- Add action translations under `admin.settings.general`:
  ```json
  "actions": {
    "save": "Save changes",
    "saving": "Saving…",
    "discard": "Discard"
  },
  "errors": {
    "taxRate": "Tax rate must be between 0% and 100%",
    "deliveryFee": "Delivery fee must be a valid non-negative amount",
    "minOrder": "Minimum order must be a valid non-negative amount",
    "radius": "Delivery radius must be between 0.1 and 100 km",
    "slotLength": "Slot length must be between 15 and 360 minutes",
    "buffer": "Buffer time must be between 0 and 120 minutes"
  }
  ```

---

### `apps/admin`

#### [NEW] [financials-settings-card.tsx](file:///d:/restaurant/apps/admin/src/features/settings/components/financials-settings-card.tsx)
- Isolated Financials card component managing local state for `taxRatePct`, `defaultDeliveryFee`, `minOrderAmount`, and `deliveryRadiusKm`.
- Normalized dirty checking, live "Effective minimum" calculation, inline field errors via `UpdateRestaurantSettingsSchema.safeParse()`, Save & Discard buttons.

#### [NEW] [reservations-settings-card.tsx](file:///d:/restaurant/apps/admin/src/features/settings/components/reservations-settings-card.tsx)
- Isolated Reservations card component managing local state for `reservationSlotMinutes` and `reservationBufferMinutes`.
- Number steppers, normalized dirty checking, inline errors, Save & Discard buttons.

#### [MODIFY] [page.tsx](file:///d:/restaurant/apps/admin/src/app/%5Blocale%5D/%28dashboard%29/settings/page.tsx)
- Replace inline Financials and Reservations cards with `<FinancialsSettingsCard settings={s} />` and `<ReservationsSettingsCard settings={s} />`.
- Clean hook ordering compliance.

#### [NEW] [settings-cards.test.tsx](file:///d:/restaurant/apps/admin/src/features/settings/components/__tests__/settings-cards.test.tsx)
- React Testing Library tests for percentage conversion (`8.25%` -> `0.0825`), dirty state tracking, inline validation errors, Save payload, and Discard behavior.

---

### `apps/api`

#### [NEW] [settings.e2e-spec.ts](file:///d:/restaurant/apps/api/test/settings.e2e-spec.ts)
- NestJS Fastify e2e tests covering `GET /api/v1/admin/restaurant/settings` and `PATCH /api/v1/admin/restaurant/settings`.

---

## Verification Plan

### Automated Tests
1. Regenerate i18n types: `pnpm --filter @repo/api generate:i18n-types`
2. Run type tests: `pnpm --filter @repo/types test` (or `tsc --noEmit`)
3. Run admin component tests: `pnpm --filter @repo/admin test -- settings-cards`
4. Run API e2e tests: `pnpm --filter @repo/api test:e2e -- test/settings.e2e-spec.ts`
5. Build admin application: `pnpm --filter @repo/admin build`

### Manual & Visual Verification
1. Open Admin Settings page (`/settings`).
2. Verify visual styling against existing Settings page layout across desktop and mobile breakpoints.
3. Edit Financials fields (Tax rate, Delivery fee, Min order, Radius):
   - Confirm inline validation errors appear for out-of-range values.
   - Confirm Save & Discard buttons operate independently.
   - Confirm Save updates baseline and shows toast.
4. Edit Reservations fields:
   - Confirm steppers update local draft without immediate network requests.
   - Confirm Save operates independently from Financials card.
