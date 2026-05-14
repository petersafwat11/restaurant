'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressQueryKeys } from '../query-keys';

export function useDeleteAddress(): UseMutationResult<{ success: true }, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (id) => getApiClient().addresses.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: addressQueryKeys.all });
      notify('success', 'Address removed');
    },
    onError: (err) => notify('error', err.message),
  });
}
