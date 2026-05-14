import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import {
  type AuditWritePayload,
  JOB_AUDIT_WRITE,
  QUEUE_AUDIT,
} from '@repo/jobs';
import type { AuditLogListDto, AuditLogListQuery } from '@repo/types';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

const MAX_DIFF_BYTES = 8 * 1024;

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_AUDIT) private readonly queue: Queue,
  ) {}

  async record(input: AuditWritePayload): Promise<void> {
    await this.queue.add(JOB_AUDIT_WRITE, this.truncate(input), {
      removeOnComplete: 1000,
      removeOnFail: 100,
    });
  }

  /** Worker entrypoint: actually insert the row. */
  async write(input: AuditWritePayload): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        restaurantId: input.restaurantId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        beforeJson: (input.beforeJson ?? null) as Prisma.InputJsonValue,
        afterJson: (input.afterJson ?? null) as Prisma.InputJsonValue,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async list(query: AuditLogListQuery): Promise<AuditLogListDto> {
    const limit = query.limit ?? 50;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        restaurantId: r.restaurantId,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        beforeJson: r.beforeJson,
        afterJson: r.afterJson,
        ip: r.ip,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  private truncate(input: AuditWritePayload): AuditWritePayload {
    const truncateJson = (v: unknown): unknown => {
      if (v === null || v === undefined) return v;
      const s = JSON.stringify(v);
      if (s.length <= MAX_DIFF_BYTES) return v;
      return { truncated: true, preview: s.slice(0, MAX_DIFF_BYTES) };
    };
    return {
      ...input,
      beforeJson: truncateJson(input.beforeJson),
      afterJson: truncateJson(input.afterJson),
    };
  }
}
