import { renderHookWithProviders } from '@/test/render-hook';
import { server } from '@/test/setup';
import type { OrderCreatedEvent, OrderListDto, RealtimeEventName } from '@repo/types';
import { ROOMS } from '@repo/types';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const API = 'http://localhost:4000/api/v1';

// Mock the realtime client. We capture handlers passed to `on()` so we can
// drive event delivery from the test deterministically.
type Handler = (payload: unknown) => void;
const handlers = new Map<string, Handler>();

vi.mock('@/lib/realtime-client', () => ({
  getRealtimeClient: () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    subscribe: vi.fn().mockResolvedValue({ ok: true, room: 'orders' }),
    unsubscribe: vi.fn().mockResolvedValue({ ok: true, room: 'orders' }),
    on: (event: RealtimeEventName, handler: Handler) => {
      handlers.set(event, handler);
      return () => handlers.delete(event);
    },
    status: () => 'connected' as const,
  }),
}));

// Seed list contains one existing row so we can verify prepending works
// against an already-populated cache (avoids the "prev is undefined" branch
// inside the hook).
const seededList: OrderListDto = {
  items: [
    {
      id: 'ord_seed_1',
      orderNumber: 'R-2026-000001',
      status: 'PENDING',
      type: 'PICKUP',
      grandTotal: '10.00',
      currency: 'PLN',
      itemCount: 1,
      customerName: 'Seed Customer',
      createdAt: '2026-05-15T10:00:00.000Z',
    },
  ],
  nextCursor: null,
};

beforeEach(() => {
  handlers.clear();
  server.use(http.get(`${API}/orders`, () => HttpResponse.json(seededList)));
});

describe('useLiveOrders', () => {
  it('prepends an order.created event with the type from the payload (no PICKUP placeholder)', async () => {
    const { useLiveOrders } = await import('../use-live-orders');
    const { result } = renderHookWithProviders(() => useLiveOrders());

    // Wait until the seeded list lands in cache and the subscription is up.
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.items).toHaveLength(1);
      expect(handlers.has('order.created')).toBe(true);
    });

    const event: OrderCreatedEvent = {
      orderId: 'ord_live_2',
      orderNumber: 'R-2026-000002',
      userId: 'usr_1',
      status: 'PENDING',
      type: 'DELIVERY',
      grandTotal: '42.50',
      currency: 'PLN',
      itemCount: 3,
      customerName: 'Anna K.',
      createdAt: '2026-05-15T11:00:00.000Z',
    };
    handlers.get('order.created')?.(event);

    await waitFor(() => {
      expect(result.current.data?.items).toHaveLength(2);
    });
    const injected = result.current.data?.items[0];
    expect(injected?.id).toBe('ord_live_2');
    expect(injected?.type).toBe('DELIVERY');
    expect(injected?.itemCount).toBe(3);
    expect(injected?.customerName).toBe('Anna K.');

    // Defensive: confirm the room constant hasn't shifted under us.
    expect(ROOMS.orders).toBe('orders');
  });
});
