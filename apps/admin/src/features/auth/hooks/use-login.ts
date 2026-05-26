'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, LoginDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

export function useLogin(): UseMutationResult<AuthResponseDto, ApiError, LoginDto> {
  const t = useTranslations('admin.auth.login');
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthResponseDto, ApiError, LoginDto>({
    mutationFn: (input) => getApiClient().auth.login(input),
    onSuccess: (res) => {
      setSession({ user: res.user });
      notify('success', t('successToast'));
    },
    onError: (err) =>
      notify(
        'error',
        err.code === 'invalidCredentials'
          ? t('errors.invalidCredentials')
          : err.code === 'accountDisabled'
            ? t('errors.accountDisabled')
            : err.message,
      ),
  });
}
