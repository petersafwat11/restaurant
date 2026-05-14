export const menuQueryKeys = {
  all: ['menu'] as const,
  tree: (restaurantId: string) => ['menu', restaurantId, 'tree'] as const,
  item: (restaurantId: string, categorySlug: string, itemSlug: string) =>
    ['menu', restaurantId, 'item', categorySlug, itemSlug] as const,
};
