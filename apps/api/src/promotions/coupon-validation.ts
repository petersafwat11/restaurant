import type { Coupon, Promotion } from '@repo/db';
import { type ValidateCouponResponseDto, type ValidationFailureReason } from '@repo/types';
import { clampNonNegative, decimalToString, multiply, toDecimal } from '@repo/utils';

export interface ValidationContext {
  coupon: Coupon & { promotion: Promotion };
  subtotal: string;
  redemptionCount: number;
  perUserRedemptions: number;
  restaurantId: string;
}

const REASON_MESSAGES: Record<ValidationFailureReason, string> = {
  NOT_FOUND: 'Coupon code not found',
  PROMOTION_INACTIVE: 'This promotion is no longer active',
  OUT_OF_WINDOW: 'This promotion is outside its valid date range',
  MIN_SUBTOTAL_NOT_MET: 'Your subtotal does not meet the minimum for this coupon',
  PER_USER_LIMIT_REACHED: 'You have already used this coupon the maximum number of times',
  MAX_REDEMPTIONS_REACHED: 'This coupon has been fully redeemed',
  WRONG_RESTAURANT: 'This coupon is not valid at this restaurant',
};

export function fail(reason: ValidationFailureReason): ValidateCouponResponseDto {
  return { valid: false, reason, message: REASON_MESSAGES[reason] };
}

/**
 * Apply the coupon's promotion rules + compute the discount amount for the
 * given subtotal. Returns either a discriminated-valid response (with
 * discountAmount) or a typed failure response. Pure — no DB access.
 */
export function validateCoupon(ctx: ValidationContext): ValidateCouponResponseDto {
  const { coupon, subtotal, redemptionCount, perUserRedemptions } = ctx;
  const promo = coupon.promotion;

  if (!promo.isActive) return fail('PROMOTION_INACTIVE');
  if (promo.restaurantId !== ctx.restaurantId) return fail('WRONG_RESTAURANT');

  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) return fail('OUT_OF_WINDOW');
  if (promo.endsAt && now > promo.endsAt) return fail('OUT_OF_WINDOW');

  const subtotalDec = toDecimal(subtotal);
  if (promo.minSubtotal && subtotalDec.lt(promo.minSubtotal)) {
    return fail('MIN_SUBTOTAL_NOT_MET');
  }

  if (coupon.perUserLimit !== null && perUserRedemptions >= coupon.perUserLimit) {
    return fail('PER_USER_LIMIT_REACHED');
  }
  if (coupon.maxRedemptions !== null && redemptionCount >= coupon.maxRedemptions) {
    return fail('MAX_REDEMPTIONS_REACHED');
  }

  // Item-level BOGO and delivery-fee waiver are NOT implemented yet. Returning
  // a flat `promo.value` for BOGO (or silently 0 for FREE_DELIVERY) let an
  // unimplemented promo type discount real money off `grandTotal` at order
  // creation regardless of cart contents. Reject until properly implemented.
  if (promo.type === 'BOGO' || promo.type === 'FREE_DELIVERY') {
    return fail('PROMOTION_INACTIVE');
  }

  // ---- Compute discount amount --------------------------------------------
  let discount = toDecimal(0);
  switch (promo.type) {
    case 'PERCENT': {
      // value is treated as a percentage (e.g. 10 = 10%)
      const pct = toDecimal(promo.value ?? 0).div(100);
      discount = multiply(subtotalDec, pct);
      break;
    }
    case 'FIXED': {
      discount = toDecimal(promo.value ?? 0);
      break;
    }
    case 'FREE_DELIVERY': {
      // The discount is the delivery fee; cart endpoint applies it on top of
      // its own pricing (returning 0 here is fine — orders.service will fold
      // the free-delivery effect in at checkout).
      discount = toDecimal(0);
      break;
    }
    case 'BOGO': {
      // Simple shared-cart application: discount equals one slot at half
      // off. Full BOGO logic with item targeting lives in
      // orders.service; for the cart-side preview we model it as a small
      // fixed estimate to communicate that a discount is applied.
      discount = toDecimal(promo.value ?? 0);
      break;
    }
  }

  // Clamp discount to ≤ subtotal.
  const clamped = clampNonNegative(discount).gt(subtotalDec)
    ? subtotalDec
    : clampNonNegative(discount);

  return {
    valid: true,
    couponId: coupon.id,
    promotionId: promo.id,
    code: coupon.code,
    discountAmount: decimalToString(clamped),
    type: promo.type as ValidateCouponResponseDto extends { type: infer T } ? T : never,
  };
}
