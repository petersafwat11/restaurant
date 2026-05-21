export const restaurantQueryKeys = {
  all: ['restaurant'] as const,
  current: () => ['restaurant', 'current'] as const,
  hours: () => ['restaurant', 'hours'] as const,
};
