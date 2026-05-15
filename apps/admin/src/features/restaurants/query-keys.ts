export const restaurantQueryKeys = {
  all: ['restaurants'] as const,
  list: () => ['restaurants', 'list'] as const,
  bySlug: (slug: string) => ['restaurants', 'bySlug', slug] as const,
  hours: (id: string) => ['restaurants', id, 'hours'] as const,
};
