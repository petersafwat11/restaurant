import { seoMetadata } from '@/features/seo/load-seo';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { JsonLd } from '@/lib/seo/json-ld';
import { restaurantId } from '@/lib/seo/schema';
import { absoluteUrl } from '@/lib/seo/site';
import { Container, EmptyState } from '@repo/ui';
import { CalendarClock } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return seoMetadata(locale, 'reservations', '/reservations');
}

export default async function ReservationsLandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'web.marketing.reservations' });
  const restaurant = await fetchPublicRestaurant();

  // Only declare a ReserveAction when reservations are actually switched on —
  // otherwise search engines would advertise an action the restaurant turned
  // off. It extends the site-wide Restaurant node by `@id` (no duplicate node).
  const reserveSchema = restaurant?.acceptsReservations
    ? {
        '@type': 'Restaurant',
        '@id': restaurantId(),
        potentialAction: {
          '@type': 'ReserveAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: absoluteUrl(locale, '/reservations'),
            inLanguage: locale === 'en' ? 'en' : 'pl',
          },
          result: { '@type': 'Reservation', name: 'Table reservation' },
        },
      }
    : null;

  return (
    <>
      {reserveSchema ? <JsonLd id="ld-reservations" data={reserveSchema} /> : null}
      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container size="narrow">
          <EmptyState
            size="lg"
            headingAs="h1"
            icon={<CalendarClock size={64} strokeWidth={1.25} />}
            title={t('title')}
            description={t('description', { phone: restaurant?.phone ?? t('phone') })}
            action={{ label: t('browseMenu'), href: '/menu' }}
          />
        </Container>
      </section>
    </>
  );
}
