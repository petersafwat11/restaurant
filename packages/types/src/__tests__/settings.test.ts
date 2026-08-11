import { describe, expect, it } from 'vitest';
import { TaxRateStringSchema } from '../settings';

describe('TaxRateStringSchema', () => {
  it('accepts valid tax rates in decimal range 0 to 1 with up to 4 decimals', () => {
    expect(TaxRateStringSchema.safeParse('0').success).toBe(true);
    expect(TaxRateStringSchema.safeParse('0.08').success).toBe(true);
    expect(TaxRateStringSchema.safeParse('0.0825').success).toBe(true);
    expect(TaxRateStringSchema.safeParse('0.1000').success).toBe(true);
    expect(TaxRateStringSchema.safeParse('1').success).toBe(true);
    expect(TaxRateStringSchema.safeParse('1.0000').success).toBe(true);
  });

  it('rejects values with more than four decimal places', () => {
    expect(TaxRateStringSchema.safeParse('0.12345').success).toBe(false);
  });

  it('rejects negative values', () => {
    expect(TaxRateStringSchema.safeParse('-0.08').success).toBe(false);
    expect(TaxRateStringSchema.safeParse('-0.0001').success).toBe(false);
  });

  it('rejects values strictly greater than 1', () => {
    expect(TaxRateStringSchema.safeParse('1.01').success).toBe(false);
    expect(TaxRateStringSchema.safeParse('2.5').success).toBe(false);
    expect(TaxRateStringSchema.safeParse('10').success).toBe(false);
  });
});
