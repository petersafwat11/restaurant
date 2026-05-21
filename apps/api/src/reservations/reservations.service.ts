import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@repo/db';
import type {
  AvailabilityResponseDto,
  CreateReservationDto,
  CreateTableDto,
  MoveReservationDto,
  ReservationDto,
  ReservationListDto,
  ReservationListQuery,
  ReservationStatus,
  TableDto,
  UpdateReservationDto,
  UpdateTableDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationAvailabilityService } from './reservation-availability.service';

interface Actor {
  userId: string | null;
  permissions: string[];
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: ReservationAvailabilityService,
    private readonly events: EventEmitter2,
  ) {}

  private async requireRestaurant() {
    const r = await this.prisma.restaurant.findFirst();
    if (!r) throw new NotFoundException('Restaurant not configured');
    return r;
  }

  // ---- Availability ------------------------------------------------------

  async getAvailability(query: {
    date: string;
    partySize: number;
  }): Promise<AvailabilityResponseDto> {
    const restaurant = await this.requireRestaurant();

    const hours = await this.prisma.operatingHours.findMany();
    const tables = await this.prisma.table.findMany({
      select: { id: true, capacity: true },
    });

    const dayStart = new Date(`${query.date}T00:00:00Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
    const existing = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['confirmed', 'seated'] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { startAt: true, endAt: true, tableId: true },
    });

    const slots = this.availability.generate({
      restaurant,
      hours,
      tables,
      existing,
      date: query.date,
      partySize: query.partySize,
      now: new Date(),
    });
    return { slots };
  }

  // ---- Create -----------------------------------------------------------

  async create(actor: Actor, dto: CreateReservationDto): Promise<ReservationDto> {
    const restaurant = await this.requireRestaurant();

    const startAt = new Date(dto.startAt);
    const slotMs = restaurant.reservationSlotMinutes * 60_000;
    const endAt = new Date(startAt.getTime() + slotMs);

    let created;
    try {
      created = await this.prisma.$transaction(
        async (tx) => {
          const tables = await tx.table.findMany({
            select: { id: true, capacity: true },
          });
          const overlapping = await tx.reservation.findMany({
            where: {
              status: { in: ['confirmed', 'seated'] },
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
            select: { tableId: true },
          });

          const occupied = new Set(overlapping.map((r) => r.tableId).filter(Boolean));
          const candidate = [...tables]
            .filter((t) => !occupied.has(t.id) && t.capacity >= dto.partySize)
            .sort((a, b) => a.capacity - b.capacity)[0];

          if (!candidate) {
            throw new BadRequestException('No tables available for this slot');
          }

          return tx.reservation.create({
            data: {
              userId: actor.userId,
              tableId: candidate.id,
              guestCount: dto.partySize,
              startAt,
              endAt,
              status: 'confirmed',
              contactName: dto.contactName,
              contactPhone: dto.contactPhone,
              notes: dto.notes ?? null,
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const msg = (err as Error).message ?? '';
      const code = (err as { code?: string }).code ?? '';
      if (
        code === 'P2034' ||
        msg.includes('could not serialize') ||
        msg.includes('serialization') ||
        msg.includes('40001')
      ) {
        throw new BadRequestException('Slot taken by a concurrent booking');
      }
      throw err;
    }

    this.events.emit('reservation.created', {
      reservationId: created.id,
      userId: created.userId,
      startAt: created.startAt.toISOString(),
      contactEmail: dto.contactEmail ?? null,
    });

    return toDto(created);
  }

  // ---- Read --------------------------------------------------------------

  async list(actor: Actor, query: ReservationListQuery): Promise<ReservationListDto> {
    if (!actor.permissions.includes('reservation:read')) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const limit = query.limit ?? 20;
    const where: Prisma.ReservationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            startAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.reservation.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map(toDto),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  async listMine(actor: Actor): Promise<ReservationListDto> {
    if (!actor.userId) throw new ForbiddenException('Sign in to view reservations');
    const rows = await this.prisma.reservation.findMany({
      where: { userId: actor.userId },
      orderBy: { startAt: 'desc' },
      take: 50,
    });
    return { items: rows.map(toDto), nextCursor: null };
  }

  async getById(actor: Actor, id: string): Promise<ReservationDto> {
    const row = await this.prisma.reservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Reservation not found');

    const canAny = actor.permissions.includes('reservation:read');
    const isMine = actor.userId !== null && row.userId === actor.userId;
    if (!canAny && !isMine) throw new NotFoundException('Reservation not found');

    return toDto(row);
  }

  // ---- Lifecycle ---------------------------------------------------------

  async update(actor: Actor, id: string, dto: UpdateReservationDto): Promise<ReservationDto> {
    const row = await this.prisma.reservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Reservation not found');

    const canAdmin = actor.permissions.includes('reservation:write');
    const isMine = actor.userId !== null && row.userId === actor.userId;

    if (!canAdmin && !isMine) throw new ForbiddenException('Not yours');

    if (!canAdmin) {
      const within24h = row.startAt.getTime() - Date.now() < 24 * 60 * 60_000;
      if (within24h && (dto.startAt || dto.partySize)) {
        throw new BadRequestException(
          'Cannot change time or party size within 24h of the reservation',
        );
      }
      if (dto.tableId) throw new ForbiddenException('Cannot change table');
    }

    const data: Prisma.ReservationUpdateInput = {};
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (canAdmin && dto.tableId !== undefined) {
      data.table = dto.tableId === null ? { disconnect: true } : { connect: { id: dto.tableId } };
    }
    if (dto.startAt) data.startAt = new Date(dto.startAt);
    if (dto.partySize) data.guestCount = dto.partySize;

    const updated = await this.prisma.reservation.update({ where: { id }, data });
    return toDto(updated);
  }

  async move(actor: Actor, id: string, dto: MoveReservationDto): Promise<ReservationDto> {
    if (!actor.permissions.includes('reservation:write')) {
      throw new ForbiddenException('Not allowed to move reservations');
    }
    const existing = await this.prisma.reservation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reservation not found');
    if (existing.status === 'cancelled' || existing.status === 'completed' || existing.status === 'no_show') {
      throw new BadRequestException('Cannot move a finalized reservation');
    }

    const restaurant = await this.requireRestaurant();

    const startAt = new Date(dto.startAt);
    const slotMs = restaurant.reservationSlotMinutes * 60_000;
    const endAt = new Date(startAt.getTime() + slotMs);
    const targetTableId = dto.tableId !== undefined ? dto.tableId : existing.tableId;

    try {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          if (targetTableId) {
            const conflict = await tx.reservation.findFirst({
              where: {
                id: { not: id },
                tableId: targetTableId,
                status: { in: ['confirmed', 'seated'] },
                startAt: { lt: endAt },
                endAt: { gt: startAt },
              },
              select: { id: true },
            });
            if (conflict) {
              throw new ConflictException({
                message: 'Target table is already booked for that window',
                conflictingReservationId: conflict.id,
              });
            }
          }
          return tx.reservation.update({
            where: { id },
            data: {
              startAt,
              endAt,
              ...(targetTableId
                ? { table: { connect: { id: targetTableId } } }
                : { table: { disconnect: true } }),
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
      return toDto(updated);
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      if (err instanceof BadRequestException) throw err;
      const code = (err as { code?: string }).code ?? '';
      const msg = (err as Error).message ?? '';
      if (code === 'P2034' || msg.includes('could not serialize')) {
        throw new ConflictException({ message: 'Concurrent edit — retry' });
      }
      throw err;
    }
  }

  async cancel(actor: Actor, id: string, reason: string): Promise<ReservationDto> {
    const row = await this.prisma.reservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Reservation not found');

    const canAdmin = actor.permissions.includes('reservation:write');
    const isMine = actor.userId !== null && row.userId === actor.userId;
    if (!canAdmin && !isMine) throw new ForbiddenException('Not yours');

    if (row.status !== 'confirmed' && row.status !== 'seated') {
      throw new BadRequestException(`Cannot cancel from status ${row.status}`);
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: row.notes ? `${row.notes}\n[cancelled: ${reason}]` : `[cancelled: ${reason}]`,
      },
    });

    this.events.emit('reservation.cancelled', {
      reservationId: updated.id,
      userId: updated.userId,
      reason,
    });

    return toDto(updated);
  }

  async transition(
    actor: Actor,
    id: string,
    to: Exclude<ReservationStatus, 'cancelled'>,
    extra: { tableId?: string } = {},
  ): Promise<ReservationDto> {
    if (!actor.permissions.includes('reservation:write')) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const row = await this.prisma.reservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Reservation not found');

    const allowed: Record<string, ReservationStatus[]> = {
      confirmed: ['seated', 'no_show'],
      seated: ['completed'],
    };
    const next = allowed[row.status] ?? [];
    if (!next.includes(to)) {
      throw new BadRequestException(`Cannot transition ${row.status} → ${to}`);
    }

    if (to === 'seated' && !extra.tableId && !row.tableId) {
      throw new BadRequestException('Table assignment required to seat');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: to,
        ...(extra.tableId ? { tableId: extra.tableId } : {}),
      },
    });

    this.events.emit(`reservation.${to}`, {
      reservationId: updated.id,
    });

    return toDto(updated);
  }

  async sweepNoShows(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - 30 * 60_000);
    const candidates = await this.prisma.reservation.findMany({
      where: { status: 'confirmed', startAt: { lt: cutoff } },
      select: { id: true },
    });
    if (candidates.length === 0) return 0;

    await this.prisma.reservation.updateMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      data: { status: 'no_show' },
    });
    return candidates.length;
  }

  // ---- Tables ------------------------------------------------------------

  async listTables(): Promise<TableDto[]> {
    const rows = await this.prisma.table.findMany({ orderBy: { name: 'asc' } });
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
    }));
  }

  async createTable(dto: CreateTableDto): Promise<TableDto> {
    const created = await this.prisma.table.create({
      data: { name: dto.name, capacity: dto.capacity },
    });
    return {
      id: created.id,
      name: created.name,
      capacity: created.capacity,
    };
  }

  async updateTable(id: string, dto: UpdateTableDto): Promise<TableDto> {
    const updated = await this.prisma.table.update({
      where: { id },
      data: { ...(dto.name && { name: dto.name }), ...(dto.capacity && { capacity: dto.capacity }) },
    });
    return {
      id: updated.id,
      name: updated.name,
      capacity: updated.capacity,
    };
  }

  async deleteTable(id: string): Promise<void> {
    await this.prisma.table.delete({ where: { id } });
  }
}

function toDto(row: {
  id: string;
  userId: string | null;
  tableId: string | null;
  guestCount: number;
  startAt: Date;
  endAt: Date;
  status: string;
  contactName: string;
  contactPhone: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ReservationDto {
  return {
    id: row.id,
    userId: row.userId,
    tableId: row.tableId,
    guestCount: row.guestCount,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status as ReservationDto['status'],
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
