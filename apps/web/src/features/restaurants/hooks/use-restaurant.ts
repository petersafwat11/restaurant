'use client';

import { getApiClient } from '@/lib/api-client';
import type { RestaurantPublicDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { restaurantQueryKeys } from '../query-keys';

export function useRestaurant(slug: string): UseQueryResult<RestaurantPublicDto> {
  return useQuery<RestaurantPublicDto>({
    queryKey: restaurantQueryKeys.bySlug(slug),
    queryFn: () => getApiClient().restaurants.bySlug(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}
