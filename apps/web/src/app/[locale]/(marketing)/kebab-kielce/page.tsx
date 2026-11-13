import { KebabPillarPage } from '@/features/seo/components/kebab-pillar';
import { seoMetadata } from '@/features/seo/load-seo';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'kebabKielce', '/kebab-kielce');
}

/**
 * Pillar page for "kebab Kielce". (`/dostawa` owns "kebab z dostawą Kielce" —
 * this page links to it rather than competing for that phrase.)
 */
export default async function KebabKielcePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <KebabPillarPage locale={locale} />;
}
