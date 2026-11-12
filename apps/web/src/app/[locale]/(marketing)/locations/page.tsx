import { seoH1, seoMetadata } from '@/features/seo/load-seo';
import { buildSeoVars } from '@/features/seo/seo-vars';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import LocationsApp from './locations-app';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'locations', '/locations');
}

export default async function LocationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const restaurant = await fetchPublicRestaurant();
  const h1 = await seoH1(locale, 'locations', restaurant ? buildSeoVars(restaurant, locale) : null);
  return <LocationsApp h1={h1} />;
}
