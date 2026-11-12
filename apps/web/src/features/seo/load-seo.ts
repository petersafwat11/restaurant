import {
  type MenuCategory,
  type MenuEntry,
  dishHref,
  dishImageAlt,
  formatPrice,
  getDishFacts,
} from '@/features/menu/lib/dish-facts';
import { MenuUnavailableError } from '@/lib/seo/fetch-menu';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import type { RestaurantPublicDto } from '@repo/types';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { DishLink, FactsLabels } from './components/seo-blocks';
import { type SeoVars, buildSeoVars, interpolate } from './seo-vars';

/** Restaurant + interpolation vars; throws (→ retryable 5xx) when the API is down. */
export async function loadSeoBase(
  locale: string,
): Promise<{ restaurant: RestaurantPublicDto; vars: SeoVars }> {
  const restaurant = await fetchPublicRestaurant();
  if (!restaurant) throw new MenuUnavailableError('Restaurant data unavailable');
  return { restaurant, vars: buildSeoVars(restaurant, locale) };
}

export type SeoMetaKey =
  | 'home'
  | 'menu'
  | 'about'
  | 'contact'
  | 'locations'
  | 'reservations'
  | 'delivery'
  | 'faq'
  | 'kebabKielce'
  | 'falafelKielce'
  | 'kapsalonKielce'
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'refundsComplaints'
  | 'deliveryCancellation'
  | 'promotionTerms';

/**
 * Title / description / canonical / hreflang for a page from `web.seo.meta`.
 * Facts in the copy ({fee}, {minOrder}, {hours}…) come from the live
 * restaurant record; if the API is unreachable we fall back to the site-wide
 * default description rather than print an unfilled placeholder.
 */
export async function seoMetadata(
  locale: string,
  key: SeoMetaKey,
  href: string,
  opts: { image?: string | null } = {},
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'web.seo.meta' });
  const restaurant = await fetchPublicRestaurant();
  const rawTitle = t.raw(`${key}.title`) as string;
  const rawDesc = t.raw(`${key}.description`) as string;
  let title = rawTitle;
  let description = rawDesc;
  if (restaurant) {
    const vars = buildSeoVars(restaurant, locale);
    title = interpolate(rawTitle, vars);
    description = interpolate(rawDesc, vars);
  } else if (/\{\w+\}/.test(rawTitle + rawDesc)) {
    const tl = await getTranslations({ locale, namespace: 'web.layout.meta' });
    title = /\{\w+\}/.test(rawTitle) ? tl('title') : rawTitle;
    description = tl('description');
  }
  return buildPageMetadata({ locale, href, title, description, image: opts.image });
}

/** H1 for a page from `web.seo.meta.{key}.h1`, interpolated with vars. */
export async function seoH1(
  locale: string,
  key: SeoMetaKey,
  vars: SeoVars | null,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'web.seo.meta' });
  const raw = t.raw(`${key}.h1`) as string;
  return vars ? interpolate(raw, vars) : raw.replace(/\s*[—-]?\s*\{\w+\}/g, '');
}

export async function loadFactsLabels(locale: string, vars: SeoVars): Promise<FactsLabels> {
  const t = await getTranslations({ locale, namespace: 'web.seo.pages.common' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  return {
    heading: t('factsHeading'),
    address: t('factAddress'),
    phone: t('factPhone'),
    hours: t('factHours'),
    delivery: t('factDelivery'),
    deliveryValue: interpolate(t.raw('factDeliveryValue') as string, vars),
    payments: t('factPayments'),
    paymentsValue: t('factPaymentsValue'),
    pickup: t('factPickup'),
    pickupValue: t('factPickupValue'),
    closed: tCommon('closed'),
  };
}

/** A linked dish row (name, real price, weight, photo) for SEO pages. */
export function toDishLink(
  category: MenuCategory,
  item: MenuEntry,
  locale: string,
  fromLabel: (price: string) => string,
): DishLink {
  const facts = getDishFacts(item, category);
  const price = formatPrice(facts.fromPrice, locale);
  const weights = facts.sizes.map((s) => s.grams).filter((g): g is number => typeof g === 'number');
  const meta =
    weights.length > 1
      ? `${Math.min(...weights)}–${Math.max(...weights)} g ${locale === 'en' ? 'of meat' : 'mięsa'}`
      : facts.grams
        ? `${facts.grams} g ${locale === 'en' ? 'of meat' : 'mięsa'}`
        : null;
  return {
    key: `${category.slug}/${item.slug}`,
    name: item.name,
    href: dishHref(category.slug, item.slug),
    price: facts.sizes.length > 1 ? fromLabel(price) : price,
    description: item.description,
    meta,
    image: item.images[0]?.url
      ? { src: item.images[0].url, alt: dishImageAlt(item, locale) }
      : null,
  };
}
