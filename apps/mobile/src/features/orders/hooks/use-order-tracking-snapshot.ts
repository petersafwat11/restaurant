import { getApiClient } from '@/lib/api-client';
import { getRealtimeClient } from '@/lib/realtime-client';
import type { OrderStatusChangedEvent, OrderTrackingDto } from '@repo/types';
import { ROOMS } from '@repo/types';
import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { orderQueryKeys } from '../query-keys';

/**
 * Tracking snapshot for the map/ETA screen: status timeline + ETA + geo. The
 * socket still drives live status; when it flips we refetch the snapshot so the
 * ETA/timeline recompute server-side.
 */
export function useOrderTrackingSnapshot(orderId: string): UseQueryResult<OrderTrackingDto> {
  const qc = useQueryClient();
  const query = useQuery<OrderTrackingDto>({
    queryKey: orderQueryKeys.tracking(orderId),
    queryFn: () => getApiClient().orders.getTracking(orderId),
    enabled: Boolean(orderId),
  });

  useEffect(() => {
    if (!orderId) return;
    const client = getRealtimeClient();
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    (async () => {
      await client.connect();
      await client.subscribe(ROOMS.order(orderId));
      if (!mounted) return;
      unsubscribe = client.on('order.status_changed', (event: OrderStatusChangedEvent) => {
        if (event.orderId !== orderId) return;
        qc.invalidateQueries({ queryKey: orderQueryKeys.tracking(orderId) });
      });
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
      client.unsubscribe(ROOMS.order(orderId)).catch(() => {});
    };
  }, [orderId, qc]);

  return query;
}
