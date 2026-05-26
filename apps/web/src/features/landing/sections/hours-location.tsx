import { Link } from '@/i18n/navigation';
import { mockHours } from '@/lib/mock/szef-donald';
import { Container, HoursTable, SectionHeader } from '@repo/ui';
import { ArrowUpRight, MapPin, Phone, Share2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

function MapPlaceholder({
  ariaLabel,
  addressBadge,
  mapTitle,
  pinTitle,
}: {
  ariaLabel: string;
  addressBadge: string;
  mapTitle: string;
  pinTitle: string;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-image-lg bg-surface-warm"
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden
        role="presentation"
      >
        <title>{mapTitle}</title>
        <defs>
          <pattern id="streetGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M0 24 H48 M24 0 V48"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="0.7"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#streetGrid)" />
        <path
          d="M0 130 Q 120 110 200 140 T 400 160"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={6}
          fill="none"
        />
        <path
          d="M210 0 Q 200 120 220 200 T 250 300"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={6}
          fill="none"
        />
        <ellipse cx={100} cy={220} rx={55} ry={32} fill="rgb(79 123 60 / 0.35)" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-3 animate-ping rounded-full bg-accent opacity-30" />
        <svg width={44} height={56} viewBox="0 0 44 56" aria-hidden role="presentation">
          <title>{pinTitle}</title>
          <path
            d="M22 0c-12 0-22 9-22 21 0 16 22 35 22 35S44 37 44 21C44 9 34 0 22 0Z"
            fill="rgb(var(--accent))"
          />
          <circle cx={22} cy={20} r={7} fill="white" />
          <circle cx={22} cy={20} r={3} fill="rgb(var(--accent))" />
        </svg>
      </div>
      <div className="absolute left-4 top-4 rounded-md bg-surface-elevated px-3 py-1.5 text-[12px] font-medium text-fg shadow-sm">
        {addressBadge}
      </div>
    </div>
  );
}

export async function LandingHoursLocation() {
  const t = await getTranslations('web.marketing.home.hoursLocation');
  const tCommon = await getTranslations('common');
  const phone = t('phone');
  const tel = phone.replace(/\s/g, '');
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
        <div className="grid items-start gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <SectionHeader id="findus-h" eyebrow={t('eyebrow')} title={t('title')} />
            <div className="flex flex-col gap-1 leading-relaxed">
              <div className="text-body-l font-semibold text-fg">{t('addressLine1')}</div>
              <div className="text-body text-fg-muted">{t('addressLine2')}</div>
              <a href={`tel:${tel}`} className="text-body text-fg hover:text-accent">
                {phone}
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="#"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40"
              >
                <MapPin size={14} /> {t('getDirections')}
              </Link>
              <a
                href={`tel:${tel}`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40"
              >
                <Phone size={14} /> {t('callUs')}
              </a>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40"
              >
                <Share2 size={14} /> {t('shareLocation')}
              </button>
            </div>
            <HoursTable hours={mockHours} highlightToday layout="list" dayLabels={dayLabels} closedLabel={closedLabel} />
          </div>
          <div className="flex flex-col gap-3">
            <MapPlaceholder ariaLabel={t('mapAriaLabel')} addressBadge={t('addressLine1')} mapTitle={t('mapTitle')} pinTitle={t('pinTitle')} />
            <div className="flex justify-end">
              <Link
                href="#"
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
