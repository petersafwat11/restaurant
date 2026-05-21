/**
 * Shared column descriptor for table exports. Each resource's
 * `export-columns/<resource>.ts` declares an array of these.
 *
 * - `csv` formats the cell for CSV output.
 * - `pdf` optionally overrides for PDF (defaults to `csv`).
 * - `pdfOmit` drops the column from PDF output (e.g. redundant "Elapsed"
 *   columns that duplicate a date already present).
 * - `pdfWidth` is a pdfmake width hint (number = points, `'*'` = stretch).
 */
export type ExportColumn<T> = {
  header: string;
  csv: (row: T) => string;
  pdf?: (row: T) => string;
  pdfOmit?: boolean;
  pdfWidth?: number | '*' | 'auto';
};

export function pdfColumns<T>(columns: readonly ExportColumn<T>[]): ExportColumn<T>[] {
  return columns.filter((c) => !c.pdfOmit);
}
