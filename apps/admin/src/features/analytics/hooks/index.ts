'use client';

import { getApiClient } from '@/lib/api-client';
import type {
  AnalyticsBaseQuery,
  AnalyticsOverviewDto,
  CustomerRetentionDto,
  CustomerRetentionQuery,
  OrdersByStatusDto,
  PaymentMethodsBreakdownDto,
  RevenueTimeseriesPointDto,
  RevenueTimeseriesQuery,
  SalesByDayOfWeekDto,
  SalesByHourDto,
  TopItemDto,
  TopItemsQuery,
} from '@repo/types';
import { useQuery } from '@tanstack/react-query';

const analyticsKeys = {
  overview: (q: AnalyticsBaseQuery) => ['analytics', 'overview', q] as const,
  revenue: (q: RevenueTimeseriesQuery) => ['analytics', 'revenue', q] as const,
  topItems: (q: TopItemsQuery) => ['analytics', 'topItems', q] as const,
  ordersByStatus: (q: AnalyticsBaseQuery) => ['analytics', 'ordersByStatus', q] as const,
  retention: (q: CustomerRetentionQuery) => ['analytics', 'retention', q] as const,
  payments: (q: AnalyticsBaseQuery) => ['analytics', 'payments', q] as const,
  salesByHour: (q: AnalyticsBaseQuery) => ['analytics', 'salesByHour', q] as const,
  salesByDow: (q: AnalyticsBaseQuery) => ['analytics', 'salesByDow', q] as const,
};

export function useAnalyticsOverview(q: AnalyticsBaseQuery) {
  return useQuery<AnalyticsOverviewDto>({
    queryKey: analyticsKeys.overview(q),
    queryFn: () => getApiClient().analytics.overview(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function useRevenueTimeseries(q: RevenueTimeseriesQuery) {
  return useQuery<RevenueTimeseriesPointDto[]>({
    queryKey: analyticsKeys.revenue(q),
    queryFn: () => getApiClient().analytics.revenueTimeseries(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function useTopItems(q: TopItemsQuery) {
  return useQuery<TopItemDto[]>({
    queryKey: analyticsKeys.topItems(q),
    queryFn: () => getApiClient().analytics.topItems(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function useOrdersByStatus(q: AnalyticsBaseQuery) {
  return useQuery<OrdersByStatusDto>({
    queryKey: analyticsKeys.ordersByStatus(q),
    queryFn: () => getApiClient().analytics.ordersByStatus(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function useCustomerRetention(q: CustomerRetentionQuery) {
  return useQuery<CustomerRetentionDto>({
    queryKey: analyticsKeys.retention(q),
    queryFn: () => getApiClient().analytics.customerRetention(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function usePaymentMethodsBreakdown(q: AnalyticsBaseQuery) {
  return useQuery<PaymentMethodsBreakdownDto>({
    queryKey: analyticsKeys.payments(q),
    queryFn: () => getApiClient().analytics.paymentMethods(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function useSalesByHour(q: AnalyticsBaseQuery) {
  return useQuery<SalesByHourDto>({
    queryKey: analyticsKeys.salesByHour(q),
    queryFn: () => getApiClient().analytics.salesByHour(q),
    enabled: Boolean(q.restaurantId),
  });
}

export function useSalesByDayOfWeek(q: AnalyticsBaseQuery) {
  return useQuery<SalesByDayOfWeekDto>({
    queryKey: analyticsKeys.salesByDow(q),
    queryFn: () => getApiClient().analytics.salesByDayOfWeek(q),
    enabled: Boolean(q.restaurantId),
  });
}
