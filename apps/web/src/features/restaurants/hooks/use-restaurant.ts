'use client';

import { getApiClient } from '@/lib/api-client';
import type { RestaurantPublicDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { restaurantQueryKeys } from '../query-keys';

/**
 * Public restaurant query. Pass `initialData` (server-fetched via
 * `fetchPublicRestaurant()`) so SSR'd surfaces — notably the footer's legal /
 * contact identity — render real data in the initial HTML instead of a blank
 * client-only flash while React Query loads.
 */
export function useRestaurant(
  initialData?: RestaurantPublicDto,
): UseQueryResult<RestaurantPublicDto> {
  return useQuery<RestaurantPublicDto>({
    queryKey: restaurantQueryKeys.current(),
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60 * 1000,
    ...(initialData ? { initialData } : {}),
  });
}
