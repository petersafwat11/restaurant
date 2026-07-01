'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  AccountDeletionStatusResponseDto,
  ConfirmAccountDeletionDto,
  RequestAccountDeletionDto,
} from '@repo/types';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { accountQueryKeys } from '../query-keys';

/** Current deletion-request status for the signed-in user. */
export function useAccountDeletionStatus(): UseQueryResult<AccountDeletionStatusResponseDto> {
  return useQuery<AccountDeletionStatusResponseDto>({
    queryKey: accountQueryKeys.deletion,
    queryFn: () => getApiClient().accountDeletion.status(),
  });
}

/** Request deletion — password reauth (schedules) or email flow (sends link). */
export function useRequestAccountDeletion(): UseMutationResult<
  AccountDeletionStatusResponseDto,
  ApiError,
  RequestAccountDeletionDto
> {
  const qc = useQueryClient();
  return useMutation<AccountDeletionStatusResponseDto, ApiError, RequestAccountDeletionDto>({
    mutationFn: (input) => getApiClient().accountDeletion.request(input),
    onSuccess: (data) => {
      qc.setQueryData(accountQueryKeys.deletion, data);
    },
    onError: (err) => notify('error', err.message),
  });
}

/** Confirm the single-use email token (email reauth flow). */
export function useConfirmAccountDeletion(): UseMutationResult<
  AccountDeletionStatusResponseDto,
  ApiError,
  ConfirmAccountDeletionDto
> {
  const qc = useQueryClient();
  return useMutation<AccountDeletionStatusResponseDto, ApiError, ConfirmAccountDeletionDto>({
    mutationFn: (input) => getApiClient().accountDeletion.confirm(input),
    onSuccess: (data) => {
      qc.setQueryData(accountQueryKeys.deletion, data);
    },
    onError: (err) => notify('error', err.message),
  });
}

/** Cancel a pending deletion during the grace period. */
export function useCancelAccountDeletion(): UseMutationResult<
  AccountDeletionStatusResponseDto,
  ApiError,
  void
> {
  const qc = useQueryClient();
  return useMutation<AccountDeletionStatusResponseDto, ApiError, void>({
    mutationFn: () => getApiClient().accountDeletion.cancel(),
    onSuccess: (data) => {
      qc.setQueryData(accountQueryKeys.deletion, data);
    },
    onError: (err) => notify('error', err.message),
  });
}
