export const kitchenQueryKeys = {
  feed: (restaurantId: string) => ['kitchen', restaurantId] as const,
};
