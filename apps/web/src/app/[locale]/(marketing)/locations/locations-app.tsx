'use client';

import { useRestaurants } from '@/features/restaurants/hooks';
import {
  FALLBACK_TIMEZONE,
  directionsHref as buildDirectionsHref,
} from '@/features/restaurants/lib/restaurant-info';
import { Link } from '@/i18n/navigation';
import type { RestaurantPublicDto } from '@repo/types';
import { Container, type DayOfWeek, EmptyState, HoursTable, PageSpinner } from '@repo/ui';
import { zonedParts } from '@repo/utils';
// Note: WeekTimeline (the "Open hours at a glance" bar chart) was removed per
// design feedback — the HoursTable alongside the address already covers it.
import { ArrowUpRight, MapPin, Phone, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type HourRow = NonNullable<RestaurantPublicDto['hours']>[number];

function toMinutes(hhmm: string) {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function formatHM(locale: string, hhmm: string): string {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0];
  const m = parts[1] ?? 0;
  if (h === undefined || Number.isNaN(h)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: m === 0 ? undefined : '2-digit',
    }).format(d);
  } catch {
    return hhmm;
  }
}

function formatNow(locale: string, now: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz,
    }).format(now);
  } catch {
    const p = zonedParts(now, tz);
    return `${p.hour}:${String(p.minute).padStart(2, '0')}`;
  }
}

interface LiveStatus {
  isOpen: boolean;
  headline: string;
  detail: string;
}

