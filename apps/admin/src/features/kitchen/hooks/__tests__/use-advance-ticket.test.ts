import { renderHookWithProviders } from '@/test/render-hook';
import { server } from '@/test/setup';
import type { OrderDto } from '@repo/types';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { nextKitchenStatus, useAdvanceKitchenTicket } from '../use-advance-ticket';

const API = 'http://localhost:4000/api/v1';

function orderStub(status: OrderDto['status']): OrderDto {
  return {
    id: 'ord_1',
    orderNumber: 'R-2026-000001',
    userId: 'usr_1',
    restaurantId: 'rest_1',
    type: 'PICKUP',
    status,
    subtotal: '10.00',
    taxTotal: '0.80',
    deliveryFee: '0.00',
    tipAmount: '0.00',
    discountTotal: '0.00',
    grandTotal: '10.80',
    currency: 'PLN',
    deliveryAddress: null,
    pickupAt: null,
    notes: null,
    couponCode: null,
    items: [],
    statusEvents: [],
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  };
}

describe('nextKitchenStatus', () => {
  it('progresses CONFIRMED → PREPARING → READY then stops', () => {
    expect(nextKitchenStatus('CONFIRMED')).toBe('PREPARING');
    expect(nextKitchenStatus('PREPARING')).toBe('READY');
    expect(nextKitchenStatus('READY')).toBeNull();
    expect(nextKitchenStatus('PENDING')).toBeNull();
    expect(nextKitchenStatus('COMPLETED')).toBeNull();
  });
});

describe('useAdvanceKitchenTicket', () => {
  it('POSTs the computed next status for the ticket', async () => {
    let receivedBody: { to?: string } = {};
    server.use(
      http.post(`${API}/orders/ord_1/status`, async ({ request }) => {
        receivedBody = (await request.json()) as { to?: string };
        return HttpResponse.json(orderStub('PREPARING'));
      }),
    );

    const { result } = renderHookWithProviders(() => useAdvanceKitchenTicket('rest_1'));
    result.current.mutate({ orderId: 'ord_1', current: 'CONFIRMED' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(receivedBody.to).toBe('PREPARING');
    expect(result.current.data?.status).toBe('PREPARING');
  });

  it('errors without calling the API when the ticket has no next step', async () => {
    const { result } = renderHookWithProviders(() => useAdvanceKitchenTicket('rest_1'));
    result.current.mutate({ orderId: 'ord_1', current: 'READY' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
