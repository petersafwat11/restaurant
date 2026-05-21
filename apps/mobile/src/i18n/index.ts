import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import i18n from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import { type Locale, loadMessages } from '@repo/i18n';

const LOCALE_STORAGE_KEY = 'app.locale';

function defaultLocale(): Locale {
  const device = Localization.getLocales()[0]?.languageCode;
  return device === 'en' ? 'en' : 'pl';
}

i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: loadMessages('pl') },
      en: { translation: loadMessages('en') },
    },
    fallbackLng: 'pl',
    lng: defaultLocale(),
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
    returnNull: false,
  });

// Hydrate stored preference (async) and switch language if it differs.
void (async () => {
  try {
    const stored = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
    if ((stored === 'pl' || stored === 'en') && stored !== i18n.language) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // SecureStore unavailable — keep device-detected default
  }
})();

/** Switch language and persist the preference to SecureStore. */
export async function setAppLocale(next: Locale): Promise<void> {
  await i18n.changeLanguage(next);
  try {
    await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, next);
  } catch {
    // Best-effort; in-memory language has already changed
  }
}

export { i18n };
