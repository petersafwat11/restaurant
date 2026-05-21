'use client';

import { getApiClient } from '@/lib/api-client';
import type { MenuTreeDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useMenuTree(): UseQueryResult<MenuTreeDto> {
  return useQuery<MenuTreeDto>({
    queryKey: menuQueryKeys.tree(),
    queryFn: () => getApiClient().menu.getTree(),
    staleTime: 5 * 60 * 1000,
  });
}
