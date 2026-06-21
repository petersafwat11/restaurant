import type { Promotion } from '@repo/db';
import { type ValidateCouponResponseDto, type ValidationFailureReason } from '@repo/types';
import { clampNonNegative, decimalToString, multiply, toDecimal } from '@repo/utils/money';

export interface ValidationContext {
  promotion: Promotion;
  subtotal: string;
  redemptionCount: number;
  perUserRedemptions: number;
}

const REASON_MESSAGES: Record<ValidationFailureReason, string> = {
  NOT_FOUND: 'Coupon code not found',
  PROMOTION_INACTIVE: 'This promotion is no longer active',
  OUT_OF_WINDOW: 'This promotion is outside its valid date range',
  MIN_SUBTOTAL_NOT_MET: 'Your subtotal does not meet the minimum for this coupon',
  PER_USER_LIMIT_REACHED: 'You have already used this coupon the maximum number of times',
  MAX_REDEMPTIONS_REACHED: 'This coupon has been fully redeemed',
};

export function fail(reason: ValidationFailureReason): ValidateCouponResponseDto {
  return { valid: false, reason, message: REASON_MESSAGES[reason] };
}

/**
 * Apply the promotion rules + compute the discount amount for the given
 * subtotal. Returns either a discriminated-valid response (with
 * discountAmount) or a typed failure response. Pure — no DB access.
 */
export function validateCoupon(ctx: ValidationContext): ValidateCouponResponseDto {
  const { promotion: promo, subtotal, redemptionCount, perUserRedemptions } = ctx;

  if (!promo.code) return fail('NOT_FOUND');
  if (!promo.isActive) return fail('PROMOTION_INACTIVE');

  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) return fail('OUT_OF_WINDOW');
  if (promo.endsAt && now > promo.endsAt) return fail('OUT_OF_WINDOW');

  const subtotalDec = toDecimal(subtotal);
  if (promo.minSubtotal && subtotalDec.lt(promo.minSubtotal)) {
    return fail('MIN_SUBTOTAL_NOT_MET');
  }

  if (promo.perUserLimit !== null && perUserRedemptions >= promo.perUserLimit) {
    return fail('PER_USER_LIMIT_REACHED');
  }
  if (promo.maxRedemptions !== null && redemptionCount >= promo.maxRedemptions) {
    return fail('MAX_REDEMPTIONS_REACHED');
  }

  // Item-level BOGO and delivery-fee waiver are NOT implemented yet. Returning
  // a flat `promo.value` for BOGO (or silently 0 for FREE_DELIVERY) would
  // discount real money off `grandTotal` at order creation regardless of cart
  // contents. Reject until properly implemented.
  if (promo.type === 'BOGO' || promo.type === 'FREE_DELIVERY') {
    return fail('PROMOTION_INACTIVE');
  }

  // ---- Compute discount amount --------------------------------------------
  let discount = toDecimal(0);
  switch (promo.type) {
    case 'PERCENT': {
      const pct = toDecimal(promo.value ?? 0).div(100);
      discount = multiply(subtotalDec, pct);
      break;
    }
    case 'FIXED': {
      discount = toDecimal(promo.value ?? 0);
      break;
    }
  }

  const clamped = clampNonNegative(discount).gt(subtotalDec)
    ? subtotalDec
    : clampNonNegative(discount);

  return {
    valid: true,
    promotionId: promo.id,
    code: promo.code,
    discountAmount: decimalToString(clamped),
    type: promo.type as ValidateCouponResponseDto extends { type: infer T } ? T : never,
  };
}
