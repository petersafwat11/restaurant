'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { VerifyEmailDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { authQueryKeys } from '../query-keys';

export function useVerifyEmail(): UseMutationResult<{ success: true }, ApiError, VerifyEmailDto> {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, VerifyEmailDto>({
    mutationFn: (input) => getApiClient().auth.verifyEmail(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authQueryKeys.me });
      notify('success', 'Email verified');
    },
    onError: (err) => notify('error', err.message),
  });
}
