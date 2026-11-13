/**
 * Phase H1/H2 — production content integrity for the landing sections.
 *
 * The featured-dishes section is a Server Component rendered from the menu
 * tree the page fetched with `fetchMenuTree(locale)` (locale-driven, H2).
 * Asserts the selection is ONLY live content and is empty when nothing is
 * featured — no mock fallback (the section then renders nothing) — and that
 * the client card island renders the live dish and its quick-add button.
 */
import { FeaturedDishCard } from '@/features/landing/sections/featured-dish-card';
import { selectFeaturedDishes } from '@/features/landing/sections/featured-dishes';
import { loadMessages } from '@repo/i18n';
import type { MenuItemDto, MenuTreeDto } from '@repo/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

// Strings that only ever appeared in the removed Szef Donald mock fixtures.
// If any of these surface in rendered output, a mock fallback has regressed.
const MOCK_DISH_STRINGS = [/Kapsalon/i, /Falafel Pita Du/i, /Box Strips Mega/i];

function withProviders(ui: React.ReactNode, locale: 'pl' | 'en' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale={locale}
        messages={loadMessages(locale)}
        timeZone="Europe/Warsaw"
      >
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function makeItem(overrides: Partial<MenuItemDto> & { id: string; name: string }): MenuItemDto {
  return {
    categoryId: 'cat_1',
    slug: overrides.id,
    description: null,
    basePrice: '24.00',
    compareAt: null,
    calories: null,
    prepMinutes: null,
    grams: null,
    allergens: [],
    isAvailable: true,
    isFeatured: false,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    spiceLevel: 0,
    position: 0,
    images: [],
    ...overrides,
  };
}

function treeWith(items: MenuItemDto[]): MenuTreeDto {
  return {
    categories: [
      {
        id: 'cat_1',
        name: 'Kebab',
        slug: 'kebab',
        description: null,
        imageUrl: null,
        position: 0,
        isActive: true,
        items: items.map((i) => ({ ...i, modifierGroups: [] })),
      },
    ],
  };
}

describe('Landing featured dishes (H1 — live or hidden, no mock fallback)', () => {
  it('selects only live featured dishes from the menu tree', () => {
    const items = selectFeaturedDishes(
      treeWith([
        makeItem({ id: 'shawarma-plate', name: 'Shawarma Plate', isFeatured: true }),
        makeItem({ id: 'house-fries', name: 'House Fries', isFeatured: false }),
      ]),
      'en',
    );
    expect(items.map((i) => i.name)).toEqual(['Shawarma Plate']);
    expect(items[0]?.href).toBe('/en/menu/kebab/shawarma-plate');
    for (const re of MOCK_DISH_STRINGS) expect(items.some((i) => re.test(i.name))).toBe(false);
  });

  it('selects nothing when no dish is featured or the menu is unavailable', () => {
    expect(
      selectFeaturedDishes(
        treeWith([makeItem({ id: 'house-fries', name: 'House Fries', isFeatured: false })]),
        'pl',
      ),
    ).toEqual([]);
    expect(selectFeaturedDishes(null, 'pl')).toEqual([]);
  });

  it('renders the live dish card with its quick-add button', () => {
    const [dish] = selectFeaturedDishes(
      treeWith([makeItem({ id: 'shawarma-plate', name: 'Shawarma Plate (EN)', isFeatured: true })]),
      'en',
    );
    if (!dish) throw new Error('expected a featured dish');
    render(
      withProviders(
        <FeaturedDishCard
          menuItemId={dish.id}
          href={dish.href}
          image={dish.image}
          name={dish.name}
          price={dish.price}
          flags={dish.flags}
          addAriaLabel="Add Shawarma Plate (EN) to cart"
        />,
      ),
    );
    expect(screen.getByText('Shawarma Plate (EN)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Shawarma Plate (EN) to cart' })).toBeTruthy();
    for (const re of MOCK_DISH_STRINGS) expect(screen.queryByText(re)).toBeNull();
  });
});
