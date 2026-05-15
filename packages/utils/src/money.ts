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

export function formatMoney(value: DecimalLike, currency: string, locale?: string): string {
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
