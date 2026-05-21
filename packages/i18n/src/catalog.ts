import type { Locale } from './locale';
import ar from './locales/ar.json';
import en from './locales/en.json';
import pl from './locales/pl.json';

export type MessageCatalog = typeof en;

const CATALOGS: Record<Locale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  ar: ar as Record<string, unknown>,
  pl: pl as Record<string, unknown>,
};

export function getMessageCatalog(locale: Locale): Record<string, unknown> {
  return CATALOGS[locale] ?? CATALOGS.en;
}

// Recursive dot-path union of every leaf string key in the catalog. Gives
// callers compile-time-checked message keys (e.g. `order.notify.placed`).
type Paths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
    }[keyof T & string];

export type MessageKey = Paths<MessageCatalog>;

export function lookupMessage(catalog: Record<string, unknown>, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
      catalog,
    );
  return typeof value === 'string' ? value : undefined;
}
