'use client';

import { getApiClient } from '@/lib/api-client';
import type { ReferralListDto, ReferralListQuery, ReferralMeDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

export function useReferralMe() {
  return useQuery<ReferralMeDto>({
    queryKey: ['referrals', 'me'],
    queryFn: () => getApiClient().referrals.me(),
  });
}

export function useReferralList(q?: ReferralListQuery) {
  return useQuery<ReferralListDto>({
    queryKey: ['referrals', 'list', q ?? {}],
    queryFn: () => getApiClient().referrals.list(q),
  });
}
