'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { VerifyEmailDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { authQueryKeys } from '../query-keys';

export function useVerifyEmail(): UseMutationResult<{ success: true }, ApiError, VerifyEmailDto> {
  const qc = useQueryClient();
  const t = useTranslations('web.auth.verifyEmail');
  const tErrors = useTranslations('errors');
  return useMutation<{ success: true }, ApiError, VerifyEmailDto>({
    mutationFn: (input) => getApiClient().auth.verifyEmail(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: authQueryKeys.me });
      notify('success', t('toasts.success'));
    },
    onError: (err) => {
      const msg = err.code === 'tokenInvalid' ? tErrors('tokenInvalid') : tErrors('generic');
      notify('error', msg);
    },
  });
}
