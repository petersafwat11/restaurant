import { renderHookWithProviders } from '@/test/render-hook';
import { server } from '@/test/setup';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useSetDefaultAddress } from '../use-set-default-address';

const API = 'http://localhost:4000/api/v1';

describe('useSetDefaultAddress', () => {
  it('returns the updated address on success', async () => {
    server.use(
      http.post(`${API}/addresses/a1/default`, () =>
        HttpResponse.json({
          id: 'a1',
          userId: 'u1',
          label: null,
          line1: '1 St',
          line2: null,
          city: 'X',
          state: null,
          country: 'US',
          geoPoint: { lat: 0, lng: 0 },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
    );

    const { result } = renderHookWithProviders(() => useSetDefaultAddress());
    result.current.mutate('a1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.isDefault).toBe(true);
  });
});
