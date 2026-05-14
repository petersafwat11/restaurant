'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { RequestOtpDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useRequestOtp(): UseMutationResult<{ success: true }, ApiError, RequestOtpDto> {
  return useMutation<{ success: true }, ApiError, RequestOtpDto>({
    mutationFn: (input) => getApiClient().auth.requestOtp(input),
    onSuccess: () => notify('success', 'Code sent'),
    onError: (err) => notify('error', err.message),
  });
}
