export const menuQueryKeys = {
  all: ['menu'] as const,
  tree: () => ['menu', 'tree'] as const,
  /** Prefix matching every item-detail query, regardless of slug. Used to
   * invalidate the open editor drawer after a modifier mutation (the modifier
   * hooks only know the group/option id, not the category/item slugs). */
  items: () => ['menu', 'item'] as const,
  item: (categorySlug: string, itemSlug: string) =>
    ['menu', 'item', categorySlug, itemSlug] as const,
};
