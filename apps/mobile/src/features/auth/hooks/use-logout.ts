import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

export function useLogout(): UseMutationResult<{ success: true }, ApiError, void> {
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, void>({
    mutationFn: () => getApiClient().auth.logout(),
    onSuccess: async () => {
      await clearSession();
      qc.clear();
      notify('success', 'Signed out');
    },
    onError: (err) => notify('error', err.message),
  });
}
