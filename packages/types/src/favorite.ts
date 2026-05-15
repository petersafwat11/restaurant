import { z } from 'zod';
import { MenuItemSchema } from './menu';

export const FavoriteSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  createdAt: z.string(),
  menuItem: MenuItemSchema.nullable(),
});
export type FavoriteDto = z.infer<typeof FavoriteSchema>;

export const FavoriteListSchema = z.object({
  items: z.array(FavoriteSchema),
  nextCursor: z.string().nullable(),
});
export type FavoriteListDto = z.infer<typeof FavoriteListSchema>;

export const FavoriteListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type FavoriteListQuery = z.infer<typeof FavoriteListQuerySchema>;

// Lightweight id-set so a list/grid can render heart state without joining.
export const FavoriteIdsSchema = z.object({
  menuItemIds: z.array(z.string()),
});
export type FavoriteIdsDto = z.infer<typeof FavoriteIdsSchema>;
