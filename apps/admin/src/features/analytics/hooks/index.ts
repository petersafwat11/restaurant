'use client';

import { getApiClient } from '@/lib/api-client';
import type {
  AnalyticsBaseQuery,
  AnalyticsOverviewDto,
  OrdersByStatusDto,
  RevenueTimeseriesPointDto,
  RevenueTimeseriesQuery,
  TopItemDto,
  TopItemsQuery,
} from '@repo/types';
import { useQuery } from '@tanstack/react-query';

const analyticsKeys = {
  overview: (q: AnalyticsBaseQuery) => ['analytics', 'overview', q] as const,
  revenue: (q: RevenueTimeseriesQuery) => ['analytics', 'revenue', q] as const,
  topItems: (q: TopItemsQuery) => ['analytics', 'topItems', q] as const,
  ordersByStatus: (q: AnalyticsBaseQuery) => ['analytics', 'ordersByStatus', q] as const,
};

export function useAnalyticsOverview(q: AnalyticsBaseQuery) {
  return useQuery<AnalyticsOverviewDto>({
    queryKey: analyticsKeys.overview(q),
    queryFn: () => getApiClient().analytics.overview(q),
  });
}

export function useRevenueTimeseries(q: RevenueTimeseriesQuery) {
  return useQuery<RevenueTimeseriesPointDto[]>({
    queryKey: analyticsKeys.revenue(q),
    queryFn: () => getApiClient().analytics.revenueTimeseries(q),
  });
}

export function useTopItems(q: TopItemsQuery) {
  return useQuery<TopItemDto[]>({
    queryKey: analyticsKeys.topItems(q),
    queryFn: () => getApiClient().analytics.topItems(q),
  });
}

export function useOrdersByStatus(q: AnalyticsBaseQuery) {
  return useQuery<OrdersByStatusDto>({
    queryKey: analyticsKeys.ordersByStatus(q),
    queryFn: () => getApiClient().analytics.ordersByStatus(q),
  });
}
