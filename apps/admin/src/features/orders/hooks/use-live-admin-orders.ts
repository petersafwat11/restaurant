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
import * as React from 'react';
import { orderQueryKeys } from '../query-keys';
import { type AdminOrderFilters } from './use-admin-orders';

interface LiveAdminOrdersResult {
  /** Count of orders that arrived in the last 5 minutes via realtime. */
  newCount: number;
  resetNewCount: () => void;
}

/**
 * Subscribes to the global orders room and patches the cache for the admin
 * orders list — newly created orders are prepended with `isNew: true`, status
 * changes update in place.
 *
 * Returns a `newCount` (decays over 5 minutes per arrival) so the Topbar live
 * pulse can show "N new in last 5 min".
 */
export function useLiveAdminOrders(filters: AdminOrderFilters): LiveAdminOrdersResult {
  const qc = useQueryClient();
  const [newCount, setNewCount] = React.useState(0);
  const arrivalTimers = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  React.useEffect(() => {
    const client = getRealtimeClient();
    let mounted = true;
    let unsubCreated: (() => void) | undefined;
    let unsubStatus: (() => void) | undefined;

    (async () => {
      await client.connect();
      await client.subscribe(ROOMS.orders);
      if (!mounted) return;

      unsubCreated = client.on('order.created', (event: OrderCreatedEvent) => {
        qc.setQueryData<OrderListDto>(orderQueryKeys.adminList(filters), (prev) => {
          if (!prev) return prev;
          const item: OrderListItemDto = {
            id: event.orderId,
            orderNumber: event.orderNumber,
            status: event.status,
            type: event.type,
            grandTotal: event.grandTotal,
            currency: event.currency,
            itemCount: event.itemCount,
            customerName: event.customerName,
            createdAt: event.createdAt,
          };
          return { ...prev, items: [item, ...prev.items] };
        });
        setNewCount((c) => c + 1);
        // decay one count after 5 minutes
        const t = setTimeout(() => {
          setNewCount((c) => Math.max(0, c - 1));
          arrivalTimers.current.delete(t);
        }, 5 * 60_000);
        arrivalTimers.current.add(t);
      });

      unsubStatus = client.on('order.status_changed', (event: OrderStatusChangedEvent) => {
        qc.setQueryData<OrderListDto>(orderQueryKeys.adminList(filters), (prev) => {
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
      // biome-ignore lint/complexity/noForEach: Set iteration
      arrivalTimers.current.forEach((t) => clearTimeout(t));
      arrivalTimers.current.clear();
      client.unsubscribe(ROOMS.orders).catch(() => {});
    };
  }, [qc, filters]);

  const resetNewCount = React.useCallback(() => setNewCount(0), []);
  return { newCount, resetNewCount };
}
