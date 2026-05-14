'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { AddressDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressQueryKeys } from '../query-keys';

export function useSetDefaultAddress(): UseMutationResult<AddressDto, ApiError, string> {
  const qc = useQueryClient();
  return useMutation<AddressDto, ApiError, string>({
    mutationFn: (id) => getApiClient().addresses.setDefault(id),
    // Optimistic update: flip isDefault locally
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: addressQueryKeys.all });
      const previous = qc.getQueryData<AddressDto[]>(addressQueryKeys.all);
      if (previous) {
        qc.setQueryData<AddressDto[]>(
          addressQueryKeys.all,
          previous.map((a) => ({ ...a, isDefault: a.id === id })),
        );
      }
      return { previous };
    },
    onError: (err, _id, ctx) => {
      const previous = (ctx as { previous?: AddressDto[] } | undefined)?.previous;
      if (previous) qc.setQueryData(addressQueryKeys.all, previous);
      notify('error', err.message);
    },
    onSuccess: () => notify('success', 'Default address set'),
    onSettled: () => qc.invalidateQueries({ queryKey: addressQueryKeys.all }),
  });
}
