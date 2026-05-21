'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { MenuItemDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useToggleItemAvailability() {
  const qc = useQueryClient();
  return useMutation<MenuItemDto, ApiError, { id: string; isAvailable: boolean }>({
    mutationFn: ({ id, isAvailable }) =>
      getApiClient().menu.items.setAvailability(id, { isAvailable }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', `Item ${data.isAvailable ? 'available' : 'unavailable'}`);
    },
    onError: (err) => notify('error', err.message),
  });
}
