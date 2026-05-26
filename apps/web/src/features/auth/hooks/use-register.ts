'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, RegisterDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

export function useRegister(): UseMutationResult<AuthResponseDto, ApiError, RegisterDto> {
  const setSession = useAuthStore((s) => s.setSession);
  const t = useTranslations('web.auth.register');
  const tErrors = useTranslations('errors');
  return useMutation<AuthResponseDto, ApiError, RegisterDto>({
    mutationFn: (input) => getApiClient().auth.register(input),
    onSuccess: (res) => {
      setSession({ user: res.user });
      notify('success', t('toasts.success'));
    },
    onError: (err) => {
      const msg =
        err.code === 'emailAlreadyRegistered'
          ? tErrors('emailAlreadyRegistered')
          : tErrors('generic');
      notify('error', msg);
    },
  });
}
