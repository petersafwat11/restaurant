import { REFUNDS_SECTIONS, RefundsEN, RefundsPL } from '@/content/legal/refunds-complaints';
import { LEGAL_LAST_UPDATED, getCompanyInfo } from '@/features/legal/company';
import { LegalPage } from '@/features/legal/legal-page';
import { LegalTableOfContents } from '@/features/legal/legal-toc';
import { PrintControls } from '@/features/legal/print-controls';
import { Link } from '@/i18n/navigation';
import { getAlternates } from '@/lib/seo/alternates';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/refunds-complaints') };
}

export default async function RefundsComplaintsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const restaurant = await fetchPublicRestaurant();
  const c = getCompanyInfo(restaurant);
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(LEGAL_LAST_UPDATED));

  return (
    <LegalPage
      eyebrow={t('eyebrow')}
      title={t('refundsComplaints.title')}
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
      <LegalTableOfContents heading={t('toc')} sections={REFUNDS_SECTIONS} locale={locale} />
      <PrintControls label={t('print')} />
      {locale === 'pl' ? <RefundsPL c={c} /> : <RefundsEN c={c} />}
    </LegalPage>
  );
}
