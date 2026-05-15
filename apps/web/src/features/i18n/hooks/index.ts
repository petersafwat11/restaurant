'use client';

import { getApiClient } from '@/lib/api-client';
import { type Locale, isLocale } from '@repo/i18n';
import type { I18nMessagesDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

const LOCALE_COOKIE = 'locale';

function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split('=')[1] ?? 'en';
  return isLocale(value) ? value : 'en';
}

/** Locale persisted in a cookie so SSR + client agree. Data layer only. */
export function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(readLocaleCookie);
  const setLocale = useCallback((next: Locale) => {
    if (typeof document !== 'undefined') {
      // 1 year, root path.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    }
    setLocaleState(next);
  }, []);
  return [locale, setLocale];
}

export function useMessages(locale?: Locale) {
  return useQuery<I18nMessagesDto>({
    queryKey: ['i18n', 'messages', locale ?? 'auto'],
    queryFn: () => getApiClient().i18n.messages(locale),
    staleTime: 60 * 60 * 1000,
  });
}
