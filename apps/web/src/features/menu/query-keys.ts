export const menuQueryKeys = {
  all: ['menu'] as const,
  tree: () => ['menu', 'tree'] as const,
  item: (categorySlug: string, itemSlug: string) =>
    ['menu', 'item', categorySlug, itemSlug] as const,
};
