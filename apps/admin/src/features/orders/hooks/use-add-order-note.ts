'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { AddOrderNoteDto, OrderDto } from '@repo/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

interface Vars {
  orderId: string;
  note: string;
}

export function useAddOrderNote() {
  const qc = useQueryClient();
  return useMutation<OrderDto, ApiError, Vars>({
    mutationFn: ({ orderId, note }) =>
      getApiClient().orders.addNote(orderId, { note } satisfies AddOrderNoteDto),
    onSuccess: (next) => {
      qc.setQueryData(orderQueryKeys.detail(next.id), next);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      notify('success', 'Note added');
    },
    onError: (err) => notify('error', err.message),
  });
}
