export const addressQueryKeys = {
  all: ['addresses'] as const,
  byId: (id: string) => ['addresses', id] as const,
};
