import { renderHookWithProviders } from '@/test/render-hook';
import { server } from '@/test/setup';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useDashboardOverview } from '../use-dashboard-overview';

const API = 'http://localhost:4000/api/v1';

const overviewPayload = {
  revenue: { value: '120.00', delta: '20.00', deltaPercent: 20 },
  orders: { value: 5, delta: 1, deltaPercent: 25 },
  aov: { value: '24.00', delta: '0.00', deltaPercent: 0 },
  completionRate: { value: 0.8, delta: 0.1 },
  newCustomers: { value: 2, delta: 1 },
  repeatRate: { value: 0.4 },
  avgPrepMinutes: { value: 12 },
  liveOrdersCount: 3,
};

describe('useDashboardOverview', () => {
  it('composes analytics + recent orders into one ergonomic shape', async () => {
    server.use(
      http.get(`${API}/analytics/overview`, () => HttpResponse.json(overviewPayload)),
      http.get(`${API}/analytics/revenue-timeseries`, () => HttpResponse.json([])),
      http.get(`${API}/analytics/top-items`, () => HttpResponse.json([])),
      http.get(`${API}/analytics/orders-by-status`, () => HttpResponse.json([])),
      http.get(`${API}/orders`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'ord_recent_1',
              orderNumber: 'R-2026-000009',
              restaurantId: 'rest_1',
              status: 'CONFIRMED',
              type: 'PICKUP',
              grandTotal: '24.00',
              currency: 'PLN',
              itemCount: 2,
              customerName: 'Recent Customer',
              createdAt: '2026-05-15T10:00:00.000Z',
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    const { result } = renderHookWithProviders(() => useDashboardOverview('rest_1', 'today'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.overview.data?.liveOrdersCount).toBe(3);
    expect(result.current.overview.data?.revenue.value).toBe('120.00');
    expect(result.current.recentOrders.data?.items).toHaveLength(1);
    expect(result.current.recentOrders.data?.items[0]?.id).toBe('ord_recent_1');
  });
});
