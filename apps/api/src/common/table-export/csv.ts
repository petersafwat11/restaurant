import type { ExportColumn } from './columns';

const BOM = '﻿';
const ROW_SEP = '\r\n';

/**
 * Build an RFC 4180 CSV string from rows + column descriptors. Prepends a
 * UTF-8 BOM so Excel detects the encoding correctly. Quote / comma / newline
 * inside a cell get escaped per RFC 4180.
 */
export function buildCsv<T>(
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
): Buffer {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.csv(row))).join(','));
  }
  return Buffer.from(BOM + lines.join(ROW_SEP) + ROW_SEP, 'utf8');
}

function escapeCell(value: string): string {
  if (value == null) return '';
  const needsQuote = /[",\r\n]/.test(value);
  if (!needsQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';
