'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OrderDto, OrderStatus } from '@repo/types';
import { STATUS_TOKENS } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../../orders/query-keys';
import { kitchenQueryKeys } from '../query-keys';

/**
 * Forward-only KDS progression. A ticket enters the feed at CONFIRMED and
 * leaves it once it reaches READY (server emits `kitchen.ticket_removed`).
 */
const NEXT_KDS_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
};

export function nextKitchenStatus(current: OrderStatus): OrderStatus | null {
  return NEXT_KDS_STATUS[current] ?? null;
}

/**
 * KDS "tap to advance" — moves a ticket to its next kitchen status via the
 * shared `POST /orders/:id/status` state-machine endpoint (kitchen role is
 * permitted CONFIRMED→PREPARING→READY server-side).
 */
export function useAdvanceKitchenTicket() {
  const qc = useQueryClient();
  return useMutation<OrderDto, ApiError, { orderId: string; current: OrderStatus }>({
    mutationFn: async ({ orderId, current }) => {
      const to = nextKitchenStatus(current);
      if (!to) throw new Error(`No further kitchen step from ${current}`);
      return getApiClient().orders.updateStatus(orderId, { to });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: kitchenQueryKeys.feed() });
      qc.invalidateQueries({ queryKey: orderQueryKeys.detail(data.id) });
      notify(
        'success',
        `Ticket #${data.orderNumber} → ${STATUS_TOKENS[data.status]?.label ?? data.status}`,
      );
    },
    onError: (err) => notify('error', err.message),
  });
}
