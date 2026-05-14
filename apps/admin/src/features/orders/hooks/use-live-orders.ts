'use client';

import { getRealtimeClient } from '@/lib/realtime-client';
import type {
  OrderCreatedEvent,
  OrderListDto,
  OrderListItemDto,
  OrderStatusChangedEvent,
} from '@repo/types';
import { ROOMS } from '@repo/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { orderQueryKeys } from '../query-keys';
import { useOrders } from './use-orders';

/**
 * Live orders list for a restaurant. Subscribes to `restaurant:{id}:orders`
 * and prepends newly created orders (with a transient `isNew: true` flag for
 * 3s) and patches statuses on existing rows.
 */
export function useLiveOrders(restaurantId: string) {
  const qc = useQueryClient();
  const query = useOrders();

  useEffect(() => {
    if (!restaurantId) return;
    const client = getRealtimeClient();
    let unsubCreated: (() => void) | undefined;
    let unsubStatus: (() => void) | undefined;
    let mounted = true;

    (async () => {
      await client.connect();
      await client.subscribe(ROOMS.restaurantOrders(restaurantId));
      if (!mounted) return;

      unsubCreated = client.on('order.created', (event: OrderCreatedEvent) => {
        qc.setQueryData<OrderListDto>(orderQueryKeys.list(), (prev) => {
          if (!prev) return prev;
          const newItem: OrderListItemDto = {
            id: event.orderId,
            orderNumber: event.orderNumber,
            restaurantId: event.restaurantId,
            status: event.status,
            type: event.type,
            grandTotal: event.grandTotal,
            currency: event.currency,
            itemCount: event.itemCount,
            customerName: event.customerName,
            createdAt: event.createdAt,
          };
          return { ...prev, items: [newItem, ...prev.items] };
        });
      });

      unsubStatus = client.on('order.status_changed', (event: OrderStatusChangedEvent) => {
        qc.setQueryData<OrderListDto>(orderQueryKeys.list(), (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((it) =>
              it.id === event.orderId ? { ...it, status: event.to } : it,
            ),
          };
        });
      });
    })();

    return () => {
      mounted = false;
      unsubCreated?.();
      unsubStatus?.();
      client.unsubscribe(ROOMS.restaurantOrders(restaurantId)).catch(() => {});
    };
  }, [restaurantId, qc]);

  return query;
}
