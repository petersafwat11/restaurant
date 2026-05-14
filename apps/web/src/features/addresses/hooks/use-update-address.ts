'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { AddressDto, UpdateAddressDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressQueryKeys } from '../query-keys';

export interface UpdateAddressInput {
  id: string;
  data: UpdateAddressDto;
}

export function useUpdateAddress(): UseMutationResult<AddressDto, ApiError, UpdateAddressInput> {
  const qc = useQueryClient();
  return useMutation<AddressDto, ApiError, UpdateAddressInput>({
    mutationFn: ({ id, data }) => getApiClient().addresses.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: addressQueryKeys.all });
      notify('success', 'Address updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
