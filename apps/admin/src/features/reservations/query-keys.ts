import type { ReservationListQuery } from '@repo/types';

export const reservationKeys = {
  all: ['reservations'] as const,
  list: (q?: ReservationListQuery) => ['reservations', 'list', q ?? {}] as const,
  detail: (id: string) => ['reservations', id] as const,
  tables: () => ['reservations', 'tables'] as const,
  availability: (params: { date: string; partySize: number }) =>
    ['reservations', 'availability', params] as const,
};
