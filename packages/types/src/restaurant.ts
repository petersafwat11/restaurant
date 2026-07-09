import { z } from 'zod';

const GeoPointSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .nullable();

const RestaurantAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().max(100).nullish(),
  zip: z.string().max(20).nullish(),
  country: z.string().min(2).max(2),
});
export type RestaurantAddressDto = z.infer<typeof RestaurantAddressSchema>;

export const OperatingHoursSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/), // "09:00"
  closesAt: z.string().regex(/^\d{2}:\d{2}$/), // "23:00"
  isClosed: z.boolean(),
});
export type OperatingHoursDto = z.infer<typeof OperatingHoursSchema>;

export const OperatingHoursInputSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean(),
});
export type OperatingHoursInputDto = z.infer<typeof OperatingHoursInputSchema>;

export const UpdateOperatingHoursSchema = z.object({
  hours: z.array(OperatingHoursInputSchema).length(7, 'Must provide all 7 days'),
});
export type UpdateOperatingHoursDto = z.infer<typeof UpdateOperatingHoursSchema>;

const MoneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

// schema.org `priceRange` is free-form text. We accept either the "$"–"$$$$"
// convention or a human currency range (e.g. "20–40 zł", matching what Google
// shows on the Business Profile). Empty string is rejected; `null` means
// "not set" so the DTO can pass the field through unset.
const PriceRangeSchema = z
  .string()
  .trim()
  .min(1, { message: 'priceRange must not be empty' })
  .max(24, { message: 'priceRange is too long' })
  .nullable();

// ---- Legal entity & customer support (payment-provider readiness) ----------
//
// The Restaurant row stores these flat; the public/admin DTOs expose them under
// a nested `legal` block. Polish identity values (NIP/REGON/KRS) are surfaced as
// already-normalized digit strings. `name`/`address` stay the trade name and
// trading address — the legal name/registered address live only here.

const NonNegativeMoneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a non-negative decimal with ≤2dp');

/** Output (DB → DTO) legal block. All values are pre-normalized or null. */
export const RestaurantLegalSchema = z.object({
  legalName: z.string().nullable(),
  nip: z.string().nullable(),
  regon: z.string().nullable(),
  krs: z.string().nullable(),
  registryCourt: z.string().nullable(),
  shareCapital: MoneyStringSchema.nullable(),
  shareCapitalCurrency: z.string().nullable(),
  registeredAddress: RestaurantAddressSchema.nullable(),
  supportEmail: z.string().nullable(),
  supportPhone: z.string().nullable(),
  complaintsEmail: z.string().nullable(),
  privacyEmail: z.string().nullable(),
});
export type RestaurantLegalDto = z.infer<typeof RestaurantLegalSchema>;

/**
 * Admin output adds the same-as-trading switch and the statement descriptor —
 * both admin-only. `statementDescriptor` is an internal payment-config
 * value (not part of public EU seller-identity disclosure), so it's deliberately
 * NOT on the public `RestaurantLegalSchema`.
 */
export const RestaurantAdminLegalSchema = RestaurantLegalSchema.extend({
  registeredAddressSameAsTrading: z.boolean(),
  statementDescriptor: z.string().nullable(),
});
export type RestaurantAdminLegalDto = z.infer<typeof RestaurantAdminLegalSchema>;

// Required for the "Payment provider readiness" check (plan §B4/§B5). KRS and
// share capital are recommended-but-conditional (sole traders have neither), so
// they are intentionally OMITTED from this list — they don't block completeness
// (the check reports only `missing` required fields; there is no warnings tier).
export const LEGAL_REQUIRED_FIELDS = [
  'legalName',
  'nip',
  'regon',
  'registryCourt',
  'supportEmail',
  'complaintsEmail',
  'privacyEmail',
  'statementDescriptor',
] as const;

export type LegalReadinessField = (typeof LEGAL_REQUIRED_FIELDS)[number] | 'registeredAddress';

/**
 * Shared readiness check used by both the admin checklist and the API's
 * online-payments-enablement fail-safe. It only reports which factual fields are unset —
 * it never claims the application verified an external registry.
 */
export function getRestaurantLegalReadiness(legal: RestaurantAdminLegalDto): {
  complete: boolean;
  missing: LegalReadinessField[];
} {
  const missing: LegalReadinessField[] = [];
  for (const field of LEGAL_REQUIRED_FIELDS) {
    if (!legal[field]) missing.push(field);
  }
  if (!legal.registeredAddressSameAsTrading && !legal.registeredAddress) {
    missing.push('registeredAddress');
  }
  return { complete: missing.length === 0, missing };
}

// ---- Legal input field validators (admin edit) -----------------------------
// Empty/whitespace input is treated as "cleared" → null so the field can be unset.
const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

/** Strip non-digits then validate against `re`; null clears, undefined skips. */
const optionalDigitsId = (re: RegExp, message: string) =>
  z
    .preprocess(
      emptyToNull,
      z
        .string()
        .transform((s) => s.replace(/\D/g, ''))
        .pipe(z.string().regex(re, message))
        .nullable(),
    )
    .optional();

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional();

const optionalEmail = z
  .preprocess(emptyToNull, z.string().trim().email().max(160).nullable())
  .optional();

const optionalCurrency = z
  .preprocess(
    (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.toUpperCase()) : v),
    z
      .string()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code')
      .nullable(),
  )
  .optional();

