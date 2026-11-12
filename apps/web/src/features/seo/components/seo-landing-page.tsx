import type { MenuCategory, MenuEntry } from '@/features/menu/lib/dish-facts';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildBreadcrumbNode, buildFaqNode } from '@/lib/seo/schema';
import { Container } from '@repo/ui';
import { getTranslations } from 'next-intl/server';
import { type SeoMetaKey, loadFactsLabels, loadSeoBase, seoH1, toDishLink } from '../load-seo';
import {
  type ContentSection,
  type QA,
  interpolate,
  interpolateQa,
  interpolateSections,
} from '../seo-vars';
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

export type DishPicker = (
  tree: NonNullable<Awaited<ReturnType<typeof fetchMenuTree>>>,
) => { category: MenuCategory; item: MenuEntry }[];

/**
 * Shared server renderer for the SEO landing pages (/kebab-kielce,
 * /falafel-kielce, /kapsalon-kielce, /dostawa, /faq). Copy lives in
 * `web.seo.pages.{contentKey}`; facts ({fee}, {hours}…) and dish prices come
 * from the live API so the page never states stale numbers.
 */
export async function SeoLandingPage({
  locale,
  metaKey,
  contentKey,
  href,
  breadcrumbName,
  pickDishes,
  dishesHeading,
  showMap = false,
  faqFromItems = false,
}: {
  locale: string;
  metaKey: SeoMetaKey;
  contentKey: 'kebabKielce' | 'falafelKielce' | 'kapsalonKielce' | 'delivery' | 'faq';
  href: string;
  breadcrumbName: string;
  pickDishes?: DishPicker;
  dishesHeading?: 'popularHeading' | 'dishesHeading';
  showMap?: boolean;
  /** `/faq` stores its questions under `items` and has no sections. */
  faqFromItems?: boolean;
}) {
  const { restaurant, vars } = await loadSeoBase(locale);
  const tree = pickDishes ? await fetchMenuTree(locale) : null;
  const t = await getTranslations({ locale, namespace: 'web.seo.pages' });
  const h1 = await seoH1(locale, metaKey, vars);
  const factsLabels = await loadFactsLabels(locale, vars);

  const lead = interpolate(t.raw(`${contentKey}.lead`) as string, vars);
  const sections = faqFromItems
    ? []
    : interpolateSections((t.raw(`${contentKey}.sections`) as ContentSection[]) ?? [], vars);
  const faqs = interpolateQa(
    (t.raw(faqFromItems ? `${contentKey}.items` : `${contentKey}.faq`) as QA[]) ?? [],
    vars,
  );
  const dishes =
    tree && pickDishes
      ? pickDishes(tree).map(({ category, item }) =>
          toDishLink(category, item, locale, (price) => t('common.fromPrice', { price })),
        )
      : [];
  const crumbs = [
    { name: t('common.breadcrumbHome'), href: '/' },
    { name: breadcrumbName, href },
  ];

  return (
    <>
      <JsonLd
        id={`ld-${contentKey}`}
        data={[
          buildBreadcrumbNode(crumbs, locale),
          ...(faqs.length > 0 ? [buildFaqNode(faqs)] : []),
        ]}
      />
      <Breadcrumbs items={crumbs} ariaLabel={breadcrumbName} />
      <PageIntro h1={h1} lead={lead}>
        <OrderDirectBanner text={interpolate(t.raw('common.orderDirect') as string, vars)} />
        <CtaRow
          primary={{
            label: interpolate(t.raw('common.ctaOrderDelivery') as string, vars),
            href: '/menu',
          }}
          secondary={
            href === '/dostawa' ? undefined : { label: t('common.ctaMenu'), href: '/menu' }
          }
        />
      </PageIntro>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-12">
              {dishes.length > 0 && (
                <DishLinkList
                  heading={t(`common.${dishesHeading ?? 'popularHeading'}`)}
                  items={dishes}
                />
              )}
              {sections.length > 0 && <ContentSections sections={sections} />}
              <FaqList heading={t('common.faqHeading')} items={faqs} />
              {showMap && (
                <MapEmbed
                  restaurant={restaurant}
                  heading={t('common.mapHeading')}
                  ariaLabel={t('common.mapAria', { address: vars.address })}
                  openInMaps={t('common.openInMaps')}
                />
              )}
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
