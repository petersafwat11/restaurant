'use client';

import { getApiClient } from '@/lib/api-client';
import type { OrderListDto, OrderListQuery } from '@repo/types';
import { type UseQueryResult, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

/** Admin orders-list filters. `cursor` is managed by the infinite hook. */
export type AdminOrderFilters = Omit<OrderListQuery, 'cursor'>;

/**
 * Restaurant-wide orders list with server-side filtering (status, type, date
 * range, search). Backed by the dual-mode `GET /orders` — staff with
 * `order:read` + `restaurantId` get the admin list.
 */
export function useAdminOrders(filters: AdminOrderFilters): UseQueryResult<OrderListDto> {
  return useQuery<OrderListDto>({
    queryKey: orderQueryKeys.adminList(filters),
    queryFn: () => getApiClient().orders.list(filters),
    enabled: Boolean(filters.restaurantId),
  });
}

/** Same filters, cursor-paginated for infinite scroll / "load more". */
export function useAdminOrdersInfinite(filters: AdminOrderFilters) {
  return useInfiniteQuery({
    queryKey: orderQueryKeys.adminListInfinite(filters),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getApiClient().orders.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: OrderListDto) => last.nextCursor ?? undefined,
    enabled: Boolean(filters.restaurantId),
  });
}
