'use client';

import { useAddToCart } from '@/features/cart/hooks';
import { dishImageAlt } from '@/features/menu/lib/dish-facts';
import { ALLERGENS, type AllergenKey, type MenuItemDto, type ModifierGroupDto } from '@repo/types';
import {
  type DishDetail,
  ItemDetailSheet,
  type ModifierGroupShape,
  type NewCartLine,
} from '@repo/ui';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

export type OrderableItem = MenuItemDto & { modifierGroups: ModifierGroupDto[] };

export { PREFERRED_ORDER_TYPE_KEY } from '@/features/menu/lib/order-preference';

export function itemFlagsOf(item: MenuItemDto): string[] {
  const flags: string[] = [];
  if (item.isVegetarian) flags.push('vegetarian');
  if (item.isVegan) flags.push('vegan');
  if (item.isGlutenFree) flags.push('gluten-free');
  if (item.spiceLevel >= 2) flags.push('spicy');
  if (item.isFeatured) flags.push('featured');
  return flags;
}

function adaptModifierGroup(g: ModifierGroupDto): ModifierGroupShape {
  return {
    id: g.id,
    name: g.name,
    required: g.isRequired,
    min: g.minSelect,
    max: g.maxSelect === 0 ? 99 : g.maxSelect,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceDelta: o.priceDelta,
      grams: o.grams,
      default: o.isDefault,
    })),
  };
}

function adaptToDishDetail(
  item: OrderableItem,
  currency: string,
  allergenLabels: Record<AllergenKey, string>,
  locale: string,
): DishDetail {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    longDescription: item.description ?? undefined,
    basePrice: item.basePrice,
    currency,
    image: {
      src: item.images[0]?.url ?? '',
      alt: dishImageAlt(item, locale),
    },
    prepMinutes: item.prepMinutes ?? undefined,
    calories: item.calories ?? undefined,
    grams: item.grams ?? undefined,
    allergens: item.allergens.map((a) => allergenLabels[a]),
    flags: itemFlagsOf(item) as DishDetail['flags'],
    modifierGroups: item.modifierGroups.map(adaptModifierGroup),
    unavailable: !item.isAvailable,
  };
}

/**
 * Shared "add this dish to the cart" behaviour for the menu, category and
 * dish pages: items with modifier groups open the detail sheet (size, meat,
 * sauce…), plain items are added directly. Render `sheet` once per page.
 */
export function useDishOrdering(currency = 'PLN') {
  const t = useTranslations('web.shop.menu');
  const locale = useLocale();
  const addMutation = useAddToCart();
  const [sheetItem, setSheetItem] = React.useState<DishDetail | null>(null);

  const allergenLabels = React.useMemo(
    () =>
      Object.fromEntries(
        ALLERGENS.map((a) => [a, t(`allergen.${a}` as 'allergen.gluten')]),
      ) as Record<AllergenKey, string>,
    [t],
  );

  const sheetLabels = React.useMemo(
    () => ({
      closeAriaLabel: t('sheet.close'),
      allergensLabel: t('sheet.allergens'),
      allergenNote: t('sheet.allergenNote'),
      specialInstructionsLabel: t('sheet.specialInstructions'),
      specialInstructionsPlaceholder: t('sheet.specialInstructionsPlaceholder'),
      quantityLabel: t('sheet.quantity'),
      totalLabel: t('sheet.total'),
      soldOut: t('sheet.soldOut'),
      addToCart: t('addToCart'),
      formatMinChoice: (min: number) => t('sheet.minChoice', { min }),
      formatChoose: (names: string[]) => t('sheet.chooseGroups', { names: names.join(', ') }),
    }),
    [t],
  );

  const flagLabels = React.useMemo(
    () => ({
      vegetarian: t('chips.vegetarian'),
      vegan: t('chips.vegan'),
      'gluten-free': t('chips.glutenFree'),
      spicy: t('chips.spicy'),
      featured: t('chips.featured'),
    }),
    [t],
  );

  const openDish = React.useCallback(
    (item: OrderableItem) => {
      setSheetItem(adaptToDishDetail(item, currency, allergenLabels, locale));
    },
    [currency, allergenLabels, locale],
  );

  /** Quick add: opens the sheet when choices are needed, otherwise adds 1. */
  const quickAdd = React.useCallback(
    (item: OrderableItem) => {
      if (!item.isAvailable) return;
      if (item.modifierGroups.length > 0) {
        openDish(item);
        return;
      }
      addMutation.mutate({ menuItemId: item.id, quantity: 1, modifierSelections: [] });
    },
    [addMutation, openDish],
  );

  const handleSheetAdd = React.useCallback(
    (line: NewCartLine) => {
      const grouped = new Map<string, string[]>();
      for (const m of line.modifiers) {
        const arr = grouped.get(m.groupId) ?? [];
        arr.push(m.optionId);
        grouped.set(m.groupId, arr);
      }
      addMutation.mutate({
        menuItemId: line.itemId,
        quantity: line.quantity,
        modifierSelections: Array.from(grouped.entries()).map(([groupId, optionIds]) => ({
          groupId,
          optionIds,
        })),
        notes: line.notes,
      });
      toast.success(t('toastAdded.title'), {
        description: t('toastAdded.description', { quantity: line.quantity, name: line.name }),
      });
    },
    [addMutation, t],
  );

  const sheet = (
    <ItemDetailSheet
      open={sheetItem !== null}
      onOpenChange={(o) => !o && setSheetItem(null)}
      item={sheetItem}
      onAddToCart={handleSheetAdd}
      labels={sheetLabels}
      flagLabels={flagLabels}
    />
  );

  return { openDish, quickAdd, sheet, flagLabels, allergenLabels };
}
