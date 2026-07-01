import { LEGAL_LAST_UPDATED } from '@/features/legal/company';
import {
  LEGAL_BUNDLE_DOCUMENTS,
  LEGAL_BUNDLE_VERSION,
  bundleSections,
  bundleTitleKey,
  isBundleDocument,
  renderBundleBody,
} from '@/features/legal/legal-bundle';
import { LegalPage } from '@/features/legal/legal-page';
import { LegalTableOfContents } from '@/features/legal/legal-toc';
import { PrintControls } from '@/features/legal/print-controls';
import { Link } from '@/i18n/navigation';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { LEGAL_BUNDLE_EFFECTIVE_DATE } from '@repo/types';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

/**
 * Versioned legal archive — `/legal/archive/{version}/{document}` (plan
 * §C3/§D1). Serves an immutable, versioned snapshot of a bundle document for
 * audit/support. Only one bundle version exists today, so the route statically
 * generates the current version × each bundle document and 404s anything else.
 *
 * Lives outside the `(marketing)` group on purpose: it is a plain, self-contained
 * snapshot (no site chrome) suitable for linking from a confirmation email or a
 * support ticket. It is `noindex` so search engines don't surface old versions.
 */

export function generateStaticParams() {
  // Current version × the four bundle documents. Widen this list when a new
  // bundle version is added (each archived version keeps its own copy).
  return ['pl', 'en'].flatMap((locale) =>
    LEGAL_BUNDLE_DOCUMENTS.map((document) => ({
      locale,
      version: LEGAL_BUNDLE_VERSION,
      document,
    })),
  );
}

export function generateMetadata(): Metadata {
  // Archived snapshots must not be indexed (old versions shouldn't outrank the
  // live policy pages).
  return { robots: { index: false, follow: false } };
}

export default async function LegalArchivePage({
  params,
}: {
  params: Promise<{ locale: string; version: string; document: string }>;
}) {
  const { locale, version, document } = await params;
  setRequestLocale(locale);

  // Only the current bundle version + a known bundle document are served.
  if (version !== LEGAL_BUNDLE_VERSION || !isBundleDocument(document)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'web.legal' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const restaurant = await fetchPublicRestaurant();

  const dayLabels = [
    tCommon('daysShort.sunday'),
    tCommon('daysShort.monday'),
    tCommon('daysShort.tuesday'),
    tCommon('daysShort.wednesday'),
    tCommon('daysShort.thursday'),
    tCommon('daysShort.friday'),
    tCommon('daysShort.saturday'),
  ];

  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    dateStyle: 'long',
    timeZone: 'Europe/Warsaw',
  }).format(new Date(LEGAL_BUNDLE_EFFECTIVE_DATE || LEGAL_LAST_UPDATED));

  const body = renderBundleBody(document, {
    restaurant,
    locale,
    dayLabels,
    closedLabel: tCommon('closed'),
  });

  return (
    <LegalPage
      eyebrow={t('archive.eyebrow', { version })}
      title={t(bundleTitleKey(document))}
      lastUpdated={t('archive.effective', { date })}
      footer={
        <p>
          {t('archive.currentNotice')}{' '}
          <Link href={`/${document}`} className="text-accent underline underline-offset-2">
            {t('archive.currentLink')}
          </Link>
        </p>
      }
    >
      <LegalTableOfContents
        heading={t('toc')}
        sections={bundleSections(document)}
        locale={locale}
      />
      <PrintControls label={t('print')} />
      {body}
    </LegalPage>
  );
}
