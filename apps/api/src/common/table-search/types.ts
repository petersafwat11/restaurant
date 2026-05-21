/**
 * Per-column descriptor for the multi-type search engine.
 *
 * Each list endpoint declares an array of these in `descriptors/<resource>.ts`.
 * `buildSearchWhere(descriptors, q)` translates the raw search string into a
 * Prisma `{ OR: [...] }` fragment where each column contributes 0..1 predicate
 * depending on whether the user's input parses as that column's type.
 */
export type ColumnSearch =
  | { kind: 'string'; field: string }
  | { kind: 'enum'; field: string; values: readonly string[] }
  | { kind: 'number'; field: string }
  | { kind: 'decimal'; field: string }
  | { kind: 'datetime'; field: string }
  | {
      kind: 'boolean';
      field: string;
      truthy: readonly string[];
      falsy: readonly string[];
    }
  | {
      kind: 'isNullSwitch';
      field: string;
      nonNullKeywords: readonly string[];
      isNullKeywords: readonly string[];
    }
  | {
      kind: 'derived';
      labels: Record<string, Record<string, unknown>>;
    };

export type WhereFragment = Record<string, unknown>;
export type SearchWhere = { OR: WhereFragment[] } | Record<string, never>;
