'use client';

import { itemFlagsOf, useDishOrdering } from '@/features/menu/hooks/use-dish-ordering';
import { type MenuCategory, dishHref, dishImageAlt } from '@/features/menu/lib/dish-facts';
import { getPathname } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { DishCard } from '@repo/ui';
import { useLocale, useTranslations } from 'next-intl';

/**
 * Dish cards for a category / landing page. Server-rendered (props come from
 * the server page) with the same add-to-cart sheet as the menu page; each
 * card links to its dish page.
 */
export function CategoryDishGrid({
  category,
  items,
  currency = 'PLN',
}: {
  category: Pick<MenuCategory, 'slug'>;
  items: MenuCategory['items'];
  currency?: string;
}) {
  const t = useTranslations('web.shop.menu');
  const locale = useLocale() as AppLocale;
  const { quickAdd, sheet, flagLabels } = useDishOrdering(currency);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {items.map((item) => (
          <DishCard
            key={item.id}
            href={getPathname({ locale, href: dishHref(category.slug, item.slug) })}
            image={{ src: item.images[0]?.url ?? '', alt: dishImageAlt(item, locale) }}
            name={item.name}
            description={item.description ?? undefined}
            price={{ amount: item.basePrice, currency }}
            grams={item.grams}
            formatWeight={(g) => t('weight', { grams: g })}
            flags={itemFlagsOf(item) as never}
            flagLabels={flagLabels}
            soldOutLabel={t('soldOutToday')}
            unavailable={!item.isAvailable}
            // Card click opens the dish page; the + button orders.
            onAdd={() => quickAdd(item)}
          />
        ))}
      </div>
      {sheet}
    </>
  );
}
