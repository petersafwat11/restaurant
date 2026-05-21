import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OperatingHours, Prisma, Restaurant } from '@repo/db';
import type {
  OperatingHoursDto,
  RestaurantAdminDto,
  RestaurantPublicDto,
  UpdateOperatingHoursDto,
  UpdateRestaurantDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';

const CACHE_TTL_SECONDS = 300;
// Single-restaurant project — one cached entry covers all reads. v3 = post
// restaurantId drop (cart/menu/etc. no longer carry it).
const PUBLIC_KEY = 'restaurant:public:v3';

/**
 * Single-restaurant project (decision: drop restaurantId everywhere).
 *
 * Every method here operates on the lone `Restaurant` row. Internal callers
 * that need the singleton id can use `requireRestaurantId()` — but most
 * downstream services don't need it any more since the FK columns are gone.
 */
@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async get(): Promise<RestaurantPublicDto> {
    return this.cache.getOrSet<RestaurantPublicDto>(PUBLIC_KEY, CACHE_TTL_SECONDS, async () => {
      const row = await this.prisma.restaurant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!row || !row.isActive) throw new NotFoundException('Restaurant not configured');
      const hours = await this.prisma.operatingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
      return toPublic(row, hours);
    });
  }

  async getAdmin(): Promise<RestaurantAdminDto> {
    const row = await this.prisma.restaurant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!row) throw new NotFoundException('Restaurant not configured');
    const hours = await this.prisma.operatingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    return {
      ...toPublic(row, hours),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(dto: UpdateRestaurantDto): Promise<RestaurantAdminDto> {
    const current = await this.prisma.restaurant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!current) throw new NotFoundException('Restaurant not configured');

    if (dto.slug && dto.slug !== current.slug) {
      const collide = await this.prisma.restaurant.findUnique({ where: { slug: dto.slug } });
      if (collide && collide.id !== current.id) {
        throw new ConflictException('Slug already in use');
      }
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: current.id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.address !== undefined ? { address: dto.address as Prisma.InputJsonValue } : {}),
        ...(dto.geoPoint !== undefined ? { geoPoint: dto.geoPoint as Prisma.InputJsonValue } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.acceptsReservations !== undefined
          ? { acceptsReservations: dto.acceptsReservations }
          : {}),
        ...(dto.acceptsDelivery !== undefined ? { acceptsDelivery: dto.acceptsDelivery } : {}),
        ...(dto.acceptsPickup !== undefined ? { acceptsPickup: dto.acceptsPickup } : {}),
        ...(dto.acceptsDineIn !== undefined ? { acceptsDineIn: dto.acceptsDineIn } : {}),
      },
    });
    await this.cache.invalidate(PUBLIC_KEY);
    const hours = await this.prisma.operatingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    return {
      ...toPublic(updated, hours),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getHours(): Promise<OperatingHoursDto[]> {
    const rows = await this.prisma.operatingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    return rows.map(toHoursDto);
  }

  async updateHours(dto: UpdateOperatingHoursDto): Promise<OperatingHoursDto[]> {
    const seen = new Set<number>();
    for (const h of dto.hours) {
      if (seen.has(h.dayOfWeek)) {
        throw new ConflictException(`Duplicate dayOfWeek ${h.dayOfWeek} in hours payload`);
      }
      seen.add(h.dayOfWeek);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const out: OperatingHours[] = [];
      for (const h of dto.hours) {
        const row = await tx.operatingHours.upsert({
          where: { dayOfWeek: h.dayOfWeek },
          update: {
            opensAt: h.opensAt,
            closesAt: h.closesAt,
            isClosed: h.isClosed,
          },
          create: {
            dayOfWeek: h.dayOfWeek,
            opensAt: h.opensAt,
            closesAt: h.closesAt,
            isClosed: h.isClosed,
          },
        });
        out.push(row);
      }
      return out;
    });

    await this.cache.invalidate(PUBLIC_KEY);
    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(toHoursDto);
  }

  /** Returns the singleton restaurant id (needed by a few legacy callers). */
  async requireRestaurantId(): Promise<string> {
    const row = await this.prisma.restaurant.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Restaurant not configured');
    return row.id;
  }
}

function toPublic(row: Restaurant, hours?: OperatingHours[]): RestaurantPublicDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logoUrl: row.logoUrl,
    coverUrl: row.coverUrl,
    phone: row.phone,
    email: row.email,
    address: row.address as RestaurantPublicDto['address'],
    geoPoint: row.geoPoint as RestaurantPublicDto['geoPoint'],
    timezone: row.timezone,
    currency: row.currency,
    defaultDeliveryFee: row.defaultDeliveryFee.toFixed(2),
    minOrderAmount: row.minOrderAmount.toFixed(2),
    isActive: row.isActive,
    acceptsReservations: row.acceptsReservations,
    acceptsDelivery: row.acceptsDelivery,
    acceptsPickup: row.acceptsPickup,
    acceptsDineIn: row.acceptsDineIn,
    ...(hours ? { hours: hours.map(toHoursDto) } : {}),
  };
}

function toHoursDto(row: OperatingHours): OperatingHoursDto {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    isClosed: row.isClosed,
  };
}
