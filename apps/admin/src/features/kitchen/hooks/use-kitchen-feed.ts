'use client';

import { getApiClient } from '@/lib/api-client';
import { getRealtimeClient } from '@/lib/realtime-client';
import type { KitchenTicketDto, KitchenTicketEvent } from '@repo/types';
import { ROOMS } from '@repo/types';
import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { kitchenQueryKeys } from '../query-keys';

/**
 * KDS data source: initial GET /kitchen/tickets + live patches via
 * `restaurant:{id}:kitchen` socket events.
 */
export function useKitchenFeed(restaurantId: string): UseQueryResult<KitchenTicketDto[]> {
  const qc = useQueryClient();
  const query = useQuery<KitchenTicketDto[]>({
    queryKey: kitchenQueryKeys.feed(restaurantId),
    queryFn: () => getApiClient().kitchen.tickets(restaurantId),
    enabled: Boolean(restaurantId),
  });

  useEffect(() => {
    if (!restaurantId) return;
    const client = getRealtimeClient();
    let unsubAdded: (() => void) | undefined;
    let unsubRemoved: (() => void) | undefined;
    let mounted = true;

    (async () => {
      await client.connect();
      await client.subscribe(ROOMS.restaurantKitchen(restaurantId));
      if (!mounted) return;

      unsubAdded = client.on('kitchen.ticket_added', (event: KitchenTicketEvent) => {
        qc.setQueryData<KitchenTicketDto[]>(kitchenQueryKeys.feed(restaurantId), (prev) => {
          if (!prev) return prev;
          if (prev.some((t) => t.orderId === event.orderId)) return prev;
          return [
            ...prev,
            {
              orderId: event.orderId,
              orderNumber: event.orderNumber,
              status: event.status,
              confirmedAt: new Date().toISOString(),
              items: [],
            },
          ];
        });
      });

      unsubRemoved = client.on('kitchen.ticket_removed', (event: KitchenTicketEvent) => {
        qc.setQueryData<KitchenTicketDto[]>(kitchenQueryKeys.feed(restaurantId), (prev) => {
          if (!prev) return prev;
          return prev.filter((t) => t.orderId !== event.orderId);
        });
      });
    })();

    return () => {
      mounted = false;
      unsubAdded?.();
      unsubRemoved?.();
      client.unsubscribe(ROOMS.restaurantKitchen(restaurantId)).catch(() => {});
    };
  }, [restaurantId, qc]);

  return query;
}
