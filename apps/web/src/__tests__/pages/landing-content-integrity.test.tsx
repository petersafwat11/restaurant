/**
 * Phase H1/H2 — production content integrity for the landing sections.
 *
 * Asserts the featured-dishes section renders ONLY live, server-fetched
 * content and hides itself when there is none — no mock fallback. Also
 * asserts the menu query is locale-driven (H2: `/en` requests
 * `?locale=en` and renders the EN payload).
 *
 * Mirrors the MSW + provider harness from `public-tracking-app.test.tsx`.
 * Remember: the test server runs with `onUnhandledRequest: 'error'`, so every
 * rendered component's API calls need a handler.
 */
import { LandingFeaturedDishes } from '@/features/landing/sections/featured-dishes';
import { server } from '@/test/setup';
import { loadMessages } from '@repo/i18n';
import type { MenuItemDto, MenuTreeDto } from '@repo/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

const API = 'http://localhost:4000/api/v1';

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

function menuHandler(tree: MenuTreeDto, onUrl?: (url: URL) => void) {
  return http.get(`${API}/menu`, ({ request }) => {
    if (onUrl) onUrl(new URL(request.url));
    return HttpResponse.json(tree);
  });
}

describe('LandingFeaturedDishes (H1 — live or hidden, no mock fallback)', () => {
  it('renders live featured dishes from the menu tree', async () => {
    server.use(
      menuHandler(
        treeWith([
          makeItem({ id: 'shawarma-plate', name: 'Shawarma Plate', isFeatured: true }),
          makeItem({ id: 'house-fries', name: 'House Fries', isFeatured: false }),
        ]),
      ),
    );
    render(withProviders(<LandingFeaturedDishes />));

    await waitFor(() => expect(screen.getByText('Shawarma Plate')).toBeTruthy());
    // Non-featured item must not appear in the featured strip.
    expect(screen.queryByText('House Fries')).toBeNull();
    // And no mock dish leaked in.
    for (const re of MOCK_DISH_STRINGS) expect(screen.queryByText(re)).toBeNull();
  });

  it('hides the section entirely when no dish is featured (no mock fallback)', async () => {
    server.use(
      menuHandler(
        treeWith([makeItem({ id: 'house-fries', name: 'House Fries', isFeatured: false })]),
      ),
    );
    const { container } = render(withProviders(<LandingFeaturedDishes />));

    // Give the query a tick to resolve, then assert nothing rendered.
    await waitFor(() => expect(screen.queryByText('House Fries')).toBeNull());
    expect(container.querySelector('section')).toBeNull();
    for (const re of MOCK_DISH_STRINGS) expect(screen.queryByText(re)).toBeNull();
    // The mock price (24,00 zł from the fixtures) must not appear either.
    expect(screen.queryByText(/24,00/)).toBeNull();
  });

  it('requests the menu in the active locale (H2: /en → ?locale=en)', async () => {
    let seenLocale: string | null = null;
    server.use(
      menuHandler(
        treeWith([
          makeItem({ id: 'shawarma-plate', name: 'Shawarma Plate (EN)', isFeatured: true }),
        ]),
        (url) => {
          seenLocale = url.searchParams.get('locale');
        },
      ),
    );
    render(withProviders(<LandingFeaturedDishes />, 'en'));

    await waitFor(() => expect(screen.getByText('Shawarma Plate (EN)')).toBeTruthy());
    expect(seenLocale).toBe('en');
  });
});
