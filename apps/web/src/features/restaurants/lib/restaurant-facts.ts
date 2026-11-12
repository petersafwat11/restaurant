import { formatPrice } from '@/features/menu/lib/dish-facts';
import type { RestaurantPublicDto } from '@repo/types';

/**
 * Plain-language restaurant facts (address, hours, delivery terms) derived
 * from the DB restaurant record — used in server-rendered copy, FAQs, JSON-LD
 * and llms.txt so every surface states the same, current facts.
 */

type Hours = NonNullable<RestaurantPublicDto['hours']>;

const DAY_SHORT: Record<string, string[]> = {
  pl: ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const DAY_LONG: Record<string, string[]> = {
  pl: ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
/** Monday-first week order (Polish convention). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function lang(locale: string): 'pl' | 'en' {
  return locale === 'en' ? 'en' : 'pl';
}

export interface HoursGroup {
  /** Day-of-week numbers (0 = Sunday) in Monday-first order. */
  days: number[];
  label: string;
  /** "10:00–21:00", or null when closed. */
  time: string | null;
}

/** Group consecutive days with identical hours: "pon.–pt. 10:00–21:00". */
export function groupHours(hours: Hours | undefined | null, locale: string): HoursGroup[] {
  const l = lang(locale);
  const byDay = new Map((hours ?? []).map((h) => [h.dayOfWeek, h]));
  const groups: HoursGroup[] = [];
  for (const d of WEEK) {
    const h = byDay.get(d);
    const time = !h || h.isClosed ? null : `${h.opensAt}–${h.closesAt}`;
    const last = groups[groups.length - 1];
    if (last && last.time === time) last.days.push(d);
    else groups.push({ days: [d], label: '', time });
  }
  const short = DAY_SHORT[l] ?? [];
  for (const g of groups) {
    const first = short[g.days[0] ?? 0] ?? '';
    const lastDay = short[g.days[g.days.length - 1] ?? 0] ?? '';
    g.label = g.days.length > 1 ? `${first}–${lastDay}` : first;
  }
  return groups;
}

/** "pon.–pt. 10:00–21:00, sob. 12:00–21:00, niedz. nieczynne". */
export function formatHoursSummary(hours: Hours | undefined | null, locale: string): string {
  if (!hours || hours.length === 0) return '';
  const closed = lang(locale) === 'en' ? 'closed' : 'nieczynne';
  return groupHours(hours, locale)
    .map((g) => `${g.label} ${g.time ?? closed}`)
    .join(', ');
}

/** Long day names of closed days, e.g. ["niedziela"]. */
export function closedDays(hours: Hours | undefined | null, locale: string): string[] {
  const names = DAY_LONG[lang(locale)] ?? [];
  const open = new Set((hours ?? []).filter((h) => !h.isClosed).map((h) => h.dayOfWeek));
  return WEEK.filter((d) => !open.has(d)).map((d) => names[d] ?? '');
}

/** True when the restaurant is open every day of the week. */
export function isOpenEveryDay(hours: Hours | undefined | null): boolean {
  return closedDays(hours, 'pl').length === 0 && (hours?.length ?? 0) >= 7;
}

/** "Ul. Ks. Piotra Ściegiennego 68a, 25-115 Kielce". */
export function fullAddress(r: Pick<RestaurantPublicDto, 'address'>): string {
  const cityLine = [r.address.zip, r.address.city].filter(Boolean).join(' ');
  return [r.address.line1, cityLine].filter(Boolean).join(', ');
}

/** Restaurant email when it is a real address; empty / invalid → null (hidden). */
export function publicEmail(
  r: Pick<RestaurantPublicDto, 'email'> | null | undefined,
): string | null {
  const e = r?.email?.trim();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

function range(min: number | null, max: number | null): string | null {
  if (min == null) return null;
  return max != null && max !== min ? `${min}–${max}` : `${min}`;
}

export interface DeliveryFacts {
  /** Delivery fee formatted, e.g. "0,00 zł". */
  fee: string;
  isFree: boolean;
  /** Minimum order formatted, e.g. "40,00 zł". */
  minOrder: string;
  radiusKm: number;
  /** "30–90" minutes, or null when not configured. */
  deliveryMinutes: string | null;
  pickupMinutes: string | null;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
}

export function deliveryFacts(r: RestaurantPublicDto, locale: string): DeliveryFacts {
  return {
    fee: formatPrice(r.defaultDeliveryFee, locale),
    isFree: Number.parseFloat(r.defaultDeliveryFee) === 0,
    minOrder: formatPrice(r.minOrderAmount, locale),
    radiusKm: r.deliveryRadiusKm,
    deliveryMinutes: range(r.estimatedDeliveryMinutesMin, r.estimatedDeliveryMinutesMax),
    pickupMinutes: range(r.estimatedPickupMinutesMin, r.estimatedPickupMinutesMax),
    acceptsDelivery: r.acceptsDelivery,
    acceptsPickup: r.acceptsPickup,
  };
}

/** Delivery fee shown in headline copy: "0 zł" rather than "0,00 zł". */
export function shortFee(r: RestaurantPublicDto, locale: string): string {
  const fee = Number.parseFloat(r.defaultDeliveryFee);
  if (fee === 0) return locale === 'en' ? 'PLN 0' : '0 zł';
  return formatPrice(r.defaultDeliveryFee, locale);
}

/** Minimum order shown in headline copy: "40 zł". */
export function shortMinOrder(r: RestaurantPublicDto, locale: string): string {
  const v = Number.parseFloat(r.minOrderAmount);
  if (Number.isInteger(v)) return locale === 'en' ? `PLN ${v}` : `${v} zł`;
  return formatPrice(r.minOrderAmount, locale);
}
