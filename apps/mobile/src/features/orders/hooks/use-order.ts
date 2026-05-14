import { getApiClient } from '@/lib/api-client';
import type { OrderDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

export function useOrder(id: string): UseQueryResult<OrderDto> {
  return useQuery<OrderDto>({
    queryKey: orderQueryKeys.detail(id),
    queryFn: () => getApiClient().orders.getById(id),
    enabled: Boolean(id),
  });
}
