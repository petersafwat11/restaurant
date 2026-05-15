/**
 * Pure loyalty + referral economics. Single source of truth for earn rate,
 * redemption value, tier thresholds and referral rewards so no magic numbers
 * leak into services. Money uses Decimal — never native float arithmetic.
 */
import { Decimal } from '@prisma/client/runtime/library';
import { type DecimalLike, round2, toDecimal } from './money';

// 1 point per whole currency unit of eligible spend (tips excluded upstream).
export const POINTS_PER_CURRENCY_UNIT = 1;
// 100 points == 1 currency unit when redeemed.
export const CURRENCY_PER_POINT = new Decimal('0.01');

export const LOYALTY_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type LoyaltyTierName = (typeof LOYALTY_TIERS)[number];

// Lifetime-point thresholds. Tier never downgrades on redemption because it
// is keyed off lifetimePoints, which only ever increases.
export const TIER_THRESHOLDS: ReadonlyArray<{
  tier: LoyaltyTierName;
  min: number;
}> = [
  { tier: 'bronze', min: 0 },
  { tier: 'silver', min: 500 },
  { tier: 'gold', min: 2000 },
  { tier: 'platinum', min: 5000 },
];

export const REFERRAL_REFERRER_POINTS = 200;
export const REFERRAL_REFEREE_POINTS = 100;

/** Points earned for an eligible spend amount (floored, never negative). */
export function pointsForAmount(eligibleAmount: DecimalLike): number {
  const amount = toDecimal(eligibleAmount);
  if (amount.lte(0)) return 0;
  return Math.floor(amount.times(POINTS_PER_CURRENCY_UNIT).toNumber());
}

/** Currency discount for a number of points (rounded to 2dp). */
export function discountForPoints(points: number): Decimal {
  if (!Number.isFinite(points) || points <= 0) return new Decimal(0);
  return round2(new Decimal(Math.floor(points)).times(CURRENCY_PER_POINT));
}

/**
 * Max points a user can redeem against a subtotal: bounded by their balance
 * and by the points whose discount value would not exceed the subtotal.
 */
export function maxRedeemablePoints(balance: number, subtotal: DecimalLike): number {
  const safeBalance = Math.max(0, Math.floor(balance));
  const sub = toDecimal(subtotal);
  if (sub.lte(0)) return 0;
  const pointsCappedBySubtotal = Math.floor(sub.dividedBy(CURRENCY_PER_POINT).toNumber());
  return Math.max(0, Math.min(safeBalance, pointsCappedBySubtotal));
}

export function tierForLifetime(lifetimePoints: number): LoyaltyTierName {
  let current: LoyaltyTierName = 'bronze';
  for (const t of TIER_THRESHOLDS) {
    if (lifetimePoints >= t.min) current = t.tier;
  }
  return current;
}

export function nextTier(lifetimePoints: number): {
  tier: LoyaltyTierName | null;
  pointsToNext: number | null;
} {
  for (const t of TIER_THRESHOLDS) {
    if (lifetimePoints < t.min) {
      return { tier: t.tier, pointsToNext: t.min - lifetimePoints };
    }
  }
  return { tier: null, pointsToNext: null };
}
