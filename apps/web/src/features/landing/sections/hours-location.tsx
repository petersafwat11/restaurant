'use client';

import { useRestaurant } from '@/features/restaurants/hooks';
import {
  directionsHref,
  formatAddressLine2,
  hoursToRows,
} from '@/features/restaurants/lib/restaurant-info';
import { Link } from '@/i18n/navigation';
import { Container, HoursTable } from '@repo/ui';
import { ArrowUpRight, MapPin, Phone, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

function MapCard({
  ariaLabel,
  addressBadge,
  addressFooter,
  directionsHref,
  openInMaps,
  geoPoint,
}: {
  ariaLabel: string;
  addressBadge: string;
  addressFooter: string;
  directionsHref: string;
  openInMaps: string;
  /** Real restaurant coordinates from the DB. Null → show a placeholder. */
  geoPoint: { lat: number; lng: number } | null;
}) {
  // Real OpenStreetMap embed centred on the DB coordinates. OSM is used (not
  // Google Maps) because its embed sets no tracking cookies — keeps the page
  // free of consent-requiring third parties.
  const embedSrc = geoPoint
    ? (() => {
        const d = 0.004; // ~±450 m window
        const bbox = [geoPoint.lng - d, geoPoint.lat - d, geoPoint.lng + d, geoPoint.lat + d].join(
          ',',
        );
        return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
          bbox,
        )}&layer=mapnik&marker=${geoPoint.lat},${geoPoint.lng}`;
      })()
    : null;

  return (
    <div className="relative overflow-hidden rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated">
      <div className="relative aspect-[5/4] w-full bg-surface-warm/40">
        {embedSrc ? (
          <iframe
            title={ariaLabel}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div
            role="img"
            aria-label={ariaLabel}
            className="absolute inset-0 grid place-items-center text-fg-subtle"
          >
            <MapPin size={32} aria-hidden />
          </div>
        )}
        {addressBadge && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-surface-elevated px-3 py-1.5 text-small font-medium text-fg shadow-sm">
            {addressBadge}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/[var(--border-alpha)] px-5 py-3">
        <p className="text-caption text-fg-muted">{addressFooter}</p>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
        >
          {openInMaps}
          <ArrowUpRight size={14} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

export function LandingHoursLocation() {
  const t = useTranslations('web.marketing.home.hoursLocation');
  const tCommon = useTranslations('common');
  const { data: restaurant } = useRestaurant();
  const phone = restaurant?.phone ?? '';
  const tel = phone.replace(/\s/g, '');
  const email = restaurant?.email ?? '';
  const href = restaurant ? directionsHref(restaurant) : '#';
  const addressLine1 = restaurant?.address.line1 ?? '';
  const addressLine2 = restaurant ? formatAddressLine2(restaurant.address) : '';
  const dayLabels = [
    tCommon('daysShort.sunday'),
    tCommon('daysShort.monday'),
    tCommon('daysShort.tuesday'),
    tCommon('daysShort.wednesday'),
    tCommon('daysShort.thursday'),
    tCommon('daysShort.friday'),
    tCommon('daysShort.saturday'),
  ];
  const closedLabel = tCommon('closed');
  return (
    <section
      id="locations"
      aria-labelledby="findus-h"
      className="bg-surface py-section-y-mobile sm:py-section-y"
    >
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-eyebrow uppercase text-accent">{t('eyebrow')}</p>
              <h2 id="findus-h" className="mt-2 font-display text-h2 text-fg">
                {t('title')}
              </h2>
            </div>

            <div className="flex flex-col gap-1.5 leading-relaxed">
              <p className="text-body-l font-semibold text-fg">{addressLine1}</p>
              <p className="text-body text-fg-muted">{addressLine2}</p>
              {phone && (
                <a href={`tel:${tel}`} className="mt-1 text-body text-fg hover:text-accent">
                  {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="text-body text-fg-muted hover:text-accent">
                  {email}
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
              >
                <MapPin size={14} /> {t('getDirections')}
              </a>
              <a
                href={`tel:${tel}`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
              >
                <Phone size={14} /> {t('callUs')}
              </a>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
              >
                <Share2 size={14} /> {t('shareLocation')}
              </button>
            </div>

            <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-5">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h3 className="text-eyebrow uppercase text-fg-muted">{t('hoursLabel')}</h3>
              </div>
              <HoursTable
                hours={hoursToRows(restaurant?.hours)}
                highlightToday
                timezone={restaurant?.timezone}
                layout="list"
                dayLabels={dayLabels}
                closedLabel={closedLabel}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <MapCard
              ariaLabel={t('mapAriaLabel', {
                name: restaurant?.name ?? '',
                address: addressLine1,
              })}
              addressBadge={addressLine1}
              addressFooter={addressLine2}
              directionsHref={href}
              openInMaps={t('openInMaps')}
              geoPoint={restaurant?.geoPoint ?? null}
            />
            <div className="flex justify-end">
              <Link
                href="/locations"
                className="inline-flex items-center gap-1 text-small text-fg hover:text-accent"
              >
                {t('viewLargerMap')}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
