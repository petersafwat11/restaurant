import { z } from 'zod';

const GeoPointSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .nullable();

const RestaurantAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).nullish(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).nullish(),
  zip: z.string().max(20).nullish(),
  country: z.string().min(2).max(2),
});
export type RestaurantAddressDto = z.infer<typeof RestaurantAddressSchema>;

export const OperatingHoursSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
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
  isActive: z.boolean(),
  hours: z.array(OperatingHoursSchema).optional(),
});
export type RestaurantPublicDto = z.infer<typeof RestaurantPublicSchema>;

export const RestaurantAdminSchema = RestaurantPublicSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
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
});
export type CreateRestaurantDto = z.infer<typeof CreateRestaurantSchema>;

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateRestaurantDto = z.infer<typeof UpdateRestaurantSchema>;

export const RestaurantListSchema = z.array(RestaurantPublicSchema);
export const OperatingHoursListSchema = z.array(OperatingHoursSchema);
