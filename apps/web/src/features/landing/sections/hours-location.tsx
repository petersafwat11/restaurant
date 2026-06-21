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
  mapTitle,
  pinTitle,
  tramAnnotation,
  metroAnnotation,
  directionsHref,
  openInMaps,
}: {
  ariaLabel: string;
  addressBadge: string;
  addressFooter: string;
  mapTitle: string;
  pinTitle: string;
  tramAnnotation: string;
  metroAnnotation: string;
  directionsHref: string;
  openInMaps: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated">
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative aspect-[5/4] w-full bg-[radial-gradient(circle_at_30%_30%,rgb(var(--surface-warm))_0%,rgb(var(--surface-2))_60%,rgb(var(--surface))_100%)]"
      >
        <svg
          viewBox="0 0 500 400"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden
          role="presentation"
        >
          <title>{mapTitle}</title>
          <defs>
            <pattern id="landingGridFine" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M0 16 H32 M16 0 V32"
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="0.6"
                fill="none"
              />
            </pattern>
          </defs>

          <rect width="500" height="400" fill="url(#landingGridFine)" />

          {/* Park / green block */}
          <path
            d="M40 280 Q 90 240 160 260 Q 210 280 200 340 L 60 360 Z"
            fill="rgb(79 123 60 / 0.18)"
          />

          {/* River */}
          <path
            d="M-20 90 Q 120 80 220 130 T 540 110"
            stroke="rgb(73 130 168 / 0.35)"
            strokeWidth={28}
            fill="none"
            strokeLinecap="round"
          />

          {/* Avenues */}
          <path
            d="M-20 200 Q 150 180 260 220 T 540 240"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={6}
            fill="none"
          />
          <path
            d="M260 -20 Q 250 130 280 240 T 320 420"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={6}
            fill="none"
          />
          <path d="M-20 320 H 540" stroke="rgba(255,255,255,0.85)" strokeWidth={4} fill="none" />
          <path d="M80 -20 V 420" stroke="rgba(255,255,255,0.7)" strokeWidth={3} fill="none" />

          {/* Tram stop dot */}
          <g transform="translate(208, 210)">
            <circle r={7} fill="#fff" stroke="rgb(var(--accent))" strokeWidth={2} />
            <circle r={3} fill="rgb(var(--accent))" />
          </g>

          {/* Metro station marker */}
          <g transform="translate(370, 326)">
            <rect x={-9} y={-9} width={18} height={18} rx={3} fill="#1d4ed8" />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#fff"
              fontFamily="system-ui"
            >
              M
            </text>
          </g>
        </svg>

        {/* Restaurant pin */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[68%]">
          <span className="absolute -inset-3 animate-ping rounded-full bg-accent/40" />
          <svg width={46} height={58} viewBox="0 0 44 56" aria-hidden role="presentation">
            <title>{pinTitle}</title>
            <path
              d="M22 0c-12 0-22 9-22 21 0 16 22 35 22 35S44 37 44 21C44 9 34 0 22 0Z"
              fill="rgb(var(--accent))"
            />
            <circle cx={22} cy={20} r={7} fill="white" />
            <circle cx={22} cy={20} r={3} fill="rgb(var(--accent))" />
          </svg>
        </div>

        {/* Annotation chips */}
        <div className="absolute left-[36%] top-[44%] -translate-y-full">
          <span className="block whitespace-nowrap rounded-md bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-fg shadow-sm">
            {tramAnnotation}
          </span>
        </div>
        <div className="absolute left-[68%] top-[78%]">
          <span className="block whitespace-nowrap rounded-md bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-fg shadow-sm">
            {metroAnnotation}
          </span>
        </div>
        <div className="absolute left-4 top-4 rounded-md bg-surface-elevated px-3 py-1.5 text-small font-medium text-fg shadow-sm">
          {addressBadge}
        </div>
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
              mapTitle={t('mapTitle')}
              pinTitle={t('pinTitle')}
              tramAnnotation={t('tramAnnotation')}
              metroAnnotation={t('metroAnnotation')}
              directionsHref={href}
              openInMaps={t('openInMaps')}
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
