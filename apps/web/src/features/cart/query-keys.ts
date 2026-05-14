export const cartQueryKeys = {
  all: ['cart'] as const,
  byRestaurant: (restaurantId: string) => ['cart', restaurantId] as const,
};
