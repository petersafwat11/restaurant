import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Coupon, Promotion } from '@repo/db';
import type {
  CouponDto,
  CreateCouponDto,
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

  async list(activeOnly?: boolean): Promise<PromotionDto[]> {
    const rows = await this.prisma.promotion.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
    return rows.map(toPromotionDto);
  }

  async getById(id: string): Promise<PromotionDto> {
    const row = await this.prisma.promotion.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Promotion not found');
    return toPromotionDto(row);
  }

  async create(dto: CreatePromotionDto): Promise<PromotionDto> {
    const row = await this.prisma.promotion.create({
      data: {
        restaurantId: dto.restaurantId,
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type,
        value: dto.value ?? null,
        minSubtotal: dto.minSubtotal ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
    return toPromotionDto(row);
  }

  async update(id: string, dto: UpdatePromotionDto): Promise<PromotionDto> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');

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
      },
    });
    return toPromotionDto(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promotion not found');
    await this.prisma.promotion.delete({ where: { id } });
  }

  // ---- Coupon CRUD -------------------------------------------------------

  async listCoupons(promotionId: string): Promise<CouponDto[]> {
    const rows = await this.prisma.coupon.findMany({
      where: { promotionId },
      include: { _count: { select: { redemptions: true } } },
      orderBy: { code: 'asc' },
    });
    return rows.map(toCouponDto);
  }

  async createCoupon(promotionId: string, dto: CreateCouponDto): Promise<CouponDto> {
    const promo = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });
    if (!promo) throw new NotFoundException('Promotion not found');

    try {
      const created = await this.prisma.coupon.create({
        data: {
          promotionId,
          code: dto.code.toUpperCase(),
          maxRedemptions: dto.maxRedemptions ?? null,
          perUserLimit: dto.perUserLimit ?? 1,
        },
      });
      return toCouponDto({ ...created, _count: { redemptions: 0 } });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Coupon code already in use');
      }
      throw err;
    }
  }

  async removeCoupon(id: string): Promise<void> {
    const redemptions = await this.prisma.couponRedemption.count({
      where: { couponId: id },
    });
    if (redemptions > 0) {
      // Soft-disable by setting maxRedemptions to 0 so it can't be used again
      // without losing the redemption history.
      await this.prisma.coupon.update({
        where: { id },
        data: { maxRedemptions: 0 },
      });
      return;
    }
    await this.prisma.coupon.delete({ where: { id } });
  }

  // ---- Validation --------------------------------------------------------

  async validate(dto: ValidateCouponDto): Promise<ValidateCouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
      include: { promotion: true },
    });
    if (!coupon) return fail('NOT_FOUND');

    const redemptionCount = await this.prisma.couponRedemption.count({
      where: { couponId: coupon.id },
    });
    const perUserRedemptions = dto.userId
      ? await this.prisma.couponRedemption.count({
          where: { couponId: coupon.id, userId: dto.userId },
        })
      : 0;

    return validateCoupon({
      coupon,
      subtotal: dto.subtotal,
      redemptionCount,
      perUserRedemptions,
      restaurantId: dto.restaurantId,
    });
  }
}

// ---- Mappers ---------------------------------------------------------------

function toPromotionDto(row: Promotion): PromotionDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    description: row.description,
    type: row.type as PromotionType,
    value: row.value ? row.value.toFixed(2) : null,
    minSubtotal: row.minSubtotal ? row.minSubtotal.toFixed(2) : null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    isActive: row.isActive,
  };
}

function toCouponDto(row: Coupon & { _count: { redemptions: number } }): CouponDto {
  return {
    id: row.id,
    promotionId: row.promotionId,
    code: row.code,
    maxRedemptions: row.maxRedemptions,
    perUserLimit: row.perUserLimit,
    redemptionsCount: row._count.redemptions,
  };
}
