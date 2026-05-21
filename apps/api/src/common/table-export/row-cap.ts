import { PayloadTooLargeException } from '@nestjs/common';

export const CSV_ROW_CAP = 50_000;
export const PDF_ROW_CAP = 1_000;

/**
 * Validate an export's row count against the per-format cap. Throws
 * PayloadTooLargeException with a structured hint payload if exceeded.
 *
 * Hint suggests narrowing filters / using analytics exports for big datasets.
 */
export function assertWithinRowCap(
  count: number,
  format: 'csv' | 'pdf',
  resource: string,
): void {
  const cap = format === 'pdf' ? PDF_ROW_CAP : CSV_ROW_CAP;
  if (count <= cap) return;
  throw new PayloadTooLargeException({
    statusCode: 413,
    error: 'Payload Too Large',
    message: `Export would include ${count.toLocaleString()} rows, exceeding the ${format.toUpperCase()} cap of ${cap.toLocaleString()}.`,
    hint:
      format === 'pdf'
        ? 'PDF exports are limited to 1,000 rows for readability. Narrow your filters or download CSV instead.'
        : 'Narrow your filters, or queue an analytics export from /reports/exports for larger datasets.',
    resource,
    count,
    cap,
    format,
  });
}
