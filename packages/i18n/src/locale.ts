export type Locale = 'pl' | 'en';

export const LOCALES: readonly Locale[] = ['pl', 'en'] as const;
export const DEFAULT_LOCALE: Locale = 'pl';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
