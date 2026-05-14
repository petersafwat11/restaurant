'use client';

import { getApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { MeDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { authQueryKeys } from '../query-keys';

export function useMe(): UseQueryResult<MeDto> {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery<MeDto>({
    queryKey: authQueryKeys.me,
    queryFn: async () => {
      const me = await getApiClient().auth.me();
      setUser(me);
      return me;
    },
  });
}
