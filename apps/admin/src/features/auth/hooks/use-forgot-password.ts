'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ForgotPasswordDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

export function useForgotPassword(): UseMutationResult<
  { success: true },
  ApiError,
  ForgotPasswordDto
> {
  const t = useTranslations('admin.auth.forgotPassword');
  return useMutation<{ success: true }, ApiError, ForgotPasswordDto>({
    mutationFn: (input) => getApiClient().auth.forgotPassword(input),
    onSuccess: () => notify('success', t('successToast')),
    onError: (err) => notify('error', err.message),
  });
}
