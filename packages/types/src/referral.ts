import { z } from 'zod';

export const REFERRAL_STATUSES = ['PENDING', 'COMPLETED'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

// 8-char Crockford-ish base32 (no I/L/O/U to avoid ambiguity).
export const ReferralCodeStringSchema = z
  .string()
  .min(6)
  .max(16)
  .regex(/^[A-Z0-9]+$/, 'Invalid referral code')
  .transform((s) => s.toUpperCase());

export const ReferralMeSchema = z.object({
  code: z.string(),
  link: z.string(),
  totalReferred: z.number().int(),
  totalCompleted: z.number().int(),
  pointsEarned: z.number().int(),
});
export type ReferralMeDto = z.infer<typeof ReferralMeSchema>;

export const ReferralSchema = z.object({
  id: z.string(),
  refereeName: z.string().nullable(),
  status: z.enum(REFERRAL_STATUSES),
  rewardGranted: z.boolean(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type ReferralDto = z.infer<typeof ReferralSchema>;

export const ReferralListSchema = z.object({
  items: z.array(ReferralSchema),
  nextCursor: z.string().nullable(),
});
export type ReferralListDto = z.infer<typeof ReferralListSchema>;

export const ReferralListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ReferralListQuery = z.infer<typeof ReferralListQuerySchema>;
