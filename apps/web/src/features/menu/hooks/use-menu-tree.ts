'use client';

import { getApiClient } from '@/lib/api-client';
import type { MenuTreeDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { menuQueryKeys } from '../query-keys';

export function useMenuTree(): UseQueryResult<MenuTreeDto> {
  // Serve the menu in the active UI locale (PL source, EN translations with
  // PL fallback). Locale is part of the query key so PL/EN cache separately.
  const locale = useLocale();
  return useQuery<MenuTreeDto>({
    queryKey: menuQueryKeys.tree(locale),
    queryFn: () => getApiClient().menu.getTree(locale),
    staleTime: 5 * 60 * 1000,
  });
}
