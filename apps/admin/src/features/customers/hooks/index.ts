'use client';

import { getApiClient } from '@/lib/api-client';
import { triggerBrowserDownload } from '@/lib/download';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  BroadcastEmailDto,
  BroadcastEmailResponseDto,
  BulkTagCustomersDto,
  BulkTagCustomersResponseDto,
  CreateCustomerNoteDto,
  CreateCustomerTagDto,
  CustomerDetailDto,
  CustomerExportQuery,
  CustomerListDto,
  CustomerListQuery,
  CustomerNoteDto,
  CustomerTagDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const customerKeys = {
  all: ['customers'] as const,
  list: (q?: CustomerListQuery) => ['customers', 'list', q ?? {}] as const,
  detail: (id: string) => ['customers', id] as const,
  tags: ['customers', 'tags'] as const,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
      notify('success', 'Note added');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useCustomerTags() {
  return useQuery<CustomerTagDto[]>({
    queryKey: customerKeys.tags,
    queryFn: () => getApiClient().customers.listTags(),
  });
}

export function useCreateCustomerTag() {
  const qc = useQueryClient();
  return useMutation<CustomerTagDto, ApiError, CreateCustomerTagDto>({
    mutationFn: (input) => getApiClient().customers.createTag(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.tags });
      notify('success', 'Tag created');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useDeleteCustomerTag() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, { tagId: string }>({
    mutationFn: ({ tagId }) => getApiClient().customers.deleteTag(tagId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.tags });
      notify('success', 'Tag deleted');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useBulkTagCustomers() {
  const qc = useQueryClient();
  return useMutation<BulkTagCustomersResponseDto, ApiError, BulkTagCustomersDto>({
    mutationFn: (input) => getApiClient().customers.bulkTag(input),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      notify(
        'success',
        `${vars.action === 'REMOVE' ? 'Removed' : 'Tagged'} ${res.affected} customer${res.affected === 1 ? '' : 's'}`,
      );
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useBroadcastEmail() {
  return useMutation<BroadcastEmailResponseDto, ApiError, BroadcastEmailDto>({
    mutationFn: (input) => getApiClient().customers.broadcastEmail(input),
    onSuccess: (res) =>
      notify('success', `Queued ${res.queued} email${res.queued === 1 ? '' : 's'}`),
    onError: (err) => notify('error', err.message),
  });
}

/**
 * Downloads the admin customers list as CSV or PDF. Same filter surface as
 * `useCustomers` (search, segment), minus pagination.
 */
export function useExportCustomers() {
  return useMutation<void, ApiError, CustomerExportQuery>({
    mutationFn: async (query) => {
      const { blob, filename } = await getApiClient().customers.export(query);
      triggerBrowserDownload(blob, filename);
    },
    onError: (err) => notify('error', err.message),
  });
}
