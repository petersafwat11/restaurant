'use client';

import { getApiClient } from '@/lib/api-client';
import type { MenuItemDetailDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useMenuItem(
  restaurantId: string,
  categorySlug: string,
  itemSlug: string,
): UseQueryResult<MenuItemDetailDto> {
  return useQuery<MenuItemDetailDto>({
    queryKey: menuQueryKeys.item(restaurantId, categorySlug, itemSlug),
    queryFn: () => getApiClient().menu.getItem(restaurantId, categorySlug, itemSlug),
    enabled: Boolean(restaurantId && categorySlug && itemSlug),
    staleTime: 5 * 60 * 1000,
  });
}
