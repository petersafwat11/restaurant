import { routing } from '@/i18n/routing';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { JsonLd, buildRestaurantSchema } from '@/lib/seo/json-ld';
import { AppProviders } from '@/providers/app-providers';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Fraunces, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-display',
  axes: ['opsz'],
  weight: 'variable',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.layout.meta' });
  const baseTitle = t('title');
  const description = t('description');
  const base = siteUrl();
  // Polish `pl` defaults unprefixed; English lives under `/en`.
  const ogLocale = locale === 'pl' ? 'pl_PL' : 'en_US';
  // `meta.title` from i18n is "Brand — tagline"; the brand is everything left
  // of the em-dash. Fall back to the full title if no dash is present.
  const brand = baseTitle.split('—')[0]?.trim() || baseTitle;

  return {
    metadataBase: new URL(base),
    title: {
      default: baseTitle,
      // `%s` is replaced by per-route titles via Next's title template merge.
      template: `%s — ${brand}`,
    },
    description,
    applicationName: brand,
    openGraph: {
      type: 'website',
      siteName: brand,
      title: baseTitle,
      description,
      locale: ogLocale,
      url: base,
    },
    twitter: {
      card: 'summary_large_image',
      title: baseTitle,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  // Site-wide `Restaurant` JSON-LD. Fetched once per hour (revalidate: 3600);
  // returns null silently if the API is unreachable so layout still renders.
  // Injected at the locale root so it reaches every public surface including
  // `(shop)/menu/*` and `(marketing)/*` — see docs/seo/seo-geo-strategy.md §D.
  const restaurant = await fetchPublicRestaurant();

  return (
    <html lang={locale} dir="ltr" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-bg text-fg antialiased">
        {restaurant ? (
          <JsonLd
            id="ld-restaurant"
            data={buildRestaurantSchema(restaurant, { siteUrl: siteUrl() })}
          />
        ) : null}
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
