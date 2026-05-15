import type { Locale } from './locale';

// BCP47 tags for the supported locales. Arabic uses Modern Standard with
// Latin (Western) digits to match the menu/price design; switch to
// 'ar-EG' nu-arab if Eastern Arabic numerals are ever required.
const BCP47: Record<Locale, string> = {
  en: 'en-US',
  ar: 'ar-u-nu-latn',
};

export function localeTag(locale: Locale): string {
  return BCP47[locale] ?? 'en-US';
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeTag(locale), options).format(value);
}

export function formatCurrency(value: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeTag(locale), options).format(d);
}

export function formatRelativeTime(diffSeconds: number, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(localeTag(locale), {
    numeric: 'auto',
  });
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return rtf.format(Math.round(diffSeconds), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  return rtf.format(Math.round(diffSeconds / 86400), 'day');
}