function computeStatus(
  hours: HourRow[],
  now: Date,
  t: ReturnType<typeof useTranslations>,
  longDay: (day: number) => string,
  locale: string,
  tz: string,
): LiveStatus | null {
  if (hours.length === 0) return null;
  const parts = zonedParts(now, tz);
  const today = parts.weekday;
  const mins = parts.hour * 60 + parts.minute;
  const todayRow = hours.find((h) => h.dayOfWeek === today);
  if (todayRow && !todayRow.isClosed) {
    const open = toMinutes(todayRow.opensAt);
    const close = toMinutes(todayRow.closesAt);
    if (mins >= open && mins < close) {
      const minsLeft = close - mins;
      const detail =
        minsLeft <= 60
          ? t('status.closingIn', { count: minsLeft })
          : t('status.openUntil', { time: formatHM(locale, todayRow.closesAt) });
      return { isOpen: true, headline: t('status.openNow'), detail };
    }
    if (mins < open) {
      return {
        isOpen: false,
        headline: t('status.closed'),
        detail: t('status.opensTodayAt', { time: formatHM(locale, todayRow.opensAt) }),
      };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const next = hours.find((h) => h.dayOfWeek === (today + i) % 7);
    if (next && !next.isClosed) {
      const time = formatHM(locale, next.opensAt);
      if (i === 1) {
        return {
          isOpen: false,
          headline: t('status.closed'),
          detail: t('status.opensTomorrowAt', { time }),
        };
      }
      return {
        isOpen: false,
        headline: t('status.closed'),
        detail: t('status.opensOnAt', { day: longDay(next.dayOfWeek), time }),
      };
    }
  }
  return { isOpen: false, headline: t('status.closed'), detail: t('status.hoursUnavailable') };
}

function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* -------------------------------------------------------------------------- */
/*  Annotated map                                                             */
/* -------------------------------------------------------------------------- */

interface MapCardProps {
  restaurant: RestaurantPublicDto;
}

function MapCard({ restaurant: r }: MapCardProps) {
  const t = useTranslations('web.marketing.locations');
  const directionsHref = buildDirectionsHref(r);

  // Real OpenStreetMap embed centred on the DB coordinates — identical to the
  // landing page's map (LandingHoursLocation). OSM is used (not Google Maps)
  // because its embed sets no tracking cookies. Falls back to a placeholder
  // when the restaurant has no geoPoint configured in admin.
  const embedSrc = r.geoPoint
    ? (() => {
        const d = 0.004; // ~±450 m window
        const bbox = [
          r.geoPoint.lng - d,
          r.geoPoint.lat - d,
          r.geoPoint.lng + d,
          r.geoPoint.lat + d,
        ].join(',');
        return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
          bbox,
        )}&layer=mapnik&marker=${r.geoPoint.lat},${r.geoPoint.lng}`;
      })()
    : null;

  const ariaLabel = t('address.mapAriaLabel', {
    name: r.name,
    address: `${r.address.line1}, ${r.address.city}`,
  });

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
        <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-surface-elevated px-3 py-1.5 text-small font-medium text-fg shadow-sm">
          {r.address.line1}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/[var(--border-alpha)] px-5 py-3">
        <p className="text-caption text-fg-muted">
          {r.address.zip ?? ''} {r.address.city}, {r.address.country}
        </p>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
        >
          {t('address.openInMaps')}
          <ArrowUpRight size={14} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sticky mobile bar                                                         */
/* -------------------------------------------------------------------------- */

function StickyMobileBar({ tel, directionsHref }: { tel: string; directionsHref: string }) {
  const t = useTranslations('web.marketing.locations.stickyBar');
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3 lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-elevated/95 p-1.5 shadow-lg backdrop-blur">
        <Link
          href="/menu"
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-small font-semibold text-text-on-accent"
        >
          {t('orderOnline')}
        </Link>
        <a
          href={`tel:${tel}`}
          aria-label={t('callAria')}
          className="grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-surface-warm/70"
        >
          <Phone size={16} strokeWidth={1.75} />
        </a>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          aria-label={t('directionsAria')}
          className="grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-surface-warm/70"
        >
          <MapPin size={16} strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function LocationsApp() {
  const t = useTranslations('web.marketing.locations');
  const locale = useLocale();
  const query = useRestaurants();
  const restaurants = query.data ?? [];
  const r = restaurants[0] ?? null;
  const now = useClock();

  const longDay = (d: number) => t(`days.long.${d}` as 'days.long.0');

  if (query.isLoading && !r) {
    return (
      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container>
          <PageSpinner />
        </Container>
      </section>
    );
  }

  if (!r) {
    return (
      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container>
          <EmptyState
            size="lg"
            title={t('empty.title')}
            description={t('empty.description')}
            action={{ label: t('empty.browseMenu'), href: '/menu' }}
          />
        </Container>
      </section>
    );
  }

  const tel = r.phone.replace(/\s/g, '');
  const directionsHref = buildDirectionsHref(r);

  const tz = r.timezone || FALLBACK_TIMEZONE;
  const hours = r.hours ?? [];
  const hoursForTable = hours.map((h) => ({
    dayOfWeek: h.dayOfWeek as DayOfWeek,
    opensAt: h.opensAt,
    closesAt: h.closesAt,
    isClosed: h.isClosed,
  }));
  const status = now ? computeStatus(hours, now, t, longDay, locale, tz) : null;

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/*  Hero                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate flex min-h-[72vh] items-end overflow-hidden bg-fg">
        {r.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={r.coverUrl}
            alt={t('heroImageAlt')}
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/40 via-surface-warm to-surface-2" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <Container className="pb-14 pt-28 sm:pb-20 sm:pt-36">
          <div className="max-w-2xl text-white">
            <p className="text-eyebrow uppercase tracking-[0.25em] text-white/80">{t('eyebrow')}</p>
            <h1
              className="mt-3 font-display text-h1 leading-[1.05] text-white sm:text-[clamp(2.75rem,6vw,4.5rem)]"
              style={{ textWrap: 'balance' }}
            >
              {r.name}
            </h1>
            {r.description && (
              <p className="mt-4 max-w-xl text-body-l text-white/85">{r.description}</p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-small">
              {status && (
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`relative grid h-2.5 w-2.5 place-items-center ${status.isOpen ? 'text-positive' : 'text-white/60'}`}
                  >
                    {status.isOpen && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-75" />
                    )}
                    <span
                      className={`relative h-2.5 w-2.5 rounded-full ${status.isOpen ? 'bg-positive' : 'bg-white/60'}`}
                    />
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-white">
                    {status.headline}
                  </span>
                  <span className="text-white/75">&middot;</span>
                  <span className="text-white/85">{status.detail}</span>
                </span>
              )}
              {now && (
                <span className="text-white/70">
                  {t('clock', {
                    time: formatNow(locale, now, tz),
                    day: longDay(zonedParts(now, tz).weekday),
                  })}
                </span>
              )}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-button bg-accent px-6 text-small font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
              >
                {t('ctas.orderOnline')}
                <ArrowUpRight size={16} strokeWidth={2} />
              </Link>
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-white/30 bg-white/5 px-5 text-small font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                <MapPin size={16} strokeWidth={2} />
                {t('ctas.getDirections')}
              </a>
              <a
                href={`tel:${tel}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-white/30 bg-white/5 px-5 text-small font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                <Phone size={16} strokeWidth={2} />
                {r.phone}
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Address + map                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-bg py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-eyebrow uppercase text-accent">{t('address.eyebrow')}</p>
                <h2 className="mt-2 font-display text-h2 text-fg">
                  {t('address.title', { city: r.address.city })}
                </h2>
              </div>

              <div className="flex flex-col gap-1.5 leading-relaxed">
                <p className="text-body-l font-semibold text-fg">{r.address.line1}</p>
                <p className="text-body text-fg-muted">
                  {r.address.zip ?? ''} {r.address.city}, {r.address.country}
                </p>
                <a href={`tel:${tel}`} className="mt-1 text-body text-fg hover:text-accent">
                  {r.phone}
                </a>
                <a href={`mailto:${r.email}`} className="text-body text-fg-muted hover:text-accent">
                  {r.email}
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
                >
                  <MapPin size={14} /> {t('ctas.getDirections')}
                </a>
                <a
                  href={`tel:${tel}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
                >
                  <Phone size={14} /> {t('ctas.callUs')}
                </a>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
                >
                  <Share2 size={14} /> {t('ctas.share')}
                </button>
              </div>

              {hoursForTable.length > 0 && (
                <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-5">
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h3 className="text-eyebrow uppercase text-fg-muted">{t('hours.label')}</h3>
                    {status && (
                      <span
                        className={`text-caption font-medium ${status.isOpen ? 'text-positive' : 'text-fg-muted'}`}
                      >
                        {status.detail}
                      </span>
                    )}
                  </div>
                  <HoursTable
                    hours={hoursForTable}
                    highlightToday
                    timezone={tz}
                    layout="list"
                    dayLabels={[0, 1, 2, 3, 4, 5, 6].map((d) =>
                      t(`days.short.${d}` as 'days.short.0'),
                    )}
                    closedLabel={t('weekTimeline.closed')}
                  />
                </div>
              )}
            </div>

            <MapCard restaurant={r} />
          </div>
        </Container>
      </section>

      <StickyMobileBar tel={tel} directionsHref={directionsHref} />
    </>
  );
}
