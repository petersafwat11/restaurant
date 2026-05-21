import { describe, expect, it } from 'vitest';
import { buildSearchWhere } from './build-search-where';
import type { ColumnSearch } from './types';

describe('buildSearchWhere', () => {
  describe('input handling', () => {
    it('returns {} for empty / nullish / whitespace input', () => {
      const descs: ColumnSearch[] = [{ kind: 'string', field: 'name' }];
      expect(buildSearchWhere(descs, undefined)).toEqual({});
      expect(buildSearchWhere(descs, null)).toEqual({});
      expect(buildSearchWhere(descs, '')).toEqual({});
      expect(buildSearchWhere(descs, '   ')).toEqual({});
    });

    it('returns {} when input contains only wildcards', () => {
      const descs: ColumnSearch[] = [{ kind: 'string', field: 'name' }];
      expect(buildSearchWhere(descs, '%%%')).toEqual({});
      expect(buildSearchWhere(descs, '___')).toEqual({});
      expect(buildSearchWhere(descs, '\\\\')).toEqual({});
    });

    it('strips wildcards from mixed input', () => {
      const descs: ColumnSearch[] = [{ kind: 'string', field: 'name' }];
      const where = buildSearchWhere(descs, '100%abc');
      expect(where).toEqual({
        OR: [{ name: { contains: '100abc', mode: 'insensitive' } }],
      });
    });

    it('caps the query at 100 chars', () => {
      const descs: ColumnSearch[] = [{ kind: 'string', field: 'name' }];
      const long = 'a'.repeat(250);
      const where = buildSearchWhere(descs, long) as {
        OR: [{ name: { contains: string } }];
      };
      expect(where.OR[0].name.contains.length).toBe(100);
    });
  });

  describe('kind: string', () => {
    it('emits an ILIKE contains predicate', () => {
      expect(
        buildSearchWhere([{ kind: 'string', field: 'name' }], 'alice'),
      ).toEqual({
        OR: [{ name: { contains: 'alice', mode: 'insensitive' } }],
      });
    });

    it('nests dotted paths', () => {
      expect(
        buildSearchWhere([{ kind: 'string', field: 'user.email' }], 'a@b.com'),
      ).toEqual({
        OR: [
          { user: { email: { contains: 'a@b.com', mode: 'insensitive' } } },
        ],
      });
    });
  });

  describe('kind: enum', () => {
    const descs: ColumnSearch[] = [
      {
        kind: 'enum',
        field: 'status',
        values: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
      },
    ];

    it('matches a single value by prefix (case insensitive)', () => {
      expect(buildSearchWhere(descs, 'act')).toEqual({
        OR: [{ status: { in: ['ACTIVE'] } }],
      });
    });

    it('matches multiple values when prefix is ambiguous', () => {
      const more: ColumnSearch[] = [
        {
          kind: 'enum',
          field: 'status',
          values: ['DELIVERED', 'DELIVERY'],
        },
      ];
      expect(buildSearchWhere(more, 'deliv')).toEqual({
        OR: [{ status: { in: ['DELIVERED', 'DELIVERY'] } }],
      });
    });

    it('contributes nothing when no value matches', () => {
      expect(buildSearchWhere(descs, 'zzzzz')).toEqual({});
    });
  });

  describe('kind: number', () => {
    const descs: ColumnSearch[] = [{ kind: 'number', field: 'rating' }];

    it('emits an equality predicate for integer input', () => {
      expect(buildSearchWhere(descs, '5')).toEqual({ OR: [{ rating: 5 }] });
    });

    it('contributes nothing for non-integer input', () => {
      expect(buildSearchWhere(descs, '5.5')).toEqual({});
      expect(buildSearchWhere(descs, 'abc')).toEqual({});
    });
  });

  describe('kind: decimal', () => {
    const descs: ColumnSearch[] = [{ kind: 'decimal', field: 'total' }];

    it('emits an equality predicate', () => {
      expect(buildSearchWhere(descs, '12.50')).toEqual({
        OR: [{ total: '12.50' }],
      });
    });

    it('strips currency symbols and commas', () => {
      expect(buildSearchWhere(descs, '$1,234.56')).toEqual({
        OR: [{ total: '1234.56' }],
      });
    });

    it('contributes nothing for non-numeric input', () => {
      expect(buildSearchWhere(descs, 'abc')).toEqual({});
    });
  });

  describe('kind: datetime', () => {
    const descs: ColumnSearch[] = [{ kind: 'datetime', field: 'createdAt' }];

    it('emits a whole-day UTC range for yyyy-mm-dd input', () => {
      const where = buildSearchWhere(descs, '2026-05-20') as {
        OR: [{ createdAt: { gte: Date; lt: Date } }];
      };
      expect(where.OR[0].createdAt.gte.toISOString()).toBe(
        '2026-05-20T00:00:00.000Z',
      );
      expect(where.OR[0].createdAt.lt.toISOString()).toBe(
        '2026-05-21T00:00:00.000Z',
      );
    });

    it('contributes nothing for non-date input', () => {
      expect(buildSearchWhere(descs, 'yesterday')).toEqual({});
      expect(buildSearchWhere(descs, '2026/05/20')).toEqual({});
    });
  });

  describe('kind: boolean', () => {
    const descs: ColumnSearch[] = [
      {
        kind: 'boolean',
        field: 'isActive',
        truthy: ['active', 'enabled', 'true'],
        falsy: ['inactive', 'disabled', 'false'],
      },
    ];

    it('maps truthy keywords to true', () => {
      expect(buildSearchWhere(descs, 'Active')).toEqual({
        OR: [{ isActive: true }],
      });
    });

    it('maps falsy keywords to false', () => {
      expect(buildSearchWhere(descs, 'disabled')).toEqual({
        OR: [{ isActive: false }],
      });
    });

    it('contributes nothing for unrecognized keywords', () => {
      expect(buildSearchWhere(descs, 'maybe')).toEqual({});
    });
  });

  describe('kind: isNullSwitch', () => {
    const descs: ColumnSearch[] = [
      {
        kind: 'isNullSwitch',
        field: 'ownerReply',
        nonNullKeywords: ['replied'],
        isNullKeywords: ['unreplied'],
      },
    ];

    it('maps non-null keyword to { not: null }', () => {
      expect(buildSearchWhere(descs, 'replied')).toEqual({
        OR: [{ ownerReply: { not: null } }],
      });
    });

    it('maps null keyword to null', () => {
      expect(buildSearchWhere(descs, 'unreplied')).toEqual({
        OR: [{ ownerReply: null }],
      });
    });
  });

  describe('kind: derived', () => {
    const descs: ColumnSearch[] = [
      {
        kind: 'derived',
        labels: {
          DRAFT: { isActive: false, startsAt: null },
          ACTIVE: { isActive: true },
        },
      },
    ];

    it('matches a label by prefix and emits its fragment', () => {
      expect(buildSearchWhere(descs, 'act')).toEqual({
        OR: [{ isActive: true }],
      });
    });

    it('emits multiple fragments when prefix is ambiguous', () => {
      const more: ColumnSearch[] = [
        {
          kind: 'derived',
          labels: {
            SCHEDULED: { startsAt: { gt: new Date('2026-01-01') } },
            SCHEDULING: { foo: true },
          },
        },
      ];
      const where = buildSearchWhere(more, 'sched') as {
        OR: Array<Record<string, unknown>>;
      };
      expect(where.OR).toHaveLength(2);
    });
  });

  describe('mixed descriptors', () => {
    it('ORs string-ILIKE fallback alongside no typed matches', () => {
      const descs: ColumnSearch[] = [
        { kind: 'string', field: 'name' },
        { kind: 'string', field: 'email' },
        { kind: 'number', field: 'rating' },
      ];
      // "alice" — number contributes nothing, both strings contribute.
      expect(buildSearchWhere(descs, 'alice')).toEqual({
        OR: [
          { name: { contains: 'alice', mode: 'insensitive' } },
          { email: { contains: 'alice', mode: 'insensitive' } },
        ],
      });
    });

    it('combines typed and string predicates when both apply', () => {
      const descs: ColumnSearch[] = [
        { kind: 'string', field: 'name' },
        { kind: 'number', field: 'rating' },
      ];
      const where = buildSearchWhere(descs, '5') as {
        OR: Array<Record<string, unknown>>;
      };
      // Typed first (rating = 5), then the string ILIKE fallback (name contains "5").
      expect(where.OR).toEqual([
        { rating: 5 },
        { name: { contains: '5', mode: 'insensitive' } },
      ]);
    });
  });
});
