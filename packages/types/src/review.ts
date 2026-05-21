import { z } from 'zod';

export const ReviewImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  position: z.number().int(),
});
export type ReviewImageDto = z.infer<typeof ReviewImageSchema>;

export const MAX_REVIEW_IMAGES = 5;

export const REVIEW_MODERATION_STATUSES = ['PUBLISHED', 'HIDDEN', 'FLAGGED'] as const;
export type ReviewModerationStatus = (typeof REVIEW_MODERATION_STATUSES)[number];

export const ReviewSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  isVisible: z.boolean(),
  moderationStatus: z.enum(REVIEW_MODERATION_STATUSES),
  flagReason: z.string().nullable().default(null),
  ownerReply: z.string().nullable().default(null),
  ownerReplyAt: z.string().nullable().default(null),
  createdAt: z.string(),
  authorName: z.string().nullable().optional(),
  images: z.array(ReviewImageSchema).default([]),
});
export type ReviewDto = z.infer<typeof ReviewSchema>;

export const OwnerReplySchema = z.object({
  reply: z.string().min(1).max(2000),
});
export type OwnerReplyDto = z.infer<typeof OwnerReplySchema>;

export const ReviewSummarySchema = z.object({
  count: z.number().int(),
  average: z.number(),
  histogram: z.object({
    '1': z.number().int(),
    '2': z.number().int(),
    '3': z.number().int(),
    '4': z.number().int(),
    '5': z.number().int(),
  }),
});
export type ReviewSummaryDto = z.infer<typeof ReviewSummarySchema>;

export const ReviewListSchema = z.object({
  items: z.array(ReviewSchema),
  nextCursor: z.string().nullable(),
});
export type ReviewListDto = z.infer<typeof ReviewListSchema>;

export const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  imageKeys: z.array(z.string().min(1)).max(MAX_REVIEW_IMAGES).optional(),
});
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export const ReviewModerationSchema = z.object({
  isVisible: z.boolean().optional(),
  moderationStatus: z.enum(REVIEW_MODERATION_STATUSES).optional(),
  flagReason: z.string().max(500).nullish(),
});
export type ReviewModerationDto = z.infer<typeof ReviewModerationSchema>;

export const ReviewListQuerySchema = z.object({
  isVisible: z.coerce.boolean().optional(),
  moderationStatus: z.enum(REVIEW_MODERATION_STATUSES).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['recent', 'rating']).optional().default('recent'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>;
