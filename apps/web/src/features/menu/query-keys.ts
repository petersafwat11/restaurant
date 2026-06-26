export const menuQueryKeys = {
  all: ['menu'] as const,
  tree: (locale?: string) => ['menu', 'tree', locale ?? 'pl'] as const,
  item: (categorySlug: string, itemSlug: string) =>
    ['menu', 'item', categorySlug, itemSlug] as const,
};
