import { describe, expect, it } from 'vitest';
import {
  elapsedMinutes,
  fmtAxisCurrency,
  fmtInt,
  fmtPct,
  fmtPrep,
  formatMoney,
  zonedParts,
  zonedTimeToUtc,
} from './format';

describe('zonedParts (restaurant-zone wall clock)', () => {
  it('reads Warsaw summer (CEST, UTC+2) wall clock from a UTC instant', () => {
    // 2026-06-24 19:19:00Z → 21:19 in Warsaw (summer). The reported bug: a
    // UTC+3 browser showed 22:19; we must always report Poland's clock.
    const p = zonedParts(new Date('2026-06-24T19:19:00Z'), 'Europe/Warsaw');
    expect(p.hour).toBe(21);
    expect(p.minute).toBe(19);
    expect(p.weekday).toBe(3); // Wednesday
    expect(p).toMatchObject({ year: 2026, month: 6, day: 24 });
  });

  it('reads Warsaw winter (CET, UTC+1)', () => {
    const p = zonedParts(new Date('2026-01-15T23:30:00Z'), 'Europe/Warsaw');
    expect(p.hour).toBe(0); // next local day
    expect(p.minute).toBe(30);
    expect(p.day).toBe(16);
    expect(p.weekday).toBe(5); // Friday
  });

  it('handles midnight without the ICU "24" overflow', () => {
    const p = zonedParts(new Date('2026-06-23T22:00:00Z'), 'Europe/Warsaw');
    expect(p.hour).toBe(0);
    expect(p.day).toBe(24);
  });

  it('falls back to UTC parts for an unknown zone instead of throwing', () => {
    const p = zonedParts(new Date('2026-06-24T19:19:00Z'), 'Not/AZone');
    expect(p.hour).toBe(19);
    expect(p.minute).toBe(19);
  });
});

describe('zonedTimeToUtc (inverse of zonedParts)', () => {
  it('round-trips a Warsaw wall clock back to the correct UTC instant', () => {
    const utc = zonedTimeToUtc(
      { year: 2026, month: 6, day: 24, hour: 21, minute: 19 },
      'Europe/Warsaw',
    );
    expect(utc.toISOString()).toBe('2026-06-24T19:19:00.000Z');
  });

  it('round-trips across DST boundaries (winter)', () => {
    const utc = zonedTimeToUtc(
      { year: 2026, month: 1, day: 16, hour: 0, minute: 30 },
      'Europe/Warsaw',
    );
    expect(utc.toISOString()).toBe('2026-01-15T23:30:00.000Z');
  });

  it('is the exact inverse of zonedParts', () => {
    const original = new Date('2026-06-24T17:45:00Z');
    const p = zonedParts(original, 'Europe/Warsaw');
    const back = zonedTimeToUtc(p, 'Europe/Warsaw');
    expect(back.getTime()).toBe(original.getTime());
  });
});

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
