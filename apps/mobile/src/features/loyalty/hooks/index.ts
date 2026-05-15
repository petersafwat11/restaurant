import { getApiClient } from '@/lib/api-client';
import type { LoyaltyAccountDto, LoyaltyHistoryDto, LoyaltyHistoryQuery } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

export function useLoyaltyAccount() {
  return useQuery<LoyaltyAccountDto>({
    queryKey: ['loyalty', 'me'],
    queryFn: () => getApiClient().loyalty.me(),
  });
}

export function useLoyaltyHistory(query?: LoyaltyHistoryQuery) {
  return useQuery<LoyaltyHistoryDto>({
    queryKey: ['loyalty', 'history', query ?? {}],
    queryFn: () => getApiClient().loyalty.history(query),
  });
}
