// pdfmake's typings are loose; we treat its docDefinition as `unknown`.
// biome-ignore lint/suspicious/noExplicitAny: pdfmake API surface is dynamic.
import pdfmake from 'pdfmake';
import { type ExportColumn, pdfColumns } from './columns';

// Use PDF core fonts (Helvetica) so we don't have to ship Roboto TTFs or wire
// vfs_fonts. Helvetica/Times/Courier are built into every PDF reader.
const FONTS_INITIALIZED = initFonts();
function initFonts(): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake's setters are dynamic.
  const pm = pdfmake as any;
  pm.fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };
  // Deny all URL access — server-side renders shouldn't fetch the network.
  pm.setUrlAccessPolicy?.(() => false);
  // Restrict local-fs access to the PDF core font names. pdfmake resolves
  // those via PDFKit's built-ins (no actual file read) but still routes them
  // through the access policy. Anything else (filesystem paths inside a
  // docDefinition's `image:` etc.) is denied.
  pm.setLocalAccessPolicy?.((path: string) => CORE_PDF_FONTS.has(path));
  return true;
}

const CORE_PDF_FONTS: ReadonlySet<string> = new Set([
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Symbol',
  'ZapfDingbats',
]);

export const PDF_CONTENT_TYPE = 'application/pdf';

export interface BuildPdfOptions {
  title: string;
  subtitle?: string;
  /** Restaurant timezone-aware label (e.g. "Generated 2026-05-20 14:30 UTC"). */
  generatedAt?: string;
}

/**
 * Render a tabular PDF with header + footer + striped rows. Returns a Buffer.
 *
 * Caller is responsible for capping row count before calling (see
 * row-cap.guard). pdfmake builds the whole doc in memory, so this is
 * appropriate for ≤1k rows; larger sets should use the CSV path.
 */
export async function buildPdf<T>(
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
  opts: BuildPdfOptions,
): Promise<Buffer> {
  // Touch the init flag so dead-code elimination doesn't drop it.
  if (!FONTS_INITIALIZED) throw new Error('PDF fonts not initialized');

  const cols = pdfColumns(columns);
  const headerRow = cols.map((c) => ({
    text: c.header,
    bold: true,
    fillColor: '#f3f4f6',
  }));
  const bodyRows = rows.map((row, i) =>
    cols.map((c) => ({
      text: (c.pdf ?? c.csv)(row),
      fillColor: i % 2 === 0 ? null : '#fafafa',
    })),
  );

  const widths = cols.map((c) => c.pdfWidth ?? 'auto');

  const docDefinition = {
    pageSize: 'A4' as const,
    pageOrientation: 'landscape' as const,
    pageMargins: [24, 56, 24, 36] as [number, number, number, number],
    defaultStyle: { font: 'Helvetica', fontSize: 8 },
    header: {
      margin: [24, 16, 24, 0],
      columns: [
        { text: opts.title, style: 'docTitle' },
        opts.generatedAt
          ? { text: opts.generatedAt, alignment: 'right', style: 'meta' }
          : { text: '' },
      ],
    },
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: 'center' as const,
      margin: [0, 12, 0, 0] as [number, number, number, number],
      fontSize: 8,
      color: '#9ca3af',
    }),
    content: [
      opts.subtitle ? { text: opts.subtitle, style: 'subtitle' } : null,
      {
        table: {
          headerRows: 1,
          widths,
          body: [headerRow, ...bodyRows],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ].filter(Boolean),
    styles: {
      docTitle: { fontSize: 12, bold: true },
      subtitle: { fontSize: 10, color: '#6b7280', margin: [0, 0, 0, 8] },
      meta: { fontSize: 8, color: '#6b7280' },
    },
  };

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake's createPdf accepts loose objects.
  const pdfDoc = (pdfmake as any).createPdf(docDefinition);
  const buffer: Buffer = await pdfDoc.getBuffer();
  return buffer;
}
