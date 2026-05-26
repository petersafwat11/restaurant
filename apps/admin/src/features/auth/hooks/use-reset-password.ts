'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ResetPasswordDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

export function useResetPassword(): UseMutationResult<
  { success: true },
  ApiError,
  ResetPasswordDto
> {
  const t = useTranslations('admin.auth.resetPassword');
  return useMutation<{ success: true }, ApiError, ResetPasswordDto>({
    mutationFn: (input) => getApiClient().auth.resetPassword(input),
    onSuccess: () => notify('success', t('successToast')),
    onError: (err) =>
      notify(
        'error',
        err.code === 'tokenInvalid' ? t('errors.tokenInvalid') : err.message,
      ),
  });
}
