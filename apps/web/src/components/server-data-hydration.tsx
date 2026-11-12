import { menuQueryKeys } from '@/features/menu/query-keys';
import { restaurantQueryKeys } from '@/features/restaurants/query-keys';
import type { MenuTreeDto, RestaurantPublicDto } from '@repo/types';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Seeds the client TanStack Query cache with server-fetched data so client
 * components (`useRestaurant`, `useMenuTree`) render real content during SSR
 * instead of a loading state — crawlers and AI bots don't execute JS, so the
 * menu, NAP and hours must be in the initial HTML. On the client the same
 * cache entries hydrate, so interactive behaviour is unchanged.
 */
export function ServerDataHydration({
  restaurant,
  menu,
  children,
}: {
  restaurant?: RestaurantPublicDto | null;
  menu?: { locale: string; tree: MenuTreeDto | null };
  children: ReactNode;
}) {
  const qc = new QueryClient();
  if (restaurant) qc.setQueryData(restaurantQueryKeys.current(), restaurant);
  if (menu?.tree) qc.setQueryData(menuQueryKeys.tree(menu.locale), menu.tree);
  return <HydrationBoundary state={dehydrate(qc)}>{children}</HydrationBoundary>;
}
