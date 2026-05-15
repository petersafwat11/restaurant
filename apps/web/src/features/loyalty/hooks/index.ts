'use client';

import { getApiClient } from '@/lib/api-client';
import type { ApiError } from '@repo/api-client';
import type {
  LoyaltyAccountDto,
  LoyaltyHistoryDto,
  LoyaltyHistoryQuery,
  LoyaltyRedeemQuoteDto,
  LoyaltyRedeemQuoteRequest,
} from '@repo/types';
import { useMutation, useQuery } from '@tanstack/react-query';

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

export function useLoyaltyRedeemQuote() {
  return useMutation<LoyaltyRedeemQuoteDto, ApiError, LoyaltyRedeemQuoteRequest>({
    mutationFn: (input) => getApiClient().loyalty.redeemQuote(input),
  });
}
