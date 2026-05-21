import { ORDER_STATUSES, ORDER_TYPES } from '@repo/types';
import type { ColumnSearch } from '../common/table-search/types';

/**
 * Columns the admin Orders table search can match against.
 *
 * Mirrors the columns rendered in the UI (apps/admin/.../orders/page.tsx).
 * The "Items" column shows `_count.items` — a Prisma relation aggregate that
 * can't be filtered with a simple equality predicate, so it sits out of
 * search for v1. Same goes for "Elapsed" (derived from `createdAt` — the
 * "Placed" datetime descriptor covers the same underlying field).
 */
export const ORDER_SEARCH_DESCRIPTORS: readonly ColumnSearch[] = [
  { kind: 'string', field: 'orderNumber' },
  { kind: 'string', field: 'user.firstName' },
  { kind: 'string', field: 'user.lastName' },
  { kind: 'string', field: 'user.email' },
  { kind: 'enum', field: 'type', values: ORDER_TYPES },
  { kind: 'enum', field: 'status', values: ORDER_STATUSES },
  { kind: 'decimal', field: 'grandTotal' },
  { kind: 'datetime', field: 'createdAt' },
];
