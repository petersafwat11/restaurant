'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OrderDto, OrderStatus, OrderType } from '@repo/types';
import { nextStatusFor } from '@repo/types';
import { STATUS_TOKENS } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderQueryKeys } from '../query-keys';

interface AdvanceVariables {
  orderId: string;
  currentStatus: OrderStatus;
  /** Order type — required to pick the correct (type-aware) next status. */
  type: OrderType;
  /** Optional target status; defaults to the first legal forward transition. */
  to?: OrderStatus;
  note?: string;
}

/**
 * Advances an order to its next valid status per the FSM. Backend re-validates
 * via PermissionsGuard + state machine, so an illegal transition is rejected
 * server-side — UI gating here is just discoverability.
 */
export function useAdvanceOrder() {
  const qc = useQueryClient();

  return useMutation<OrderDto, ApiError, AdvanceVariables>({
    mutationFn: ({ orderId, currentStatus, type, to, note }) => {
      // When no explicit target is given (bulk "Advance"), use the type-aware
      // next status — which never includes CANCELLED, so an "advance" can't
      // silently cancel, and respects delivery-vs-pickup hand-off paths.
      const target = to ?? nextStatusFor(currentStatus, type);
      if (!target) throw new Error(`No legal transition from ${currentStatus}`);
      return getApiClient().orders.updateStatus(orderId, { to: target, note });
    },
    onSuccess: (data) => {
      qc.setQueryData(orderQueryKeys.detail(data.id), data);
      qc.invalidateQueries({ queryKey: orderQueryKeys.all });
      notify(
        'success',
        `Order #${data.orderNumber} moved to ${STATUS_TOKENS[data.status]?.label ?? data.status}`,
      );
    },
    onError: (err) => notify('error', err.message),
  });
}
