import { getAlternates } from '@/lib/seo/alternates';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import LocationsApp from './locations-app';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.marketing.locations.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/locations'),
  };
}

export default async function LocationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LocationsApp />;
}
