import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@repo/db';
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
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { resolvePeriod } from './period-range';

const COMPLETED_STATUSES: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.DELIVERED];
const CACHE_TTL_SECONDS = 15 * 60;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private get redis() {
    return this.redisService.client;
  }

  private async requireRestaurant() {
    const restaurant = await this.prisma.restaurant.findFirst();
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async overview(q: AnalyticsBaseQuery): Promise<AnalyticsOverviewDto> {
    const restaurant = await this.requireRestaurant();

    // Skip the redis cache under NODE_ENV=test. The e2e suite shares a single
    // Redis across the run (singleFork) and each analytics test seeds a fresh
    // order set in its `beforeEach`; a stale `analytics:overview:today` entry
    // from a prior test would otherwise mask the actual aggregate.
    const cacheable = q.period !== 'custom' && process.env.NODE_ENV !== 'test';
    const cacheKey = `analytics:overview:${q.period}`;
    if (cacheable) {
      const hit = await this.redis.get(cacheKey);
      if (hit) return JSON.parse(hit) as AnalyticsOverviewDto;
    }

    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });

    const [cur, prev] = await Promise.all([
      this.aggregateForRange(range.from, range.to),
      this.aggregateForRange(range.prevFrom, range.prevTo),
    ]);

    const newCustomerCount = await this.countNewCustomers(range.from, range.to);
    const prevNewCustomers = await this.countNewCustomers(range.prevFrom, range.prevTo);

    const liveOrdersCount = await this.prisma.order.count({
      where: {
        status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
      },
    });

    const result: AnalyticsOverviewDto = {
      revenue: moneyDelta(cur.revenue, prev.revenue),
      orders: numericDelta(cur.orderCount, prev.orderCount),
      aov: moneyDelta(cur.aov, prev.aov),
      completionRate: {
        value: cur.completionRate,
        delta: round2(cur.completionRate - prev.completionRate),
      },
      newCustomers: {
        value: newCustomerCount,
        delta: newCustomerCount - prevNewCustomers,
      },
      repeatRate: { value: cur.repeatRate },
      avgPrepMinutes: { value: cur.avgPrepMinutes },
      liveOrdersCount,
    };

    if (cacheable) {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    }
    return result;
  }

  async revenueTimeseries(q: RevenueTimeseriesQuery): Promise<RevenueTimeseriesPointDto[]> {
    const restaurant = await this.requireRestaurant();
    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });
    const granularity =
      q.granularity ?? (q.period === 'today' ? 'hour' : q.period === '7d' ? 'day' : 'day');

    // Bucket unit is a hardcoded literal chosen by the validated granularity
    // (no string interpolation of input → no injection), and bucketing is done
    // in the restaurant timezone so buckets align with the tz-local window
    // edges (consistent with salesByHour/salesByDayOfWeek).
    const tz = restaurant.timezone;
    const truncSql =
      granularity === 'hour'
        ? Prisma.sql`date_trunc('hour', "createdAt" AT TIME ZONE ${tz})`
        : granularity === 'week'
          ? Prisma.sql`date_trunc('week', "createdAt" AT TIME ZONE ${tz})`
          : Prisma.sql`date_trunc('day', "createdAt" AT TIME ZONE ${tz})`;
    const rows = await this.prisma.$queryRaw<
      { bucket: Date; revenue: Prisma.Decimal; orders: bigint }[]
    >`
      SELECT ${truncSql} AS bucket,
             SUM("grandTotal") AS revenue,
             COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "createdAt" >= ${range.from}
        AND "createdAt" < ${range.to}
        AND "status" = ANY(${COMPLETED_STATUSES}::text[]::"OrderStatus"[])
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      revenue: r.revenue?.toFixed(2) ?? '0.00',
      orders: Number(r.orders ?? 0),
    }));
  }

  async topItems(q: TopItemsQuery): Promise<TopItemDto[]> {
    const restaurant = await this.requireRestaurant();
    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          status: { in: COMPLETED_STATUSES },
          createdAt: { gte: range.from, lt: range.to },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: q.limit,
    });

    const items = await this.prisma.menuItem.findMany({
      where: { id: { in: grouped.map((g) => g.menuItemId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(items.map((i) => [i.id, i.name]));

    return grouped.map((g) => ({
      menuItemId: g.menuItemId,
      name: nameById.get(g.menuItemId) ?? 'Unknown',
      quantity: g._sum.quantity ?? 0,
      revenue: (g._sum.lineTotal ?? new Prisma.Decimal(0)).toFixed(2),
    }));
  }

  async ordersByStatus(q: AnalyticsBaseQuery): Promise<OrdersByStatusDto> {
    const restaurant = await this.requireRestaurant();
    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });

    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: range.from, lt: range.to },
      },
      _count: true,
    });
    return rows.map((r) => ({ status: r.status, count: r._count }));
  }

  async paymentMethods(q: AnalyticsBaseQuery): Promise<PaymentMethodsBreakdownDto> {
    const restaurant = await this.requireRestaurant();
    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });

    const rows = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        order: {
          createdAt: { gte: range.from, lt: range.to },
        },
        status: 'PAID',
      },
      _count: true,
      _sum: { amount: true },
    });
    return rows.map((r) => ({
      method: r.method,
      count: r._count,
      total: (r._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    }));
  }

  async salesByHour(q: AnalyticsBaseQuery): Promise<SalesByHourDto> {
    const restaurant = await this.requireRestaurant();
    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });

    const rows = await this.prisma.$queryRaw<
      { dow: number; hour: number; revenue: Prisma.Decimal; orders: bigint }[]
    >`
      SELECT EXTRACT(DOW FROM ("createdAt" AT TIME ZONE ${restaurant.timezone}))::int AS dow,
             EXTRACT(HOUR FROM ("createdAt" AT TIME ZONE ${restaurant.timezone}))::int AS hour,
             SUM("grandTotal") AS revenue,
             COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "createdAt" >= ${range.from}
        AND "createdAt" < ${range.to}
        AND "status" = ANY(${COMPLETED_STATUSES}::text[]::"OrderStatus"[])
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
    return rows.map((r) => ({
      dayOfWeek: Number(r.dow),
      hour: Number(r.hour),
      orders: Number(r.orders ?? 0),
      revenue: r.revenue?.toFixed(2) ?? '0.00',
    }));
  }

  async salesByDayOfWeek(q: AnalyticsBaseQuery): Promise<SalesByDayOfWeekDto> {
    const restaurant = await this.requireRestaurant();
    const range = resolvePeriod(q.period, restaurant.timezone, { from: q.from, to: q.to });

    const rows = await this.prisma.$queryRaw<
      { dow: number; revenue: Prisma.Decimal; orders: bigint }[]
    >`
      SELECT EXTRACT(DOW FROM ("createdAt" AT TIME ZONE ${restaurant.timezone}))::int AS dow,
             SUM("grandTotal") AS revenue,
             COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE "createdAt" >= ${range.from}
        AND "createdAt" < ${range.to}
        AND "status" = ANY(${COMPLETED_STATUSES}::text[]::"OrderStatus"[])
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((r) => ({
      dayOfWeek: Number(r.dow),
      orders: Number(r.orders ?? 0),
      revenue: r.revenue?.toFixed(2) ?? '0.00',
    }));
  }

  async customerRetention(q: CustomerRetentionQuery): Promise<CustomerRetentionDto> {
    // Pragmatic cohort retention: month-by-month for users who first ordered
    // during the cohort month, returning their repeat-order presence per
    // subsequent month for 6 periods. Only one cohort returned when specified.
    await this.requireRestaurant();

    const rows = await this.prisma.$queryRaw<
      { cohort: string; period_index: number; retained: bigint; cohort_size: bigint }[]
    >`
      WITH firsts AS (
        SELECT "userId", MIN(date_trunc('month', "createdAt")) AS cohort
        FROM "Order"
        WHERE "userId" IS NOT NULL
        GROUP BY "userId"
      ),
      orders_per_month AS (
        SELECT o."userId", date_trunc('month', o."createdAt") AS month
        FROM "Order" o
        WHERE o."userId" IS NOT NULL
        GROUP BY 1, 2
      ),
      cohort_sizes AS (
        SELECT cohort, COUNT(*)::bigint AS cohort_size
        FROM firsts
        GROUP BY cohort
      )
      SELECT to_char(f.cohort, 'YYYY-MM') AS cohort,
             EXTRACT(YEAR FROM age(opm.month, f.cohort))::int * 12 +
             EXTRACT(MONTH FROM age(opm.month, f.cohort))::int AS period_index,
             COUNT(DISTINCT opm."userId")::bigint AS retained,
             cs.cohort_size
      FROM firsts f
      JOIN orders_per_month opm ON opm."userId" = f."userId"
      JOIN cohort_sizes cs ON cs.cohort = f.cohort
      GROUP BY f.cohort, period_index, cs.cohort_size
      ORDER BY f.cohort, period_index
      LIMIT 200
    `;
    return rows
      .filter((r) => !q.cohortMonth || r.cohort === q.cohortMonth)
      .map((r) => ({
        cohort: r.cohort,
        periodIndex: Number(r.period_index),
        retainedCount: Number(r.retained),
        retainedPercent: r.cohort_size > 0n ? Number(r.retained) / Number(r.cohort_size) : 0,
      }));
  }

  // ---- Internal helpers --------------------------------------------------

  private async aggregateForRange(from: Date, to: Date) {
    const all = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { id: true, status: true, grandTotal: true, userId: true },
    });
    const completed = all.filter((o) => COMPLETED_STATUSES.includes(o.status));
    const revenue = completed.reduce(
      (sum, o) => sum.add(o.grandTotal),
      new Prisma.Decimal(0),
    );
    const orderCount = all.length;
    const aov =
      completed.length > 0 ? revenue.div(completed.length) : new Prisma.Decimal(0);
    // Completion rate is completed / (completed + cancelled) per the KPI
    // catalog — NOT completed / total, which would be unstable as in-flight
    // (PENDING/PREPARING) and REFUNDED orders inflate the denominator.
    const cancelledCount = all.filter((o) => o.status === 'CANCELLED').length;
    const completionDenom = completed.length + cancelledCount;
    const completionRate =
      completionDenom > 0 ? completed.length / completionDenom : 0;

    // Repeat rate: distinct users with ≥2 orders in window.
    const userCounts = new Map<string, number>();
    for (const o of completed) {
      if (!o.userId) continue;
      userCounts.set(o.userId, (userCounts.get(o.userId) ?? 0) + 1);
    }
    const uniqueUsers = userCounts.size;
    const repeatUsers = [...userCounts.values()].filter((c) => c >= 2).length;
    const repeatRate = uniqueUsers > 0 ? repeatUsers / uniqueUsers : 0;

    // Avg prep minutes: time from CONFIRMED to READY in OrderStatusEvent.
    const prep = await this.prisma.$queryRaw<{ avg_minutes: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (r."createdAt" - c."createdAt"))/60.0)::float AS avg_minutes
      FROM "OrderStatusEvent" c
      JOIN "OrderStatusEvent" r ON r."orderId" = c."orderId" AND r.status = 'READY'
      WHERE c.status = 'CONFIRMED'
        AND c."createdAt" >= ${from}
        AND c."createdAt" < ${to}
    `;
    const avgPrepMinutes = prep[0]?.avg_minutes ?? null;

    return {
      revenue: revenue.toFixed(2),
      orderCount,
      completedCount: completed.length,
      aov: aov.toFixed(2),
      completionRate: round4(completionRate),
      repeatRate: round4(repeatRate),
      avgPrepMinutes: avgPrepMinutes !== null ? Math.round(avgPrepMinutes * 10) / 10 : null,
    };
  }

  private async countNewCustomers(from: Date, to: Date): Promise<number> {
    // A "new customer" in the window is a user whose first order falls inside
    // [from, to).
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "userId", MIN("createdAt") AS first_at
        FROM "Order"
        WHERE "userId" IS NOT NULL
        GROUP BY "userId"
      ) firsts
      WHERE first_at >= ${from} AND first_at < ${to}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  // ---- Rollups -----------------------------------------------------------

  /**
   * Recompute the daily metric row for a given date. Idempotent.
   * Date is interpreted as a calendar day in the restaurant timezone.
   */
  async rollupDay(date: Date): Promise<void> {
    const restaurant = await this.prisma.restaurant.findFirst();
    if (!restaurant) return;
    const dayStart = startOfDayInTz(date, restaurant.timezone);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

    const agg = await this.aggregateForRange(dayStart, dayEnd);
    const newCustomerCount = await this.countNewCustomers(dayStart, dayEnd);

    const refundedCount = await this.prisma.order.count({
      where: {
        status: 'REFUNDED',
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });
    const cancelledCount = await this.prisma.order.count({
      where: {
        status: 'CANCELLED',
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    const dayDate = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate()));
    await this.prisma.dailyMetric.upsert({
      where: { date: dayDate },
      update: {
        revenue: new Prisma.Decimal(agg.revenue),
        orderCount: agg.orderCount,
        completedOrderCount: agg.completedCount,
        cancelledOrderCount: cancelledCount,
        refundedOrderCount: refundedCount,
        newCustomerCount,
        avgOrderValue: new Prisma.Decimal(agg.aov),
        avgPrepMinutes: agg.avgPrepMinutes,
      },
      create: {
        date: dayDate,
        revenue: new Prisma.Decimal(agg.revenue),
        orderCount: agg.orderCount,
        completedOrderCount: agg.completedCount,
        cancelledOrderCount: cancelledCount,
        refundedOrderCount: refundedCount,
        newCustomerCount,
        avgOrderValue: new Prisma.Decimal(agg.aov),
        avgPrepMinutes: agg.avgPrepMinutes,
      },
    });
  }
}

function moneyDelta(curStr: string, prevStr: string) {
  const cur = Number(curStr);
  const prev = Number(prevStr);
  return {
    value: curStr,
    delta: (cur - prev).toFixed(2),
    deltaPercent: prev === 0 ? 0 : round2((cur - prev) / prev),
  };
}

function numericDelta(cur: number, prev: number) {
  return {
    value: cur,
    delta: cur - prev,
    deltaPercent: prev === 0 ? 0 : round2((cur - prev) / prev),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function startOfDayInTz(d: Date, tz: string): Date {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
}
