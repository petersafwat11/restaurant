'use client';

import { getApiClient } from '@/lib/api-client';
import type { PromotionDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function usePromotion(id: string | null) {
  return useQuery<PromotionDto>({
    queryKey: id ? promotionQueryKeys.byId(id) : ['promotions', 'noop'],
    queryFn: () => getApiClient().promotions.getById(id as string),
    enabled: Boolean(id),
  });
}
