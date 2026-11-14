import { cheapestPrice, dishHref, dishImageAlt } from '@/features/menu/lib/dish-facts';
import { Link, getPathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { MenuTreeDto } from '@repo/types';
import { Container, type DishFlag, SectionHeader } from '@repo/ui';
import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { FeaturedDishCard } from './featured-dish-card';

export type FeaturedDish = {
  id: string;
  href: string;
  image: { src: string; alt: string };
  name: string;
  description?: string;
  price: { amount: string; currency: string };
  flags: DishFlag[];
};

/**
 * Featured dishes from the live menu tree (DB), max 6. There is NO mock
 * fallback: if no dish is tagged `isFeatured`, the list is empty and the
 * section is hidden (Phase H1) — showing arbitrary or fabricated dishes under
 * "Our customers' favourites" would misrepresent the live catalogue.
 */
export function selectFeaturedDishes(tree: MenuTreeDto | null, locale: AppLocale): FeaturedDish[] {
  if (!tree) return [];
  return tree.categories
    .flatMap((c) => c.items.map((i) => ({ ...i, categorySlug: c.slug })))
    .filter((i) => i.isFeatured)
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      href: getPathname({ locale, href: dishHref(i.categorySlug, i.slug) }),
      image: { src: i.images[0]?.url ?? '', alt: dishImageAlt(i, locale) },
      name: i.name,
      description: i.description ?? undefined,
      price: { amount: cheapestPrice(i), currency: 'PLN' },
      flags: [
        i.isVegetarian && 'vegetarian',
        i.isVegan && 'vegan',
        i.isGlutenFree && 'gluten-free',
        i.spiceLevel >= 2 && 'spicy',
        i.isFeatured && 'featured',
      ].filter(Boolean) as DishFlag[],
    }));
}

/**
 * Server Component: the cards are plain HTML from the server-fetched tree;
 * only each card's quick-add button hydrates (FeaturedDishCard). Images are
 * below the fold on mobile, so they lazy-load (no preload competing with the
 * hero for bandwidth).
 */
export async function LandingFeaturedDishes({ tree }: { tree: MenuTreeDto | null }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations('web.marketing.home.featured');
  const tChips = await getTranslations('web.shop.menu.chips');
  const items = selectFeaturedDishes(tree, locale);

  // No live featured dishes → hide the section rather than show mock content.
  if (items.length === 0) return null;

  const flagLabels = {
    vegetarian: tChips('vegetarian'),
    vegan: tChips('vegan'),
    'gluten-free': tChips('glutenFree'),
    spicy: tChips('spicy'),
    featured: tChips('featured'),
  };

  return (
    <section
      aria-labelledby="featured-h"
      className="bg-surface py-section-y-mobile sm:py-section-y"
    >
      <Container>
        <SectionHeader
          id="featured-h"
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          action={{ label: t('seeFullMenu'), href: getPathname({ locale, href: '/menu' }) }}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {items.map((d) => (
            <FeaturedDishCard
              key={d.href}
              menuItemId={d.id}
              href={d.href}
              image={{
                ...d.image,
                sizes: '(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 50vw, 400px',
              }}
              name={d.name}
              description={d.description}
              price={d.price}
              flags={d.flags}
              flagLabels={flagLabels}
              soldOutLabel={t('soldOutLabel')}
              addAriaLabel={t('addAriaLabel', { name: d.name })}
            />
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Link
            href="/menu"
            className="inline-flex h-12 items-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-6 text-[15px] font-medium text-fg transition-colors hover:bg-surface-warm/40"
          >
            {t('viewFullMenuCta')}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
