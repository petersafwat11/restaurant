import type { Locale } from '@repo/i18n';
import { useTranslation } from 'react-i18next';
import { setAppLocale } from '@/i18n';

export function useLocale(): [Locale, (next: Locale) => Promise<void>] {
  const { i18n } = useTranslation();
  return [(i18n.language as Locale) ?? 'pl', setAppLocale];
}

export { useTranslation } from 'react-i18next';
