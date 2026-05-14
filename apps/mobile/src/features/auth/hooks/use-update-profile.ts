import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@repo/api-client';
import type { MeDto, UpdateProfileDto } from '@repo/types';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { authQueryKeys } from '../query-keys';

export function useUpdateProfile(): UseMutationResult<MeDto, ApiError, UpdateProfileDto> {
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  return useMutation<MeDto, ApiError, UpdateProfileDto>({
    mutationFn: (input) => getApiClient().users.updateProfile(input),
    onSuccess: (me) => {
      setUser(me);
      qc.setQueryData(authQueryKeys.me, me);
      notify('success', 'Profile updated');
    },
    onError: (err) => notify('error', err.message),
  });
}
