import { getAlternates } from '@/lib/seo/alternates';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ContactApp from './contact-app';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'web.marketing.contact.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/contact'),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ContactApp />;
}
