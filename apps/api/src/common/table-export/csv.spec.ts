import { describe, expect, it } from 'vitest';
import type { ExportColumn } from './columns';
import { buildCsv } from './csv';

type Row = { id: number; name: string; note: string | null };

const columns: ExportColumn<Row>[] = [
  { header: 'ID', csv: (r) => String(r.id) },
  { header: 'Name', csv: (r) => r.name },
  { header: 'Note', csv: (r) => r.note ?? '' },
];

describe('buildCsv', () => {
  it('prepends a UTF-8 BOM', () => {
    const out = buildCsv([], columns).toString('utf8');
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it('emits header + rows separated by CRLF', () => {
    const out = buildCsv(
      [{ id: 1, name: 'Alice', note: null }],
      columns,
    ).toString('utf8');
    const body = out.slice(1); // drop BOM
    expect(body).toBe('ID,Name,Note\r\n1,Alice,\r\n');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const out = buildCsv(
      [
        {
          id: 2,
          name: 'Comma, Inc',
          note: 'He said "hi"\nthen left',
        },
      ],
      columns,
    ).toString('utf8');
    const body = out.slice(1);
    expect(body).toBe(
      'ID,Name,Note\r\n2,"Comma, Inc","He said ""hi""\nthen left"\r\n',
    );
  });
});
