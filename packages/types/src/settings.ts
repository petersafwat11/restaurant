import { z } from 'zod';

const MoneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

// GeoJSON-style polygon: array of linear rings, each ring an array of [lng, lat] pairs.
export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1),
});
export type PolygonGeoJson = z.infer<typeof PolygonSchema>;

// Zones are pure coverage geometry. The restaurant-wide `defaultDeliveryFee`
// and `minOrderAmount` apply to all zones — a "do we deliver here, yes/no"
// model that matches how small restaurants actually price delivery.
export const DeliveryZoneSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  polygon: PolygonSchema,
});
export type DeliveryZoneDto = z.infer<typeof DeliveryZoneSchema>;

/** Public read shape — same as DeliveryZoneDto for now, kept separate so we
 * can evolve internal fields (e.g. priorities) without leaking them. */
export const PublicDeliveryZoneSchema = DeliveryZoneSchema;
export type PublicDeliveryZoneDto = z.infer<typeof PublicDeliveryZoneSchema>;

export const PublicDeliveryZonesResponseSchema = z.object({
  zones: z.array(PublicDeliveryZoneSchema),
});
export type PublicDeliveryZonesResponseDto = z.infer<typeof PublicDeliveryZonesResponseSchema>;

export const HolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(120),
  isClosed: z.boolean().default(true),
  openOverride: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  closeOverride: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
});
export type HolidayDto = z.infer<typeof HolidaySchema>;

export const RestaurantSettingsSchema = z.object({
  taxRate: MoneyStringSchema,
  defaultDeliveryFee: MoneyStringSchema,
  minOrderAmount: MoneyStringSchema,
  deliveryZones: z.array(DeliveryZoneSchema),
  holidayDates: z.array(HolidaySchema),
  reservationSlotMinutes: z.number().int().min(15).max(360),
  reservationBufferMinutes: z.number().int().min(0).max(120),
  timezone: z.string(),
  currency: z.string(),
});
export type RestaurantSettingsDto = z.infer<typeof RestaurantSettingsSchema>;

export const UpdateRestaurantSettingsSchema = z
  .object({
    taxRate: MoneyStringSchema.optional(),
    defaultDeliveryFee: MoneyStringSchema.optional(),
    minOrderAmount: MoneyStringSchema.optional(),
    deliveryZones: z.array(DeliveryZoneSchema).optional(),
    reservationSlotMinutes: z.number().int().min(15).max(360).optional(),
    reservationBufferMinutes: z.number().int().min(0).max(120).optional(),
  })
  .partial();
export type UpdateRestaurantSettingsDto = z.infer<typeof UpdateRestaurantSettingsSchema>;

export const DeliveryZoneCheckQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});
export type DeliveryZoneCheckQuery = z.infer<typeof DeliveryZoneCheckQuerySchema>;

export const DeliveryZoneCheckResponseSchema = z.object({
  matched: z.boolean(),
  zone: DeliveryZoneSchema.nullable(),
});
export type DeliveryZoneCheckResponseDto = z.infer<typeof DeliveryZoneCheckResponseSchema>;
