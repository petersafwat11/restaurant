import type { OrderListQuery } from '@repo/types';

export const orderQueryKeys = {
  all: ['orders'] as const,
  list: (query?: OrderListQuery) => ['orders', 'list', query ?? {}] as const,
  adminList: (filters: Partial<OrderListQuery>) => ['orders', 'admin-list', filters] as const,
  adminListInfinite: (filters: Partial<OrderListQuery>) =>
    ['orders', 'admin-list-infinite', filters] as const,
  detail: (id: string) => ['orders', id] as const,
};
