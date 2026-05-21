'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateMenuCategoryDto, MenuCategoryDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuQueryKeys } from '../query-keys';

export function useCreateMenuCategory() {
  const qc = useQueryClient();
  return useMutation<MenuCategoryDto, ApiError, CreateMenuCategoryDto>({
    mutationFn: (input) => getApiClient().menu.categories.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: menuQueryKeys.tree() });
      notify('success', 'Category created');
    },
    onError: (err) => notify('error', err.message),
  });
}
