import { z } from 'zod';

export const AggregateRatingSchema = z.object({
  ratingValue: z.number().nullable(),
  reviewCount: z.number().int(),
});
export type AggregateRatingDto = z.infer<typeof AggregateRatingSchema>;

export const FeaturedItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  basePrice: z.string(),
  imageUrl: z.string().nullable(),
  categorySlug: z.string(),
});
export type FeaturedItemDto = z.infer<typeof FeaturedItemSchema>;

export const SpecialSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  value: z.string().nullable(),
});
export type SpecialDto = z.infer<typeof SpecialSchema>;

export const LocationSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  phone: z.string(),
  address: z.unknown(),
  geoPoint: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  todayHours: z
    .object({ opensAt: z.string(), closesAt: z.string(), isClosed: z.boolean() })
    .nullable(),
});
export type LocationSummaryDto = z.infer<typeof LocationSummarySchema>;

export const LandingDataSchema = z.object({
  restaurant: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    logoUrl: z.string().nullable(),
    coverUrl: z.string().nullable(),
  }),
  featuredItems: z.array(FeaturedItemSchema),
  specials: z.array(SpecialSchema),
  aggregateRating: AggregateRatingSchema,
  locations: z.array(LocationSummarySchema),
});
export type LandingDataDto = z.infer<typeof LandingDataSchema>;

export const AboutDataSchema = z.object({
  restaurant: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    phone: z.string(),
    email: z.string(),
    address: z.unknown(),
  }),
  aggregateRating: AggregateRatingSchema,
});
export type AboutDataDto = z.infer<typeof AboutDataSchema>;

export const MarketingQuerySchema = z.object({
  restaurantId: z.string().optional(),
});
export type MarketingQuery = z.infer<typeof MarketingQuerySchema>;
