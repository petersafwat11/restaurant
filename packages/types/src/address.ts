import { z } from 'zod';

const GeoPointSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .nullable();

export const CreateAddressSchema = z.object({
  label: z.string().max(40).nullish(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).nullish(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).nullish(),
  zip: z.string().max(20).nullish(),
  country: z.string().min(2).max(2), // ISO-3166-1 alpha-2
  geoPoint: GeoPointSchema.optional(),
  isDefault: z.boolean().optional(),
});
export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;

export const UpdateAddressSchema = CreateAddressSchema.partial();
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;

export const AddressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: z.string().nullable(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  country: z.string(),
  geoPoint: GeoPointSchema,
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AddressDto = z.infer<typeof AddressSchema>;

export const AddressListSchema = z.array(AddressSchema);
