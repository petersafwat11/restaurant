'use client';

import { getApiClient } from '@/lib/api-client';
import type { OrderDto, OrderListDto, OrderStatus } from '@repo/types';
import { ORDER_STATUSES } from '@repo/types';
import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { orderQueryKeys } from '../query-keys';

// Linear progression rank, so the list reconcile below only moves a row
// FORWARD — a freshly-fetched detail must never regress a newer realtime
// status that already landed on the list.
const STATUS_RANK = new Map<OrderStatus, number>(ORDER_STATUSES.map((s, i) => [s, i]));

export function useOrder(id: string): UseQueryResult<OrderDto> {
  const qc = useQueryClient();
  const query = useQuery<OrderDto>({
    queryKey: orderQueryKeys.detail(id),
    queryFn: () => getApiClient().orders.getById(id),
    enabled: Boolean(id),
  });

  // Reconcile the orders list(s) with the freshly-fetched detail status. The
  // live list can lag the true status — e.g. a COD order auto-confirmed after
  // its `order.created` event, or an online order confirmed by a (deliberately
  // silent) payment webhook — which surfaces as a table-vs-popup mismatch.
  // Patch the matching row whenever we load the authoritative detail status.
  const detailId = query.data?.id;
  const detailStatus = query.data?.status;
  React.useEffect(() => {
    if (!detailId || !detailStatus) return;
    const detailRank = STATUS_RANK.get(detailStatus) ?? 0;
    qc.setQueriesData<OrderListDto>(
      {
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'orders' &&
          (q.queryKey[1] === 'admin-list' || q.queryKey[1] === 'list'),
      },
      (prev) => {
        if (!prev?.items) return prev;
        let changed = false;
        const items = prev.items.map((it) => {
          if (it.id !== detailId || it.status === detailStatus) return it;
          // Don't regress a row that already advanced past the detail status.
          if ((STATUS_RANK.get(it.status) ?? 0) > detailRank) return it;
          changed = true;
          return { ...it, status: detailStatus };
        });
        return changed ? { ...prev, items } : prev;
      },
    );
  }, [qc, detailId, detailStatus]);

  return query;
}
