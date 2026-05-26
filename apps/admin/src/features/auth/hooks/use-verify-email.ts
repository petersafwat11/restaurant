'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { VerifyEmailDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { authQueryKeys } from '../query-keys';

export function useVerifyEmail(): UseMutationResult<{ success: true }, ApiError, VerifyEmailDto> {
  const t = useTranslations('admin.auth.verifyEmail');
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, VerifyEmailDto>({
    mutationFn: (input) => getApiClient().auth.verifyEmail(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authQueryKeys.me });
      notify('success', t('successToast'));
    },
    onError: (err) =>
      notify(
        'error',
        err.code === 'tokenInvalid' ? t('errors.tokenInvalid') : err.message,
      ),
  });
}
