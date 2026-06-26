/**
 * Content locale for public reads. Polish is the source/default language; the
 * only alternate is English. Anything missing or unrecognised resolves to 'pl'
 * so callers can pass a raw `?locale=` query value straight through.
 */
export type ContentLocale = 'pl' | 'en';

export function parseLocale(raw?: string | null): ContentLocale {
  return raw === 'en' ? 'en' : 'pl';
}

/** Localized string, falling back to the source (PL) when the EN value is empty. */
export function pickLocale(
  locale: ContentLocale,
  base: string,
  en: string | null | undefined,
): string {
  return locale === 'en' && en ? en : base;
}

/** Nullable variant — returns the source (possibly null) when EN is empty. */
export function pickLocaleN(
  locale: ContentLocale,
  base: string | null,
  en: string | null | undefined,
): string | null {
  return locale === 'en' && en ? en : base;
}
