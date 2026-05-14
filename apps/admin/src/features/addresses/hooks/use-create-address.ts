'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { AddressDto, CreateAddressDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressQueryKeys } from '../query-keys';

export function useCreateAddress(): UseMutationResult<AddressDto, ApiError, CreateAddressDto> {
  const qc = useQueryClient();
  return useMutation<AddressDto, ApiError, CreateAddressDto>({
    mutationFn: (input) => getApiClient().addresses.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: addressQueryKeys.all });
      notify('success', 'Address added');
    },
    onError: (err) => notify('error', err.message),
  });
}
