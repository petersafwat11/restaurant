import { SeoLandingPage } from '@/features/seo/components/seo-landing-page';
import { seoMetadata } from '@/features/seo/load-seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'faq', '/faq');
}

/** Customer FAQ with FAQPage JSON-LD; every fact interpolated from the API. */
export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      locale={locale}
      metaKey="faq"
      contentKey="faq"
      href="/faq"
      breadcrumbName="FAQ"
      faqFromItems
    />
  );
}
