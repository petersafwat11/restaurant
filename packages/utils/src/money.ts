/**
 * Money helpers built on Prisma's Decimal. All money in this codebase is
 * Decimal — never use native Number arithmetic for currency. Every public
 * boundary rounds half-up to 2 decimals.
 */
import { Decimal } from '@prisma/client/runtime/library';

export { Decimal };

export type DecimalLike = Decimal | string | number;

const TWO_DP = 2;

export function toDecimal(value: DecimalLike): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function round2(value: DecimalLike): Decimal {
  return toDecimal(value).toDecimalPlaces(TWO_DP, Decimal.ROUND_HALF_UP);
}

export function addAll(values: readonly DecimalLike[]): Decimal {
  return round2(values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0)));
}

export function sum(...values: DecimalLike[]): Decimal {
  return addAll(values);
}

export function multiply(amount: DecimalLike, qty: DecimalLike): Decimal {
  return round2(toDecimal(amount).times(toDecimal(qty)));
}

export function clampNonNegative(value: DecimalLike): Decimal {
  const d = toDecimal(value);
  return d.lt(0) ? new Decimal(0) : d;
}

// Currency → BCP47 locale baseline. Receipts + emails pass through here so
// the API server (often C/UTC) and a Polish browser produce the same string.
// True per-user locale awareness lands in Sprint 11 — until then this is the
// stable default.
const CURRENCY_LOCALE: Record<string, string> = {
  PLN: 'pl-PL',
  EUR: 'de-DE',
  GBP: 'en-GB',
  USD: 'en-US',
};

/**
 * @deprecated Use `formatMoney` from `./format.ts` — same signature, but
 * browser-safe (doesn't pull `@prisma/client` into client bundles). Kept here
 * for binary-compatible server code; new client imports should reach for
 * the format.ts version which is re-exported from the barrel.
 */
export function formatMoneyServer(value: DecimalLike, currency: string, locale?: string): string {
  const num = toDecimal(value).toNumber();
  const resolved = locale ?? CURRENCY_LOCALE[currency.toUpperCase()] ?? 'en-US';
  return new Intl.NumberFormat(resolved, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function isZero(value: DecimalLike): boolean {
  return toDecimal(value).isZero();
}

export function decimalToString(value: DecimalLike): string {
  return round2(value).toFixed(2);
}

// ---- Provider minor units (Stripe etc.) -----------------------------------
//
// Minor-unit exponent per ISO-4217 currency we support. We list currencies
// explicitly and reject anything else rather than silently assuming 2dp — a
// wrong exponent means charging 100× or 1/100× the intended amount (plan §F5).
const CURRENCY_MINOR_UNIT_EXPONENT: Record<string, number> = {
  PLN: 2,
  EUR: 2,
  USD: 2,
  GBP: 2,
  CZK: 2,
  CHF: 2,
  SEK: 2,
  NOK: 2,
  DKK: 2,
  RON: 2,
  BGN: 2,
  // Zero-decimal currencies — guarded; the platform is PLN-first but the math
  // must be correct if one is ever enabled.
  JPY: 0,
  KRW: 0,
};

/** Minor-unit exponent for a supported currency; throws on unsupported. */
export function currencyMinorUnitExponent(currency: string): number {
  const exp = CURRENCY_MINOR_UNIT_EXPONENT[currency.toUpperCase()];
  if (exp === undefined) {
    throw new Error(`Unsupported currency for minor-unit conversion: ${currency}`);
  }
  return exp;
}

/**
 * Convert a major-unit money amount into provider minor units (e.g. PLN
 * "12.34" → 1234). Decimal-based — never `Number.parseFloat`/`* 100` — so it
 * is exact at the cent boundary. Throws on an unsupported currency or a value
 * that isn't a whole number of minor units.
 */
export function toMinorUnits(amount: DecimalLike, currency: string): number {
  const exp = currencyMinorUnitExponent(currency);
  const factor = new Decimal(`1${'0'.repeat(exp)}`);
  const scaled = toDecimal(amount).times(factor);
  if (!scaled.isInteger()) {
    throw new Error(`Amount ${String(amount)} ${currency} is not a whole number of minor units`);
  }
  return scaled.toNumber();
}

/** Convert provider minor units back into a major-unit money string. */
export function fromMinorUnits(minor: number, currency: string): string {
  const exp = currencyMinorUnitExponent(currency);
  const factor = new Decimal(`1${'0'.repeat(exp)}`);
  return toDecimal(minor).div(factor).toFixed(exp);
}
