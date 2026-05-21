'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, LoginDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useLogin(): UseMutationResult<AuthResponseDto, ApiError, LoginDto> {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthResponseDto, ApiError, LoginDto>({
    mutationFn: (input) => getApiClient().auth.login(input),
    onSuccess: (res) => {
      setSession({ user: res.user });
      notify('success', 'Signed in');
    },
    onError: (err) => notify('error', err.message),
  });
}
