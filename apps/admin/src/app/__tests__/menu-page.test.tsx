import MenuPage from '@/app/[locale]/(dashboard)/menu/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const menuTree = {
  categories: [
    {
      id: 'cat_1',
      name: 'Burgers',
      slug: 'burgers',
      description: null,
      imageUrl: null,
      position: 0,
      isActive: true,
      items: [
        {
          id: 'item_1',
          categoryId: 'cat_1',
          name: 'Classic Burger',
          slug: 'classic-burger',
          description: 'Beef patty, lettuce, tomato',
          basePrice: '12.99',
          compareAt: null,
          calories: 650,
          prepMinutes: 10,
          isAvailable: true,
          isFeatured: true,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          spiceLevel: 1,
          position: 0,
          images: [],
          modifierGroups: [],
        },
      ],
    },
    {
      id: 'cat_2',
      name: 'Sides',
      slug: 'sides',
      description: null,
      imageUrl: null,
      position: 1,
      isActive: true,
      items: [],
    },
  ],
};

afterEach(() => resetTestState());

describe('MenuPage', () => {
  it('renders both category panes and the first category items', async () => {
    server.use(http.get(/\/menu$/, () => HttpResponse.json(menuTree)));

    const { container } = renderPage(<MenuPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('Burgers')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Burgers');
    expect(text).toContain('Sides');
    expect(text).toContain('Classic Burger');
    expect(text).toMatch(/12\.99/);
  });

  it('blocks the page when menu:read is missing', () => {
    renderPage(<MenuPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
