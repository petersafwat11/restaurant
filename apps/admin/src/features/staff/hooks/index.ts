'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  InviteStaffDto,
  StaffListQuery,
  StaffMemberDto,
  UpdateStaffRoleDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const staffKeys = {
  all: ['staff'] as const,
  list: (q?: StaffListQuery) => ['staff', 'list', q ?? {}] as const,
};

export function useStaff(q?: StaffListQuery) {
  return useQuery<StaffMemberDto[]>({
    queryKey: staffKeys.list(q),
    queryFn: () => getApiClient().staff.list(q),
  });
}

export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation<{ token: string; expiresAt: string }, ApiError, InviteStaffDto>({
    mutationFn: (input) => getApiClient().staff.invite(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.all });
      notify('success', 'Invite sent');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useUpdateStaffRole() {
  const qc = useQueryClient();
  return useMutation<StaffMemberDto, ApiError, { userId: string; input: UpdateStaffRoleDto }>({
    mutationFn: ({ userId, input }) => getApiClient().staff.updateRole(userId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.all });
      notify('success', 'Role updated');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useDeactivateStaff() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (userId) => getApiClient().staff.deactivate(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.all });
      notify('success', 'Staff member deactivated');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useReactivateStaff() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (userId) => getApiClient().staff.reactivate(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.all });
      notify('success', 'Staff member reactivated');
    },
    onError: (err) => notify('error', err.message),
  });
}
