import type { ColumnSearch, SearchWhere, WhereFragment } from './types';

const MAX_QUERY_LEN = 100;

/**
 * Translate a raw user search string into a Prisma `{ OR: [...] }` fragment
 * across the supplied column descriptors. Each column contributes 0..1
 * predicates depending on whether the input parses as that column's type.
 *
 * Empty / whitespace / wildcards-only input returns `{}` so the caller can
 * spread it into a wider where clause without effect. If no typed column
 * contributes (e.g. the input is just a name fragment), the string columns
 * still contribute their ILIKE predicates so the user never sees the
 * surprising "I typed something and got everything back" behavior.
 */
export function buildSearchWhere(
  descriptors: readonly ColumnSearch[],
  rawQuery: string | null | undefined,
): SearchWhere {
  const q = sanitize(rawQuery);
  if (!q) return {};

  const stringPredicates: WhereFragment[] = [];
  const typedPredicates: WhereFragment[] = [];

  for (const desc of descriptors) {
    switch (desc.kind) {
      case 'string': {
        stringPredicates.push(
          nestPath(desc.field, { contains: q, mode: 'insensitive' }),
        );
        break;
      }
      case 'enum': {
        const lower = q.toLowerCase();
        const matches = desc.values.filter((v) =>
          v.toLowerCase().startsWith(lower),
        );
        if (matches.length > 0) {
          typedPredicates.push(nestPath(desc.field, { in: matches }));
        }
        break;
      }
      case 'number': {
        const parsed = parseIntStrict(q);
        if (parsed !== null) {
          typedPredicates.push(nestPath(desc.field, parsed));
        }
        break;
      }
      case 'decimal': {
        const parsed = parseDecimal(q);
        if (parsed !== null) {
          // Prisma Decimal field accepts string or number; string preserves
          // precision better.
          typedPredicates.push(nestPath(desc.field, parsed));
        }
        break;
      }
      case 'datetime': {
        const range = parseWholeDayRange(q);
        if (range) {
          typedPredicates.push(
            nestPath(desc.field, { gte: range.gte, lt: range.lt }),
          );
        }
        break;
      }
      case 'boolean': {
        const lower = q.toLowerCase();
        if (desc.truthy.some((kw) => kw.toLowerCase() === lower)) {
          typedPredicates.push(nestPath(desc.field, true));
        } else if (desc.falsy.some((kw) => kw.toLowerCase() === lower)) {
          typedPredicates.push(nestPath(desc.field, false));
        }
        break;
      }
      case 'isNullSwitch': {
        const lower = q.toLowerCase();
        if (desc.nonNullKeywords.some((kw) => kw.toLowerCase() === lower)) {
          typedPredicates.push(nestPath(desc.field, { not: null }));
        } else if (desc.isNullKeywords.some((kw) => kw.toLowerCase() === lower)) {
          typedPredicates.push(nestPath(desc.field, null));
        }
        break;
      }
      case 'derived': {
        const lower = q.toLowerCase();
        for (const [label, fragment] of Object.entries(desc.labels)) {
          if (label.toLowerCase().startsWith(lower)) {
            typedPredicates.push(fragment);
          }
        }
        break;
      }
    }
  }

  const all = [...typedPredicates, ...stringPredicates];
  if (all.length === 0) return {};
  return { OR: all };
}

function sanitize(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  // Strip Prisma ILIKE wildcards (%, _) and the escape char (\). Prisma's
  // `contains` compiles to `column ILIKE '%' || $1 || '%'` without an ESCAPE
  // clause, so these characters would otherwise leak through as wildcards.
  // Stripping them is the conservative choice — a user who types "100%" gets
  // results for "100" rather than "100 followed by anything".
  const cleaned = raw.replace(/[\\%_]/g, '').trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, MAX_QUERY_LEN);
}

function parseIntStrict(q: string): number | null {
  if (!/^-?\d+$/.test(q)) return null;
  const n = Number.parseInt(q, 10);
  return Number.isFinite(n) ? n : null;
}

function parseDecimal(q: string): string | null {
  const stripped = q.replace(/[$,€£\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(stripped)) return null;
  // Returns the canonical string form — Prisma's Decimal column accepts
  // either a number or a string; string keeps full precision.
  return stripped;
}

function parseWholeDayRange(q: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q)) return null;
  const gte = new Date(`${q}T00:00:00.000Z`);
  if (Number.isNaN(gte.getTime())) return null;
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}

/**
 * `nestPath('user.email', value)` → `{ user: { email: value } }`.
 * Used so descriptors can refer to relation fields without each one having
 * to spell out the nesting manually.
 */
function nestPath(path: string, value: unknown): WhereFragment {
  const parts = path.split('.');
  let out: unknown = value;
  for (let i = parts.length - 1; i >= 0; i--) {
    out = { [parts[i] as string]: out };
  }
  return out as WhereFragment;
}
