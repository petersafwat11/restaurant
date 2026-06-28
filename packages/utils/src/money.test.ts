import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';
import {
  addAll,
  clampNonNegative,
  currencyMinorUnitExponent,
  decimalToString,
  fromMinorUnits,
  multiply,
  round2,
  toDecimal,
  toMinorUnits,
} from './money';

describe('money', () => {
  it('sums Decimals without float drift', () => {
    const total = addAll(['9.99', '9.99', '9.99']);
    expect(total.toFixed(2)).toBe('29.97');
  });

  it('multiplies and rounds half-up to 2 decimals', () => {
    expect(multiply('9.99', 3).toFixed(2)).toBe('29.97');
    expect(multiply('0.125', 1).toFixed(2)).toBe('0.13');
  });

  it('clamps negative values to zero', () => {
    expect(clampNonNegative('-3.5').toFixed(2)).toBe('0.00');
    expect(clampNonNegative('3.5').toFixed(2)).toBe('3.50');
  });

  it('round2 stabilises arithmetic', () => {
    expect(round2(toDecimal('0.1').plus('0.2')).toFixed(2)).toBe('0.30');
  });

  it('decimalToString gives 2dp string', () => {
    expect(decimalToString('1')).toBe('1.00');
  });

  it('formatMoney produces a localized currency string', () => {
    const out = formatMoney('12.5', 'PLN');
    expect(out).toMatch(/12[.,]50/);
  });

  it('formatMoney pins PLN to pl-PL (zł suffix)', () => {
    const out = formatMoney('12.5', 'PLN');
    expect(out).toMatch(/12,50/);
    expect(out).toMatch(/zł/);
  });

  // Web port regression — locks the PLN contract the customer site depends on.
  // Polish locale always uses comma decimal + zł suffix. Thousands grouping
  // (non-breaking space) requires full ICU data; Node's small-icu build may
  // omit it, so we accept either grouped or ungrouped. Browser is always grouped.
  it('formatMoney PLN renders 2dp comma decimal for whole values', () => {
    const out = formatMoney('24.00', 'PLN');
    expect(out).toMatch(/24,00/);
    expect(out).toMatch(/zł/);
  });

  it('formatMoney PLN renders large values with comma decimal + zł suffix', () => {
    const out = formatMoney('1234.50', 'PLN');
    expect(out).toMatch(/1.?234,50/);
    expect(out).toMatch(/zł/);
  });

  it('formatMoney pins USD to en-US ($ prefix)', () => {
    const out = formatMoney('12.5', 'USD');
    expect(out).toMatch(/\$12\.50/);
  });

  it('formatMoney pins EUR to de-DE (€ suffix)', () => {
    const out = formatMoney('12.5', 'EUR');
    expect(out).toMatch(/12,50/);
    expect(out).toMatch(/€/);
  });

  it('formatMoney accepts an explicit locale override', () => {
    const polishLocale = formatMoney('12.5', 'USD', 'pl-PL');
    expect(polishLocale).toMatch(/12,50/);
  });
});

describe('provider minor units (Stripe)', () => {
  it('converts 2dp currencies to minor units exactly', () => {
    expect(toMinorUnits('12.34', 'PLN')).toBe(1234);
    expect(toMinorUnits('0.00', 'PLN')).toBe(0);
    expect(toMinorUnits('0.01', 'PLN')).toBe(1);
    expect(toMinorUnits('1000000.99', 'EUR')).toBe(100000099);
  });

  it('is exact at the cent boundary (no float drift)', () => {
    // 0.1 + 0.2 in float is 0.30000000000000004; Decimal-based stays exact.
    expect(toMinorUnits(toDecimal('0.1').plus('0.2'), 'PLN')).toBe(30);
    expect(toMinorUnits('19.99', 'USD')).toBe(1999);
  });

  it('handles zero-decimal currencies', () => {
    expect(toMinorUnits('1234', 'JPY')).toBe(1234);
    expect(fromMinorUnits(1234, 'JPY')).toBe('1234');
  });

  it('round-trips through minor units', () => {
    expect(fromMinorUnits(toMinorUnits('87.65', 'PLN'), 'PLN')).toBe('87.65');
    expect(fromMinorUnits(1, 'PLN')).toBe('0.01');
  });

  it('rejects unsupported currencies instead of assuming 2dp', () => {
    expect(() => toMinorUnits('10.00', 'XYZ')).toThrow(/Unsupported currency/);
    expect(() => fromMinorUnits(1000, 'XYZ')).toThrow(/Unsupported currency/);
    expect(() => currencyMinorUnitExponent('ZZZ')).toThrow(/Unsupported currency/);
  });

  it('rejects sub-minor-unit precision', () => {
    expect(() => toMinorUnits('1.234', 'PLN')).toThrow(/whole number of minor units/);
  });
});
