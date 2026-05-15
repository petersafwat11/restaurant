import { DEFAULT_LOCALE, LOCALES, type Locale, isLocale } from './locale';

/**
 * Resolve a locale from an `Accept-Language` header (or any q-weighted list),
 * falling back to a supported preference list and finally DEFAULT_LOCALE.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
  supported: readonly Locale[] = LOCALES,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  if (!acceptLanguage) return fallback;

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '1') : 1;
      return { tag: (tag ?? '').trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .filter((x) => x.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split('-')[0] ?? tag;
    if (isLocale(primary) && supported.includes(primary)) return primary;
  }
  return fallback;
}

/** Pick a locale for a user: explicit stored locale wins, else negotiate. */
export function resolveUserLocale(
  storedLocale: string | null | undefined,
  acceptLanguage?: string | null,
): Locale {
  if (storedLocale && isLocale(storedLocale)) return storedLocale;
  return negotiateLocale(acceptLanguage);
}
