/** Build the export filename: `<base>-<slug>-<yyyymmdd-hhmm>.<ext>`. */
export function exportFilename(base: string, slug: string, ext: string): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '-')
    .slice(0, 13);
  return `${base}-${slug}-${ts}.${ext}`;
}
