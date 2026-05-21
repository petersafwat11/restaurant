import { OrderStatus, Prisma } from '@repo/db';
import type { ExportKind } from '@repo/types';
import type { PrismaService } from '../prisma/prisma.service';

const COMPLETED: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.DELIVERED];

export interface ReportRunInput {
  from?: Date;
  to?: Date;
}

export interface GeneratedReport {
  csv: string;
  rowCount: number;
}

const UTF8_BOM = '﻿';

function csv(rows: (string | number)[][]): string {
  return (
    UTF8_BOM +
    rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(','),
      )
      .join('\n')
  );
}

export async function runReport(
  kind: ExportKind,
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  switch (kind) {
    case 'sales-by-item':
      return salesByItem(input, prisma);
    case 'sales-by-category':
      return salesByCategory(input, prisma);
    case 'sales-by-hour':
      return salesByHour(input, prisma);
    case 'sales-by-day-of-week':
      return salesByDayOfWeek(input, prisma);
    case 'tax-summary':
      return taxSummary(input, prisma);
    case 'payment-methods':
      return paymentMethods(input, prisma);
    case 'customer-retention':
      return customerRetention(input, prisma);
    case 'orders-detail':
      return ordersDetail(input, prisma);
    case 'customers':
      return customersExport(input, prisma);
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown report kind: ${_exhaustive as string}`);
    }
  }
}

async function salesByItem(input: ReportRunInput, prisma: PrismaService): Promise<GeneratedReport> {
  const grouped = await prisma.orderItem.groupBy({
    by: ['menuItemId', 'nameSnapshot'],
    where: {
      order: {
        status: { in: COMPLETED },
        ...(input.from || input.to ? { createdAt: between(input.from, input.to) } : {}),
      },
    },
    _sum: { quantity: true, lineTotal: true },
  });
  const rows: (string | number)[][] = [
    ['menuItemId', 'name', 'qty', 'revenue', 'avgPrice'],
    ...grouped.map((g) => {
      const qty = g._sum.quantity ?? 0;
      const rev = (g._sum.lineTotal ?? new Prisma.Decimal(0)).toFixed(2);
      const avg = qty > 0 ? (Number(rev) / qty).toFixed(2) : '0.00';
      return [g.menuItemId, g.nameSnapshot, qty, rev, avg];
    }),
  ];
  return { csv: csv(rows), rowCount: grouped.length };
}

async function salesByCategory(
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  const rows = await prisma.$queryRaw<{ category: string; qty: bigint; revenue: Prisma.Decimal }[]>`
    SELECT mc.name AS category,
           SUM(oi.quantity)::bigint AS qty,
           SUM(oi."lineTotal") AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "MenuItem" mi ON mi.id = oi."menuItemId"
    JOIN "MenuCategory" mc ON mc.id = mi."categoryId"
    WHERE o.status = ANY(${COMPLETED}::text[]::"OrderStatus"[])
      ${input.from ? Prisma.sql`AND o."createdAt" >= ${input.from}` : Prisma.empty}
      ${input.to ? Prisma.sql`AND o."createdAt" < ${input.to}` : Prisma.empty}
    GROUP BY mc.name
    ORDER BY revenue DESC NULLS LAST
  `;
  const out: (string | number)[][] = [
    ['category', 'qty', 'revenue'],
    ...rows.map((r) => [r.category, Number(r.qty), r.revenue?.toFixed(2) ?? '0.00']),
  ];
  return { csv: csv(out), rowCount: rows.length };
}

async function salesByHour(input: ReportRunInput, prisma: PrismaService): Promise<GeneratedReport> {
  const rows = await prisma.$queryRaw<{ hour: number; qty: bigint; revenue: Prisma.Decimal }[]>`
    SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
           COUNT(*)::bigint AS qty,
           SUM("grandTotal") AS revenue
    FROM "Order"
    WHERE status = ANY(${COMPLETED}::text[]::"OrderStatus"[])
      ${input.from ? Prisma.sql`AND "createdAt" >= ${input.from}` : Prisma.empty}
      ${input.to ? Prisma.sql`AND "createdAt" < ${input.to}` : Prisma.empty}
    GROUP BY hour
    ORDER BY hour
  `;
  const out: (string | number)[][] = [
    ['hour', 'qty', 'revenue'],
    ...rows.map((r) => [Number(r.hour), Number(r.qty), r.revenue?.toFixed(2) ?? '0.00']),
  ];
  return { csv: csv(out), rowCount: rows.length };
}

async function salesByDayOfWeek(
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  const rows = await prisma.$queryRaw<{ dow: number; qty: bigint; revenue: Prisma.Decimal }[]>`
    SELECT EXTRACT(DOW FROM "createdAt")::int AS dow,
           COUNT(*)::bigint AS qty,
           SUM("grandTotal") AS revenue
    FROM "Order"
    WHERE status = ANY(${COMPLETED}::text[]::"OrderStatus"[])
      ${input.from ? Prisma.sql`AND "createdAt" >= ${input.from}` : Prisma.empty}
      ${input.to ? Prisma.sql`AND "createdAt" < ${input.to}` : Prisma.empty}
    GROUP BY dow
    ORDER BY dow
  `;
  const out: (string | number)[][] = [
    ['dayOfWeek', 'qty', 'revenue'],
    ...rows.map((r) => [Number(r.dow), Number(r.qty), r.revenue?.toFixed(2) ?? '0.00']),
  ];
  return { csv: csv(out), rowCount: rows.length };
}

async function taxSummary(input: ReportRunInput, prisma: PrismaService): Promise<GeneratedReport> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: COMPLETED },
      ...(input.from || input.to ? { createdAt: between(input.from, input.to) } : {}),
    },
    select: { subtotal: true, taxTotal: true, discountTotal: true, grandTotal: true },
  });
  const refunds = await prisma.refund.aggregate({
    where: {
      payment: {
        order: {
          ...(input.from || input.to ? { createdAt: between(input.from, input.to) } : {}),
        },
      },
    },
    _sum: { amount: true },
  });

  const sum = orders.reduce(
    (acc, o) => ({
      subtotal: acc.subtotal.add(o.subtotal),
      tax: acc.tax.add(o.taxTotal),
      discount: acc.discount.add(o.discountTotal),
      total: acc.total.add(o.grandTotal),
    }),
    {
      subtotal: new Prisma.Decimal(0),
      tax: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(0),
    },
  );
  const refundTotal = refunds._sum.amount ?? new Prisma.Decimal(0);
  const out: (string | number)[][] = [
    ['subtotal', 'tax', 'discount', 'total', 'refunds'],
    [
      sum.subtotal.toFixed(2),
      sum.tax.toFixed(2),
      sum.discount.toFixed(2),
      sum.total.toFixed(2),
      refundTotal.toFixed(2),
    ],
  ];
  return { csv: csv(out), rowCount: 1 };
}

async function paymentMethods(
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  const rows = await prisma.payment.groupBy({
    by: ['method'],
    where: {
      status: 'PAID',
      order: {
        ...(input.from || input.to ? { createdAt: between(input.from, input.to) } : {}),
      },
    },
    _count: true,
    _sum: { amount: true },
  });
  const out: (string | number)[][] = [
    ['method', 'count', 'total'],
    ...rows.map((r) => [r.method, r._count, r._sum.amount?.toFixed(2) ?? '0.00']),
  ];
  return { csv: csv(out), rowCount: rows.length };
}

async function customerRetention(
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  const rows = await prisma.$queryRaw<
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
      SELECT cohort, COUNT(*)::bigint AS cohort_size FROM firsts GROUP BY cohort
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
  `;
  const out: (string | number)[][] = [
    ['cohort', 'periodIndex', 'retainedCount', 'cohortSize', 'retainedPercent'],
    ...rows.map((r) => [
      r.cohort,
      Number(r.period_index),
      Number(r.retained),
      Number(r.cohort_size),
      r.cohort_size > 0n
        ? ((Number(r.retained) / Number(r.cohort_size)) * 100).toFixed(2)
        : '0.00',
    ]),
  ];
  return { csv: csv(out), rowCount: rows.length };
}

async function ordersDetail(
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        ...(input.from || input.to ? { createdAt: between(input.from, input.to) } : {}),
      },
    },
    include: { order: true },
    orderBy: { order: { createdAt: 'asc' } },
  });
  const out: (string | number)[][] = [
    [
      'orderNumber',
      'createdAt',
      'status',
      'item',
      'qty',
      'unitPrice',
      'lineTotal',
      'currency',
    ],
    ...items.map((it) => [
      it.order.orderNumber,
      it.order.createdAt.toISOString(),
      it.order.status,
      it.nameSnapshot,
      it.quantity,
      it.unitPrice.toFixed(2),
      it.lineTotal.toFixed(2),
      it.order.currency,
    ]),
  ];
  return { csv: csv(out), rowCount: items.length };
}

