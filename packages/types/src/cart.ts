import { z } from 'zod';

// Money values cross the wire as fixed-point strings — see `menu.ts` for the
// shared rationale.
const MoneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Money must be a decimal string with ≤2dp');

// ---- Cart item input -------------------------------------------------------

export const ModifierSelectionSchema = z.object({
  groupId: z.string().min(1),
  optionIds: z.array(z.string().min(1)),
});
export type ModifierSelectionDto = z.infer<typeof ModifierSelectionSchema>;

export const AddCartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  modifierSelections: z.array(ModifierSelectionSchema).default([]),
  notes: z.string().max(500).nullish(),
});
export type AddCartItemDto = z.infer<typeof AddCartItemSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99).optional(),
  modifierSelections: z.array(ModifierSelectionSchema).optional(),
  notes: z.string().max(500).nullish(),
});
export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;

// ---- Cart item snapshot ----------------------------------------------------

export const ModifierSnapshotEntrySchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionId: z.string(),
  optionName: z.string(),
  priceDelta: MoneyStringSchema,
});
export type ModifierSnapshotEntry = z.infer<typeof ModifierSnapshotEntrySchema>;

export const CartItemSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: MoneyStringSchema,
  lineTotal: MoneyStringSchema,
  modifierSnapshot: z.array(ModifierSnapshotEntrySchema),
  notes: z.string().nullable(),
});
export type CartItemDto = z.infer<typeof CartItemSchema>;

// ---- Totals + cart wrapper -------------------------------------------------

export const CartTotalsSchema = z.object({
  subtotal: MoneyStringSchema,
  discountTotal: MoneyStringSchema,
  estimatedTotal: MoneyStringSchema, // subtotal - discount (tax/delivery/tip computed at checkout)
});
export type CartTotalsDto = z.infer<typeof CartTotalsSchema>;

export const CartAppliedCouponSchema = z.object({
  id: z.string(),
  code: z.string(),
  discountAmount: MoneyStringSchema,
});
export type CartAppliedCouponDto = z.infer<typeof CartAppliedCouponSchema>;

export const CartSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  userId: z.string().nullable(),
  sessionKey: z.string().nullable(),
  currency: z.string(),
  items: z.array(CartItemSchema),
  appliedCoupon: CartAppliedCouponSchema.nullable(),
  totals: CartTotalsSchema,
  updatedAt: z.string(),
});
export type CartDto = z.infer<typeof CartSchema>;

// ---- Coupon + merge --------------------------------------------------------

export const ApplyCouponSchema = z.object({
  code: z.string().min(1).max(60),
});
export type ApplyCouponDto = z.infer<typeof ApplyCouponSchema>;

export const MergeCartSchema = z.object({
  sessionKey: z.string().min(1),
  restaurantId: z.string().min(1),
});
export type MergeCartDto = z.infer<typeof MergeCartSchema>;
