'use client';

import { useRestaurants } from '@/features/restaurants/hooks';
import type { RestaurantPublicDto } from '@repo/types';
import { Container, type DayOfWeek, EmptyState, HoursTable, PageSpinner } from '@repo/ui';
import { ArrowUpRight, Bike, Footprints, MapPin, Phone, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type HourRow = NonNullable<RestaurantPublicDto['hours']>[number];

function toMinutes(hhmm: string) {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function formatTime12(hhmm: string) {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0];
  const m = parts[1] ?? 0;
  if (h === undefined || Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

interface LiveStatus {
  isOpen: boolean;
  headline: string;
  detail: string;
}

function computeStatus(hours: HourRow[], now: Date): LiveStatus | null {
  if (hours.length === 0) return null;
  const today = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const todayRow = hours.find((h) => h.dayOfWeek === today);
  if (todayRow && !todayRow.isClosed) {
    const open = toMinutes(todayRow.opensAt);
    const close = toMinutes(todayRow.closesAt);
    if (mins >= open && mins < close) {
      const minsLeft = close - mins;
      const detail =
        minsLeft <= 60
          ? `Closing in ${minsLeft} min`
          : `Open until ${formatTime12(todayRow.closesAt)}`;
      return { isOpen: true, headline: 'Open now', detail };
    }
    if (mins < open) {
      return {
        isOpen: false,
        headline: 'Closed',
        detail: `Opens today at ${formatTime12(todayRow.opensAt)}`,
      };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const next = hours.find((h) => h.dayOfWeek === (today + i) % 7);
    if (next && !next.isClosed) {
      const label = i === 1 ? 'tomorrow' : DAY_LONG[next.dayOfWeek];
      return {
        isOpen: false,
        headline: 'Closed',
        detail: `Opens ${label} at ${formatTime12(next.opensAt)}`,
      };
    }
  }
  return { isOpen: false, headline: 'Closed', detail: 'Hours unavailable' };
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

function formatClockLine(now: Date) {
  const day = DAY_LONG[now.getDay()];
  const h = now.getHours();
  const m = now.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  const minutes = String(m).padStart(2, '0');
  return `It's ${hour}:${minutes}${period}, ${day}`;
}

/* -------------------------------------------------------------------------- */
/*  Week timeline                                                             */
/* -------------------------------------------------------------------------- */

interface WeekTimelineProps {
  hours: HourRow[];
  now: Date | null;
}

const TIMELINE_START = 8 * 60; // 08:00
const TIMELINE_END = 24 * 60 + 60; // 25:00 — accommodates closings just past midnight visually

function clampPct(value: number) {
  return Math.max(0, Math.min(100, value));
}

function WeekTimeline({ hours, now }: WeekTimelineProps) {
  const today = now ? now.getDay() : -1;
  const nowMins = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const span = TIMELINE_END - TIMELINE_START;

  // Order Mon–Sun for a more familiar week
  const order: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

  const ticks = [10, 14, 18, 22];

  return (
    <div className="overflow-hidden rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 sm:p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase text-accent">This week</p>
          <h3 className="mt-2 font-display text-h3 text-fg">Open hours at a glance</h3>
        </div>
        <p className="hidden text-caption text-fg-subtle sm:block">
          Bars show when we&rsquo;re serving · today is highlighted
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {order.map((d) => {
          const row = hours.find((h) => h.dayOfWeek === d);
          const isToday = d === today;
          const isClosed = !row || row.isClosed;

          const openMin = row && !row.isClosed ? toMinutes(row.opensAt) : 0;
          let closeMin = row && !row.isClosed ? toMinutes(row.closesAt) : 0;
          // Treat closeMin <= openMin as crossing midnight
          if (!isClosed && closeMin <= openMin) closeMin += 24 * 60;

          const left = clampPct(((openMin - TIMELINE_START) / span) * 100);
          const right = clampPct(((closeMin - TIMELINE_START) / span) * 100);
          const nowPct = clampPct(((nowMins - TIMELINE_START) / span) * 100);

          return (
            <div
              key={d}
              className={
                'grid grid-cols-[44px_1fr_88px] items-center gap-3 rounded-md py-1.5 sm:gap-4 ' +
                (isToday ? 'bg-surface-warm/40 px-2' : 'px-2')
              }
            >
              <span
                className={
                  'text-caption font-semibold uppercase tracking-wider ' +
                  (isToday ? 'text-accent' : 'text-fg-muted')
                }
              >
                {DAY_LABELS[d]}
              </span>

              <div className="relative h-3 rounded-full bg-surface-warm/70">
                {!isClosed && (
                  <div
                    className={
                      'absolute inset-y-0 rounded-full transition-colors ' +
                      (isToday ? 'bg-accent/55 ring-1 ring-inset ring-accent/40' : 'bg-accent/25')
                    }
                    style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
                  />
                )}
                {isToday && now && (
                  <div
                    className="absolute -top-1 -bottom-1 w-px bg-fg"
                    style={{ left: `${nowPct}%` }}
                    aria-hidden
                  >
                    <span className="absolute -left-[3px] -top-[3px] block h-[7px] w-[7px] rounded-full bg-fg shadow-[0_0_0_2px_rgb(var(--surface-elevated))]" />
                  </div>
                )}
              </div>

              <span
                className={
                  'text-right text-caption tabular-nums ' +
                  (isClosed ? 'text-fg-subtle' : isToday ? 'font-medium text-fg' : 'text-fg-muted')
                }
              >
                {isClosed || !row
                  ? 'Closed'
                  : `${formatTime12(row.opensAt)}–${formatTime12(row.closesAt)}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* axis ticks */}
      <div className="mt-3 grid grid-cols-[44px_1fr_88px] gap-3 sm:gap-4">
        <span aria-hidden />
        <div className="relative h-4">
          {ticks.map((t) => {
            const pct = clampPct(((t * 60 - TIMELINE_START) / span) * 100);
            return (
              <span
                key={t}
                className="absolute top-0 -translate-x-1/2 text-[10px] uppercase tracking-wider text-fg-subtle"
                style={{ left: `${pct}%` }}
              >
                {t > 12 ? `${t - 12}pm` : `${t}am`}
              </span>
            );
          })}
        </div>
        <span aria-hidden />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Annotated map                                                             */
/* -------------------------------------------------------------------------- */

interface MapCardProps {
  restaurant: RestaurantPublicDto;
}

function MapCard({ restaurant: r }: MapCardProps) {
  const directionsHref = r.geoPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${r.geoPoint.lat},${r.geoPoint.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${r.address.line1}, ${r.address.city}`,
      )}`;

  return (
    <div className="relative overflow-hidden rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated">
      <div
        role="img"
        aria-label={`Map showing ${r.name} at ${r.address.line1}, ${r.address.city}`}
        className="relative aspect-[5/4] w-full bg-[radial-gradient(circle_at_30%_30%,rgb(var(--surface-warm))_0%,rgb(var(--surface-2))_60%,rgb(var(--surface))_100%)]"
      >
        <svg
          viewBox="0 0 500 400"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <pattern id="gridFine" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M0 16 H32 M16 0 V32"
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="0.6"
                fill="none"
              />
            </pattern>
          </defs>

          <rect width="500" height="400" fill="url(#gridFine)" />

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
          <svg width={46} height={58} viewBox="0 0 44 56" aria-hidden>
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
            Tram &middot; 2 min walk
          </span>
        </div>
        <div className="absolute left-[68%] top-[78%]">
          <span className="block whitespace-nowrap rounded-md bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-fg shadow-sm">
            Metro &middot; 5 min walk
          </span>
        </div>
        <div className="absolute left-4 top-4 rounded-md bg-surface-elevated px-3 py-1.5 text-small font-medium text-fg shadow-sm">
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
          Open in Maps
          <ArrowUpRight size={14} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero mode card (glass)                                                    */
/* -------------------------------------------------------------------------- */

function HeroModeCard({
  icon,
  title,
  body,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-card border border-white/15 bg-white/[0.06] px-4 py-3.5 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-white/[0.12]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/15 transition-colors group-hover:bg-accent group-hover:text-text-on-accent group-hover:ring-accent/0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-body-l font-semibold leading-tight text-white">{title}</p>
        <p className="mt-0.5 text-caption text-white/70">{body}</p>
      </div>
      <ArrowUpRight
        size={16}
        strokeWidth={2}
        className="shrink-0 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sticky mobile bar                                                         */
/* -------------------------------------------------------------------------- */

function StickyMobileBar({ tel, directionsHref }: { tel: string; directionsHref: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3 lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-elevated/95 p-1.5 shadow-lg backdrop-blur">
        <Link
          href="/menu"
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-small font-semibold text-text-on-accent"
        >
          Order online
        </Link>
        <a
          href={`tel:${tel}`}
          aria-label="Call"
          className="grid h-11 w-11 place-items-center rounded-full text-fg hover:bg-surface-warm/70"
        >
          <Phone size={16} strokeWidth={1.75} />
        </a>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Directions"
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

export default function LocationsPage() {
  const query = useRestaurants();
  const restaurants = query.data ?? [];
  const r = restaurants[0] ?? null;
  const now = useClock();

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
            title="We&rsquo;re not quite ready yet"
            description="The restaurant is being set up. Check back soon."
            action={{ label: 'Browse menu', href: '/menu' }}
          />
        </Container>
      </section>
    );
  }

  const tel = r.phone.replace(/\s/g, '');
  const directionsHref = r.geoPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${r.geoPoint.lat},${r.geoPoint.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${r.address.line1}, ${r.address.city}`,
      )}`;

  const hours = r.hours ?? [];
  const hoursForTable = hours.map((h) => ({
    dayOfWeek: h.dayOfWeek as DayOfWeek,
    opensAt: h.opensAt,
    closesAt: h.closesAt,
    isClosed: h.isClosed,
  }));
  const status = now ? computeStatus(hours, now) : null;

  const modes = [
    r.acceptsDelivery ? 'Delivery' : null,
    r.acceptsPickup ? 'Pickup' : null,
    r.acceptsDineIn ? 'Dine-in' : null,
  ].filter(Boolean) as string[];

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
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/40 via-surface-warm to-surface-2" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <Container className="pb-14 pt-28 sm:pb-20 sm:pt-36">
          <div className="max-w-2xl text-white">
            <p className="text-eyebrow uppercase tracking-[0.25em] text-white/80">Visit us</p>
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
                    className={
                      'relative grid h-2.5 w-2.5 place-items-center ' +
                      (status.isOpen ? 'text-positive' : 'text-white/60')
                    }
                  >
                    {status.isOpen && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-75" />
                    )}
                    <span
                      className={
                        'relative h-2.5 w-2.5 rounded-full ' +
                        (status.isOpen ? 'bg-positive' : 'bg-white/60')
                      }
                    />
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-white">
                    {status.headline}
                  </span>
                  <span className="text-white/75">&middot;</span>
                  <span className="text-white/85">{status.detail}</span>
                </span>
              )}
              {now && <span className="text-white/70">{formatClockLine(now)}</span>}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-button bg-accent px-6 text-small font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
              >
                Order online
                <ArrowUpRight size={16} strokeWidth={2} />
              </Link>
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-white/30 bg-white/5 px-5 text-small font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                <MapPin size={16} strokeWidth={2} />
                Get directions
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

          {/* Hero order-mode cards — hidden for now, keeping markup + styles for later */}
          {/* {modes.length > 0 && (
            <div className="mt-10 grid max-w-4xl gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4">
              {r.acceptsDelivery && (
                <HeroModeCard
                  icon={<Bike size={20} strokeWidth={1.8} />}
                  title="Delivery"
                  body="Hot, at your door"
                  href="/menu?mode=delivery"
                />
              )}
              {r.acceptsPickup && (
                <HeroModeCard
                  icon={<MapPin size={20} strokeWidth={1.8} />}
                  title="Pickup"
                  body="Skip the line"
                  href="/menu?mode=pickup"
                />
              )}
              {r.acceptsDineIn && (
                <HeroModeCard
                  icon={<Footprints size={20} strokeWidth={1.8} />}
                  title="Dine-in"
                  body="Come sit with us"
                  href="/menu?mode=dine-in"
                />
              )}
            </div>
          )} */}
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
                <p className="text-eyebrow uppercase text-accent">Find us</p>
                <h2 className="mt-2 font-display text-h2 text-fg">
                  Right in the heart of {r.address.city}.
                </h2>
              </div>

              <div className="flex flex-col gap-1.5 leading-relaxed">
                <p className="text-body-l font-semibold text-fg">{r.address.line1}</p>
                <p className="text-body text-fg-muted">
                  {r.address.zip ?? ''} {r.address.city}, {r.address.country}
                </p>
                <Link href={`tel:${tel}`} className="mt-1 text-body text-fg hover:text-accent">
                  {r.phone}
                </Link>
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
                  <MapPin size={14} /> Get directions
                </a>
                <a
                  href={`tel:${tel}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
                >
                  <Phone size={14} /> Call us
                </a>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg hover:border-accent/40 hover:text-accent"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>

              {hoursForTable.length > 0 && (
                <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-5">
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h3 className="text-eyebrow uppercase text-fg-muted">Hours</h3>
                    {status && (
                      <span
                        className={
                          'text-caption font-medium ' +
                          (status.isOpen ? 'text-positive' : 'text-fg-muted')
                        }
                      >
                        {status.detail}
                      </span>
                    )}
                  </div>
                  <HoursTable hours={hoursForTable} highlightToday layout="list" />
                </div>
              )}
            </div>

            <MapCard restaurant={r} />
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Week timeline                                                     */}
      {/* ------------------------------------------------------------------ */}
      {hours.length > 0 && (
        <section className="bg-surface py-section-y-mobile sm:py-section-y">
          <Container>
            <WeekTimeline hours={hours} now={now} />
          </Container>
        </section>
      )}

      <StickyMobileBar tel={tel} directionsHref={directionsHref} />
    </>
  );
}
