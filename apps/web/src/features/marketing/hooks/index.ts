'use client';

import { getApiClient } from '@/lib/api-client';
import type { AboutDataDto, LandingDataDto, MarketingQuery } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

export function useLandingData(query?: MarketingQuery) {
  return useQuery<LandingDataDto>({
    queryKey: ['marketing', 'landing', query ?? {}],
    queryFn: () => getApiClient().marketing.landing(query),
  });
}

export function useAboutData(query?: MarketingQuery) {
  return useQuery<AboutDataDto>({
    queryKey: ['marketing', 'about', query ?? {}],
    queryFn: () => getApiClient().marketing.about(query),
  });
}
