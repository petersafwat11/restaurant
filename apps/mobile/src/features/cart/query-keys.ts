export const cartQueryKeys = {
  all: ['cart'] as const,
  current: () => ['cart', 'current'] as const,
};
