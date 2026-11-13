import {
  type DishFacts,
  type MenuCategory,
  type MenuEntry,
  dishHref,
  dishImageAlt,
  findDishBySlug,
  formatPrice,
  getDishFacts,
  joinAlternatives,
  joinList,
  lcFirst,
} from '@/features/menu/lib/dish-facts';
import { directionsHref } from '@/features/restaurants/lib/restaurant-info';
import { Link } from '@/i18n/navigation';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildBreadcrumbNode, buildFaqNode } from '@/lib/seo/schema';
import { Container } from '@repo/ui';
import { ArrowRight, MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { loadFactsLabels, loadSeoBase, seoH1, toDishLink } from '../load-seo';
import {
  type ContentSection,
  type QA,
  interpolate,
  interpolateQa,
  interpolateSections,
} from '../seo-vars';
import { RichText } from './rich-text';
import {
  Breadcrumbs,
  ContentSections,
  CtaRow,
  DishLinkList,
  FactsCard,
  FaqList,
  MapEmbed,
  OrderDirectBanner,
  PageIntro,
} from './seo-blocks';

type Tree = NonNullable<Awaited<ReturnType<typeof fetchMenuTree>>>;
type Dish = { category: MenuCategory; item: MenuEntry; facts: DishFacts };

interface DishBlurb {
  slug: string;
  heading: string;
  text: string;
}

/** Photos shown in the gallery (real uploads from the menu), in this order. */
const GALLERY_SLUGS = ['kebab-tortilla', 'kebab-kapsalon', 'kebab-na-talerzu'];

function kebabCategory(tree: Tree): MenuCategory | undefined {
  return (
    tree.categories.find((c) => c.slug === 'kebab') ??
    tree.categories.find((c) => /kebab/i.test(c.slug))
  );
}

/** Kebab dishes that come in sizes — the rows of the size / weight / price table. */
function sizedKebabs(tree: Tree): Dish[] {
  const category = kebabCategory(tree);
  if (!category) return [];
  return category.items
    .filter((item) => item.isAvailable)
    .map((item) => ({ category, item, facts: getDishFacts(item, category) }))
    .filter((d) => d.facts.sizes.length > 0);
}

function findDish(tree: Tree, slug: string): Dish | null {
  const hit = findDishBySlug(tree, slug);
  return hit ? { ...hit, facts: getDishFacts(hit.item, hit.category) } : null;
}

/**
 * `/kebab-kielce` — the pillar page for "kebab Kielce". Long-form copy lives in
 * `web.seo.pages.kebabKielce`; every number on the page (sizes, meat weights,
 * prices, sauce surcharge, delivery fee / minimum / radius / times, hours) is
 * computed from the live menu tree and restaurant record, so the page never
 * states a stale price. Server-rendered end to end — no client JS of its own.
 */
export async function KebabPillarPage({ locale }: { locale: string }) {
  const { restaurant, vars } = await loadSeoBase(locale);
  const tree = await fetchMenuTree(locale);
  const t = await getTranslations({ locale, namespace: 'web.seo.pages' });
  const h1 = await seoH1(locale, 'kebabKielce', vars);
  const factsLabels = await loadFactsLabels(locale, vars);
  const price = (v: string) => formatPrice(v, locale);
  const raw = <T,>(key: string) => t.raw(`kebabKielce.${key}`) as T;

  const lead = interpolate(raw<string>('lead'), vars);
  const topSections = interpolateSections(raw<ContentSection[]>('sections'), vars);
  const bottomSections = interpolateSections(raw<ContentSection[]>('sectionsBottom'), vars);
  const faqs = interpolateQa(raw<QA[]>('faq'), vars);

  // ---- data-driven facts ---------------------------------------------------
  const sized = tree ? sizedKebabs(tree) : [];
  const reference = sized[0]?.facts ?? null;
  const meats = reference?.meats.map((m) => lcFirst(m.name)) ?? [];
  const meatsFree = reference?.meats.every((m) => Number.parseFloat(m.priceDelta) === 0) ?? false;
  const sauces = reference?.sauces.map((s) => lcFirst(s.name)) ?? [];
  const sauceSurcharge = reference?.saucesRequired
    ? (reference.sauces
        .map((s) => s.priceDelta)
        .sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))[0] ?? '0.00')
    : null;
  const allGrams = sized
    .flatMap((d) => d.facts.sizes.map((s) => s.grams))
    .filter((g): g is number => typeof g === 'number');

  const blurbs = tree
    ? raw<DishBlurb[]>('dishes.items')
        .map((b) => ({ blurb: b, dish: findDish(tree, b.slug) }))
        .filter((x): x is { blurb: DishBlurb; dish: Dish } => x.dish !== null)
    : [];
  const gallery = tree
    ? GALLERY_SLUGS.map((slug) => findDish(tree, slug)).filter(
        (d): d is Dish => d !== null && !!d.facts.imageUrl,
      )
    : [];
  const popular = tree
    ? [
        ...tree.categories.flatMap((category) =>
          category.items
            .filter((item) => item.isFeatured && item.isAvailable)
            .map((item) => ({ category, item })),
        ),
      ]
        .slice(0, 6)
        .map(({ category, item }) =>
          toDishLink(category, item, locale, (p) => t('common.fromPrice', { price: p })),
        )
    : [];

  const crumbs = [
    { name: t('common.breadcrumbHome'), href: '/' },
    { name: locale === 'en' ? 'Kebab in Kielce' : 'Kebab Kielce', href: '/kebab-kielce' },
  ];

  return (
    <>
      <JsonLd
        id="ld-kebabKielce"
        data={[buildBreadcrumbNode(crumbs, locale), ...(faqs.length ? [buildFaqNode(faqs)] : [])]}
      />
      <Breadcrumbs items={crumbs} ariaLabel={crumbs[1]?.name ?? ''} />
      <PageIntro h1={h1} lead={lead}>
        <OrderDirectBanner text={interpolate(t.raw('common.orderDirect') as string, vars)} />
        <CtaRow
          primary={{
            label: interpolate(t.raw('common.ctaOrderDelivery') as string, vars),
            href: '/menu',
          }}
          secondary={{ label: t('common.ctaMenu'), href: '/menu' }}
        />
      </PageIntro>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-12">
              {gallery.length > 0 && (
                <section aria-labelledby="kk-gallery" className="flex flex-col gap-4">
                  <h2 id="kk-gallery" className="font-display text-h3 text-fg sm:text-h2">
                    {t('kebabKielce.galleryHeading')}
                  </h2>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {gallery.map((d) => (
                      <li key={d.item.slug}>
                        <figure className="flex flex-col gap-2">
                          <Link
                            href={dishHref(d.category.slug, d.item.slug)}
                            className="relative block aspect-[4/3] overflow-hidden rounded-card bg-surface-warm"
                          >
                            <Image
                              src={d.facts.imageUrl as string}
                              alt={dishImageAlt(d.item, locale)}
                              fill
                              sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 33vw, 260px"
                              className="object-cover"
                            />
                          </Link>
                          <figcaption className="text-small text-fg-muted">
                            {d.item.name} —{' '}
                            {t('common.fromPrice', { price: price(d.facts.fromPrice) })}
                          </figcaption>
                        </figure>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <ContentSections sections={topSections} />

              {meats.length > 0 && (
                <section aria-labelledby="kk-meat" className="flex max-w-3xl flex-col gap-3">
                  <h2 id="kk-meat" className="font-display text-h3 text-fg sm:text-h2">
                    {t('kebabKielce.meat.heading')}
                  </h2>
                  {raw<string[]>('meat.paragraphs').map((p) => (
                    <p key={p} className="text-body-l text-fg-muted">
                      <RichText text={interpolate(p, vars)} />
                    </p>
                  ))}
                  <p className="text-body-l text-fg-muted">
                    {t('kebabKielce.meat.options', { meats: joinAlternatives(meats, locale) })}
                    {meatsFree ? ` ${t('kebabKielce.meat.samePrice')}` : ''}
                  </p>
                </section>
              )}

              {sized.length > 0 && (
                <section aria-labelledby="kk-sizes" className="flex flex-col gap-4">
                  <h2 id="kk-sizes" className="font-display text-h3 text-fg sm:text-h2">
                    {t('kebabKielce.sizes.heading')}
                  </h2>
                  <p className="max-w-3xl text-body-l text-fg-muted">
                    {allGrams.length > 0
                      ? t('kebabKielce.sizes.introGrams', {
                          min: Math.min(...allGrams),
                          max: Math.max(...allGrams),
                        })
                      : t('kebabKielce.sizes.intro')}
                  </p>
                  <div className="overflow-x-auto rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated">
                    <table className="w-full min-w-[480px] text-left text-body">
                      <caption className="sr-only">{t('kebabKielce.sizes.caption')}</caption>
                      <thead>
                        <tr className="text-caption uppercase tracking-wide text-fg-muted">
                          <th scope="col" className="px-4 py-3">
                            {t('kebabKielce.sizes.dishCol')}
                          </th>
                          <th scope="col" className="px-4 py-3">
                            {t('common.sizeCol')}
                          </th>
                          <th scope="col" className="px-4 py-3">
                            {t('common.meatCol')}
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            {t('common.priceCol')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sized.flatMap((d) =>
                          d.facts.sizes.map((s, i) => (
                            <tr
                              key={`${d.item.slug}-${s.name}`}
                              className={
                                i === 0 ? 'border-t border-border/[var(--border-strong-alpha)]' : ''
                              }
                            >
                              {i === 0 && (
                                <th
                                  scope="rowgroup"
                                  rowSpan={d.facts.sizes.length}
                                  className="px-4 py-2 align-top font-semibold text-fg"
                                >
                                  <Link
                                    href={dishHref(d.category.slug, d.item.slug)}
                                    className="hover:text-accent"
                                  >
                                    {d.item.name}
                                  </Link>
                                </th>
                              )}
                              <td className="px-4 py-2 text-fg">{s.name}</td>
                              <td className="px-4 py-2 text-fg-muted">
                                {s.grams != null ? `${s.grams} g` : '—'}
                              </td>
                              <td className="px-4 py-2 text-right font-medium tabular-nums text-fg">
                                {price(s.price)}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                  {sauceSurcharge !== null && (
                    <p className="max-w-3xl text-small text-fg-muted">
                      {Number.parseFloat(sauceSurcharge) > 0
                        ? t('kebabKielce.sizes.sauceIncluded', { surcharge: price(sauceSurcharge) })
                        : t('kebabKielce.sizes.sauceFree')}
                    </p>
                  )}
                </section>
              )}

              <section aria-labelledby="kk-sauces" className="flex max-w-3xl flex-col gap-3">
                <h2 id="kk-sauces" className="font-display text-h3 text-fg sm:text-h2">
                  {t('kebabKielce.sauces.heading')}
                </h2>
                {sauces.length > 0 && (
                  <p className="text-body-l text-fg-muted">
                    {sauceSurcharge !== null && Number.parseFloat(sauceSurcharge) > 0
                      ? t('kebabKielce.sauces.choicePaid', {
                          sauces: joinList(sauces, locale),
                          surcharge: price(sauceSurcharge),
                        })
                      : t('kebabKielce.sauces.choiceFree', { sauces: joinList(sauces, locale) })}
                  </p>
                )}
                {raw<string[]>('sauces.paragraphs').map((p) => (
                  <p key={p} className="text-body-l text-fg-muted">
                    <RichText text={interpolate(p, vars)} />
                  </p>
                ))}
              </section>

              {blurbs.length > 0 && (
                <section aria-labelledby="kk-more" className="flex max-w-3xl flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <h2 id="kk-more" className="font-display text-h3 text-fg sm:text-h2">
                      {t('kebabKielce.dishes.heading')}
                    </h2>
                    <p className="text-body-l text-fg-muted">{t('kebabKielce.dishes.intro')}</p>
                  </div>
                  {blurbs.map(({ blurb, dish }) => {
                    const gl = dish.facts.sizes
                      .map((s) => s.grams)
                      .filter((g): g is number => typeof g === 'number');
                    const minG = gl.length > 0 ? Math.min(...gl) : dish.facts.grams;
                    const maxG = gl.length > 0 ? Math.max(...gl) : dish.facts.grams;
                    return (
                      <div key={blurb.slug} className="flex flex-col gap-2">
                        <h3 className="text-h3 font-semibold text-fg">{blurb.heading}</h3>
                        <p className="text-body-l text-fg-muted">{interpolate(blurb.text, vars)}</p>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
                          <span className="font-semibold text-fg">
                            {dish.facts.sizes.length > 1
                              ? t('common.fromPrice', { price: price(dish.facts.fromPrice) })
                              : price(dish.facts.fromPrice)}
                          </span>
                          {minG && maxG && minG !== maxG ? (
                            <span className="text-fg-muted">
                              {t('kebabKielce.dishes.gramsRange', { min: minG, max: maxG })}
                            </span>
                          ) : minG ? (
                            <span className="text-fg-muted">
                              {t('kebabKielce.dishes.grams', { grams: minG })}
                            </span>
                          ) : null}
                          <Link
                            href={dishHref(dish.category.slug, dish.item.slug)}
                            className="inline-flex items-center gap-1 font-medium text-accent-hover underline underline-offset-2 hover:text-accent"
                          >
                            {t('kebabKielce.dishes.link', { name: dish.item.name })}
                            <ArrowRight size={14} aria-hidden />
                          </Link>
                        </p>
                      </div>
                    );
                  })}
                </section>
              )}

              <ContentSections sections={bottomSections} />

              <section aria-labelledby="kk-visit" className="flex max-w-3xl flex-col gap-3">
                <h2 id="kk-visit" className="font-display text-h3 text-fg sm:text-h2">
                  {t('kebabKielce.visit.heading')}
                </h2>
                {raw<string[]>('visit.paragraphs').map((p) => (
                  <p key={p} className="text-body-l text-fg-muted">
                    <RichText text={interpolate(p, vars)} />
                  </p>
                ))}
                <a
                  href={directionsHref(restaurant)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 self-start text-small font-medium text-accent-hover underline underline-offset-2 hover:text-accent"
                >
                  <MapPin size={14} aria-hidden /> {t('kebabKielce.visit.directions')}
                </a>
              </section>

              <DishLinkList heading={t('common.popularHeading')} items={popular} />

              <FaqList heading={t('common.faqHeading')} items={faqs} />

              <MapEmbed
                restaurant={restaurant}
                heading={t('common.mapHeading')}
                ariaLabel={t('common.mapAria', { address: vars.address })}
                openInMaps={t('common.openInMaps')}
              />
            </div>
            <div className="lg:sticky lg:top-28">
              <FactsCard restaurant={restaurant} locale={locale} labels={factsLabels} />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
