import { existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QUEUE_REPORTS, JOB_REPORTS_GENERATE } from '@repo/jobs';
import type { CreateExportDto, ExportDto, ExportStatus } from '@repo/types';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { runReport } from './report-generators';

const EXPORT_DIR = process.env.EXPORTS_DIR ?? join(tmpdir(), 'restaurant-exports');
const INLINE_ROW_LIMIT = 10_000;
const RETENTION_DAYS = 30;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_REPORTS) private readonly queue: Queue,
  ) {
    if (!existsSync(EXPORT_DIR)) mkdirSync(EXPORT_DIR, { recursive: true });
  }

  async create(actorUserId: string, dto: CreateExportDto): Promise<ExportDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
      select: { id: true, slug: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60_000);
    const rec = await this.prisma.export.create({
      data: {
        requestedByUserId: actorUserId,
        restaurantId: dto.restaurantId,
        kind: dto.kind,
        params: { ...(dto.params ?? {}), format: dto.format } as unknown as import('@repo/db').Prisma.InputJsonValue,
        status: 'queued',
        expiresAt,
      },
    });

    // Try inline. If row estimate is small, run synchronously to return READY.
    const inline = await this.tryInline(rec.id, dto, restaurant.slug);
    if (inline) return inline;

    await this.queue.add(JOB_REPORTS_GENERATE, { exportId: rec.id });
    return toDto(rec);
  }

  async list(actorUserId: string, permissions: string[]): Promise<ExportDto[]> {
    const where = permissions.includes('report:read')
      ? {}
      : { requestedByUserId: actorUserId };
    const rows = await this.prisma.export.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(toDto);
  }

  async getById(actorUserId: string, permissions: string[], id: string): Promise<ExportDto> {
    const row = await this.prisma.export.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Export not found');
    if (row.requestedByUserId !== actorUserId && !permissions.includes('report:read')) {
      throw new ForbiddenException('Not yours');
    }
    return toDto(row);
  }

  async download(
    actorUserId: string,
    permissions: string[],
    id: string,
  ): Promise<{ filename: string; content: Buffer; contentType: string }> {
    const row = await this.prisma.export.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Export not found');
    if (row.requestedByUserId !== actorUserId && !permissions.includes('report:read')) {
      throw new ForbiddenException('Not yours');
    }
    if (row.status !== 'ready') throw new BadRequestException(`Export is ${row.status}`);
    if (row.expiresAt < new Date()) {
      throw new GoneException('Export expired');
    }
    if (!row.filePath) throw new NotFoundException('Export file missing');

    const fs = await import('node:fs/promises');
    const content = await fs.readFile(row.filePath);
    const format = (row.params as { format?: string } | null)?.format ?? 'csv';
    return {
      filename: this.filenameFor(row.kind, row.restaurantId ?? 'restaurant', format),
      content,
      contentType: format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8',
    };
  }

  /**
   * Called by the BullMQ processor. Idempotent.
   */
  async processExport(id: string): Promise<void> {
    const row = await this.prisma.export.findUnique({ where: { id } });
    if (!row) return;
    if (row.status === 'ready' || row.status === 'failed') return;

    await this.prisma.export.update({
      where: { id },
      data: { status: 'processing' },
    });

    try {
      const params = (row.params ?? {}) as { from?: string; to?: string; format?: string };
      const report = await runReport(
        row.kind as Parameters<typeof runReport>[0],
        {
          restaurantId: row.restaurantId ?? '',
          from: params.from ? new Date(params.from) : undefined,
          to: params.to ? new Date(params.to) : undefined,
        },
        this.prisma,
      );

      const restaurant = row.restaurantId
        ? await this.prisma.restaurant.findUnique({
            where: { id: row.restaurantId },
            select: { slug: true },
          })
        : null;
      const slug = restaurant?.slug ?? 'restaurant';
      const filename = this.filenameFor(row.kind, slug, params.format ?? 'csv');
      const filePath = join(EXPORT_DIR, `${id}-${filename}`);
      await writeFile(filePath, report.csv, 'utf8');
      const size = statSync(filePath).size;

      await this.prisma.export.update({
        where: { id },
        data: { status: 'ready', filePath, fileSize: size, completedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.export.update({
        where: { id },
        data: { status: 'failed', errorMessage: (err as Error).message },
      });
    }
  }

  /** Daily cleanup — invoked by the cleanup job. */
  async cleanupExpired(): Promise<number> {
    const expired = await this.prisma.export.findMany({
      where: { expiresAt: { lt: new Date() }, filePath: { not: null } },
    });
    let removed = 0;
    const fs = await import('node:fs/promises');
    for (const e of expired) {
      if (e.filePath) {
        await fs.unlink(e.filePath).catch(() => {
          /* file may already be gone */
        });
      }
      await this.prisma.export.delete({ where: { id: e.id } });
      removed++;
    }
    return removed;
  }

  private async tryInline(
    exportId: string,
    dto: CreateExportDto,
    restaurantSlug: string,
  ): Promise<ExportDto | null> {
    // Estimate row count for inline-vs-async decision.
    const estimate = await this.estimateRows(dto);
    if (estimate > INLINE_ROW_LIMIT) return null;

    const params = dto.params ?? {};
    const report = await runReport(
      dto.kind,
      {
        restaurantId: dto.restaurantId,
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
      },
      this.prisma,
    );
    const filename = this.filenameFor(dto.kind, restaurantSlug, dto.format);
    const filePath = join(EXPORT_DIR, `${exportId}-${filename}`);
    await writeFile(filePath, report.csv, 'utf8');
    const size = statSync(filePath).size;
    const updated = await this.prisma.export.update({
      where: { id: exportId },
      data: { status: 'ready', filePath, fileSize: size, completedAt: new Date() },
    });
    return toDto(updated);
  }

  private async estimateRows(dto: CreateExportDto): Promise<number> {
    if (dto.kind === 'orders-detail') {
      const from = dto.params?.from ? new Date(dto.params.from) : undefined;
      const to = dto.params?.to ? new Date(dto.params.to) : undefined;
      const count = await this.prisma.orderItem.count({
        where: {
          order: {
            restaurantId: dto.restaurantId,
            ...(from || to
              ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
              : {}),
          },
        },
      });
      return count;
    }
    return 0; // other kinds are bounded
  }

  private filenameFor(kind: string, slug: string, format: string): string {
    const ts = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '-')
      .slice(0, 13);
    return `${kind}-${slug}-${ts}.${format}`;
  }
}

function toDto(row: {
  id: string;
  requestedByUserId: string;
  restaurantId: string | null;
  kind: string;
  status: string;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  expiresAt: Date;
  params: unknown;
}): ExportDto {
  const params = (row.params ?? {}) as { format?: string };
  return {
    id: row.id,
    requestedByUserId: row.requestedByUserId,
    restaurantId: row.restaurantId,
    kind: row.kind as ExportDto['kind'],
    format: (params.format ?? 'csv') as ExportDto['format'],
    status: row.status as ExportStatus,
    fileSize: row.fileSize,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
  };
}
