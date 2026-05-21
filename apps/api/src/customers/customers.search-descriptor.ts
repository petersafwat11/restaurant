import type { ColumnSearch } from '../common/table-search/types';

/**
 * Columns the admin Customers table search can match against.
 *
 * Mirrors the columns rendered in the UI (apps/admin/.../customers/...).
 * The "Orders", "Lifetime spend", "Last order", and "Segment" columns are
 * *computed* by aggregating Order data at read time, not stored on User. A
 * proper search across them would require either denormalizing onto User or
 * running a subquery per row — out of scope for v1. The four directly-stored
 * User columns below (name, email, phone) cover the common case.
 */
export const CUSTOMER_SEARCH_DESCRIPTORS: readonly ColumnSearch[] = [
  { kind: 'string', field: 'firstName' },
  { kind: 'string', field: 'lastName' },
  { kind: 'string', field: 'email' },
  { kind: 'string', field: 'phone' },
];
