import { describe, expect, it } from 'vitest';
import {
  elapsedMinutes,
  fmtAxisCurrency,
  fmtInt,
  fmtPct,
  fmtPrep,
  formatMoney,
} from './format';

describe('formatMoney (carry-over fix #7 — 2-decimal enforcement)', () => {
  it('always pads to 2 decimal places', () => {
    expect(formatMoney('0.5', 'USD')).toMatch(/0\.50/);
    expect(formatMoney('1', 'USD')).toMatch(/1\.00/);
    expect(formatMoney(12, 'USD')).toMatch(/12\.00/);
  });

  it('caps to 2 decimal places (no 3+ digit tails)', () => {
    expect(formatMoney('0.555', 'USD')).toMatch(/0\.5[56]/);
    expect(formatMoney('1.999', 'USD')).toMatch(/2\.00|1\.99|2,00/);
  });

  it('returns em-dash for NaN', () => {
    expect(formatMoney('not-a-number', 'USD')).toBe('—');
  });

  it('honors the locale for the currency', () => {
    expect(formatMoney('12.5', 'PLN')).toMatch(/12,50/);
  });
});

describe('fmtAxisCurrency (carry-over fix #5 — $k above 1000)', () => {
  it('renders sub-1000 values as integer dollar', () => {
    expect(fmtAxisCurrency(0)).toBe('$0');
    expect(fmtAxisCurrency(750)).toBe('$750');
    expect(fmtAxisCurrency(999)).toBe('$999');
  });

  it('switches to $k at 1000+', () => {
    expect(fmtAxisCurrency(1000)).toBe('$1.0k');
    expect(fmtAxisCurrency(1500)).toBe('$1.5k');
    expect(fmtAxisCurrency(25000)).toBe('$25.0k');
  });

  it('handles negative values symmetrically', () => {
    expect(fmtAxisCurrency(-1500)).toBe('$-1.5k');
  });

  it('accepts a custom currency symbol', () => {
    expect(fmtAxisCurrency(2500, '€')).toBe('€2.5k');
  });
});

describe('elapsedMinutes (carry-over fix #6 — monotonically ascending)', () => {
  it('returns positive minutes for past timestamps', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-01T00:30:00Z');
    expect(elapsedMinutes(start, now)).toBe(30);
  });

  it('clamps to 0 for future timestamps (clock-skew safety)', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const future = new Date('2026-01-01T00:05:00Z');
    expect(elapsedMinutes(future, now)).toBe(0);
  });

  it('accepts string ISO timestamps', () => {
    const now = new Date('2026-01-01T01:00:00Z');
    expect(elapsedMinutes('2026-01-01T00:00:00Z', now)).toBe(60);
  });
});

describe('fmtPrep', () => {
  it('renders sub-minute as seconds', () => {
    expect(fmtPrep(0.5)).toBe('30s');
  });

  it('renders minutes for < 1h', () => {
    expect(fmtPrep(12)).toBe('12m');
    expect(fmtPrep(59)).toBe('59m');
  });

  it('renders hours+minutes for >= 1h', () => {
    expect(fmtPrep(65)).toBe('1h 05m');
    expect(fmtPrep(125)).toBe('2h 05m');
  });

  it('returns em-dash for negative or non-finite', () => {
    expect(fmtPrep(-1)).toBe('—');
    expect(fmtPrep(Number.NaN)).toBe('—');
  });
});

describe('fmtInt + fmtPct', () => {
  it('fmtInt groups thousands', () => {
    expect(fmtInt(1234567)).toMatch(/1[,.\s]234[,.\s]567/);
  });

  it('fmtPct defaults to 1 decimal', () => {
    expect(fmtPct(12.345)).toBe('12.3%');
  });

  it('fmtPct can show signed positive', () => {
    expect(fmtPct(5, { signed: true })).toBe('+5.0%');
    expect(fmtPct(-5, { signed: true })).toBe('-5.0%');
    expect(fmtPct(0, { signed: true })).toBe('0.0%');
  });
});
