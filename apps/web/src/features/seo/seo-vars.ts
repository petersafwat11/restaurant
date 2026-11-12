import {
  deliveryFacts,
  formatHoursSummary,
  fullAddress,
  shortFee,
  shortMinOrder,
} from '@/features/restaurants/lib/restaurant-facts';
import { WRAPS_PER_WEEK } from '@/lib/brand';
import type { RestaurantPublicDto } from '@repo/types';

/**
 * Placeholder values for SEO copy in `web.seo.*` messages. Every fact comes
 * from the live restaurant record (DB → API), so copy never drifts from the
 * real delivery fee, minimum order, radius or opening hours.
 */
export type SeoVars = Record<
  | 'address'
  | 'phone'
  | 'hours'
  | 'fee'
  | 'minOrder'
  | 'radius'
  | 'deliveryTime'
  | 'pickupTime'
  | 'wraps',
  string
>;

export function buildSeoVars(r: RestaurantPublicDto, locale: string): SeoVars {
  const d = deliveryFacts(r, locale);
  return {
    address: fullAddress(r),
    phone: r.phone,
    hours: formatHoursSummary(r.hours, locale),
    fee: shortFee(r, locale),
    minOrder: shortMinOrder(r, locale),
    radius: String(d.radiusKm).replace('.', locale === 'en' ? '.' : ','),
    // Not configured in admin → an em dash rather than an invented number.
    deliveryTime: d.deliveryMinutes ?? '—',
    pickupTime: d.pickupMinutes ?? '—',
    wraps: WRAPS_PER_WEEK.toLocaleString(locale === 'en' ? 'en-GB' : 'pl-PL'),
  };
}

/** Replace `{name}` placeholders; unknown names are left untouched. */
export function interpolate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export interface ContentSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface QA {
  q: string;
  a: string;
}

export function interpolateSections(sections: ContentSection[], vars: SeoVars): ContentSection[] {
  return sections.map((s) => ({
    heading: interpolate(s.heading, vars),
    paragraphs: s.paragraphs?.map((p) => interpolate(p, vars)),
    bullets: s.bullets?.map((b) => interpolate(b, vars)),
  }));
}

export function interpolateQa(items: QA[], vars: SeoVars): QA[] {
  return items.map((i) => ({ q: interpolate(i.q, vars), a: interpolate(i.a, vars) }));
}
