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
  const t = useTranslations('web.auth.resetPassword');
  const tErrors = useTranslations('errors');
  return useMutation<{ success: true }, ApiError, ResetPasswordDto>({
    mutationFn: (input) => getApiClient().auth.resetPassword(input),
    onSuccess: () => notify('success', t('toasts.success')),
    onError: (err) => {
      const msg = err.code === 'tokenInvalid' ? tErrors('tokenInvalid') : tErrors('generic');
      notify('error', msg);
    },
  });
}
