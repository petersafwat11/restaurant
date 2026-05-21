import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { JOB_EMAIL_PROMO, QUEUE_EMAIL } from '@repo/jobs';
import type {
  BroadcastEmailDto,
  BroadcastEmailResponseDto,
  BulkTagCustomersDto,
  BulkTagCustomersResponseDto,
  CreateCustomerNoteDto,
  CreateCustomerTagDto,
  CustomerDetailDto,
  CustomerExportQuery,
  CustomerListDto,
  CustomerListQuery,
  CustomerSegment,
  CustomerSummaryDto,
  CustomerTagDto,
} from '@repo/types';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  CSV_CONTENT_TYPE,
  PDF_CONTENT_TYPE,
  assertWithinRowCap,
  buildCsv,
  buildPdf,
  exportFilename,
} from '../common/table-export';
import { buildSearchWhere } from '../common/table-search/build-search-where';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerSegmentsService } from './customer-segments.service';
import { CUSTOMER_EXPORT_COLUMNS } from './customers.export-columns';
import { CUSTOMER_SEARCH_DESCRIPTORS } from './customers.search-descriptor';

const COMPLETED_STATUSES = ['COMPLETED', 'DELIVERED'] as const;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly segments: CustomerSegmentsService,
    @InjectQueue(QUEUE_EMAIL) private readonly emailQueue: Queue,
  ) {}

  async list(query: CustomerListQuery): Promise<CustomerListDto> {
    const limit = query.limit ?? 30;
    const where = this.buildListWhere({ search: query.search });

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = users.length > limit;
    const slice = hasMore ? users.slice(0, limit) : users;

    const summaries = await Promise.all(slice.map((u) => this.toSummary(u)));

    const filtered = query.segment
      ? summaries.filter((s) => s.segment === query.segment)
      : summaries;

    return {
      items: filtered,
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Where-builder for the admin customers list. Used by both `list` and
   * `exportList` to keep the filter surface aligned. Segment filtering is
   * applied *after* summary aggregation since it's a computed field — same
   * as the list method's behavior today.
   */
  private buildListWhere(input: {
    search?: string;
  }): Prisma.UserWhereInput {
    return {
      roles: { some: { role: { key: 'customer' } } },
      ...(buildSearchWhere(
        CUSTOMER_SEARCH_DESCRIPTORS,
        input.search,
      ) as Prisma.UserWhereInput),
    };
  }

  /**
   * CSV / PDF export of the admin customers list — same filter surface as
   * `list`, no pagination. Caps at 50k rows for CSV / 1k for PDF.
   *
   * Segment is computed from order aggregates, so the segment filter (if
   * provided) is applied after summary aggregation. Row cap is checked
   * against the *user* count before aggregation; the post-filter result may
   * be smaller but never larger, so cap enforcement stays correct.
   */
  async exportList(
    query: CustomerExportQuery,
  ): Promise<{ filename: string; content: Buffer; contentType: string }> {
    const where = this.buildListWhere({ search: query.search });

    const count = await this.prisma.user.count({ where });
    assertWithinRowCap(count, query.format, 'customers');

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const summaries = await Promise.all(users.map((u) => this.toSummary(u)));
    const rows = query.segment
      ? summaries.filter((s) => s.segment === query.segment)
      : summaries;

    const slug = await this.restaurantSlug();
    const filename = exportFilename('customers', slug, query.format);

    if (query.format === 'pdf') {
      const content = await buildPdf(rows, CUSTOMER_EXPORT_COLUMNS, {
        title: 'Customers',
        generatedAt: `Generated ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      });
      return { filename, content, contentType: PDF_CONTENT_TYPE };
    }
    const content = buildCsv(rows, CUSTOMER_EXPORT_COLUMNS);
    return { filename, content, contentType: CSV_CONTENT_TYPE };
  }

  private async restaurantSlug(): Promise<string> {
    const r = await this.prisma.restaurant.findFirst({ select: { slug: true } });
    if (!r) throw new NotFoundException('Restaurant not found');
    return r.slug;
  }

  async get(id: string): Promise<CustomerDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: { take: 10 },
        paymentMethods: { take: 10 },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const summary = await this.toSummary(user);

    const orders = await this.prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const reviewCount = await this.prisma.review.count({
      where: { userId: id },
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

  // ---- Tags --------------------------------------------------------------

  async listTags(): Promise<CustomerTagDto[]> {
    const rows = await this.prisma.customerTag.findMany({ orderBy: { label: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.label,
      color: r.color,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createTag(dto: CreateCustomerTagDto): Promise<CustomerTagDto> {
    try {
      const row = await this.prisma.customerTag.create({
        data: {
          slug: dto.slug.toLowerCase(),
          label: dto.label,
          color: dto.color ?? null,
        },
      });
      return {
        id: row.id,
        slug: row.slug,
        label: row.label,
        color: row.color,
        createdAt: row.createdAt.toISOString(),
      };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new BadRequestException('Tag slug already exists');
      }
      throw err;
    }
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.prisma.customerTag.delete({ where: { id: tagId } });
  }

  async bulkTag(
    dto: BulkTagCustomersDto,
    actorUserId: string,
  ): Promise<BulkTagCustomersResponseDto> {
    const tag = await this.prisma.customerTag.findUnique({ where: { id: dto.tagId } });
    if (!tag) throw new NotFoundException('Tag not found');

    if (dto.action === 'REMOVE') {
      const res = await this.prisma.userTag.deleteMany({
        where: { tagId: dto.tagId, userId: { in: dto.userIds } },
      });
      return { affected: res.count };
    }

    // ADD: skip duplicates via createMany skipDuplicates.
    const rows = dto.userIds.map((userId) => ({
      userId,
      tagId: dto.tagId,
      byUserId: actorUserId,
    }));
    const res = await this.prisma.userTag.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return { affected: res.count };
  }

  async broadcastEmail(
    dto: BroadcastEmailDto,
    actorUserId: string,
  ): Promise<BroadcastEmailResponseDto> {
    // Resolve recipient set: explicit userIds win; else segment+restaurant filter.
    let users: { id: string; email: string; firstName: string | null }[];
    if (dto.userIds && dto.userIds.length > 0) {
      users = await this.prisma.user.findMany({
        where: { id: { in: dto.userIds }, isActive: true },
        select: { id: true, email: true, firstName: true },
      });
    } else {
      // v1: explicit userIds only. Segment broadcast requires a server-side
      // aggregation to avoid an N+1 over 5k candidates; tracked separately.
      throw new BadRequestException(
        dto.segment
          ? 'Segment-based broadcast is not yet supported; pass explicit userIds'
          : 'Provide userIds (segment broadcast not yet supported)',
      );
    }

    if (users.length === 0) {
      throw new BadRequestException('No recipients matched');
    }

    const campaignId = randomUUID();
    await this.emailQueue.add(JOB_EMAIL_PROMO, {
      campaignId,
      subject: dto.subject,
      body: dto.body,
      fromUserId: actorUserId,
      recipients: users.map((u) => ({
        userId: u.id,
        email: u.email,
        name: u.firstName,
      })),
    });

    return { queued: users.length, campaignId };
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
  ): Promise<CustomerSummaryDto> {
    const where: Prisma.OrderWhereInput = {
      userId: user.id,
      status: { in: [...COMPLETED_STATUSES] },
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
