import type { AbstractIntlMessages } from 'next-intl';

/**
 * Namespaces that are only ever read by Server Components (`getTranslations`)
 * and so never need to reach the browser:
 *  - `admin`     — the staff app's strings (≈45 KB) share the locale bundle;
 *  - `web.seo`   — SEO page copy, metadata and pillar-page text (≈20 KB+);
 *  - `web.legal` — legal page chrome.
 *
 * `NextIntlClientProvider` would otherwise serialise the whole bundle into the
 * RSC payload of every page, which is parsed on the main thread before the
 * first paint on slow phones. Keep this list in sync if a client component
 * ever starts reading one of these namespaces (it would throw a missing
 * message error in dev, so the regression is loud).
 */
export function pickClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  const { admin: _admin, web, ...rest } = messages;
  if (!web || typeof web !== 'object') return rest;
  const { seo: _seo, legal: _legal, ...webClient } = web as AbstractIntlMessages;
  return { ...rest, web: webClient };
}
