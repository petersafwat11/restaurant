import { CategoryDishGrid } from '@/features/menu/components/category-dish-grid';
import { categoryHref, formatPrice, getDishFacts } from '@/features/menu/lib/dish-facts';
import {
  Breadcrumbs,
  FaqList,
  OrderDirectBanner,
  PageIntro,
} from '@/features/seo/components/seo-blocks';
import { loadSeoBase } from '@/features/seo/load-seo';
import { interpolate } from '@/features/seo/seo-vars';
import { Link } from '@/i18n/navigation';
import { fetchMenuTreeOrThrow } from '@/lib/seo/fetch-menu';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildPageMetadata } from '@/lib/seo/page-metadata';
import {
  buildBreadcrumbNode,
  buildFaqNode,
  buildMenuSectionNode,
  restaurantId,
} from '@/lib/seo/schema';
import { absoluteAsset } from '@/lib/seo/site';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ locale: string; category: string }> };

async function loadCategory(locale: string, slug: string) {
  const tree = await fetchMenuTreeOrThrow(locale);
  const category = tree.categories.find((c) => c.slug === slug && c.items.length > 0);
  return { tree, category };
}

function cheapest(category: NonNullable<Awaited<ReturnType<typeof loadCategory>>['category']>) {
  const prices = category.items.map((i) => getDishFacts(i, category).fromPrice);
  return prices.reduce((min, p) => (Number.parseFloat(p) < Number.parseFloat(min) ? p : min));
}

async function categoryCopy(locale: string, slug: string, name: string) {
  const t = await getTranslations({ locale, namespace: 'web.seo.meta.category' });
  const overrides = (t.raw('overrides') ?? {}) as Record<string, { title?: string; h1?: string }>;
  const o = overrides[slug] ?? {};
  return {
    title: o.title ?? (t.raw('title') as string),
    h1: o.h1 ?? (t.raw('h1') as string),
    description: t.raw('description') as string,
    name,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const [{ category }, { vars }] = await Promise.all([
    loadCategory(locale, slug),
    loadSeoBase(locale),
  ]);
  if (!category) return {};
  const copy = await categoryCopy(locale, slug, category.name);
  const v = {
    ...vars,
    category: category.name,
    count: category.items.length,
    from: formatPrice(cheapest(category), locale),
  };
  const image = category.imageUrl ?? category.items.find((i) => i.images[0])?.images[0]?.url;
  return buildPageMetadata({
    locale,
    href: categoryHref(slug),
    title: interpolate(copy.title, v),
    description: interpolate(copy.description, v),
    image: image ? absoluteAsset(image) : null,
  });
}

/**
 * Category landing page (`/menu/[category]`), one per DB category. Server
 * rendered: H1, intro built from DB facts, every dish (H3) with price and
 * link to its dish page, add-to-cart, and MenuSection + BreadcrumbList JSON-LD.
 */
export default async function CategoryPage({ params }: Props) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);
  const [{ tree, category }, { vars }] = await Promise.all([
    loadCategory(locale, slug),
    loadSeoBase(locale),
  ]);
  if (!category) notFound();

  const t = await getTranslations({ locale, namespace: 'web.seo.pages' });
  const copy = await categoryCopy(locale, slug, category.name);
  const v = {
    ...vars,
    category: category.name,
    count: category.items.length,
    from: formatPrice(cheapest(category), locale),
    description: (category.description ?? '').trim(),
  };
  const intro = interpolate(
    t.raw(category.description ? 'category.intro' : 'category.introNoDescription') as string,
    v,
  );
  const crumbs = [
    { name: t('common.breadcrumbHome'), href: '/' },
    { name: t('common.breadcrumbMenu'), href: '/menu' },
    { name: category.name, href: categoryHref(slug) },
  ];
  const others = tree.categories.filter((c) => c.slug !== slug && c.items.length > 0);
  const faqs = category.items.slice(0, 4).map((item) => {
    const f = getDishFacts(item, category);
    const sizes =
      f.sizes.length > 1
        ? f.sizes.map((s) => `${s.name} ${formatPrice(s.price, locale)}`).join(', ')
        : formatPrice(f.fromPrice, locale);
    return {
      q:
        locale === 'en'
          ? `How much is the ${item.name} at Szef Donald?`
          : `Ile kosztuje ${item.name} w Szef Donald?`,
      a: `${sizes}.`,
    };
  });

  return (
    <>
      <JsonLd
        id="ld-category"
        data={[
          { ...buildMenuSectionNode(category, locale), isPartOf: { '@id': restaurantId() } },
          buildBreadcrumbNode(crumbs, locale),
          buildFaqNode(faqs),
        ]}
      />
      <Breadcrumbs items={crumbs} ariaLabel={t('common.breadcrumbMenu')} />
      <PageIntro h1={interpolate(copy.h1, v)} lead={intro}>
        <OrderDirectBanner
          text={interpolate(t.raw('common.orderDirect') as string, vars)}
          href="/dostawa"
        />
      </PageIntro>
      <section className="bg-bg pb-section-y-mobile sm:pb-section-y">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-display text-h3 text-fg sm:text-h2">
            {t('common.dishesHeading')} — {category.name}
          </h2>
          <CategoryDishGrid category={category} items={category.items} />
          <div className="mt-16">
            <FaqList heading={t('common.faqHeading')} items={faqs} />
          </div>
          {others.length > 0 && (
            <nav className="mt-12" aria-label={t('common.breadcrumbMenu')}>
              <h2 className="mb-3 font-display text-h3 text-fg">{t('common.breadcrumbMenu')}</h2>
              <ul className="flex flex-wrap gap-2">
                {others.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={categoryHref(c.slug)}
                      className="inline-flex h-9 items-center rounded-full border border-border/[var(--border-strong-alpha)] px-4 text-small text-fg hover:border-accent/40 hover:text-accent"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