async function customersExport(
  input: ReportRunInput,
  prisma: PrismaService,
): Promise<GeneratedReport> {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      email: string;
      phone: string | null;
      firstName: string | null;
      lastName: string | null;
      createdAt: Date;
      lifetimeOrders: bigint;
      lifetimeSpend: Prisma.Decimal | null;
      firstOrderAt: Date | null;
      lastOrderAt: Date | null;
    }[]
  >`
    SELECT u.id, u.email, u.phone, u."firstName", u."lastName", u."createdAt",
           COALESCE(o.cnt, 0)::bigint AS "lifetimeOrders",
           o.total AS "lifetimeSpend",
           o.first_at AS "firstOrderAt",
           o.last_at AS "lastOrderAt"
    FROM "User" u
    JOIN "UserRole" ur ON ur."userId" = u.id
    JOIN "Role" r ON r.id = ur."roleId" AND r.key = 'customer'
    LEFT JOIN (
      SELECT "userId",
             COUNT(*)::bigint AS cnt,
             SUM("grandTotal") AS total,
             MIN("createdAt") AS first_at,
             MAX("createdAt") AS last_at
      FROM "Order"
      WHERE status = ANY(${COMPLETED}::text[]::"OrderStatus"[])
        ${input.from ? Prisma.sql`AND "createdAt" >= ${input.from}` : Prisma.empty}
        ${input.to ? Prisma.sql`AND "createdAt" < ${input.to}` : Prisma.empty}
      GROUP BY "userId"
    ) o ON o."userId" = u.id
    ORDER BY u."createdAt" DESC
  `;
  const out: (string | number)[][] = [
    [
      'customerId',
      'email',
      'phone',
      'firstName',
      'lastName',
      'createdAt',
      'lifetimeOrders',
      'lifetimeSpend',
      'firstOrderAt',
      'lastOrderAt',
    ],
    ...rows.map((r) => [
      r.id,
      r.email,
      r.phone ?? '',
      r.firstName ?? '',
      r.lastName ?? '',
      r.createdAt.toISOString(),
      Number(r.lifetimeOrders),
      r.lifetimeSpend?.toFixed(2) ?? '0.00',
      r.firstOrderAt?.toISOString() ?? '',
      r.lastOrderAt?.toISOString() ?? '',
    ]),
  ];
  return { csv: csv(out), rowCount: rows.length };
}

function between(from?: Date, to?: Date): Prisma.DateTimeFilter {
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lt: to } : {}),
  };
}
