import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { resolvePeriod } from './period-range';

describe('resolvePeriod', () => {
  const tz = 'America/New_York';
  const fixedNow = new Date('2026-08-18T14:30:00.000Z');

  it('resolves "today" with start and end aligned to timezone', () => {
    const range = resolvePeriod('today', tz, undefined, fixedNow);
    expect(range.from).toBeInstanceOf(Date);
    expect(range.to).toBeInstanceOf(Date);
    expect(range.to.getTime() - range.from.getTime()).toBe(24 * 60 * 60_000);
    expect(range.prevTo.getTime()).toBe(range.from.getTime());
  });

  it('resolves "7d" with 7 days length', () => {
    const range = resolvePeriod('7d', tz, undefined, fixedNow);
    expect(range.to.getTime() - range.from.getTime()).toBe(7 * 24 * 60 * 60_000);
    expect(range.prevTo.getTime()).toBe(range.from.getTime());
  });

  it('resolves "30d" with 30 days length', () => {
    const range = resolvePeriod('30d', tz, undefined, fixedNow);
    expect(range.to.getTime() - range.from.getTime()).toBe(30 * 24 * 60 * 60_000);
  });

  it('resolves "custom" period with valid from and to dates', () => {
    const from = '2026-08-01T00:00:00.000Z';
    const to = '2026-08-10T00:00:00.000Z';
    const range = resolvePeriod('custom', tz, { from, to }, fixedNow);
    expect(range.from.toISOString()).toBe(from);
    expect(range.to.toISOString()).toBe(to);
    expect(range.prevTo.toISOString()).toBe(from);
    expect(range.prevFrom.toISOString()).toBe('2026-07-23T00:00:00.000Z');
  });

  it('throws BadRequestException when custom dates are missing or invalid', () => {
    expect(() => resolvePeriod('custom', tz, undefined, fixedNow)).toThrow(BadRequestException);
    expect(() => resolvePeriod('custom', tz, { from: 'invalid' }, fixedNow)).toThrow(
      BadRequestException,
    );
    expect(() =>
      resolvePeriod(
        'custom',
        tz,
        { from: '2026-08-10T00:00:00Z', to: '2026-08-01T00:00:00Z' },
        fixedNow,
      ),
    ).toThrow(BadRequestException);
  });
});
