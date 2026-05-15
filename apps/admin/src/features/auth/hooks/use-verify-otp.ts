'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { AuthResponseDto, VerifyOtpDto } from '@repo/types';
import { type UseMutationResult, useMutation } from '@tanstack/react-query';

export function useVerifyOtp(): UseMutationResult<AuthResponseDto, ApiError, VerifyOtpDto> {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthResponseDto, ApiError, VerifyOtpDto>({
    mutationFn: (input) => getApiClient().auth.verifyOtp(input),
    onSuccess: async (res) => {
      await setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      notify('success', 'Signed in');
    },
    onError: (err) => notify('error', err.message),
  });
}