// Card statement descriptor: 5–22 chars, at least one letter, excludes < > \ ' " *
const optionalStatementDescriptor = z
  .preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .min(5, 'Statement descriptor must be 5–22 characters')
      .max(22, 'Statement descriptor must be 5–22 characters')
      .regex(/^[^<>\\'"*]+$/, 'Cannot contain < > \\ \' " *')
      .refine((s) => /[A-Za-z]/.test(s), 'Must contain at least one letter')
      .nullable(),
  )
  .optional();

/** Flat legal input fields shared by Create/Update (kept flat to match storage). */
const legalInputFields = {
  legalName: optionalText(200),
  nip: optionalDigitsId(/^\d{10}$/, 'NIP must be 10 digits'),
  regon: optionalDigitsId(/^\d{9}(\d{5})?$/, 'REGON must be 9 or 14 digits'),
  krs: optionalDigitsId(/^\d{10}$/, 'KRS must be 10 digits'),
  registryCourt: optionalText(200),
  shareCapital: z.preprocess(emptyToNull, NonNegativeMoneyStringSchema.nullable()).optional(),
  shareCapitalCurrency: optionalCurrency,
  registeredAddress: RestaurantAddressSchema.nullish(),
  registeredAddressSameAsTrading: z.boolean().optional(),
  supportEmail: optionalEmail,
  supportPhone: optionalText(40),
  complaintsEmail: optionalEmail,
  privacyEmail: optionalEmail,
  statementDescriptor: optionalStatementDescriptor,
};

export const RestaurantPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  phone: z.string(),
  email: z.string(),
  address: RestaurantAddressSchema,
  geoPoint: GeoPointSchema,
  timezone: z.string(),
  currency: z.string(),
  // Flat delivery economics — exposed publicly so the checkout map picker can
  // show them without hitting an admin endpoint.
  defaultDeliveryFee: MoneyStringSchema,
  minOrderAmount: MoneyStringSchema,
  // Delivery coverage radius (km) for the circle centred on geoPoint. Read-only:
  // the map draws this circle and checks the dropped pin against it.
  deliveryRadiusKm: z.number().positive(),
  // Indicative order-ready time ranges (minutes); null when not configured.
  // Surfaced publicly (checkout success ETA, the Terms "Delivery & pickup"
  // section). Min/Max are set together with Min <= Max (enforced server-side).
  estimatedDeliveryMinutesMin: z.number().int().min(1).max(600).nullable(),
  estimatedDeliveryMinutesMax: z.number().int().min(1).max(600).nullable(),
  estimatedPickupMinutesMin: z.number().int().min(1).max(600).nullable(),
  estimatedPickupMinutesMax: z.number().int().min(1).max(600).nullable(),
  isActive: z.boolean(),
  acceptsReservations: z.boolean().default(true),
  acceptsDelivery: z.boolean().default(true),
  acceptsPickup: z.boolean().default(true),
  acceptsDineIn: z.boolean().default(true),
  // Discovery fields surfaced in schema.org JSON-LD on public pages.
  servesCuisine: z.array(z.string().min(1).max(60)).default([]),
  priceRange: PriceRangeSchema.default(null),
  sameAs: z.array(z.string().url()).default([]),
  // Legal entity & support block (sourced from flat Restaurant columns).
  legal: RestaurantLegalSchema,
  hours: z.array(OperatingHoursSchema).optional(),
});
export type RestaurantPublicDto = z.infer<typeof RestaurantPublicSchema>;

export const RestaurantAdminSchema = RestaurantPublicSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  // Admin view exposes the same-as-trading switch alongside the public legal block.
  legal: RestaurantAdminLegalSchema,
});
export type RestaurantAdminDto = z.infer<typeof RestaurantAdminSchema>;

export const CreateRestaurantSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be kebab-case'),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullish(),
  logoUrl: z.string().url().nullish(),
  coverUrl: z.string().url().nullish(),
  phone: z.string().min(1).max(40),
  email: z.string().email(),
  address: RestaurantAddressSchema,
  geoPoint: GeoPointSchema.optional(),
  timezone: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  servesCuisine: z.array(z.string().min(1).max(60)).optional(),
  priceRange: PriceRangeSchema.optional(),
  sameAs: z.array(z.string().url()).optional(),
  estimatedDeliveryMinutesMin: z.number().int().min(1).max(600).nullable().optional(),
  estimatedDeliveryMinutesMax: z.number().int().min(1).max(600).nullable().optional(),
  estimatedPickupMinutesMin: z.number().int().min(1).max(600).nullable().optional(),
  estimatedPickupMinutesMax: z.number().int().min(1).max(600).nullable().optional(),
  // Legal entity & customer-support fields (flat; normalized on input).
  ...legalInputFields,
});
export type CreateRestaurantDto = z.infer<typeof CreateRestaurantSchema>;

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial().extend({
  isActive: z.boolean().optional(),
  acceptsReservations: z.boolean().optional(),
  acceptsDelivery: z.boolean().optional(),
  acceptsPickup: z.boolean().optional(),
  acceptsDineIn: z.boolean().optional(),
});
export type UpdateRestaurantDto = z.infer<typeof UpdateRestaurantSchema>;

export const RestaurantListSchema = z.array(RestaurantPublicSchema);
export const OperatingHoursListSchema = z.array(OperatingHoursSchema);
