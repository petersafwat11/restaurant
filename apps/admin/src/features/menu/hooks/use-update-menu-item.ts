'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { MenuItemDto, UpdateMenuItemDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useUpdateMenuItem(id: string) {
  const qc = useQueryClient();
  return useMutation<MenuItemDto, ApiError, UpdateMenuItemDto>({
    mutationFn: (input) => getApiClient().menu.items.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', 'Item updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
