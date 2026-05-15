import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  SeoMetaDto,
  SeoMetaQuery,
  StructuredDataDto,
} from '@repo/types';
import {
  type SitemapEntry,
  buildRobots,
  buildSitemap,
  buildStructuredData,
} from '@repo/utils';
import { ENV, type ENV_TYPE } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: ENV_TYPE,
  ) {}

  private get baseUrl(): string {
    return this.env.APP_URL_WEB.replace(/\/+$/, '');
  }

  async structuredData(slug: string): Promise<StructuredDataDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        menus: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const agg = await this.prisma.review.aggregate({
      where: { isVisible: true, order: { restaurantId: restaurant.id } },
      _avg: { rating: true },
      _count: true,
    });

    const address = restaurant.address as Record<string, string | null | undefined>;
    const geo = restaurant.geoPoint as { lat?: number; lng?: number } | null;

    return buildStructuredData({
      restaurant: {
        name: restaurant.name,
        description: restaurant.description,
        url: `${this.baseUrl}`,
        telephone: restaurant.phone,
        email: restaurant.email,
        image: restaurant.coverUrl ?? restaurant.logoUrl,
        address: {
          line1: address?.line1 ?? undefined,
          line2: address?.line2 ?? undefined,
          city: address?.city ?? undefined,
          state: address?.state ?? undefined,
          zip: address?.zip ?? undefined,
          country: address?.country ?? undefined,
        },
        geo:
          geo && typeof geo.lat === 'number' && typeof geo.lng === 'number'
            ? { lat: geo.lat, lng: geo.lng }
            : null,
      },
      aggregateRating: {
        ratingValue:
          agg._count > 0 && agg._avg.rating != null
            ? Math.round(agg._avg.rating * 10) / 10
            : null,
        reviewCount: agg._count,
      },
      menu: {
        name: `${restaurant.name} Menu`,
        sections: restaurant.menus.map((c) => ({
          name: c.name,
          items: c.items.map((it) => ({
            name: it.name,
            description: it.description,
            price: it.basePrice.toFixed(2),
          })),
        })),
      },
      currency: restaurant.currency,
    });
  }

  async sitemap(): Promise<string> {
    const base = this.baseUrl;
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: {
        menus: {
          where: { isActive: true },
          include: { items: { where: { isAvailable: true } } },
        },
      },
    });

    const entries: SitemapEntry[] = [
      { loc: `${base}/`, changefreq: 'daily', priority: 1.0 },
      { loc: `${base}/menu`, changefreq: 'daily', priority: 0.9 },
      { loc: `${base}/about`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${base}/locations`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${base}/contact`, changefreq: 'yearly', priority: 0.3 },
      { loc: `${base}/reservations`, changefreq: 'monthly', priority: 0.6 },
    ];
    for (const r of restaurants) {
      for (const c of r.menus) {
        for (const it of c.items) {
          entries.push({
            loc: `${base}/menu/${c.slug}/${it.slug}`,
            changefreq: 'weekly',
            priority: 0.7,
          });
        }
      }
    }
    return buildSitemap(entries);
  }

  robots(): string {
    return buildRobots({ sitemapUrl: `${this.baseUrl}/sitemap.xml` });
  }

  async meta(query: SeoMetaQuery): Promise<SeoMetaDto> {
    const restaurant = query.restaurantId
      ? await this.prisma.restaurant.findUnique({ where: { id: query.restaurantId } })
      : await this.prisma.restaurant.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
    const name = restaurant?.name ?? 'Restaurant';
    const path = query.path.startsWith('/') ? query.path : `/${query.path}`;
    const titleByPath: Record<string, string> = {
      '/': `${name} — Order online`,
      '/menu': `Menu — ${name}`,
      '/about': `About — ${name}`,
      '/locations': `Locations — ${name}`,
      '/contact': `Contact — ${name}`,
      '/reservations': `Reservations — ${name}`,
    };
    return {
      title: titleByPath[path] ?? `${name}`,
      description:
        restaurant?.description ?? `Order from ${name} for delivery or pickup.`,
      image: restaurant?.coverUrl ?? restaurant?.logoUrl ?? null,
      canonical: `${this.baseUrl}${path}`,
    };
  }
}
