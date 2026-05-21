import OrdersPage from '@/app/(dashboard)/orders/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Stub the realtime client — tests don't run a Socket.IO server and the
// disconnect during teardown raises an unhandled rejection otherwise.
vi.mock('@/lib/realtime-client', () => ({
  getRealtimeClient: () => ({
    connect: async () => {},
    subscribe: async () => {},
    unsubscribe: async () => {},
    on: () => () => {},
    status: () => 'connected',
  }),
}));

const ordersPayload = {
  items: [
    {
      id: 'ord_1',
      orderNumber: 'R-2026-001',
      status: 'CONFIRMED',
      type: 'PICKUP',
      grandTotal: '42.50',
      currency: 'USD',
      itemCount: 3,
      customerName: 'Alice Buyer',
      createdAt: '2026-05-15T10:00:00.000Z',
    },
    {
      id: 'ord_2',
      orderNumber: 'R-2026-002',
      status: 'PREPARING',
      type: 'DELIVERY',
      grandTotal: '120.00',
      currency: 'USD',
      itemCount: 1,
      customerName: null,
      createdAt: '2026-05-15T11:00:00.000Z',
    },
  ],
  nextCursor: null,
};

afterEach(() => resetTestState());

describe('OrdersPage', () => {
  it('renders rows with order number, status, type, formatted total', async () => {
    server.use(http.get(/\/orders/, () => HttpResponse.json(ordersPayload)));

    const { container } = renderPage(<OrdersPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('R-2026-001')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('R-2026-001');
    expect(text).toContain('R-2026-002');
    expect(text).toContain('Alice Buyer');
    expect(text).toContain('Guest'); // customerName null falls back to "Guest"
    // formatMoney 2dp via carry-over fix #7
    expect(text).toMatch(/42\.50/);
    expect(text).toMatch(/120\.00/);
    // Plural — "1 item" singular, "3 items" plural (carry-over fix #3)
    expect(text).toMatch(/3 items/);
    expect(text).toMatch(/1 item(?!s)/);
  });
});
