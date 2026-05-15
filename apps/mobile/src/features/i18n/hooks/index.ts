import { getApiClient } from '@/lib/api-client';
import { type Locale, isLocale } from '@repo/i18n';
import type { I18nMessagesDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const LOCALE_STORAGE = 'app.locale';

/** Locale persisted in SecureStore. Data layer only — no UI. */
export function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_STORAGE)
      .then((v) => {
        if (v && isLocale(v)) setLocaleState(v);
      })
      .catch(() => undefined);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void SecureStore.setItemAsync(LOCALE_STORAGE, next).catch(() => undefined);
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
