import { z } from 'zod';

const MoneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

export const ANALYTICS_PERIODS = ['today', '7d', '30d', 'custom'] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const ANALYTICS_GRANULARITIES = ['hour', 'day', 'week'] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

const NumericDeltaSchema = z.object({
  value: z.number(),
  delta: z.number(),
  deltaPercent: z.number(),
});

const MoneyDeltaSchema = z.object({
  value: MoneyStringSchema,
  delta: MoneyStringSchema,
  deltaPercent: z.number(),
});

export const AnalyticsOverviewSchema = z.object({
  revenue: MoneyDeltaSchema,
  orders: NumericDeltaSchema,
  aov: MoneyDeltaSchema,
  completionRate: z.object({ value: z.number(), delta: z.number() }),
  newCustomers: z.object({ value: z.number(), delta: z.number() }),
  repeatRate: z.object({ value: z.number() }),
  avgPrepMinutes: z.object({ value: z.number().nullable() }),
  liveOrdersCount: z.number(),
});
export type AnalyticsOverviewDto = z.infer<typeof AnalyticsOverviewSchema>;

export const AnalyticsBaseQuerySchema = z.object({
  period: z.enum(ANALYTICS_PERIODS).default('today'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AnalyticsBaseQuery = z.infer<typeof AnalyticsBaseQuerySchema>;

export const RevenueTimeseriesQuerySchema = AnalyticsBaseQuerySchema.extend({
  granularity: z.enum(ANALYTICS_GRANULARITIES).optional(),
});
export type RevenueTimeseriesQuery = z.infer<typeof RevenueTimeseriesQuerySchema>;

export const RevenueTimeseriesPointSchema = z.object({
  bucket: z.string(),
  revenue: MoneyStringSchema,
  orders: z.number().int().min(0),
});
export type RevenueTimeseriesPointDto = z.infer<typeof RevenueTimeseriesPointSchema>;

export const RevenueTimeseriesSchema = z.array(RevenueTimeseriesPointSchema);

export const TopItemsQuerySchema = AnalyticsBaseQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type TopItemsQuery = z.infer<typeof TopItemsQuerySchema>;

export const TopItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(0),
  revenue: MoneyStringSchema,
});
export type TopItemDto = z.infer<typeof TopItemSchema>;
export const TopItemsSchema = z.array(TopItemSchema);

export const OrdersByStatusSchema = z.array(
  z.object({ status: z.string(), count: z.number().int().min(0) }),
);
export type OrdersByStatusDto = z.infer<typeof OrdersByStatusSchema>;

export const PaymentMethodsBreakdownSchema = z.array(
  z.object({
    method: z.string(),
    count: z.number().int().min(0),
    total: MoneyStringSchema,
  }),
);
export type PaymentMethodsBreakdownDto = z.infer<typeof PaymentMethodsBreakdownSchema>;

export const SalesByHourSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    hour: z.number().int().min(0).max(23),
    orders: z.number().int().min(0),
    revenue: MoneyStringSchema,
  }),
);
export type SalesByHourDto = z.infer<typeof SalesByHourSchema>;

export const SalesByDayOfWeekSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    orders: z.number().int().min(0),
    revenue: MoneyStringSchema,
  }),
);
export type SalesByDayOfWeekDto = z.infer<typeof SalesByDayOfWeekSchema>;

export const CustomerRetentionQuerySchema = z.object({
  cohortMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});
export type CustomerRetentionQuery = z.infer<typeof CustomerRetentionQuerySchema>;

export const CustomerRetentionSchema = z.array(
  z.object({
    cohort: z.string(),
    periodIndex: z.number().int().min(0),
    retainedCount: z.number().int().min(0),
    retainedPercent: z.number(),
  }),
);
export type CustomerRetentionDto = z.infer<typeof CustomerRetentionSchema>;
