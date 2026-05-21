'use client';

import { getApiClient } from '@/lib/api-client';
import type { OrderDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

export function useOrder(id: string, token?: string | null): UseQueryResult<OrderDto> {
  return useQuery<OrderDto>({
    queryKey: orderQueryKeys.detail(id),
    // Prefer the token-authenticated public endpoint when we have one — it
    // works for guests across refreshes. Fall back to the standard auth-gated
    // read for logged-in customers and staff.
    queryFn: () =>
      token ? getApiClient().orders.getByToken(token) : getApiClient().orders.getById(id),
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: false,
  });
}
