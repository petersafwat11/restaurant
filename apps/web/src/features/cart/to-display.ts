import type { CartItemDto } from '@repo/types';
import type { CartLineDisplay } from '@repo/ui';

/**
 * Adapt `CartItemDto` (the canonical server shape) to `CartLineDisplay`
 * (what `<CartLineItem>` and `<CartSheet>` consume).
 *
 * The adapter exists so `@repo/ui` stays free of `@repo/types` imports
 * beyond enums — the primitive's display shape is a small projection,
 * the DTO carries fields the UI doesn't need (modifierSnapshot with ids,
 * lineTotal as a server-computed string).
 */
export function cartItemToDisplay(
  item: CartItemDto,
  imageBySlug?: Map<string, string>,
): CartLineDisplay {
  const modifierSummary =
    item.modifierSnapshot.length > 0
      ? item.modifierSnapshot.map((m) => m.optionName).join(' · ')
      : undefined;
  return {
    id: item.id,
    name: item.name,
    image: imageBySlug?.get(item.menuItemId),
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    modifierSummary,
    notes: item.notes ?? undefined,
  };
}
