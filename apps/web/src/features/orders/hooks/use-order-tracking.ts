'use client';

import { getRealtimeClient } from '@/lib/realtime-client';
import type { OrderDto, OrderStatusChangedEvent } from '@repo/types';
import { ROOMS } from '@repo/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { orderQueryKeys } from '../query-keys';
import { useOrder } from './use-order';

/**
 * Subscribes to `order:{orderId}` and patches the TanStack Query cache when
 * a status_changed event arrives. Returns the live order via `useOrder`.
 */
export function useOrderTracking(orderId: string, token?: string | null) {
  const qc = useQueryClient();
  const query = useOrder(orderId, token);

  useEffect(() => {
    if (!orderId) return;
    const client = getRealtimeClient();
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        await client.connect();
        await client.subscribe(ROOMS.order(orderId));
        if (!mounted) return;
        unsubscribe = client.on('order.status_changed', (event: OrderStatusChangedEvent) => {
          if (event.orderId !== orderId) return;
          qc.setQueryData<OrderDto>(orderQueryKeys.detail(orderId), (prev) =>
            prev ? { ...prev, status: event.to } : prev,
          );
        });
      } catch {
        // Guest orders + auth-less sessions can't authenticate the socket; the
        // confirmation page still works via the cached order. Swallow so the
        // rejection doesn't surface as an unhandled error.
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
      // Don't disconnect the singleton — other consumers may still need it.
      client.unsubscribe(ROOMS.order(orderId)).catch(() => {});
    };
  }, [orderId, qc]);

  return query;
}
