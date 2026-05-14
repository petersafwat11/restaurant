'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  CreateCustomerNoteDto,
  CustomerDetailDto,
  CustomerListDto,
  CustomerListQuery,
  CustomerNoteDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const customerKeys = {
  all: ['customers'] as const,
  list: (q?: CustomerListQuery) => ['customers', 'list', q ?? {}] as const,
  detail: (id: string) => ['customers', id] as const,
};

export function useCustomers(q?: CustomerListQuery) {
  return useQuery<CustomerListDto>({
    queryKey: customerKeys.list(q),
    queryFn: () => getApiClient().customers.list(q),
  });
}

export function useCustomer(id: string) {
  return useQuery<CustomerDetailDto>({
    queryKey: customerKeys.detail(id),
    queryFn: () => getApiClient().customers.get(id),
    enabled: Boolean(id),
  });
}

export function useUpdateCustomerNote(id: string) {
  const qc = useQueryClient();
  return useMutation<CustomerNoteDto, ApiError, CreateCustomerNoteDto>({
    mutationFn: (input) => getApiClient().customers.addNote(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.detail(id) }),
    onError: (err) => notify('error', err.message),
  });
}
