'use client';

import { getApiClient } from '@/lib/api-client';
import type { RestaurantPublicDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

export function useRestaurants(): UseQueryResult<RestaurantPublicDto[]> {
  return useQuery<RestaurantPublicDto[]>({
    queryKey: ['restaurant', 'list'],
    queryFn: async () => {
      const r = await getApiClient().restaurant.get();
      return [r];
    },
    staleTime: 5 * 60 * 1000,
  });
}
