import { COOKIES_SECTIONS, CookiesEN, CookiesPL } from '@/content/legal/cookies';
import { LEGAL_LAST_UPDATED } from '@/features/legal/company';
import { LegalPage } from '@/features/legal/legal-page';
import { LegalTableOfContents } from '@/features/legal/legal-toc';
import { PrintControls } from '@/features/legal/print-controls';
import { Link } from '@/i18n/navigation';
import { getAlternates } from '@/lib/seo/alternates';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/cookies') };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <LegalPage
      eyebrow={t('eyebrow')}
      title={t('cookies.title')}
      lastUpdated={t('lastUpdated', { date })}
      footer={
        <p>
          {t('footerQuestion')}{' '}
          <Link href="/contact" className="text-accent underline underline-offset-2">
            {t('footerLink')}
          </Link>
        </p>
      }
    >
      <LegalTableOfContents heading={t('toc')} sections={COOKIES_SECTIONS} locale={locale} />
      <PrintControls label={t('print')} />
      {locale === 'pl' ? <CookiesPL /> : <CookiesEN />}
    </LegalPage>
  );
}
