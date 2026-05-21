'use client';

import { getApiClient } from '@/lib/api-client';
import type { MenuItemDetailDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useMenuItem(
  categorySlug: string,
  itemSlug: string,
): UseQueryResult<MenuItemDetailDto> {
  return useQuery<MenuItemDetailDto>({
    queryKey: menuQueryKeys.item(categorySlug, itemSlug),
    queryFn: () => getApiClient().menu.getItem(categorySlug, itemSlug),
    enabled: Boolean(categorySlug && itemSlug),
  });
}
