import DashboardPage from '@/app/[locale]/(dashboard)/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const overview = {
  revenue: { value: '1250.50', delta: '120.00', deltaPercent: 10.6 },
  orders: { value: 42, delta: 6, deltaPercent: 16.7 },
  aov: { value: '29.77', delta: '1.50', deltaPercent: 5.3 },
  completionRate: { value: 0.92, delta: 0.04 },
  newCustomers: { value: 8, delta: 3 },
  repeatRate: { value: 0.38 },
  avgPrepMinutes: { value: 14 },
  liveOrdersCount: 5,
};

afterEach(() => resetTestState());

describe('DashboardPage (Overview)', () => {
  it('renders KPI cards backed by the analytics overview endpoint', async () => {
    server.use(
      http.get(/\/analytics\/overview/, () => HttpResponse.json(overview)),
      http.get(/\/analytics\/revenue-timeseries/, () => HttpResponse.json([])),
      http.get(/\/analytics\/top-items/, () => HttpResponse.json([])),
      http.get(/\/analytics\/orders-by-status/, () => HttpResponse.json([])),
      http.get(/\/orders/, () => HttpResponse.json({ items: [], nextCursor: null })),
    );

    const { container } = renderPage(<DashboardPage />);

    await waitFor(() => {
      const text = container.textContent ?? '';
      // formatMoney 2dp surface — verifies carry-over fix #7
      expect(text).toMatch(/1,250\.50|1[ .]250[,.]50/);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('42');
    expect(text).toMatch(/29\.77|29,77/);
  });
});
