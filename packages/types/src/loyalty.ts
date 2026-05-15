import { z } from 'zod';

export const LOYALTY_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type LoyaltyTier = (typeof LOYALTY_TIERS)[number];

export const LoyaltyAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  points: z.number().int(),
  tier: z.string(),
});
export type LoyaltyAccountDto = z.infer<typeof LoyaltyAccountSchema>;

export const LoyaltyTransactionSchema = z.object({
  id: z.string(),
  delta: z.number().int(),
  reason: z.string(),
  orderId: z.string().nullable(),
  createdAt: z.string(),
});
export type LoyaltyTransactionDto = z.infer<typeof LoyaltyTransactionSchema>;

export const LoyaltyHistorySchema = z.object({
  items: z.array(LoyaltyTransactionSchema),
  nextCursor: z.string().nullable(),
});
export type LoyaltyHistoryDto = z.infer<typeof LoyaltyHistorySchema>;

export const LoyaltyHistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type LoyaltyHistoryQuery = z.infer<typeof LoyaltyHistoryQuerySchema>;
