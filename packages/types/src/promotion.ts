import { z } from 'zod';

const MoneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Money must be a decimal string with ≤2dp');

export const PROMOTION_TYPES = ['PERCENT', 'FIXED', 'BOGO', 'FREE_DELIVERY'] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

// ---- Promotion -------------------------------------------------------------

export const PromotionSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(PROMOTION_TYPES),
  value: MoneyStringSchema.nullable(),
  minSubtotal: MoneyStringSchema.nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
});
export type PromotionDto = z.infer<typeof PromotionSchema>;

export const CreatePromotionSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullish(),
  type: z.enum(PROMOTION_TYPES),
  value: MoneyStringSchema.nullish(),
  minSubtotal: MoneyStringSchema.nullish(),
  startsAt: z.string().datetime().nullish(),
  endsAt: z.string().datetime().nullish(),
  isActive: z.boolean().optional(),
});
export type CreatePromotionDto = z.infer<typeof CreatePromotionSchema>;

export const UpdatePromotionSchema = CreatePromotionSchema.partial();
export type UpdatePromotionDto = z.infer<typeof UpdatePromotionSchema>;

// ---- Coupon ----------------------------------------------------------------

export const CouponSchema = z.object({
  id: z.string(),
  promotionId: z.string(),
  code: z.string(),
  maxRedemptions: z.number().int().min(0).nullable(),
  perUserLimit: z.number().int().min(0).nullable(),
  redemptionsCount: z.number().int().min(0),
});
export type CouponDto = z.infer<typeof CouponSchema>;

export const CreateCouponSchema = z.object({
  code: z.string().min(2).max(60),
  maxRedemptions: z.number().int().min(0).nullish(),
  perUserLimit: z.number().int().min(0).nullish(),
});
export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;

// ---- Validation endpoint ---------------------------------------------------

export const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(60),
  subtotal: MoneyStringSchema,
  userId: z.string().min(1).optional(),
  restaurantId: z.string().min(1),
});
export type ValidateCouponDto = z.infer<typeof ValidateCouponSchema>;

export const VALIDATION_FAILURE_REASONS = [
  'NOT_FOUND',
  'PROMOTION_INACTIVE',
  'OUT_OF_WINDOW',
  'MIN_SUBTOTAL_NOT_MET',
  'PER_USER_LIMIT_REACHED',
  'MAX_REDEMPTIONS_REACHED',
  'WRONG_RESTAURANT',
] as const;
export type ValidationFailureReason = (typeof VALIDATION_FAILURE_REASONS)[number];

export const ValidateCouponResponseSchema = z.discriminatedUnion('valid', [
  z.object({
    valid: z.literal(true),
    couponId: z.string(),
    promotionId: z.string(),
    code: z.string(),
    discountAmount: MoneyStringSchema,
    type: z.enum(PROMOTION_TYPES),
  }),
  z.object({
    valid: z.literal(false),
    reason: z.enum(VALIDATION_FAILURE_REASONS),
    message: z.string(),
  }),
]);
export type ValidateCouponResponseDto = z.infer<typeof ValidateCouponResponseSchema>;

export const PromotionListSchema = z.array(PromotionSchema);
export const CouponListSchema = z.array(CouponSchema);
