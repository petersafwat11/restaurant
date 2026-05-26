'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, RegisterDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

export function useRegister(): UseMutationResult<AuthResponseDto, ApiError, RegisterDto> {
  const t = useTranslations('admin.auth.register');
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthResponseDto, ApiError, RegisterDto>({
    mutationFn: (input) => getApiClient().auth.register(input),
    onSuccess: (res) => {
      setSession({ user: res.user });
      notify('success', t('successToast'));
    },
    onError: (err) =>
      notify(
        'error',
        err.code === 'emailAlreadyRegistered'
          ? t('errors.emailAlreadyRegistered')
          : err.message,
      ),
  });
}
