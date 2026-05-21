'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateMenuItemDto, MenuItemDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation<MenuItemDto, ApiError, CreateMenuItemDto>({
    mutationFn: (input) => getApiClient().menu.items.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', 'Item created');
    },
    onError: (err) => notify('error', err.message),
  });
}
