export const cartQueryKeys = {
  all: ['cart'] as const,
  current: (sessionKey?: string | null) => ['cart', sessionKey ?? null] as const,
};
