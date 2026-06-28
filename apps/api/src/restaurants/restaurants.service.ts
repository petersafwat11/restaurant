import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type OperatingHours, Prisma, type Restaurant } from '@repo/db';
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
// restaurantId drop (cart/menu/etc. no longer carry it). v4 = estimated*Minutes
// split into Min/Max range pairs. v5 = added nested `legal` block (legal entity +
// support contacts). Bump avoids serving a stale object missing the new keys
// during the post-deploy TTL window.
const PUBLIC_KEY = 'restaurant:public:v5';

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
      legal: toAdminLegal(row),
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

    // Estimated-time ranges are set as a Min/Max pair: both-or-neither, Min <= Max.
    // Validate against the *resulting* state (dto value if present, else current).
    const pick = <K extends keyof UpdateRestaurantDto>(key: K, fallback: number | null) =>
      dto[key] !== undefined ? (dto[key] as number | null) : fallback;
    const ranges: Array<[string, number | null, number | null]> = [
      [
        'delivery',
        pick('estimatedDeliveryMinutesMin', current.estimatedDeliveryMinutesMin),
        pick('estimatedDeliveryMinutesMax', current.estimatedDeliveryMinutesMax),
      ],
      [
        'pickup',
        pick('estimatedPickupMinutesMin', current.estimatedPickupMinutesMin),
        pick('estimatedPickupMinutesMax', current.estimatedPickupMinutesMax),
      ],
    ];
    for (const [label, min, max] of ranges) {
      if ((min === null) !== (max === null)) {
        throw new BadRequestException(
          `Estimated ${label} time needs both a min and a max, or neither.`,
        );
      }
      if (min !== null && max !== null && min > max) {
        throw new BadRequestException(
          `Estimated ${label} time min must be less than or equal to max.`,
        );
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
        ...(dto.servesCuisine !== undefined ? { servesCuisine: dto.servesCuisine } : {}),
        ...(dto.priceRange !== undefined ? { priceRange: dto.priceRange } : {}),
        ...(dto.sameAs !== undefined ? { sameAs: dto.sameAs } : {}),
        ...(dto.estimatedDeliveryMinutesMin !== undefined
          ? { estimatedDeliveryMinutesMin: dto.estimatedDeliveryMinutesMin }
          : {}),
        ...(dto.estimatedDeliveryMinutesMax !== undefined
          ? { estimatedDeliveryMinutesMax: dto.estimatedDeliveryMinutesMax }
          : {}),
        ...(dto.estimatedPickupMinutesMin !== undefined
          ? { estimatedPickupMinutesMin: dto.estimatedPickupMinutesMin }
          : {}),
        ...(dto.estimatedPickupMinutesMax !== undefined
          ? { estimatedPickupMinutesMax: dto.estimatedPickupMinutesMax }
          : {}),
        // Legal entity & customer-support fields (stored flat).
        ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
        ...(dto.nip !== undefined ? { nip: dto.nip } : {}),
        ...(dto.regon !== undefined ? { regon: dto.regon } : {}),
        ...(dto.krs !== undefined ? { krs: dto.krs } : {}),
        ...(dto.registryCourt !== undefined ? { registryCourt: dto.registryCourt } : {}),
        ...(dto.shareCapital !== undefined
          ? {
              shareCapital: dto.shareCapital === null ? null : new Prisma.Decimal(dto.shareCapital),
            }
          : {}),
        ...(dto.shareCapitalCurrency !== undefined
          ? { shareCapitalCurrency: dto.shareCapitalCurrency }
          : {}),
        ...(dto.registeredAddress !== undefined
          ? {
              registeredAddress:
                dto.registeredAddress === null
                  ? Prisma.DbNull
                  : (dto.registeredAddress as Prisma.InputJsonValue),
            }
          : {}),
        ...(dto.registeredAddressSameAsTrading !== undefined
          ? { registeredAddressSameAsTrading: dto.registeredAddressSameAsTrading }
          : {}),
        ...(dto.supportEmail !== undefined ? { supportEmail: dto.supportEmail } : {}),
        ...(dto.supportPhone !== undefined ? { supportPhone: dto.supportPhone } : {}),
        ...(dto.complaintsEmail !== undefined ? { complaintsEmail: dto.complaintsEmail } : {}),
        ...(dto.privacyEmail !== undefined ? { privacyEmail: dto.privacyEmail } : {}),
        ...(dto.statementDescriptor !== undefined
          ? { statementDescriptor: dto.statementDescriptor }
          : {}),
      },
    });
    await this.cache.invalidate(PUBLIC_KEY);
    const hours = await this.prisma.operatingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    return {
      ...toPublic(updated, hours),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      legal: toAdminLegal(updated),
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
    deliveryRadiusKm: row.deliveryRadiusKm,
    estimatedDeliveryMinutesMin: row.estimatedDeliveryMinutesMin,
    estimatedDeliveryMinutesMax: row.estimatedDeliveryMinutesMax,
    estimatedPickupMinutesMin: row.estimatedPickupMinutesMin,
    estimatedPickupMinutesMax: row.estimatedPickupMinutesMax,
    isActive: row.isActive,
    acceptsReservations: row.acceptsReservations,
    acceptsDelivery: row.acceptsDelivery,
    acceptsPickup: row.acceptsPickup,
    acceptsDineIn: row.acceptsDineIn,
    servesCuisine: row.servesCuisine,
    priceRange: (row.priceRange ?? null) as RestaurantPublicDto['priceRange'],
    sameAs: row.sameAs,
    legal: toLegal(row),
    ...(hours ? { hours: hours.map(toHoursDto) } : {}),
  };
}

/** Public legal block (no same-as-trading switch — that is admin-only). */
function toLegal(row: Restaurant): RestaurantPublicDto['legal'] {
  return {
    legalName: row.legalName,
    nip: row.nip,
    regon: row.regon,
    krs: row.krs,
    registryCourt: row.registryCourt,
    shareCapital: row.shareCapital ? row.shareCapital.toFixed(2) : null,
    shareCapitalCurrency: row.shareCapitalCurrency,
    registeredAddress: (row.registeredAddress ??
      null) as RestaurantPublicDto['legal']['registeredAddress'],
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    complaintsEmail: row.complaintsEmail,
    privacyEmail: row.privacyEmail,
  };
}

/**
 * Admin legal block — public block plus the admin-only fields
 * (registered-address-same-as-trading switch + the internal statement descriptor).
 */
function toAdminLegal(row: Restaurant): RestaurantAdminDto['legal'] {
  return {
    ...toLegal(row),
    registeredAddressSameAsTrading: row.registeredAddressSameAsTrading,
    statementDescriptor: row.statementDescriptor,
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
