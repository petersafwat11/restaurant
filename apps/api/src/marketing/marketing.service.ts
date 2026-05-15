import { Injectable, NotFoundException } from '@nestjs/common';
import type { Restaurant } from '@repo/db';
import type {
  AboutDataDto,
  AggregateRatingDto,
  LandingDataDto,
  LocationSummaryDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async landing(restaurantId?: string): Promise<LandingDataDto> {
    const restaurant = await this.resolveRestaurant(restaurantId);

    const [featured, specials, aggregateRating, locations] = await Promise.all([
      this.prisma.menuItem.findMany({
        where: {
          isAvailable: true,
          isFeatured: true,
          category: { restaurantId: restaurant.id },
        },
        include: {
          category: { select: { slug: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
        orderBy: { position: 'asc' },
        take: 12,
      }),
      this.activeSpecials(restaurant.id),
      this.aggregateRating(restaurant.id),
      this.locationSummaries(),
    ]);

    return {
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
        coverUrl: restaurant.coverUrl,
      },
      featuredItems: featured.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        description: i.description,
        basePrice: i.basePrice.toFixed(2),
        imageUrl: i.images[0]?.url ?? null,
        categorySlug: i.category.slug,
      })),
      specials,
      aggregateRating,
      locations,
    };
  }

  async about(restaurantId?: string): Promise<AboutDataDto> {
    const restaurant = await this.resolveRestaurant(restaurantId);
    const aggregateRating = await this.aggregateRating(restaurant.id);
    return {
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        description: restaurant.description,
        phone: restaurant.phone,
        email: restaurant.email,
        address: restaurant.address,
      },
      aggregateRating,
    };
  }

  private async resolveRestaurant(restaurantId?: string): Promise<Restaurant> {
    const restaurant = restaurantId
      ? await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
      : await this.prisma.restaurant.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  private async activeSpecials(restaurantId: string) {
    const now = new Date();
    const promos = await this.prisma.promotion.findMany({
      where: {
        restaurantId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { name: 'asc' },
      take: 8,
    });
    return promos.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      value: p.value ? p.value.toFixed(2) : null,
    }));
  }

  private async aggregateRating(restaurantId: string): Promise<AggregateRatingDto> {
    const agg = await this.prisma.review.aggregate({
      where: { isVisible: true, order: { restaurantId } },
      _avg: { rating: true },
      _count: true,
    });
    return {
      ratingValue:
        agg._count > 0 && agg._avg.rating != null
          ? Math.round(agg._avg.rating * 10) / 10
          : null,
      reviewCount: agg._count,
    };
  }

  private async locationSummaries(): Promise<LocationSummaryDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: { hours: true },
      orderBy: { createdAt: 'asc' },
    });
    return restaurants.map((r) => {
      const dow = weekdayInTz(new Date(), r.timezone);
      const today = r.hours.find((h) => h.dayOfWeek === dow);
      const geo = r.geoPoint as { lat?: number; lng?: number } | null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        phone: r.phone,
        address: r.address,
        geoPoint:
          geo && typeof geo.lat === 'number' && typeof geo.lng === 'number'
            ? { lat: geo.lat, lng: geo.lng }
            : null,
        todayHours: today
          ? {
              opensAt: today.opensAt,
              closesAt: today.closesAt,
              isClosed: today.isClosed,
            }
          : null,
      };
    });
  }
}

function weekdayInTz(date: Date, tz: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz });
    return WEEKDAY_INDEX[fmt.format(date)] ?? date.getUTCDay();
  } catch {
    return date.getUTCDay();
  }
}
