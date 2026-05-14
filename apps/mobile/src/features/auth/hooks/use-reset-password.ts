import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ResetPasswordDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useResetPassword(): UseMutationResult<
  { success: true },
  ApiError,
  ResetPasswordDto
> {
  return useMutation<{ success: true }, ApiError, ResetPasswordDto>({
    mutationFn: (input) => getApiClient().auth.resetPassword(input),
    onSuccess: () => notify('success', 'Password updated — sign in with your new password'),
    onError: (err) => notify('error', err.message),
  });
}
