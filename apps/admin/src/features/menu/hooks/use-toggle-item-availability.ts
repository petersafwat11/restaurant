'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { MenuItemDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useToggleItemAvailability(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation<MenuItemDto, ApiError, { id: string; isAvailable: boolean }>({
    mutationFn: ({ id, isAvailable }) =>
      getApiClient().menu.items.setAvailability(id, { isAvailable }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
    },
    onError: (err) => notify('error', err.message),
  });
}
