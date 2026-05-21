'use client';

import { getApiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

/**
 * Token-authenticated public tracking — used by `/orders/[orderId]?token=…`
 * deep links sent in confirmation emails. No auth header is sent; the backend
 * verifies the HMAC over (orderId, exp).
 */
export function usePublicOrderTracking(token: string | null | undefined) {
  return useQuery({
    queryKey: ['orders', 'public-tracking', token] as const,
    // `enabled` below gates execution on token being truthy, so the assertion
    // narrows nullable → string for the API call signature.
    queryFn: () => getApiClient().orders.getTrackingByToken(token as string),
    enabled: !!token,
    staleTime: 15_000,
    // Public tracking can't subscribe to the socket (no auth → no room access),
    // so we poll every 30s. Stops automatically when the page unmounts.
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && !data.isTerminal ? 30_000 : false;
    },
    retry: false,
  });
}
