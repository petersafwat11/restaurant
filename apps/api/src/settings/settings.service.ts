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

  private async requireRestaurant() {
    const r = await this.prisma.restaurant.findFirst();
    if (!r) throw new NotFoundException('Restaurant not found');
    return r;
  }

  async get(): Promise<RestaurantSettingsDto> {
    const r = await this.requireRestaurant();
    return {
      taxRate: r.taxRate.toString(),
      defaultDeliveryFee: r.defaultDeliveryFee.toFixed(2),
      minOrderAmount: r.minOrderAmount.toFixed(2),
      deliveryZones: ((r.deliveryZones as unknown as DeliveryZoneDto[]) ?? []).map((z) => ({
        id: z.id,
        name: z.name,
        polygon: z.polygon,
      })),
      holidayDates: (r.holidayDates as unknown as HolidayDto[]) ?? [],
      reservationSlotMinutes: r.reservationSlotMinutes,
      reservationBufferMinutes: r.reservationBufferMinutes,
      timezone: r.timezone,
      currency: r.currency,
    };
  }

  async update(dto: UpdateRestaurantSettingsDto): Promise<RestaurantSettingsDto> {
    const r = await this.requireRestaurant();
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
    await this.prisma.restaurant.update({ where: { id: r.id }, data });
    return this.get();
  }

  async addHoliday(holiday: HolidayDto): Promise<RestaurantSettingsDto> {
    const r = await this.requireRestaurant();
    const list = ((r.holidayDates as unknown as HolidayDto[]) ?? []).filter(
      (h) => h.date !== holiday.date,
    );
    list.push(holiday);
    await this.prisma.restaurant.update({
      where: { id: r.id },
      data: { holidayDates: list as unknown as Prisma.InputJsonValue },
    });
    return this.get();
  }

  async removeHoliday(date: string): Promise<RestaurantSettingsDto> {
    const r = await this.requireRestaurant();
    const list = ((r.holidayDates as unknown as HolidayDto[]) ?? []).filter(
      (h) => h.date !== date,
    );
    await this.prisma.restaurant.update({
      where: { id: r.id },
      data: { holidayDates: list as unknown as Prisma.InputJsonValue },
    });
    return this.get();
  }

  async checkDeliveryZone(
    lat: number,
    lng: number,
  ): Promise<DeliveryZoneCheckResponseDto> {
    const r = await this.requireRestaurant();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid coordinates');
    }
    const zones = (r.deliveryZones as unknown as DeliveryZoneDto[]) ?? [];
    const zone = this.zones.findZone(zones, lat, lng);
    return {
      matched: zone !== null,
      zone: zone ? { id: zone.id, name: zone.name, polygon: zone.polygon } : null,
    };
  }

  async getPublicDeliveryZones(): Promise<DeliveryZoneDto[]> {
    const r = await this.prisma.restaurant.findFirst({ select: { deliveryZones: true } });
    if (!r) throw new NotFoundException('Restaurant not found');
    const zones = (r.deliveryZones as unknown as DeliveryZoneDto[]) ?? [];
    // Strip legacy fields (fee, minOrderAmount) that may linger in JSON from
    // older saves — slim schema is { id, name, polygon }.
    return zones.map((z) => ({ id: z.id, name: z.name, polygon: z.polygon }));
  }
}
