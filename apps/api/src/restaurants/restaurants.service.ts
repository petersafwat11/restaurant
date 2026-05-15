import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OperatingHours, Prisma, Restaurant } from '@repo/db';
import type {
  CreateRestaurantDto,
  OperatingHoursDto,
  RestaurantAdminDto,
  RestaurantPublicDto,
  UpdateOperatingHoursDto,
  UpdateRestaurantDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';

const CACHE_TTL_SECONDS = 300;
const LIST_KEY = 'restaurants:list';
const slugKey = (slug: string) => `restaurant:slug:${slug}`;

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(): Promise<RestaurantPublicDto[]> {
    return this.cache.getOrSet<RestaurantPublicDto[]>(LIST_KEY, CACHE_TTL_SECONDS, async () => {
      const rows = await this.prisma.restaurant.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      return rows.map((r) => toPublic(r));
    });
  }

  async getBySlug(slug: string): Promise<RestaurantPublicDto> {
    return this.cache.getOrSet<RestaurantPublicDto>(slugKey(slug), CACHE_TTL_SECONDS, async () => {
      const row = await this.prisma.restaurant.findUnique({
        where: { slug },
        include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
      });
      if (!row || !row.isActive) throw new NotFoundException('Restaurant not found');
      return toPublic(row, row.hours);
    });
  }

  async create(dto: CreateRestaurantDto): Promise<RestaurantAdminDto> {
    const existing = await this.prisma.restaurant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Slug already in use');

    const created = await this.prisma.restaurant.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
        coverUrl: dto.coverUrl ?? null,
        phone: dto.phone,
        email: dto.email,
        address: dto.address as Prisma.InputJsonValue,
        geoPoint: (dto.geoPoint ?? null) as Prisma.InputJsonValue,
        timezone: dto.timezone ?? 'Europe/Warsaw',
        currency: dto.currency ?? 'PLN',
      },
    });
    await this.cache.invalidate(LIST_KEY);
    return toAdmin(created);
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<RestaurantAdminDto> {
    const current = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Restaurant not found');

    const updated = await this.prisma.restaurant.update({
      where: { id },
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
      },
    });
    await this.cache.invalidate([LIST_KEY, slugKey(current.slug)]);
    if (dto.slug && dto.slug !== current.slug) {
      await this.cache.invalidate(slugKey(dto.slug));
    }
    return toAdmin(updated);
  }

  async getHours(restaurantId: string): Promise<OperatingHoursDto[]> {
    const exists = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, slug: true },
    });
    if (!exists) throw new NotFoundException('Restaurant not found');

    const rows = await this.prisma.operatingHours.findMany({
      where: { restaurantId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return rows.map(toHoursDto);
  }

  async updateHours(
    restaurantId: string,
    dto: UpdateOperatingHoursDto,
  ): Promise<OperatingHoursDto[]> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

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
          where: {
            restaurantId_dayOfWeek: {
              restaurantId,
              dayOfWeek: h.dayOfWeek,
            },
          },
          update: {
            opensAt: h.opensAt,
            closesAt: h.closesAt,
            isClosed: h.isClosed,
          },
          create: {
            restaurantId,
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

    await this.cache.invalidate([LIST_KEY, slugKey(restaurant.slug)]);
    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(toHoursDto);
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
    isActive: row.isActive,
    ...(hours ? { hours: hours.map(toHoursDto) } : {}),
  };
}

function toAdmin(row: Restaurant): RestaurantAdminDto {
  return {
    ...toPublic(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toHoursDto(row: OperatingHours): OperatingHoursDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    dayOfWeek: row.dayOfWeek,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    isClosed: row.isClosed,
  };
}
