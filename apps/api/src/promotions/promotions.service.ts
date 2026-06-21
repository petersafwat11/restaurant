import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Promotion } from '@repo/db';
import type {
  CreatePromotionDto,
  PromotionDto,
  PromotionType,
  UpdatePromotionDto,
  ValidateCouponDto,
  ValidateCouponResponseDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { fail, validateCoupon } from './coupon-validation';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Promotion CRUD ----------------------------------------------------

  async list(activeOnly?: boolean, includeArchived = false): Promise<PromotionDto[]> {
    const rows = await this.prisma.promotion.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { redemptions: true } } },
    });
    return rows.map(toPromotionDto);
  }

  async archive(id: string): Promise<PromotionDto> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');
    const updated = await this.prisma.promotion.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date(), isActive: false },
      include: { _count: { select: { redemptions: true } } },
    });
    return toPromotionDto(updated);
  }

  async unarchive(id: string): Promise<PromotionDto> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');
    const updated = await this.prisma.promotion.update({
      where: { id },
      data: { isArchived: false, archivedAt: null },
      include: { _count: { select: { redemptions: true } } },
    });
    return toPromotionDto(updated);
  }

  async getById(id: string): Promise<PromotionDto> {
    const row = await this.prisma.promotion.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!row) throw new NotFoundException('Promotion not found');
    return toPromotionDto(row);
  }

  async create(dto: CreatePromotionDto): Promise<PromotionDto> {
    try {
      const row = await this.prisma.promotion.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          type: dto.type,
          value: dto.value ?? null,
          minSubtotal: dto.minSubtotal ?? null,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          isActive: dto.isActive ?? true,
          code: dto.code ? dto.code.toUpperCase() : null,
          maxRedemptions: dto.maxRedemptions ?? null,
          perUserLimit: dto.perUserLimit ?? 1,
        },
        include: { _count: { select: { redemptions: true } } },
      });
      return toPromotionDto(row);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Coupon code already in use');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<PromotionDto> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');

    try {
      const updated = await this.prisma.promotion.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...(dto.minSubtotal !== undefined ? { minSubtotal: dto.minSubtotal } : {}),
          ...(dto.startsAt !== undefined
            ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }
            : {}),
          ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.code !== undefined ? { code: dto.code ? dto.code.toUpperCase() : null } : {}),
          ...(dto.maxRedemptions !== undefined ? { maxRedemptions: dto.maxRedemptions } : {}),
          ...(dto.perUserLimit !== undefined ? { perUserLimit: dto.perUserLimit } : {}),
        },
        include: { _count: { select: { redemptions: true } } },
      });
      return toPromotionDto(updated);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Coupon code already in use');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<{ id: string }> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');
    await this.prisma.promotion.delete({ where: { id } });
    return { id: existing.id };
  }

  // ---- Validation --------------------------------------------------------

  async validate(dto: ValidateCouponDto): Promise<ValidateCouponResponseDto> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (!promotion) return fail('NOT_FOUND');

    const redemptionCount = await this.prisma.couponRedemption.count({
      where: { promotionId: promotion.id },
    });
    const perUserRedemptions = dto.userId
      ? await this.prisma.couponRedemption.count({
          where: { promotionId: promotion.id, userId: dto.userId },
        })
      : 0;

    return validateCoupon({
      promotion,
      subtotal: dto.subtotal,
      redemptionCount,
      perUserRedemptions,
    });
  }
}

// ---- Mappers ---------------------------------------------------------------

function toPromotionDto(
  row: Promotion & { _count: { redemptions: number } },
): PromotionDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as PromotionType,
    value: row.value ? row.value.toFixed(2) : null,
    minSubtotal: row.minSubtotal ? row.minSubtotal.toFixed(2) : null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    isActive: row.isActive,
    isArchived: row.isArchived,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    code: row.code,
    maxRedemptions: row.maxRedemptions,
    perUserLimit: row.perUserLimit,
    redemptionsCount: row._count.redemptions,
  };
}
