import { DELIVERY_SECTIONS, DeliveryEN, DeliveryPL } from '@/content/legal/delivery-cancellation';
import { LEGAL_LAST_UPDATED, getCompanyInfo } from '@/features/legal/company';
import { buildDeliveryFacts } from '@/features/legal/legal-bundle';
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
  return { alternates: getAlternates('/delivery-cancellation') };
}

export default async function DeliveryCancellationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const restaurant = await fetchPublicRestaurant();
  const c = getCompanyInfo(restaurant);
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(LEGAL_LAST_UPDATED));

  // Day labels (index 0=Sun … 6=Sat) + "Closed" for <HoursTable>, matching the
  // footer's pattern so the legal page reuses the same DB-driven hours rendering.
  const dayLabels = [
    tCommon('daysShort.sunday'),
    tCommon('daysShort.monday'),
    tCommon('daysShort.tuesday'),
    tCommon('daysShort.wednesday'),
    tCommon('daysShort.thursday'),
    tCommon('daysShort.friday'),
    tCommon('daysShort.saturday'),
  ];
  const facts = buildDeliveryFacts(restaurant, c, dayLabels, tCommon('closed'));

  return (
    <LegalPage
      eyebrow={t('eyebrow')}
      title={t('deliveryCancellation.title')}
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
      <LegalTableOfContents heading={t('toc')} sections={DELIVERY_SECTIONS} locale={locale} />
      <PrintControls label={t('print')} />
      {locale === 'pl' ? <DeliveryPL f={facts} /> : <DeliveryEN f={facts} />}
    </LegalPage>
  );
}
