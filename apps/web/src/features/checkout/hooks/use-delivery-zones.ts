'use client';

import { getApiClient } from '@/lib/api-client';
import type { PublicDeliveryZonesResponseDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

export function useDeliveryZones() {
  return useQuery<PublicDeliveryZonesResponseDto>({
    queryKey: ['delivery-zones'],
    queryFn: () => getApiClient().settings.getDeliveryZones(),
    staleTime: 5 * 60 * 1000,
  });
}
