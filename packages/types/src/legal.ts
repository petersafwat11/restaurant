import { z } from 'zod';

/**
 * Single source of truth for the customer-facing legal bundle version. Bump it
 * (and the effective date) whenever any binding policy text changes.
 *
 * - The web checkout renders this beside the acceptance checkbox.
 * - The API validates the submitted version at order creation and rejects a
 *   stale one with a typed `LEGAL_VERSION_CHANGED` conflict (plan §C2).
 * - The accepted bundle is snapshotted + SHA-256 hashed onto the order as
 *   durable, server-generated evidence.
 *
 * Per-document SHA-256 hashes of the rendered policy *sources* are added in
 * Phase D, once the prose moves into version-controlled MDX. Until then the
 * order's `legalSnapshotHash` covers the captured snapshot object itself.
 */
export const LEGAL_BUNDLE_VERSION = '2026-06-24';
export const LEGAL_BUNDLE_EFFECTIVE_DATE = '2026-06-24';

/** Documents that make up the accepted bundle (route ids; prose lives in web). */
export const LEGAL_BUNDLE_DOCUMENTS = [
  'terms',
  'privacy',
  'refunds-complaints',
  'delivery-cancellation',
] as const;

/** Typed error code returned (409) when the client submits a stale version. */
export const LEGAL_VERSION_CHANGED = 'LEGAL_VERSION_CHANGED' as const;

// Address shape as stored on the restaurant record. Kept permissive (passthrough)
// because the snapshot copies whatever JSON the restaurant address holds verbatim.
const SnapshotAddressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    city: z.string().optional(),
    state: z.string().nullable().optional(),
    country: z.string().optional(),
  })
  .passthrough();

const MinutesRangeSchema = z.object({ min: z.number(), max: z.number() }).nullable();

/**
 * Immutable, server-built snapshot persisted on `Order.legalSnapshot`. Captures
 * the exact legal/commercial context the customer accepted so a historical
 * order never depends on later admin edits (plan §C2).
 */
export const OrderLegalSnapshotSchema = z.object({
  version: z.string(),
  effectiveDate: z.string(),
  // Server-set ISO timestamp — the client never chooses this.
  acceptedAt: z.string(),
  locale: z.string(),
  documents: z.array(z.string()),
  seller: z.object({
    legalName: z.string().nullable(),
    tradeName: z.string(),
    nip: z.string().nullable(),
    krs: z.string().nullable(),
    regon: z.string().nullable(),
    registryCourt: z.string().nullable(),
    // Share capital is part of the mandatory sp. z o.o. identity disclosure, so
    // it's captured here to faithfully reproduce the entity block the customer saw.
    shareCapital: z.string().nullable(),
    shareCapitalCurrency: z.string().nullable(),
    tradingAddress: SnapshotAddressSchema.nullable(),
    registeredAddress: SnapshotAddressSchema.nullable(),
    supportEmail: z.string().nullable(),
    supportPhone: z.string().nullable(),
    complaintsEmail: z.string().nullable(),
    privacyEmail: z.string().nullable(),
  }),
  currency: z.string(),
  fulfilment: z.object({
    type: z.string(),
    deliveryFee: z.string(),
    minOrderAmount: z.string(),
    estimatedDeliveryMinutes: MinutesRangeSchema,
    estimatedPickupMinutes: MinutesRangeSchema,
  }),
});
export type OrderLegalSnapshotDto = z.infer<typeof OrderLegalSnapshotSchema>;
