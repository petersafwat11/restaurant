import { describe, expect, it } from 'vitest';
import type { ExportColumn } from './columns';
import { buildPdf } from './pdf';

type Row = { id: number; name: string };

const columns: ExportColumn<Row>[] = [
  { header: 'ID', csv: (r) => String(r.id) },
  { header: 'Name', csv: (r) => r.name },
];

describe('buildPdf', () => {
  it('returns a non-empty Buffer starting with the PDF magic header', async () => {
    const buf = await buildPdf(
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      columns,
      { title: 'Test', generatedAt: '2026-05-20' },
    );
    expect(buf.length).toBeGreaterThan(100);
    // PDF files start with "%PDF-"
    expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  }, 10_000);

  it('renders an empty body without crashing', async () => {
    const buf = await buildPdf([], columns, { title: 'Empty' });
    expect(buf.length).toBeGreaterThan(100);
  }, 10_000);
});
