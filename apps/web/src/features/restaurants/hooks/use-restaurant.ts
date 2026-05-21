'use client';

import { getApiClient } from '@/lib/api-client';
import type { RestaurantPublicDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { restaurantQueryKeys } from '../query-keys';

export function useRestaurant(): UseQueryResult<RestaurantPublicDto> {
  return useQuery<RestaurantPublicDto>({
    queryKey: restaurantQueryKeys.current(),
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60 * 1000,
  });
}
