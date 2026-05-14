import { z } from 'zod';

// Money values cross the wire as fixed-point strings (e.g., "12.50") so
// frontend code never accidentally does Number arithmetic on them.
const MoneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Money must be a decimal string with ≤2dp');

// ---- Modifier options ------------------------------------------------------

export const ModifierOptionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  priceDelta: MoneyStringSchema,
  isDefault: z.boolean(),
});
export type ModifierOptionDto = z.infer<typeof ModifierOptionSchema>;

export const CreateModifierOptionSchema = z.object({
  name: z.string().min(1).max(120),
  priceDelta: MoneyStringSchema.optional(),
  isDefault: z.boolean().optional(),
});
export type CreateModifierOptionDto = z.infer<typeof CreateModifierOptionSchema>;

export const UpdateModifierOptionSchema = CreateModifierOptionSchema.partial();
export type UpdateModifierOptionDto = z.infer<typeof UpdateModifierOptionSchema>;

// ---- Modifier groups -------------------------------------------------------

export const ModifierGroupSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  name: z.string(),
  isRequired: z.boolean(),
  minSelect: z.number().int().min(0),
  maxSelect: z.number().int().min(0),
  options: z.array(ModifierOptionSchema),
});
export type ModifierGroupDto = z.infer<typeof ModifierGroupSchema>;

export const CreateModifierGroupSchema = z.object({
  name: z.string().min(1).max(120),
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(0).optional(),
});
export type CreateModifierGroupDto = z.infer<typeof CreateModifierGroupSchema>;

export const UpdateModifierGroupSchema = CreateModifierGroupSchema.partial();
export type UpdateModifierGroupDto = z.infer<typeof UpdateModifierGroupSchema>;

// ---- Menu item images ------------------------------------------------------

export const MenuItemImageSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  url: z.string(),
  alt: z.string().nullable(),
  position: z.number().int().min(0),
});
export type MenuItemImageDto = z.infer<typeof MenuItemImageSchema>;

export const AddMenuItemImageSchema = z.object({
  key: z.string().min(1, 'R2 object key required'),
  alt: z.string().max(200).nullish(),
});
export type AddMenuItemImageDto = z.infer<typeof AddMenuItemImageSchema>;

// ---- Menu items ------------------------------------------------------------

export const MenuItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  basePrice: MoneyStringSchema,
  compareAt: MoneyStringSchema.nullable(),
  calories: z.number().int().nullable(),
  prepMinutes: z.number().int().nullable(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  isVegetarian: z.boolean(),
  isVegan: z.boolean(),
  isGlutenFree: z.boolean(),
  spiceLevel: z.number().int().min(0).max(3),
  position: z.number().int().min(0),
  images: z.array(MenuItemImageSchema),
});
export type MenuItemDto = z.infer<typeof MenuItemSchema>;

export const MenuItemDetailSchema = MenuItemSchema.extend({
  modifierGroups: z.array(ModifierGroupSchema),
});
export type MenuItemDetailDto = z.infer<typeof MenuItemDetailSchema>;

export const CreateMenuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(160),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).nullish(),
  basePrice: MoneyStringSchema,
  compareAt: MoneyStringSchema.nullish(),
  calories: z.number().int().min(0).nullish(),
  prepMinutes: z.number().int().min(0).nullish(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  spiceLevel: z.number().int().min(0).max(3).optional(),
  position: z.number().int().min(0).optional(),
});
export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();
export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>;

export const SetItemAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
export type SetItemAvailabilityDto = z.infer<typeof SetItemAvailabilitySchema>;

// ---- Categories ------------------------------------------------------------

export const MenuCategorySchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  position: z.number().int().min(0),
  isActive: z.boolean(),
  items: z.array(MenuItemSchema),
});
export type MenuCategoryDto = z.infer<typeof MenuCategorySchema>;

export const CreateMenuCategorySchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).nullish(),
  imageUrl: z.string().url().nullish(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type CreateMenuCategoryDto = z.infer<typeof CreateMenuCategorySchema>;

export const UpdateMenuCategorySchema = CreateMenuCategorySchema.partial();
export type UpdateMenuCategoryDto = z.infer<typeof UpdateMenuCategorySchema>;

// ---- Menu tree -------------------------------------------------------------

export const MenuTreeSchema = z.object({
  restaurantId: z.string(),
  categories: z.array(
    MenuCategorySchema.extend({
      items: z.array(
        MenuItemSchema.extend({
          modifierGroups: z.array(ModifierGroupSchema),
        }),
      ),
    }),
  ),
});
export type MenuTreeDto = z.infer<typeof MenuTreeSchema>;

// ---- Reorder ---------------------------------------------------------------

export const ReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderDto = z.infer<typeof ReorderSchema>;

export const ReorderItemsSchema = ReorderSchema.extend({
  categoryId: z.string().min(1),
});
export type ReorderItemsDto = z.infer<typeof ReorderItemsSchema>;
