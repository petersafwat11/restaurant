import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type {
  CreateCustomerNoteDto,
  CustomerDetailDto,
  CustomerListDto,
  CustomerListQuery,
  CustomerSegment,
  CustomerSummaryDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerSegmentsService } from './customer-segments.service';

const COMPLETED_STATUSES = ['COMPLETED', 'DELIVERED'] as const;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly segments: CustomerSegmentsService,
  ) {}

  async list(query: CustomerListQuery): Promise<CustomerListDto> {
    const limit = query.limit ?? 30;

    // Base set: users with the customer role only. Filter optionally by
    // restaurantId via the order join.
    const where: Prisma.UserWhereInput = {
      roles: { some: { role: { key: 'customer' } } },
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.restaurantId
        ? { orders: { some: { restaurantId: query.restaurantId } } }
        : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = users.length > limit;
    const slice = hasMore ? users.slice(0, limit) : users;

    const summaries = await Promise.all(
      slice.map((u) => this.toSummary(u, query.restaurantId)),
    );

    const filtered = query.segment
      ? summaries.filter((s) => s.segment === query.segment)
      : summaries;

    return {
      items: filtered,
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  async get(id: string, restaurantId?: string): Promise<CustomerDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: { take: 10 },
        paymentMethods: { take: 10 },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    // Scope aggregates/orders/reviews to the requested restaurant when given so
    // staff don't see a customer's activity across other (competitor) tenants.
    const summary = await this.toSummary(user, restaurantId);

    const orders = await this.prisma.order.findMany({
      where: { userId: id, ...(restaurantId ? { restaurantId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const reviewCount = await this.prisma.review.count({
      where: { userId: id, ...(restaurantId ? { order: { restaurantId } } : {}) },
    });

    const notes = await this.prisma.customerNote.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      ...summary,
      addresses: user.addresses.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        city: a.city,
      })),
      paymentMethods: user.paymentMethods.map((p) => ({
        id: p.id,
        brand: p.brand,
        last4: p.last4,
      })),
      recentOrders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        grandTotal: o.grandTotal.toFixed(2),
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
      })),
      reviewCount,
      notes: notes.map((n) => ({
        id: n.id,
        userId: n.userId,
        byUserId: n.byUserId,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async addNote(userId: string, byUserId: string, dto: CreateCustomerNoteDto) {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Customer not found');

    const created = await this.prisma.customerNote.create({
      data: { userId, byUserId, body: dto.body },
    });
    return {
      id: created.id,
      userId: created.userId,
      byUserId: created.byUserId,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    };
  }

  private async toSummary(
    user: {
      id: string;
      email: string;
      phone: string | null;
      firstName: string | null;
      lastName: string | null;
      createdAt: Date;
    },
    restaurantId?: string,
  ): Promise<CustomerSummaryDto> {
    const where: Prisma.OrderWhereInput = {
      userId: user.id,
      status: { in: [...COMPLETED_STATUSES] },
      ...(restaurantId ? { restaurantId } : {}),
    };

    const agg = await this.prisma.order.aggregate({
      where,
      _count: true,
      _sum: { grandTotal: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });

    const ninety = new Date(Date.now() - 90 * 24 * 60 * 60_000);
    const ordersLast90Days = await this.prisma.order.count({
      where: { ...where, createdAt: { gte: ninety } },
    });

    const lifetimeOrders = agg._count;
    const lifetimeSpend = agg._sum.grandTotal ?? null;
    const segment: CustomerSegment | null = this.segments.classify({
      lifetimeOrders,
      lifetimeSpend: lifetimeSpend ? Number(lifetimeSpend.toString()) : 0,
      firstOrderAt: agg._min.createdAt,
      lastOrderAt: agg._max.createdAt,
      accountCreatedAt: user.createdAt,
      ordersLast90Days,
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      lifetimeOrders,
      lifetimeSpend: (lifetimeSpend ?? '0.00').toString(),
      lastOrderAt: agg._max.createdAt?.toISOString() ?? null,
      firstOrderAt: agg._min.createdAt?.toISOString() ?? null,
      segment,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
