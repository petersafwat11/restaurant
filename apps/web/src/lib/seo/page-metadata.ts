import { clamp } from '@/features/menu/lib/dish-copy';
import type { Metadata } from 'next';
import { getAlternates } from './alternates';
import { absoluteUrl } from './site';

export interface PageMetaInput {
  locale: string;
  /** Locale-agnostic route, e.g. `/menu/kebab`. */
  href: string;
  /** Full document title (rendered verbatim — no brand template appended). */
  title: string;
  description: string;
  /** Optional absolute image URL for Open Graph. */
  image?: string | null;
  noindex?: boolean;
}

/**
 * Per-page metadata: absolute title, description, canonical + hreflang
 * (pl / en / x-default) and matching Open Graph fields. Titles are passed as
 * `absolute` so the layout template never doubles the brand name.
 */
export function buildPageMetadata({
  locale,
  href,
  title,
  description: rawDescription,
  image,
  noindex,
}: PageMetaInput): Metadata {
  // Keep snippets within what Google shows (~155 chars).
  const description = clamp(rawDescription, 155);
  return {
    title: { absolute: title },
    description,
    alternates: getAlternates(href, locale),
    openGraph: {
      type: 'website',
      siteName: 'Szef Donald',
      title,
      description,
      url: absoluteUrl(locale, href),
      locale: locale === 'en' ? 'en_US' : 'pl_PL',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
