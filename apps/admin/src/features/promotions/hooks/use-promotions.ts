'use client';

import { getApiClient } from '@/lib/api-client';
import type { PromotionDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { promotionQueryKeys } from '../query-keys';

export function usePromotions(active?: boolean): UseQueryResult<PromotionDto[]> {
  return useQuery<PromotionDto[]>({
    queryKey: promotionQueryKeys.list(active),
    queryFn: () => getApiClient().promotions.list(active),
  });
}
