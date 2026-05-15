import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  isVisible: z.boolean(),
  createdAt: z.string(),
  authorName: z.string().nullable().optional(),
});
export type ReviewDto = z.infer<typeof ReviewSchema>;

export const ReviewListSchema = z.object({
  items: z.array(ReviewSchema),
  nextCursor: z.string().nullable(),
});
export type ReviewListDto = z.infer<typeof ReviewListSchema>;

export const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export const ReviewModerationSchema = z.object({
  isVisible: z.boolean(),
});
export type ReviewModerationDto = z.infer<typeof ReviewModerationSchema>;

export const ReviewListQuerySchema = z.object({
  restaurantId: z.string().optional(),
  isVisible: z.coerce.boolean().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['recent', 'rating']).optional().default('recent'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>;
