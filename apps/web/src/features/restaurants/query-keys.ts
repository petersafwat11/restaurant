export const restaurantQueryKeys = {
  all: ['restaurant'] as const,
  current: () => ['restaurant'] as const,
  hours: () => ['restaurant', 'hours'] as const,
};
