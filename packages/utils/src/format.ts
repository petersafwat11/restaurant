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
  const opts: Intl.DateTimeFormatOptions = timezone
    ? { ...options, timeZone: timezone }
    : options;
  return new Intl.DateTimeFormat(locale, opts).format(date);
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
