import type { OrderListQuery } from '@repo/types';

export const orderQueryKeys = {
  all: ['orders'] as const,
  list: (query?: OrderListQuery) => ['orders', 'list', query ?? {}] as const,
  detail: (id: string) => ['orders', id] as const,
  tracking: (id: string) => ['orders', id, 'tracking'] as const,
};
