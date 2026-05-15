import { describe, expect, it } from 'vitest';
import {
  REFERRAL_REFEREE_POINTS,
  REFERRAL_REFERRER_POINTS,
  discountForPoints,
  maxRedeemablePoints,
  nextTier,
  pointsForAmount,
  tierForLifetime,
} from './loyalty';

describe('loyalty economics', () => {
  it('earns 1 point per whole currency unit, floored', () => {
    expect(pointsForAmount('0')).toBe(0);
    expect(pointsForAmount('9.99')).toBe(9);
    expect(pointsForAmount('100.00')).toBe(100);
    expect(pointsForAmount('-5')).toBe(0);
  });

  it('redeems at 100 points per currency unit', () => {
    expect(discountForPoints(0).toFixed(2)).toBe('0.00');
    expect(discountForPoints(100).toFixed(2)).toBe('1.00');
    expect(discountForPoints(250).toFixed(2)).toBe('2.50');
    expect(discountForPoints(-10).toFixed(2)).toBe('0.00');
  });

  it('caps redeemable points by balance and subtotal', () => {
    // balance 1000, subtotal 3.00 → 300 pts max (= $3 discount)
    expect(maxRedeemablePoints(1000, '3.00')).toBe(300);
    // balance 50, subtotal 100 → bounded by balance
    expect(maxRedeemablePoints(50, '100.00')).toBe(50);
    expect(maxRedeemablePoints(1000, '0')).toBe(0);
    expect(maxRedeemablePoints(-5, '10')).toBe(0);
  });

  it('computes tier from lifetime points (never downgrades)', () => {
    expect(tierForLifetime(0)).toBe('bronze');
    expect(tierForLifetime(499)).toBe('bronze');
    expect(tierForLifetime(500)).toBe('silver');
    expect(tierForLifetime(2000)).toBe('gold');
    expect(tierForLifetime(9999)).toBe('platinum');
  });

  it('reports the next tier and distance to it', () => {
    expect(nextTier(0)).toEqual({ tier: 'silver', pointsToNext: 500 });
    expect(nextTier(1500)).toEqual({ tier: 'gold', pointsToNext: 500 });
    expect(nextTier(6000)).toEqual({ tier: null, pointsToNext: null });
  });

  it('exposes referral reward constants', () => {
    expect(REFERRAL_REFERRER_POINTS).toBeGreaterThan(0);
    expect(REFERRAL_REFEREE_POINTS).toBeGreaterThan(0);
  });
});
