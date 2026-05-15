'use client';

import { getApiClient } from '@/lib/api-client';
import type { OperatingHoursDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { restaurantQueryKeys } from '../query-keys';

export function useOperatingHours(restaurantId: string): UseQueryResult<OperatingHoursDto[]> {
  return useQuery<OperatingHoursDto[]>({
    queryKey: restaurantQueryKeys.hours(restaurantId),
    queryFn: () => getApiClient().restaurants.getHours(restaurantId),
    enabled: Boolean(restaurantId),
  });
}
