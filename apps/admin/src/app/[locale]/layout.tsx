import { routing } from '@/i18n/routing';
import { AppProviders } from '@/providers/app-providers';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';

export const metadata: Metadata = {
  applicationName: 'Szef Donald Admin',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Donald Admin',
  },
  icons: {
    icon: [
      { url: '/icons/admin-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/admin-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/admin-apple-touch.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0B0D12',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} dir="ltr">
      <body>
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
