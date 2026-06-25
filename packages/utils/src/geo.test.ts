import { describe, expect, it } from 'vitest';
import { distanceKm, isWithinRadiusKm } from './geo';

const kielce = { lat: 50.8505, lng: 20.6275 };

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(kielce, kielce)).toBe(0);
  });

  it('matches a known distance (Kielce → Kraków ≈ 100 km)', () => {
    const krakow = { lat: 50.0647, lng: 19.945 };
    expect(distanceKm(kielce, krakow)).toBeGreaterThan(95);
    expect(distanceKm(kielce, krakow)).toBeLessThan(105);
  });

  it('is symmetric', () => {
    const other = { lat: 50.9, lng: 20.7 };
    expect(distanceKm(kielce, other)).toBeCloseTo(distanceKm(other, kielce), 9);
  });
});

describe('isWithinRadiusKm', () => {
  it('accepts a nearby point inside 7 km', () => {
    // ~0.02° lat ≈ 2.2 km north
    expect(isWithinRadiusKm(kielce, { lat: 50.8705, lng: 20.6275 }, 7)).toBe(true);
  });

  it('rejects a point well outside 7 km', () => {
    expect(isWithinRadiusKm(kielce, { lat: 50.0647, lng: 19.945 }, 7)).toBe(false);
  });

  it('includes the boundary', () => {
    expect(isWithinRadiusKm(kielce, kielce, 0)).toBe(true);
  });
});
