'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, LoginDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

export function useLogin(): UseMutationResult<AuthResponseDto, ApiError, LoginDto> {
  const setSession = useAuthStore((s) => s.setSession);
  const t = useTranslations('web.auth.login');
  const tErrors = useTranslations('errors');
  return useMutation<AuthResponseDto, ApiError, LoginDto>({
    mutationFn: (input) => getApiClient().auth.login(input),
    onSuccess: (res) => {
      setSession({ user: res.user });
      notify('success', t('toasts.success'));
    },
    onError: (err) => {
      const code = err.code;
      const msg =
        code === 'invalidCredentials' || code === 'accountDisabled'
          ? tErrors(code)
          : tErrors('generic');
      notify('error', msg);
    },
  });
}
