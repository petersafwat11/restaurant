'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ChangePasswordDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useChangePassword(): UseMutationResult<
  { success: true },
  ApiError,
  ChangePasswordDto
> {
  return useMutation<{ success: true }, ApiError, ChangePasswordDto>({
    mutationFn: (input) => getApiClient().users.changePassword(input),
    onSuccess: () => notify('success', 'Password changed — sign in again on other devices'),
    onError: (err) => notify('error', err.message),
  });
}
