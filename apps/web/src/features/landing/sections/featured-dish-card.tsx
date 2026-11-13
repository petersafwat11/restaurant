'use client';

import { useAddToCart } from '@/features/cart/hooks';
import { DishCard, type DishCardProps } from '@repo/ui';

/**
 * Client island for one landing "featured" card: the card markup is rendered
 * from server-computed props, only the quick-add `+` needs the cart mutation.
 * Keeps the landing page from shipping (and hydrating) the whole menu tree.
 */
export function FeaturedDishCard({
  menuItemId,
  addAriaLabel,
  ...card
}: Omit<DishCardProps, 'onAdd' | 'formatAddAriaLabel' | 'onClick'> & {
  menuItemId: string;
  addAriaLabel: string;
}) {
  const addMutation = useAddToCart();
  return (
    <DishCard
      {...card}
      formatAddAriaLabel={() => addAriaLabel}
      onAdd={() => addMutation.mutate({ menuItemId, quantity: 1, modifierSelections: [] })}
    />
  );
}
