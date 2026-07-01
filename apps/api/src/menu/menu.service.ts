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
import { type ContentLocale, pickLocale, pickLocaleN } from '../common/i18n/locale';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { UploadsService } from '../uploads/uploads.service';

const TREE_TTL_SECONDS = 300;
// Single-restaurant project — one tree cache key per locale for the whole menu.
// v3 = added per-locale (pl/en) variants on top of the v2 restaurantId drop.
const TREE_KEY_PREFIX = 'menu:tree:v3';
const treeKey = (locale: ContentLocale) => `${TREE_KEY_PREFIX}:${locale}`;
const CONTENT_LOCALES: ContentLocale[] = ['pl', 'en'];
const availabilityKey = (itemId: string) => `availability:${itemId}`;

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly uploads: UploadsService,
  ) {}

  // ---- Public reads -------------------------------------------------------

  async getTree(locale: ContentLocale = 'pl'): Promise<MenuTreeDto> {
    const tree = await this.cache.getOrSet<MenuTreeDto>(treeKey(locale), TREE_TTL_SECONDS, async () =>
      this.loadTreeFromDb(locale),
    );
    return this.applyAvailabilityOverrides(tree);
  }

  async getItem(
    categorySlug: string,
    itemSlug: string,
    locale: ContentLocale = 'pl',
  ): Promise<MenuItemDetailDto> {
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
    return toItemDetailDto({ ...item, isAvailable }, locale);
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
          grams: dto.grams ?? null,
          allergens: dto.allergens ?? [],
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
        ...(dto.grams !== undefined ? { grams: dto.grams } : {}),
        ...(dto.allergens !== undefined ? { allergens: dto.allergens } : {}),
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
        grams: dto.grams ?? null,
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
        ...(dto.grams !== undefined ? { grams: dto.grams } : {}),
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

  private async loadTreeFromDb(locale: ContentLocale): Promise<MenuTreeDto> {
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
        name: pickLocale(locale, c.name, c.nameEn),
        slug: c.slug,
        description: pickLocaleN(locale, c.description, c.descriptionEn),
        imageUrl: c.imageUrl,
        position: c.position,
        isActive: c.isActive,
        items: c.items.map((it) => toItemDetailDto(it, locale)),
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
    await Promise.all(CONTENT_LOCALES.map((l) => this.cache.invalidate(treeKey(l))));
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toCategoryDto(
  row: MenuCategory,
  items: MenuItemDto[],
  locale: ContentLocale = 'pl',
): MenuCategoryDto {
  return {
    id: row.id,
    name: pickLocale(locale, row.name, row.nameEn),
    slug: row.slug,
    description: pickLocaleN(locale, row.description, row.descriptionEn),
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

function toItemDto(row: MenuItemWithImages, locale: ContentLocale = 'pl'): MenuItemDto {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: pickLocale(locale, row.name, row.nameEn),
    slug: row.slug,
    description: pickLocaleN(locale, row.description, row.descriptionEn),
    basePrice: decimalToString(row.basePrice.toString()),
    compareAt: row.compareAt !== null ? decimalToString(row.compareAt.toString()) : null,
    calories: row.calories,
    prepMinutes: row.prepMinutes,
    grams: row.grams,
    allergens: row.allergens as MenuItemDto['allergens'],
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

function toItemDetailDto(
  row: MenuItemWithRelations,
  locale: ContentLocale = 'pl',
): MenuItemDetailDto {
  return {
    ...toItemDto(row, locale),
    modifierGroups: row.modifierGroups.map((g) => toGroupDto(g, g.options, locale)),
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
  locale: ContentLocale = 'pl',
): ModifierGroupDto {
  return {
    id: row.id,
    itemId: row.itemId,
    name: pickLocale(locale, row.name, row.nameEn),
    isRequired: row.isRequired,
    minSelect: row.minSelect,
    maxSelect: row.maxSelect,
    options: options.map((o) => toOptionDto(o, locale)),
  };
}

function toOptionDto(row: MenuItemModifierOption, locale: ContentLocale = 'pl'): ModifierOptionDto {
  return {
    id: row.id,
    groupId: row.groupId,
    name: pickLocale(locale, row.name, row.nameEn),
    priceDelta: decimalToString(row.priceDelta.toString()),
    grams: row.grams,
    isDefault: row.isDefault,
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === 'P2002';
}
