import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AnalyticsBaseQuerySchema,
  CustomerRetentionQuerySchema,
  RevenueTimeseriesQuerySchema,
  TopItemsQuerySchema,
} from '@repo/types';
import type {
  AnalyticsBaseQuery,
  CustomerRetentionQuery,
  RevenueTimeseriesQuery,
  TopItemsQuery,
} from '@repo/types';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Permissions('analytics:read')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@Query(new ZodValidationPipe(AnalyticsBaseQuerySchema)) q: AnalyticsBaseQuery) {
    return this.analytics.overview(q);
  }

  @Get('revenue-timeseries')
  revenue(@Query(new ZodValidationPipe(RevenueTimeseriesQuerySchema)) q: RevenueTimeseriesQuery) {
    return this.analytics.revenueTimeseries(q);
  }

  @Get('top-items')
  topItems(@Query(new ZodValidationPipe(TopItemsQuerySchema)) q: TopItemsQuery) {
    return this.analytics.topItems(q);
  }

  @Get('orders-by-status')
  ordersByStatus(@Query(new ZodValidationPipe(AnalyticsBaseQuerySchema)) q: AnalyticsBaseQuery) {
    return this.analytics.ordersByStatus(q);
  }

  @Get('customer-retention')
  customerRetention(
    @Query(new ZodValidationPipe(CustomerRetentionQuerySchema)) q: CustomerRetentionQuery,
  ) {
    return this.analytics.customerRetention(q);
  }

  @Get('payment-methods')
  paymentMethods(@Query(new ZodValidationPipe(AnalyticsBaseQuerySchema)) q: AnalyticsBaseQuery) {
    return this.analytics.paymentMethods(q);
  }

  @Get('sales-by-hour')
  salesByHour(@Query(new ZodValidationPipe(AnalyticsBaseQuerySchema)) q: AnalyticsBaseQuery) {
    return this.analytics.salesByHour(q);
  }

  @Get('sales-by-day-of-week')
  salesByDow(@Query(new ZodValidationPipe(AnalyticsBaseQuerySchema)) q: AnalyticsBaseQuery) {
    return this.analytics.salesByDayOfWeek(q);
  }
}
