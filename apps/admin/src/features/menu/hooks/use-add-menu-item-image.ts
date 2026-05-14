'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { AddMenuItemImageDto, MenuItemImageDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useAddMenuItemImage(restaurantId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation<MenuItemImageDto, ApiError, AddMenuItemImageDto>({
    mutationFn: (input) => getApiClient().menu.items.addImage(itemId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree(restaurantId) });
      notify('success', 'Image added');
    },
    onError: (err) => notify('error', err.message),
  });
}
