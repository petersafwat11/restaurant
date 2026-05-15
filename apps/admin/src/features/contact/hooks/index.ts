'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  ContactMessageDto,
  ContactMessageListDto,
  ContactMessageListQuery,
  UpdateContactMessageDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const contactKeys = {
  all: ['contact'] as const,
  list: (q?: ContactMessageListQuery) => ['contact', 'list', q ?? {}] as const,
};

export function useContactMessages(q?: ContactMessageListQuery) {
  return useQuery<ContactMessageListDto>({
    queryKey: contactKeys.list(q),
    queryFn: () => getApiClient().contact.list(q),
  });
}

export function useUpdateContactStatus() {
  const qc = useQueryClient();
  return useMutation<ContactMessageDto, ApiError, { id: string; input: UpdateContactMessageDto }>({
    mutationFn: ({ id, input }) => getApiClient().contact.updateStatus(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
    onError: (err) => notify('error', err.message),
  });
}
