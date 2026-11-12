import { SeoLandingPage } from '@/features/seo/components/seo-landing-page';
import { seoMetadata } from '@/features/seo/load-seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'delivery', '/dostawa');
}

/** Delivery terms: area, fee, minimum, times, payments, pickup, how to order. */
export default async function DeliveryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      locale={locale}
      metaKey="delivery"
      contentKey="delivery"
      href="/dostawa"
      breadcrumbName={locale === 'en' ? 'Delivery' : 'Dostawa'}
      showMap
    />
  );
}
