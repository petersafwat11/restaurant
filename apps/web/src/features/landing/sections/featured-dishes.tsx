'use client';

import { useAddToCart } from '@/features/cart/hooks';
import { useMenuTree } from '@/features/menu/hooks';
import { Link } from '@/i18n/navigation';
import { Container, DishCard, SectionHeader } from '@repo/ui';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type FeaturedItem = {
  href: string;
  image: { src: string; alt: string };
  name: string;
  description?: string;
  price: { amount: string; currency: string };
  flags?: string[];
  onAdd?: () => void;
};

/**
 * Pulls the featured dishes from the live menu tree (DB). There is NO mock
 * fallback: if no dish is tagged `isFeatured`, the section is hidden entirely
 * (Phase H1). Showing arbitrary or fabricated dishes under "Our customers'
 * favourites" would misrepresent the live catalogue to customers and payment
 * crawlers, so an empty featured set means no section.
 */
export function LandingFeaturedDishes() {
  const t = useTranslations('web.marketing.home.featured');
  const tChips = useTranslations('web.shop.menu.chips');
  const treeQuery = useMenuTree();
  const addMutation = useAddToCart();

  const flagLabels = React.useMemo(
    () => ({
      vegetarian: tChips('vegetarian'),
      vegan: tChips('vegan'),
      'gluten-free': tChips('glutenFree'),
      spicy: tChips('spicy'),
      featured: tChips('featured'),
    }),
    [tChips],
  );

  const items = React.useMemo<FeaturedItem[]>(() => {
    if (!treeQuery.data) return [];
    const currency = 'PLN';
    return treeQuery.data.categories
      .flatMap((c) => c.items)
      .filter((i) => i.isFeatured)
      .slice(0, 6)
      .map((i) => ({
        href: `/menu#${i.slug}`,
        image: {
          src: i.images[0]?.url ?? '',
          alt: i.images[0]?.alt ?? i.name,
        },
        name: i.name,
        description: i.description ?? undefined,
        price: { amount: i.basePrice, currency },
        flags: [
          i.isVegetarian && 'vegetarian',
          i.isVegan && 'vegan',
          i.isGlutenFree && 'gluten-free',
          i.spiceLevel >= 2 && 'spicy',
          i.isFeatured && 'featured',
        ].filter(Boolean) as string[],
        onAdd: () => {
          addMutation.mutate({
            menuItemId: i.id,
            quantity: 1,
            modifierSelections: [],
          });
        },
      }));
  }, [treeQuery.data, addMutation]);

  // No live featured dishes → hide the section rather than show mock content.
  if (items.length === 0) return null;

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
          action={{ label: t('seeFullMenu'), href: '/menu' }}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {items.map((d, i) => (
            <DishCard
              key={d.href}
              href={d.href}
              image={{ ...d.image, priority: i < 3 }}
              name={d.name}
              description={d.description}
              price={d.price}
              flags={d.flags as never}
              flagLabels={flagLabels}
              onAdd={d.onAdd}
              soldOutLabel={t('soldOutLabel')}
              formatAddAriaLabel={(name) => t('addAriaLabel', { name })}
            />
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Link
            href="/menu"
            className="inline-flex h-12 items-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-6 text-[15px] font-medium text-fg transition-colors hover:bg-surface-warm/40"
          >
            {t('viewFullMenuCta')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
