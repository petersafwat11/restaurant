import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ForgotPasswordDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useForgotPassword(): UseMutationResult<
  { success: true },
  ApiError,
  ForgotPasswordDto
> {
  return useMutation<{ success: true }, ApiError, ForgotPasswordDto>({
    mutationFn: (input) => getApiClient().auth.forgotPassword(input),
    onSuccess: () => notify('success', 'If that email exists, a reset link is on its way'),
    onError: (err) => notify('error', err.message),
  });
}
