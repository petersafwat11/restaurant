import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  MenuCategory,
  MenuItem,
  MenuItemImage,
  MenuItemModifierGroup,
  MenuItemModifierOption,
} from '@repo/db';
import type {
  AddMenuItemImageDto,
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  MenuCategoryDto,
  MenuItemDetailDto,
  MenuItemDto,
  MenuItemImageDto,
  MenuTreeDto,
  ModifierGroupDto,
  ModifierOptionDto,
  ReorderDto,
  ReorderItemsDto,
  SetItemAvailabilityDto,
  UpdateMenuCategoryDto,
  UpdateMenuItemDto,
  UpdateModifierGroupDto,
  UpdateModifierOptionDto,
} from '@repo/types';
import { decimalToString } from '@repo/utils';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { UploadsService } from '../uploads/uploads.service';

const TREE_TTL_SECONDS = 300;
const treeKey = (restaurantId: string) => `menu:${restaurantId}`;
const availabilityKey = (itemId: string) => `availability:${itemId}`;

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly uploads: UploadsService,
  ) {}

  // ---- Public reads -------------------------------------------------------

  async getTree(restaurantId: string): Promise<MenuTreeDto> {
    const tree = await this.cache.getOrSet<MenuTreeDto>(
      treeKey(restaurantId),
      TREE_TTL_SECONDS,
      async () => this.loadTreeFromDb(restaurantId),
    );

    // Merge availability fast-path keys into the cached tree. Any item with
    // an explicit availability key wins over the DB-baked value.
    return this.applyAvailabilityOverrides(tree);
  }

  async getItem(
    restaurantId: string,
    categorySlug: string,
    itemSlug: string,
  ): Promise<MenuItemDetailDto> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { restaurantId_slug: { restaurantId, slug: categorySlug } },
    });
    if (!category) throw new NotFoundException('Category not found');

    const item = await this.prisma.menuItem.findUnique({
      where: { categoryId_slug: { categoryId: category.id, slug: itemSlug } },
      include: {
        images: { orderBy: { position: 'asc' } },
        modifierGroups: {
          include: { options: { orderBy: { name: 'asc' } } },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    const isAvailable = await this.resolveAvailability(item.id, item.isAvailable);
    return toItemDetailDto({ ...item, isAvailable });
  }

  // ---- Category writes ----------------------------------------------------

  async createCategory(dto: CreateMenuCategoryDto): Promise<MenuCategoryDto> {
    await this.requireRestaurant(dto.restaurantId);
    try {
      const row = await this.prisma.menuCategory.create({
        data: {
          restaurantId: dto.restaurantId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          imageUrl: dto.imageUrl ?? null,
          position: dto.position ?? (await this.nextCategoryPosition(dto.restaurantId)),
          isActive: dto.isActive ?? true,
        },
      });
      await this.invalidateTree(dto.restaurantId);
      return toCategoryDto(row, []);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Slug already in use for this restaurant');
      }
      throw err;
    }
  }

  async updateCategory(id: string, dto: UpdateMenuCategoryDto): Promise<MenuCategoryDto> {
    const existing = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    const updated = await this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.invalidateTree(updated.restaurantId);
    return toCategoryDto(updated, []);
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.menuCategory.delete({ where: { id } });
    await this.invalidateTree(existing.restaurantId);
  }

  async reorderCategories(dto: ReorderDto): Promise<void> {
    const categories = await this.prisma.menuCategory.findMany({
      where: { id: { in: dto.orderedIds } },
      select: { id: true, restaurantId: true },
    });
    if (categories.length !== dto.orderedIds.length) {
      throw new NotFoundException('One or more categories not found');
    }
    const restaurantIds = new Set(categories.map((c) => c.restaurantId));
    if (restaurantIds.size !== 1) {
      throw new ConflictException('Categories must belong to one restaurant');
    }
    const restaurantId = categories[0].restaurantId;

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.menuCategory.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    await this.invalidateTree(restaurantId);
  }

  // ---- Item writes --------------------------------------------------------

  async createItem(dto: CreateMenuItemDto): Promise<MenuItemDto> {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    try {
      const row = await this.prisma.menuItem.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          basePrice: dto.basePrice,
          compareAt: dto.compareAt ?? null,
          calories: dto.calories ?? null,
          prepMinutes: dto.prepMinutes ?? null,
          isAvailable: dto.isAvailable ?? true,
          isFeatured: dto.isFeatured ?? false,
          isVegetarian: dto.isVegetarian ?? false,
          isVegan: dto.isVegan ?? false,
          isGlutenFree: dto.isGlutenFree ?? false,
          spiceLevel: dto.spiceLevel ?? 0,
          position: dto.position ?? (await this.nextItemPosition(dto.categoryId)),
        },
        include: { images: true },
      });
      await this.invalidateTree(category.restaurantId);
      return toItemDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Slug already in use for this category');
      }
      throw err;
    }
  }

  async updateItem(id: string, dto: UpdateMenuItemDto): Promise<MenuItemDto> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!existing) throw new NotFoundException('Menu item not found');

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.compareAt !== undefined ? { compareAt: dto.compareAt } : {}),
        ...(dto.calories !== undefined ? { calories: dto.calories } : {}),
        ...(dto.prepMinutes !== undefined ? { prepMinutes: dto.prepMinutes } : {}),
        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.isVegetarian !== undefined ? { isVegetarian: dto.isVegetarian } : {}),
        ...(dto.isVegan !== undefined ? { isVegan: dto.isVegan } : {}),
        ...(dto.isGlutenFree !== undefined ? { isGlutenFree: dto.isGlutenFree } : {}),
        ...(dto.spiceLevel !== undefined ? { spiceLevel: dto.spiceLevel } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
      include: { images: { orderBy: { position: 'asc' } } },
    });

    // If the explicit availability key was set, the row's value supersedes it.
    await this.cache.invalidate(availabilityKey(id));
    await this.invalidateTree(existing.category.restaurantId);
    return toItemDto(updated);
  }

  async deleteItem(id: string): Promise<void> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!existing) throw new NotFoundException('Menu item not found');
    await this.prisma.menuItem.delete({ where: { id } });
    await this.cache.invalidate(availabilityKey(id));
    await this.invalidateTree(existing.category.restaurantId);
  }

  async setItemAvailability(id: string, dto: SetItemAvailabilityDto): Promise<MenuItemDto> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!existing) throw new NotFoundException('Menu item not found');

    // Write-through: persist for durability, plus set the fast-path key so
    // we don't have to bust the entire tree cache for a toggle.
    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: dto.isAvailable },
      include: { images: { orderBy: { position: 'asc' } } },
    });
    await this.cache.set(availabilityKey(id), dto.isAvailable);
    return toItemDto(updated);
  }

  async reorderItems(dto: ReorderItemsDto): Promise<void> {
    const items = await this.prisma.menuItem.findMany({
      where: { id: { in: dto.orderedIds } },
      select: { id: true, categoryId: true, category: { select: { restaurantId: true } } },
    });
    if (items.length !== dto.orderedIds.length) {
      throw new NotFoundException('One or more items not found');
    }
    for (const it of items) {
      if (it.categoryId !== dto.categoryId) {
        throw new ConflictException('All items must belong to the supplied category');
      }
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.menuItem.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    await this.invalidateTree(items[0].category.restaurantId);
  }

  // ---- Item images --------------------------------------------------------

  async addItemImage(itemId: string, dto: AddMenuItemImageDto): Promise<MenuItemImageDto> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    const next = await this.prisma.menuItemImage.count({ where: { itemId } });
    const url = this.uploads.publicUrlForKey(dto.key);
    const row = await this.prisma.menuItemImage.create({
      data: {
        itemId,
        url,
        alt: dto.alt ?? null,
        position: next,
      },
    });
    await this.invalidateTree(item.category.restaurantId);
    return toImageDto(row);
  }

  async removeItemImage(itemId: string, imageId: string): Promise<void> {
    const image = await this.prisma.menuItemImage.findUnique({
      where: { id: imageId },
      include: {
        item: { select: { id: true, category: { select: { restaurantId: true } } } },
      },
    });
    if (!image || image.itemId !== itemId) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.menuItemImage.delete({ where: { id: imageId } });
    // Best-effort R2 cleanup; failures are swallowed by the uploads service
    // and the daily orphan sweep is the safety net.
    const key = this.uploads.extractKeyFromUrl(image.url);
    if (key) await this.uploads.deleteObject(key);
    await this.invalidateTree(image.item.category.restaurantId);
  }

  async reorderItemImages(itemId: string, dto: ReorderDto): Promise<void> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    const images = await this.prisma.menuItemImage.findMany({
      where: { id: { in: dto.orderedIds }, itemId },
      select: { id: true },
    });
    if (images.length !== dto.orderedIds.length) {
      throw new NotFoundException('One or more images not found');
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.menuItemImage.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    await this.invalidateTree(item.category.restaurantId);
  }

  // ---- Modifier groups ----------------------------------------------------

  async createModifierGroup(
    itemId: string,
    dto: CreateModifierGroupDto,
  ): Promise<ModifierGroupDto> {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: { select: { restaurantId: true } } },
    });
    if (!item) throw new NotFoundException('Menu item not found');

    const row = await this.prisma.menuItemModifierGroup.create({
      data: {
        itemId,
        name: dto.name,
        isRequired: dto.isRequired ?? false,
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? 1,
      },
    });
    await this.invalidateTree(item.category.restaurantId);
    return toGroupDto(row, []);
  }

  async updateModifierGroup(id: string, dto: UpdateModifierGroupDto): Promise<ModifierGroupDto> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({
      where: { id },
      include: {
        options: { orderBy: { name: 'asc' } },
        item: { include: { category: { select: { restaurantId: true } } } },
      },
    });
    if (!group) throw new NotFoundException('Modifier group not found');

    const updated = await this.prisma.menuItemModifierGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
        ...(dto.minSelect !== undefined ? { minSelect: dto.minSelect } : {}),
        ...(dto.maxSelect !== undefined ? { maxSelect: dto.maxSelect } : {}),
      },
      include: { options: { orderBy: { name: 'asc' } } },
    });
    await this.invalidateTree(group.item.category.restaurantId);
    return toGroupDto(updated, updated.options);
  }

  async deleteModifierGroup(id: string): Promise<void> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({
      where: { id },
      include: { item: { include: { category: { select: { restaurantId: true } } } } },
    });
    if (!group) throw new NotFoundException('Modifier group not found');
    await this.prisma.menuItemModifierGroup.delete({ where: { id } });
    await this.invalidateTree(group.item.category.restaurantId);
  }

  // ---- Modifier options ---------------------------------------------------

  async createModifierOption(
    groupId: string,
    dto: CreateModifierOptionDto,
  ): Promise<ModifierOptionDto> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({
      where: { id: groupId },
      include: { item: { include: { category: { select: { restaurantId: true } } } } },
    });
    if (!group) throw new NotFoundException('Modifier group not found');

    const row = await this.prisma.menuItemModifierOption.create({
      data: {
        groupId,
        name: dto.name,
        priceDelta: dto.priceDelta,
        isDefault: dto.isDefault ?? false,
      },
    });
    await this.invalidateTree(group.item.category.restaurantId);
    return toOptionDto(row);
  }

  async updateModifierOption(id: string, dto: UpdateModifierOptionDto): Promise<ModifierOptionDto> {
    const option = await this.prisma.menuItemModifierOption.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            item: { include: { category: { select: { restaurantId: true } } } },
          },
        },
      },
    });
    if (!option) throw new NotFoundException('Modifier option not found');

    const updated = await this.prisma.menuItemModifierOption.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priceDelta !== undefined ? { priceDelta: dto.priceDelta } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
    await this.invalidateTree(option.group.item.category.restaurantId);
    return toOptionDto(updated);
  }

  async deleteModifierOption(id: string): Promise<void> {
    const option = await this.prisma.menuItemModifierOption.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            item: { include: { category: { select: { restaurantId: true } } } },
          },
        },
      },
    });
    if (!option) throw new NotFoundException('Modifier option not found');
    await this.prisma.menuItemModifierOption.delete({ where: { id } });
    await this.invalidateTree(option.group.item.category.restaurantId);
  }

  // ---- Private helpers ----------------------------------------------------

  private async loadTreeFromDb(restaurantId: string): Promise<MenuTreeDto> {
    await this.requireRestaurant(restaurantId);
    const categories = await this.prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      include: {
        items: {
          include: {
            images: { orderBy: { position: 'asc' } },
            modifierGroups: {
              include: { options: { orderBy: { name: 'asc' } } },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    return {
      restaurantId,
      categories: categories.map((c) => ({
        id: c.id,
        restaurantId: c.restaurantId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        position: c.position,
        isActive: c.isActive,
        items: c.items.map(toItemDetailDto),
      })),
    };
  }

  private async applyAvailabilityOverrides(tree: MenuTreeDto): Promise<MenuTreeDto> {
    const itemIds = tree.categories.flatMap((c) => c.items.map((it) => it.id));
    if (itemIds.length === 0) return tree;

    const overrides = await Promise.all(
      itemIds.map(async (id) => {
        const v = await this.cache.get<boolean>(availabilityKey(id));
        return [id, v] as const;
      }),
    );
    const overrideMap = new Map<string, boolean>();
    for (const [id, v] of overrides) {
      if (v !== null) overrideMap.set(id, v);
    }
    if (overrideMap.size === 0) return tree;

    return {
      ...tree,
      categories: tree.categories.map((c) => ({
        ...c,
        items: c.items.map((it) =>
          overrideMap.has(it.id) ? { ...it, isAvailable: overrideMap.get(it.id) as boolean } : it,
        ),
      })),
    };
  }

  private async resolveAvailability(itemId: string, fallback: boolean): Promise<boolean> {
    const override = await this.cache.get<boolean>(availabilityKey(itemId));
    return override === null ? fallback : override;
  }

  private async requireRestaurant(id: string): Promise<void> {
    const r = await this.prisma.restaurant.findUnique({ where: { id }, select: { id: true } });
    if (!r) throw new NotFoundException('Restaurant not found');
  }

  private async nextCategoryPosition(restaurantId: string): Promise<number> {
    return this.prisma.menuCategory.count({ where: { restaurantId } });
  }

  private async nextItemPosition(categoryId: string): Promise<number> {
    return this.prisma.menuItem.count({ where: { categoryId } });
  }

  private async invalidateTree(restaurantId: string): Promise<void> {
    await this.cache.invalidate(treeKey(restaurantId));
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toCategoryDto(row: MenuCategory, items: MenuItemDto[]): MenuCategoryDto {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    position: row.position,
    isActive: row.isActive,
    items,
  };
}

type MenuItemWithImages = MenuItem & { images: MenuItemImage[] };
type MenuItemWithRelations = MenuItemWithImages & {
  modifierGroups: (MenuItemModifierGroup & {
    options: MenuItemModifierOption[];
  })[];
};

function toItemDto(row: MenuItemWithImages): MenuItemDto {
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
    images: row.images.map(toImageDto),
  };
}

function toItemDetailDto(row: MenuItemWithRelations): MenuItemDetailDto {
  return {
    ...toItemDto(row),
    modifierGroups: row.modifierGroups.map((g) => toGroupDto(g, g.options)),
  };
}

function toImageDto(row: MenuItemImage): MenuItemImageDto {
  return {
    id: row.id,
    itemId: row.itemId,
    url: row.url,
    alt: row.alt,
    position: row.position,
  };
}

function toGroupDto(
  row: MenuItemModifierGroup,
  options: MenuItemModifierOption[],
): ModifierGroupDto {
  return {
    id: row.id,
    itemId: row.itemId,
    name: row.name,
    isRequired: row.isRequired,
    minSelect: row.minSelect,
    maxSelect: row.maxSelect,
    options: options.map(toOptionDto),
  };
}

function toOptionDto(row: MenuItemModifierOption): ModifierOptionDto {
  return {
    id: row.id,
    groupId: row.groupId,
    name: row.name,
    priceDelta: decimalToString(row.priceDelta.toString()),
    isDefault: row.isDefault,
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === 'P2002';
}
