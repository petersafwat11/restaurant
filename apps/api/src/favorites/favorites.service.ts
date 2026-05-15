import { Injectable, NotFoundException } from '@nestjs/common';
import type { MenuItem, MenuItemImage, Prisma } from '@repo/db';
import type {
  FavoriteDto,
  FavoriteIdsDto,
  FavoriteListDto,
  FavoriteListQuery,
  MenuItemDto,
} from '@repo/types';
import { decimalToString } from '@repo/utils';
import { PrismaService } from '../prisma/prisma.service';

const FAVORITE_INCLUDE = {
  menuItem: { include: { images: { orderBy: { position: 'asc' } } } },
} satisfies Prisma.FavoriteInclude;

type FavoriteRow = Prisma.FavoriteGetPayload<{
  include: typeof FAVORITE_INCLUDE;
}>;

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: FavoriteListQuery): Promise<FavoriteListDto> {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: FAVORITE_INCLUDE,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: slice.map(toFavoriteDto),
      nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
    };
  }

  async listIds(userId: string): Promise<FavoriteIdsDto> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      select: { menuItemId: true },
    });
    return { menuItemIds: rows.map((r) => r.menuItemId) };
  }

  /** Idempotent add — re-adding an existing favorite is a no-op. */
  async add(userId: string, menuItemId: string): Promise<FavoriteDto> {
    // Ensure the item exists so we don't store dangling favorites.
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    const row = await this.prisma.favorite.upsert({
      where: { userId_menuItemId: { userId, menuItemId } },
      create: { userId, menuItemId },
      update: {},
      include: FAVORITE_INCLUDE,
    });
    return toFavoriteDto(row);
  }

  async remove(userId: string, menuItemId: string): Promise<{ removed: boolean }> {
    const result = await this.prisma.favorite.deleteMany({
      where: { userId, menuItemId },
    });
    return { removed: result.count > 0 };
  }
}

function toFavoriteDto(row: FavoriteRow): FavoriteDto {
  return {
    id: row.id,
    menuItemId: row.menuItemId,
    createdAt: row.createdAt.toISOString(),
    menuItem: row.menuItem ? toMenuItemDto(row.menuItem) : null,
  };
}

function toMenuItemDto(row: MenuItem & { images: MenuItemImage[] }): MenuItemDto {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    basePrice: decimalToString(row.basePrice.toString()),
    compareAt: row.compareAt !== null ? decimalToString(row.compareAt.toString()) : null,
    calories: row.calories,
    prepMinutes: row.prepMinutes,
    isAvailable: row.isAvailable,
    isFeatured: row.isFeatured,
    isVegetarian: row.isVegetarian,
    isVegan: row.isVegan,
    isGlutenFree: row.isGlutenFree,
    spiceLevel: row.spiceLevel,
    position: row.position,
    images: row.images.map((img) => ({
      id: img.id,
      itemId: img.itemId,
      url: img.url,
      alt: img.alt,
      position: img.position,
    })),
  };
}
