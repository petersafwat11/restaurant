/**
 * Number + duration + money formatters used across the admin dashboard.
 *
 * This file is browser-safe — no Decimal/Prisma imports, which are the things
 * that would otherwise drag `@prisma/client/runtime/library` (and its `fs`
 * import) into client bundles. Server-only arithmetic helpers live in
 * `./money.ts`.
 */

const CURRENCY_LOCALE: Record<string, string> = {
  PLN: 'pl-PL',
  EUR: 'de-DE',
  GBP: 'en-GB',
  USD: 'en-US',
};

/**
 * Browser-safe currency formatter. Accepts a numeric or string value (e.g.
 * "12.50" as emitted by the API). Always renders 2-decimal — the README §6
 * carry-over fix #7 lives here, at the single source of truth.
 */
export function formatMoney(value: string | number, currency: string, locale?: string): string {
  const num = typeof value === 'number' ? value : Number.parseFloat(value);
  if (Number.isNaN(num)) return '—';
  const resolved = locale ?? CURRENCY_LOCALE[currency.toUpperCase()] ?? 'en-US';
  return new Intl.NumberFormat(resolved, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Sum a list of money strings (e.g. "12.50", "0.99") and return a 2-decimal
 * string. Goes through integer cents so floating-point drift can't bite.
 * Browser-safe — no Decimal import.
 */
export function sumMoneyStrings(values: ReadonlyArray<string | number>): string {
  const cents = values.reduce<number>((acc, v) => {
    const n = typeof v === 'number' ? v : Number.parseFloat(v);
    return acc + (Number.isFinite(n) ? Math.round(n * 100) : 0);
  }, 0);
  return (cents / 100).toFixed(2);
}

/**
 * Format a date/time in the restaurant's timezone. Pass the IANA zone name
 * (e.g. "America/Los_Angeles") so multi-location admins see the right time
 * regardless of their own browser TZ. Falls back to the browser's locale TZ
 * when timezone is empty.
 */
export function formatRestaurantDateTime(
  iso: string | Date,
  timezone: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  locale?: string,
): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = timezone ? { ...options, timeZone: timezone } : options;
  return new Intl.DateTimeFormat(locale, opts).format(date);
}

/** The wall-clock fields of an instant, evaluated in a specific IANA zone. */
export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number; // 0–23
  minute: number; // 0–59
  second: number; // 0–59
  /** ISO weekday, 0=Sunday … 6=Saturday — matches `Date.getDay()` semantics. */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Break an instant into its wall-clock parts **in the given IANA timezone**.
 *
 * Use this anywhere the UI needs "what time / day is it for the restaurant"
 * instead of trusting the visitor's browser clock — the restaurant lives in
 * one place (Poland) regardless of where the customer is.
 *
 * `hourCycle: 'h23'` is required: without it `en-US` emits "24" for midnight on
 * some ICU builds, which then reads back as hour 24. (Same fix as the analytics
 * `period-range.ts` day-boundary math.) Falls back to UTC parts if `tz` is an
 * unknown zone so a bad config can never throw at render time.
 */
export function zonedParts(date: Date, tz: string): ZonedParts {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .reduce<Record<string, string>>((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
      weekday: WEEKDAY_INDEX[parts.weekday ?? ''] ?? date.getUTCDay(),
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      weekday: date.getUTCDay(),
    };
  }
}

/**
 * Inverse of {@link zonedParts}: compose a wall-clock time *in `tz`* into the
 * UTC instant it denotes. DST-correct — finds the zone's offset for that wall
 * clock via `Intl`. Mirrors the server's `composeWallClockUtc`; used by the
 * admin calendar's drag-to-move so a dropped slot means the restaurant's local
 * time regardless of the operator's browser zone.
 */
export function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number },
  tz: string,
): Date {
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
  );
  // zonedParts(asUtc) tells us what wall clock `asUtc` reads as in `tz`; the
  // gap between that and the wall clock we wanted is the zone offset to undo.
  const back = zonedParts(new Date(asUtc), tz);
  const reread = Date.UTC(back.year, back.month - 1, back.day, back.hour, back.minute);
  return new Date(asUtc - (reread - asUtc));
}

export function fmtInt(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function fmtPct(value: number, opts: { digits?: number; signed?: boolean } = {}): string {
  const { digits = 1, signed = false } = opts;
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

/**
 * Format minutes as a compact prep duration: `12m`, `1h 05m`, `45s` for
 * sub-minute. Used in Orders ELAPSED column and KDS.
 */
export function fmtPrep(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Chart Y-axis tick formatter — switches to `$k` above 1000 (carry-over fix
 * #5 from design-prompts/README.md §6).
 */
export function fmtAxisCurrency(value: number, currencySymbol = '$'): string {
  if (Math.abs(value) >= 1000) return `${currencySymbol}${(value / 1000).toFixed(1)}k`;
  return `${currencySymbol}${value.toFixed(0)}`;
}

/**
 * Elapsed minutes between two timestamps. Always non-negative — flips the
 * sign if `now < start` (clock-skew safety). Used for the Orders ELAPSED
 * column (carry-over fix #6).
 */
export function elapsedMinutes(start: Date | string, now: Date = new Date()): number {
  const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const diff = (now.getTime() - startMs) / 60000;
  return Math.max(0, diff);
}
