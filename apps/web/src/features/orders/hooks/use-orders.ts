'use client';

import { getApiClient } from '@/lib/api-client';
import type { OrderListDto, OrderListQuery } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

export function useOrders(query?: OrderListQuery): UseQueryResult<OrderListDto> {
  return useQuery<OrderListDto>({
    queryKey: orderQueryKeys.list(query),
    queryFn: () => getApiClient().orders.list(query),
  });
}
