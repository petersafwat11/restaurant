'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { MenuCategoryDto, UpdateMenuCategoryDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useUpdateMenuCategory(id: string) {
  const qc = useQueryClient();
  return useMutation<MenuCategoryDto, ApiError, UpdateMenuCategoryDto>({
    mutationFn: (input) => getApiClient().menu.categories.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', 'Category updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
