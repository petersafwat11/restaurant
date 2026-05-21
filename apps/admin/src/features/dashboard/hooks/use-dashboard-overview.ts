'use client';

import {
  useAnalyticsOverview,
  useOrdersByStatus,
  useRevenueTimeseries,
  useTopItems,
} from '@/features/analytics/hooks';
import { useAdminOrders } from '@/features/orders/hooks';
import type { AnalyticsPeriod } from '@repo/types';

const RECENT_ORDERS_LIMIT = 10;
const TOP_ITEMS_LIMIT = 5;

/**
 * Ergonomic composite for the admin overview page: KPI cards + revenue chart +
 * top items + orders-by-status + a recent-orders feed, in one call. Mirrors the
 * `useExportFlow` composite pattern so the UI sprint wires a single hook.
 */
export function useDashboardOverview(period: AnalyticsPeriod = 'today') {
  const base = { period };

  const overview = useAnalyticsOverview(base);
  const revenue = useRevenueTimeseries(base);
  const topItems = useTopItems({ ...base, limit: TOP_ITEMS_LIMIT });
  const ordersByStatus = useOrdersByStatus(base);
  const recentOrders = useAdminOrders({ limit: RECENT_ORDERS_LIMIT });

  return {
    overview,
    revenue,
    topItems,
    ordersByStatus,
    recentOrders,
    isLoading:
      overview.isLoading ||
      revenue.isLoading ||
      topItems.isLoading ||
      ordersByStatus.isLoading ||
      recentOrders.isLoading,
    error:
      overview.error ??
      revenue.error ??
      topItems.error ??
      ordersByStatus.error ??
      recentOrders.error ??
      null,
  };
}
