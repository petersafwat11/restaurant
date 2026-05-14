import { renderHookWithProviders } from '@/test/render-hook';
import { server } from '@/test/setup';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useCreateMenuItem } from '../use-create-menu-item';

const API = 'http://localhost:4000/api/v1';
const RESTAURANT_ID = 'rest_1';

const sampleInput = {
  categoryId: 'cat_1',
  name: 'Test Item',
  slug: 'test-item',
  basePrice: '12.50',
};

const sampleItem = {
  id: 'item_1',
  categoryId: 'cat_1',
  name: 'Test Item',
  slug: 'test-item',
  description: null,
  basePrice: '12.50',
  compareAt: null,
  calories: null,
  prepMinutes: null,
  isAvailable: true,
  isFeatured: false,
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  spiceLevel: 0,
  position: 0,
  images: [],
};

describe('useCreateMenuItem', () => {
  it('returns the created item on success', async () => {
    server.use(http.post(`${API}/menu/items`, () => HttpResponse.json(sampleItem)));

    const { result } = renderHookWithProviders(() => useCreateMenuItem(RESTAURANT_ID));
    result.current.mutate(sampleInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('item_1');
    expect(result.current.data?.basePrice).toBe('12.50');
  });

  it('surfaces an ApiError on 422 validation failure', async () => {
    server.use(
      http.post(`${API}/menu/items`, () =>
        HttpResponse.json(
          {
            statusCode: 422,
            message: 'Validation failed',
            error: 'Unprocessable Entity',
            timestamp: '',
          },
          { status: 422 },
        ),
      ),
    );

    const { result } = renderHookWithProviders(() => useCreateMenuItem(RESTAURANT_ID));
    result.current.mutate(sampleInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as { status?: number } | null;
    expect(err?.status).toBe(422);
  });
});
