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
import { decimalToString } from '@repo/utils/money';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { UploadsService } from '../uploads/uploads.service';

const TREE_TTL_SECONDS = 300;
// Single-restaurant project — one tree cache key for the whole menu. v2 = post
// restaurantId drop (categories/items no longer carry it).
const TREE_KEY = 'menu:tree:v2';
const availabilityKey = (itemId: string) => `availability:${itemId}`;

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly uploads: UploadsService,
  ) {}

  // ---- Public reads -------------------------------------------------------

  async getTree(): Promise<MenuTreeDto> {
    const tree = await this.cache.getOrSet<MenuTreeDto>(
      TREE_KEY,
      TREE_TTL_SECONDS,
      async () => this.loadTreeFromDb(),
    );
    return this.applyAvailabilityOverrides(tree);
  }

  async getItem(categorySlug: string, itemSlug: string): Promise<MenuItemDetailDto> {
    const category = await this.prisma.menuCategory.findUnique({ where: { slug: categorySlug } });
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
    try {
      const row = await this.prisma.menuCategory.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          imageUrl: dto.imageUrl ?? null,
          position: dto.position ?? (await this.nextCategoryPosition()),
          isActive: dto.isActive ?? true,
        },
      });
      await this.invalidateTree();
      return toCategoryDto(row, []);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Slug already in use');
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
    await this.invalidateTree();
    return toCategoryDto(updated, []);
  }

  async deleteCategory(id: string): Promise<{ id: string }> {
    const existing = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.menuCategory.delete({ where: { id } });
    await this.invalidateTree();
    return { id: existing.id };
  }

  async reorderCategories(dto: ReorderDto): Promise<void> {
    const categories = await this.prisma.menuCategory.findMany({
      where: { id: { in: dto.orderedIds } },
      select: { id: true },
    });
    if (categories.length !== dto.orderedIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.menuCategory.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    await this.invalidateTree();
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
      await this.invalidateTree();
      return toItemDto(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException('Slug already in use for this category');
      }
      throw err;
    }
  }

  async updateItem(id: string, dto: UpdateMenuItemDto): Promise<MenuItemDto> {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
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

    await this.cache.invalidate(availabilityKey(id));
    await this.invalidateTree();
    return toItemDto(updated);
  }

  async deleteItem(id: string): Promise<{ id: string }> {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');
    await this.prisma.menuItem.delete({ where: { id } });
    await this.cache.invalidate(availabilityKey(id));
    await this.invalidateTree();
    return { id: existing.id };
  }

  async setItemAvailability(id: string, dto: SetItemAvailabilityDto): Promise<MenuItemDto> {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');

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
      select: { id: true, categoryId: true },
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
    await this.invalidateTree();
  }

  // ---- Item images --------------------------------------------------------

  async addItemImage(itemId: string, dto: AddMenuItemImageDto): Promise<MenuItemImageDto> {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
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
    await this.invalidateTree();
    return toImageDto(row);
  }

  async removeItemImage(itemId: string, imageId: string): Promise<void> {
    const image = await this.prisma.menuItemImage.findUnique({ where: { id: imageId } });
    if (!image || image.itemId !== itemId) {
      throw new NotFoundException('Image not found');
    }
    await this.prisma.menuItemImage.delete({ where: { id: imageId } });
    const key = this.uploads.extractKeyFromUrl(image.url);
    if (key) await this.uploads.deleteByKey(key);
    await this.invalidateTree();
  }

  async reorderItemImages(itemId: string, dto: ReorderDto): Promise<void> {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
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
    await this.invalidateTree();
  }

  // ---- Modifier groups ----------------------------------------------------

  async createModifierGroup(
    itemId: string,
    dto: CreateModifierGroupDto,
  ): Promise<ModifierGroupDto> {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
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
    await this.invalidateTree();
    return toGroupDto(row, []);
  }

  async updateModifierGroup(id: string, dto: UpdateModifierGroupDto): Promise<ModifierGroupDto> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({
      where: { id },
      include: { options: { orderBy: { name: 'asc' } } },
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
    await this.invalidateTree();
    return toGroupDto(updated, updated.options);
  }

  async deleteModifierGroup(id: string): Promise<void> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Modifier group not found');
    await this.prisma.menuItemModifierGroup.delete({ where: { id } });
    await this.invalidateTree();
  }

  // ---- Modifier options ---------------------------------------------------

  async createModifierOption(
    groupId: string,
    dto: CreateModifierOptionDto,
  ): Promise<ModifierOptionDto> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Modifier group not found');

    const row = await this.prisma.menuItemModifierOption.create({
      data: {
        groupId,
        name: dto.name,
        priceDelta: dto.priceDelta,
        isDefault: dto.isDefault ?? false,
      },
    });
    await this.invalidateTree();
    return toOptionDto(row);
  }

  async updateModifierOption(id: string, dto: UpdateModifierOptionDto): Promise<ModifierOptionDto> {
    const option = await this.prisma.menuItemModifierOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Modifier option not found');

    const updated = await this.prisma.menuItemModifierOption.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priceDelta !== undefined ? { priceDelta: dto.priceDelta } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
    await this.invalidateTree();
    return toOptionDto(updated);
  }

  async deleteModifierOption(id: string): Promise<void> {
    const option = await this.prisma.menuItemModifierOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Modifier option not found');
    await this.prisma.menuItemModifierOption.delete({ where: { id } });
    await this.invalidateTree();
  }

  // ---- Private helpers ----------------------------------------------------

  private async loadTreeFromDb(): Promise<MenuTreeDto> {
    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
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
      categories: categories.map((c) => ({
        id: c.id,
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

  private async nextCategoryPosition(): Promise<number> {
    return this.prisma.menuCategory.count();
  }

  private async nextItemPosition(categoryId: string): Promise<number> {
    return this.prisma.menuItem.count({ where: { categoryId } });
  }

  private async invalidateTree(): Promise<void> {
    await this.cache.invalidate(TREE_KEY);
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toCategoryDto(row: MenuCategory, items: MenuItemDto[]): MenuCategoryDto {
  return {
    id: row.id,
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
