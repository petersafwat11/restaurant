import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type {
  DeliveryZoneCheckResponseDto,
  DeliveryZoneDto,
  HolidayDto,
  RestaurantSettingsDto,
  UpdateRestaurantSettingsDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryZoneService } from './delivery-zone.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zones: DeliveryZoneService,
  ) {}

  async get(restaurantId: string): Promise<RestaurantSettingsDto> {
    const r = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) throw new NotFoundException('Restaurant not found');
    return {
      restaurantId: r.id,
      taxRate: r.taxRate.toString(),
      defaultDeliveryFee: r.defaultDeliveryFee.toFixed(2),
      minOrderAmount: r.minOrderAmount.toFixed(2),
      deliveryZones: (r.deliveryZones as unknown as DeliveryZoneDto[]) ?? [],
      holidayDates: (r.holidayDates as unknown as HolidayDto[]) ?? [],
      reservationSlotMinutes: r.reservationSlotMinutes,
      reservationBufferMinutes: r.reservationBufferMinutes,
      timezone: r.timezone,
      currency: r.currency,
    };
  }

  async update(
    restaurantId: string,
    dto: UpdateRestaurantSettingsDto,
  ): Promise<RestaurantSettingsDto> {
    const data: Prisma.RestaurantUpdateInput = {};
    if (dto.taxRate !== undefined) data.taxRate = new Prisma.Decimal(dto.taxRate);
    if (dto.defaultDeliveryFee !== undefined) {
      data.defaultDeliveryFee = new Prisma.Decimal(dto.defaultDeliveryFee);
    }
    if (dto.minOrderAmount !== undefined) {
      data.minOrderAmount = new Prisma.Decimal(dto.minOrderAmount);
    }
    if (dto.deliveryZones !== undefined) {
      data.deliveryZones = dto.deliveryZones as unknown as Prisma.InputJsonValue;
    }
    if (dto.reservationSlotMinutes !== undefined) {
      data.reservationSlotMinutes = dto.reservationSlotMinutes;
    }
    if (dto.reservationBufferMinutes !== undefined) {
      data.reservationBufferMinutes = dto.reservationBufferMinutes;
    }
    await this.prisma.restaurant.update({ where: { id: restaurantId }, data });
    return this.get(restaurantId);
  }

  async addHoliday(restaurantId: string, holiday: HolidayDto): Promise<RestaurantSettingsDto> {
    const r = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) throw new NotFoundException('Restaurant not found');
    const list = ((r.holidayDates as unknown as HolidayDto[]) ?? []).filter(
      (h) => h.date !== holiday.date,
    );
    list.push(holiday);
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { holidayDates: list as unknown as Prisma.InputJsonValue },
    });
    return this.get(restaurantId);
  }

  async removeHoliday(restaurantId: string, date: string): Promise<RestaurantSettingsDto> {
    const r = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) throw new NotFoundException('Restaurant not found');
    const list = ((r.holidayDates as unknown as HolidayDto[]) ?? []).filter(
      (h) => h.date !== date,
    );
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { holidayDates: list as unknown as Prisma.InputJsonValue },
    });
    return this.get(restaurantId);
  }

  async checkDeliveryZone(
    restaurantId: string,
    lat: number,
    lng: number,
  ): Promise<DeliveryZoneCheckResponseDto> {
    const r = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) throw new NotFoundException('Restaurant not found');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid coordinates');
    }
    const zones = (r.deliveryZones as unknown as DeliveryZoneDto[]) ?? [];
    const zone = this.zones.findZone(zones, lat, lng);
    return {
      matched: zone !== null,
      zone,
      fee: zone?.fee ?? null,
      minOrderAmount: zone?.minOrderAmount ?? null,
    };
  }
}
