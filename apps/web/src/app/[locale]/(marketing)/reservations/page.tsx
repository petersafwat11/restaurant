import { getAlternates } from '@/lib/seo/alternates';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { JsonLd, buildReservationSchema } from '@/lib/seo/json-ld';
import { Container, EmptyState } from '@repo/ui';
import { CalendarClock } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export function generateMetadata(): Metadata {
  return { alternates: getAlternates('/reservations') };
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}

export default async function ReservationsLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.marketing.reservations' });

  const restaurant = await fetchPublicRestaurant();
  const base = siteUrl();
  // Only emit ReserveAction JSON-LD when the restaurant actually accepts
  // reservations — otherwise a search engine that lands a user on this page
  // would advertise an action the restaurant has turned off.
  const reserveSchema = restaurant?.acceptsReservations
    ? buildReservationSchema(restaurant, {
        siteUrl: base,
        reservationUrl: `${base}/reservations`,
      })
    : null;

  return (
    <>
      {reserveSchema ? <JsonLd id="ld-reservations" data={reserveSchema} /> : null}
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
    </>
  );
}
