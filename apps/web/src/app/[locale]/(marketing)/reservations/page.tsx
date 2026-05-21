import type { Metadata } from 'next';
import { Container, EmptyState } from '@repo/ui';
import { CalendarClock } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAlternates } from '@/lib/seo/alternates';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/reservations') };
}

export default async function ReservationsLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.marketing.reservations' });

  return (
    <section className="bg-bg py-section-y-mobile sm:py-section-y">
      <Container size="narrow">
        <EmptyState
          size="lg"
          icon={<CalendarClock size={64} strokeWidth={1.25} />}
          title={t('title')}
          description={t('description', { phone: t('phone') })}
          action={{ label: t('browseMenu'), href: '/menu' }}
        />
      </Container>
    </section>
  );
}
