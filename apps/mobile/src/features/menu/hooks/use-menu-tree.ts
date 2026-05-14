import { getApiClient } from '@/lib/api-client';
import type { MenuTreeDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useMenuTree(restaurantId: string): UseQueryResult<MenuTreeDto> {
  return useQuery<MenuTreeDto>({
    queryKey: menuQueryKeys.tree(restaurantId),
    queryFn: () => getApiClient().menu.getTree(restaurantId),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60 * 1000,
  });
}
