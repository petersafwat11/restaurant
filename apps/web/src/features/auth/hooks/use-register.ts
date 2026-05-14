'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, RegisterDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useRegister(): UseMutationResult<AuthResponseDto, ApiError, RegisterDto> {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthResponseDto, ApiError, RegisterDto>({
    mutationFn: (input) => getApiClient().auth.register(input),
    onSuccess: async (res) => {
      await setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      notify('success', 'Account created — check your email to verify');
    },
    onError: (err) => notify('error', err.message),
  });
}
