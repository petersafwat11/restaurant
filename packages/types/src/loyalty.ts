import { z } from 'zod';

export const LOYALTY_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type LoyaltyTier = (typeof LOYALTY_TIERS)[number];

export const LOYALTY_TXN_KINDS = [
  'EARN',
  'REDEEM',
  'REVOKE',
  'REDEEM_REVERSAL',
  'REFERRAL',
  'ADJUST',
] as const;
export type LoyaltyTxnKind = (typeof LOYALTY_TXN_KINDS)[number];

export const LoyaltyAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  points: z.number().int(),
  lifetimePoints: z.number().int(),
  tier: z.string(),
  nextTier: z.string().nullable(),
  pointsToNextTier: z.number().int().nullable(),
});
export type LoyaltyAccountDto = z.infer<typeof LoyaltyAccountSchema>;

export const LoyaltyTransactionSchema = z.object({
  id: z.string(),
  delta: z.number().int(),
  kind: z.enum(LOYALTY_TXN_KINDS),
  reason: z.string(),
  orderId: z.string().nullable(),
  createdAt: z.string(),
});
export type LoyaltyTransactionDto = z.infer<typeof LoyaltyTransactionSchema>;

// Server-computed redemption quote. The client never sends a money value —
// it sends the points it wants to burn; the API returns the discount.
export const LoyaltyRedeemQuoteRequestSchema = z.object({
  points: z.number().int().min(0),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/, 'subtotal must be a decimal string'),
});
export type LoyaltyRedeemQuoteRequest = z.infer<typeof LoyaltyRedeemQuoteRequestSchema>;

export const LoyaltyRedeemQuoteSchema = z.object({
  requestedPoints: z.number().int(),
  appliablePoints: z.number().int(),
  maxRedeemablePoints: z.number().int(),
  discountAmount: z.string(),
  balanceAfter: z.number().int(),
});
export type LoyaltyRedeemQuoteDto = z.infer<typeof LoyaltyRedeemQuoteSchema>;

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
