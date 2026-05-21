'use client';

import { getApiClient } from '@/lib/api-client';
import { triggerBrowserDownload } from '@/lib/download';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { OrderExportQuery } from '@repo/types';
import { useMutation } from '@tanstack/react-query';

/**
 * Downloads the admin orders list as CSV or PDF. Filters mirror the list
 * query (status, type, search, date range) and apply server-side, so the
 * file always reflects what the user is looking at — minus pagination.
 */
export function useExportOrders() {
  return useMutation<void, ApiError, OrderExportQuery>({
    mutationFn: async (query) => {
      const { blob, filename } = await getApiClient().orders.export(query);
      triggerBrowserDownload(blob, filename);
    },
    onError: (err) => notify('error', err.message),
  });
}
