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
    onSuccess: async (res) => {
      // Mobile uses the header-based auth path — the API always returns
      // tokens in the body for non-cookie audiences.
      if (!res.accessToken || !res.refreshToken) {
        throw new Error('Login response missing tokens');
      }
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
