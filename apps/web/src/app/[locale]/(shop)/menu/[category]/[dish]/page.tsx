import { DishOrderActions } from '@/features/menu/components/dish-order-actions';
import { buildDishCopy } from '@/features/menu/lib/dish-copy';
import {
  type MenuCategory,
  type MenuEntry,
  categoryHref,
  dishHref,
  dishImageAlt,
  formatPrice,
  getDishFacts,
} from '@/features/menu/lib/dish-facts';
import { fullAddress, shortFee, shortMinOrder } from '@/features/restaurants/lib/restaurant-facts';
import { Breadcrumbs, DishLinkList, FaqList } from '@/features/seo/components/seo-blocks';
import { loadSeoBase, toDishLink } from '@/features/seo/load-seo';
import { interpolate } from '@/features/seo/seo-vars';
import { Link } from '@/i18n/navigation';
import { fetchMenuItem, fetchMenuTreeOrThrow } from '@/lib/seo/fetch-menu';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import {
  buildBreadcrumbNode,
  buildFaqNode,
  buildMenuItemNode,
  menuId,
  restaurantId,
} from '@/lib/seo/schema';
import { absoluteAsset } from '@/lib/seo/site';
import type { MenuItemDetailDto, MenuTreeDto } from '@repo/types';
import { Container } from '@repo/ui';
import { Leaf, Weight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ locale: string; category: string; dish: string }> };

/**
 * Loads the dish (404 only when the API says it doesn't exist — API failures
 * throw so crawlers get a retryable error, never a false 404) plus the tree
 * for its category name, related dishes and combo deals.
 */
async function loadDish(locale: string, categorySlug: string, dishSlug: string) {
  const [result, tree] = await Promise.all([
    fetchMenuItem(categorySlug, dishSlug, locale),
    fetchMenuTreeOrThrow(locale),
  ]);
  if (result.status === 'not-found') return null;
  const category = tree.categories.find((c) => c.slug === categorySlug);
  if (!category) return null;
  return { item: result.item, category, tree };
}

function combosFor(tree: MenuTreeDto, item: MenuItemDetailDto, categorySlug: string): string[] {
  if (/zestaw|combo/i.test(categorySlug)) return [];
  const key = item.name
    .replace(/^kebab\s+/i, '')
    .trim()
    .toLowerCase();
  if (key.length < 4) return [];
  return tree.categories
    .filter((c) => /zestaw|combo/i.test(c.slug))
    .flatMap((c) => c.items)
    .filter((i) => i.name.toLowerCase().includes(key))
    .map((i) => i.name);
}

function relatedFor(tree: MenuTreeDto, category: MenuCategory, item: MenuItemDetailDto) {
  const same = category.items
    .filter((i) => i.slug !== item.slug && i.isAvailable)
    .map((i) => ({ category, item: i }));
  const featured = tree.categories
    .filter((c) => c.slug !== category.slug)
    .flatMap((c) => c.items.filter((i) => i.isFeatured).map((i) => ({ category: c, item: i })));
  return [...same, ...featured].slice(0, 4) as { category: MenuCategory; item: MenuEntry }[];
}

async function buildCopy(locale: string, data: NonNullable<Awaited<ReturnType<typeof loadDish>>>) {
  const { restaurant } = await loadSeoBase(locale);
  const tMenu = await getTranslations({ locale, namespace: 'web.shop.menu' });
  const facts = getDishFacts(data.item, data.category);
  const copy = buildDishCopy(facts, {
    locale,
    address: fullAddress(restaurant),
    deliveryFee: shortFee(restaurant, locale),
    minOrder: shortMinOrder(restaurant, locale),
    radiusKm: restaurant.deliveryRadiusKm,
    combos: combosFor(data.tree, data.item, data.category.slug),
    allergenLabels: data.item.allergens.map((a) => tMenu(`allergen.${a}`).toLowerCase()),
  });
  return { restaurant, facts, copy };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category, dish } = await params;
  const data = await loadDish(locale, category, dish);
  if (!data) return {};
  const { copy, facts } = await buildCopy(locale, data);
  return buildPageMetadata({
    locale,
    href: dishHref(category, dish),
    title: copy.title,
    description: copy.metaDescription,
    image: facts.imageUrl ? absoluteAsset(facts.imageUrl) : null,
  });
}

/** Kebab dishes (and kebab combo sets) link back to the /kebab-kielce pillar page. */
function isKebabCategory(categorySlug: string): boolean {
  return /kebab|zestaw/i.test(categorySlug);
}

