import type { AnalyticsPeriod } from '@repo/types';

export interface PeriodRange {
  from: Date;
  to: Date;
  /** Previous period of equal length used for delta math. */
  prevFrom: Date;
  prevTo: Date;
}

/**
 * Resolve a period to UTC date boundaries. Per-restaurant timezone is honored
 * by computing the day boundary in that zone and converting to UTC.
 */
export function resolvePeriod(
  period: AnalyticsPeriod,
  timezone: string,
  custom?: { from?: string; to?: string },
  now: Date = new Date(),
): PeriodRange {
  if (period === 'custom') {
    if (!custom?.from || !custom?.to) throw new Error('Custom period requires from/to');
    const from = new Date(custom.from);
    const to = new Date(custom.to);
    const span = to.getTime() - from.getTime();
    return { from, to, prevFrom: new Date(from.getTime() - span), prevTo: from };
  }

  const dayMs = 24 * 60 * 60_000;
  const todayStart = startOfDayUtc(now, timezone);
  const todayEnd = new Date(todayStart.getTime() + dayMs);

  if (period === 'today') {
    const span = dayMs;
    return {
      from: todayStart,
      to: todayEnd,
      prevFrom: new Date(todayStart.getTime() - span),
      prevTo: todayStart,
    };
  }

  const days = period === '7d' ? 7 : 30;
  const from = new Date(todayEnd.getTime() - days * dayMs);
  return {
    from,
    to: todayEnd,
    prevFrom: new Date(from.getTime() - days * dayMs),
    prevTo: from,
  };
}

function startOfDayUtc(d: Date, tz: string): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const y = Number(parts.year);
  const m = Number(parts.month);
  const day = Number(parts.day);
  // Compose midnight in the zone, expressed as UTC ms.
  const guess = Date.UTC(y, m - 1, day);
  const offset = tzOffsetMinutes(new Date(guess), tz);
  return new Date(guess - offset * 60_000);
}

function tzOffsetMinutes(d: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - d.getTime()) / 60_000);
}