export default async function DishPage({ params }: Props) {
  const { locale, category: categorySlug, dish: dishSlug } = await params;
  setRequestLocale(locale);
  const data = await loadDish(locale, categorySlug, dishSlug);
  if (!data) notFound();
  const { item, category, tree } = data;
  const { restaurant, facts, copy } = await buildCopy(locale, data);
  const { vars } = await loadSeoBase(locale);
  const t = await getTranslations({ locale, namespace: 'web.seo.pages.common' });

  const crumbs = [
    { name: t('breadcrumbHome'), href: '/' },
    { name: t('breadcrumbMenu'), href: '/menu' },
    { name: category.name, href: categoryHref(category.slug) },
    { name: item.name, href: dishHref(category.slug, item.slug) },
  ];
  const related = relatedFor(tree, category, item).map(({ category: c, item: i }) =>
    toDishLink(c, i, locale, (price) => t('fromPrice', { price })),
  );
  const diet = [
    facts.isVegan ? t('vegan') : facts.isVegetarian ? t('vegetarian') : null,
    facts.isGlutenFree ? t('glutenFree') : null,
  ].filter(Boolean) as string[];
  const showGrams = facts.sizes.some((s) => s.grams != null);

  return (
    <>
      <JsonLd
        id="ld-dish"
        data={[
          {
            ...buildMenuItemNode(category, item, locale, true),
            isPartOf: { '@id': menuId(locale) },
            offeredBy: { '@id': restaurantId() },
          },
          buildBreadcrumbNode(crumbs, locale),
          buildFaqNode(copy.faqs),
        ]}
      />
      <Breadcrumbs items={crumbs} ariaLabel={t('breadcrumbMenu')} />

      <section className="bg-bg pb-12 pt-8">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-image-lg bg-surface-warm">
              {facts.imageUrl ? (
                // Above the fold (first on phones): the likely LCP, so preloaded.
                <Image
                  src={facts.imageUrl}
                  alt={dishImageAlt(item, locale)}
                  fill
                  preload
                  sizes="(max-width: 1024px) calc(100vw - 32px), 600px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div>
              <h1
                className="font-display text-h2 text-fg sm:text-h1"
                style={{ textWrap: 'balance' }}
              >
                {copy.h1}
              </h1>
              {item.description && (
                <p className="mt-3 text-body-l text-fg-muted">{item.description}</p>
              )}
              <p className="mt-4 font-display text-price text-fg">
                {facts.sizes.length > 1
                  ? t('fromPrice', { price: formatPrice(facts.fromPrice, locale) })
                  : formatPrice(facts.fromPrice, locale)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-small text-fg-subtle">
                {facts.grams ? (
                  <span className="inline-flex items-center gap-1">
                    <Weight size={14} aria-hidden /> {facts.grams} g
                  </span>
                ) : null}
                {diet.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 text-positive">
                    <Leaf size={14} aria-hidden /> {d}
                  </span>
                ))}
                {!item.isAvailable && <span>{t('unavailable')}</span>}
              </div>

              <DishOrderActions
                item={item}
                deliveryLabel={interpolate(t.raw('ctaOrderDelivery') as string, vars)}
                pickupLabel={t('ctaPickup')}
                showDelivery={restaurant.acceptsDelivery}
                showPickup={restaurant.acceptsPickup}
              />
              <p className="mt-3 text-small text-fg-subtle">
                {interpolate(t.raw('orderDirect') as string, vars)}
              </p>

              {facts.sizes.length > 1 && (
                <div className="mt-8">
                  <h2 className="font-display text-h3 text-fg">{t('sizesHeading')}</h2>
                  <table className="mt-3 w-full text-left text-body">
                    <thead>
                      <tr className="text-caption uppercase tracking-wide text-fg-subtle">
                        <th scope="col" className="py-2">
                          {t('sizeCol')}
                        </th>
                        {showGrams && (
                          <th scope="col" className="py-2">
                            {t('meatCol')}
                          </th>
                        )}
                        <th scope="col" className="py-2 text-right">
                          {t('priceCol')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {facts.sizes.map((s) => (
                        <tr key={s.name} className="border-t border-border/[var(--border-alpha)]">
                          <td className="py-2 text-fg">{s.name}</td>
                          {showGrams && (
                            <td className="py-2 text-fg-muted">
                              {s.grams != null ? `${s.grams} g` : '—'}
                            </td>
                          )}
                          <td className="py-2 text-right font-medium text-fg">
                            {formatPrice(s.price, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="flex max-w-3xl flex-col gap-4">
            <h2 className="font-display text-h3 text-fg sm:text-h2">{t('aboutDishHeading')}</h2>
            {copy.paragraphs.map((p) => (
              <p key={p} className="text-body-l text-fg-muted">
                {p}
              </p>
            ))}
            {isKebabCategory(category.slug) && (
              <p className="text-body-l text-fg-muted">
                {t.rich('kebabPillarDish', {
                  link: (chunks) => (
                    <Link
                      href="/kebab-kielce"
                      className="font-medium text-accent-hover underline underline-offset-2 hover:text-accent"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
          </div>
          <div className="mt-12">
            <FaqList heading={t('faqHeading')} items={copy.faqs} />
          </div>
          <div className="mt-12">
            <DishLinkList heading={t('relatedHeading')} items={related} />
          </div>
          <p className="mt-8">
            <Link
              href={categoryHref(category.slug)}
              className="text-small font-medium text-accent hover:underline"
            >
              {t('categoryLink', { category: category.name })} →
            </Link>
          </p>
        </Container>
      </section>
    </>
  );
}
