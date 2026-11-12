import { groupHours } from '@/features/restaurants/lib/restaurant-facts';
import { directionsHref } from '@/features/restaurants/lib/restaurant-info';
import { Link } from '@/i18n/navigation';
import type { RestaurantPublicDto } from '@repo/types';
import { Container } from '@repo/ui';
import { ArrowRight, ChevronRight, MapPin, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ContentSection, QA } from '../seo-vars';

/**
 * Server-rendered building blocks for the SEO / AI-visibility pages. Plain
 * semantic HTML (H2 / H3, lists, tables) so crawlers and AI bots that don't
 * run JavaScript get every fact in the initial response.
 */

export function PageIntro({
  h1,
  lead,
  eyebrow,
  children,
}: {
  h1: string;
  lead?: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-bg pb-8 pt-12 sm:pt-16">
      <Container>
        {eyebrow && <p className="text-eyebrow uppercase text-accent">{eyebrow}</p>}
        <h1
          className="mt-3 max-w-3xl font-display text-h2 text-fg sm:text-h1"
          style={{ textWrap: 'balance' }}
        >
          {h1}
        </h1>
        {lead && <p className="mt-4 max-w-2xl text-body-l text-fg-muted">{lead}</p>}
        {children}
      </Container>
    </section>
  );
}

export interface Crumb {
  name: string;
  href: string;
}

export function Breadcrumbs({ items, ariaLabel }: { items: Crumb[]; ariaLabel: string }) {
  return (
    <nav aria-label={ariaLabel} className="bg-bg pt-6">
      <Container>
        <ol className="flex flex-wrap items-center gap-1 text-small text-fg-subtle">
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} aria-hidden />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-fg-muted">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-accent">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Container>
    </nav>
  );
}

/** "Zamów bezpośrednio — dostawa 0 zł" strip, linking to the menu. */
export function OrderDirectBanner({ text, href = '/menu' }: { text: string; href?: string }) {
  return (
    <Link
      href={href}
      className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-small font-semibold text-accent hover:bg-accent/15"
    >
      <Truck size={16} aria-hidden />
      {text}
      <ArrowRight size={14} aria-hidden />
    </Link>
  );
}

export function CtaRow({
  primary,
  secondary,
}: {
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={primary.href}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-button bg-accent px-6 text-[15px] font-semibold text-text-on-accent hover:bg-accent-hover"
      >
        {primary.label}
        <ArrowRight size={16} aria-hidden />
      </Link>
      {secondary && (
        <Link
          href={secondary.href}
          className="inline-flex h-12 items-center justify-center rounded-button border border-border/[var(--border-strong-alpha)] px-6 text-[15px] font-medium text-fg hover:bg-surface-warm/40"
        >
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

export function ContentSections({ sections }: { sections: ContentSection[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      {sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <h2 className="font-display text-h3 text-fg sm:text-h2">{s.heading}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p} className="text-body-l text-fg-muted">
              {p}
            </p>
          ))}
          {s.bullets && s.bullets.length > 0 && (
            <ul className="list-disc space-y-1 pl-6 text-body text-fg-muted">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function FaqList({ heading, items }: { heading: string; items: QA[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq-h" className="flex max-w-3xl flex-col gap-4">
      <h2 id="faq-h" className="font-display text-h3 text-fg sm:text-h2">
        {heading}
      </h2>
      <div className="flex flex-col divide-y divide-border/[var(--border-alpha)] rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated">
        {items.map((i) => (
          <div key={i.q} className="p-5">
            <h3 className="text-body-l font-semibold text-fg">{i.q}</h3>
            <p className="mt-2 text-body text-fg-muted">{i.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface DishLink {
  key: string;
  name: string;
  href: string;
  price: string;
  description?: string | null;
  meta?: string | null;
  image?: { src: string; alt: string } | null;
}

export function DishLinkList({ heading, items }: { heading: string; items: DishLink[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-h3 text-fg sm:text-h2">{heading}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((d) => (
          <li key={d.key}>
            <Link
              href={d.href}
              className="flex h-full gap-4 rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-3 transition-colors hover:border-accent/40"
            >
              {d.image?.src ? (
                <img
                  src={d.image.src}
                  alt={d.image.alt}
                  loading="lazy"
                  width={88}
                  height={66}
                  className="h-[66px] w-[88px] shrink-0 rounded-md object-cover"
                />
              ) : null}
              <div className="flex min-w-0 flex-col">
                <h3 className="text-body font-semibold text-fg">{d.name}</h3>
                {d.meta && <p className="text-caption text-fg-subtle">{d.meta}</p>}
                {d.description && (
                  <p className="line-clamp-2 text-small text-fg-muted">{d.description}</p>
                )}
                <p className="mt-auto pt-1 text-small font-semibold text-fg">{d.price}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface FactsLabels {
  heading: string;
  address: string;
  phone: string;
  hours: string;
  delivery: string;
  deliveryValue: string;
  payments: string;
  paymentsValue: string;
  pickup: string;
  pickupValue: string;
  closed: string;
}

/** Address, phone, hours, delivery terms — the facts AI answers are built from. */
export function FactsCard({
  restaurant: r,
  locale,
  labels,
}: {
  restaurant: RestaurantPublicDto;
  locale: string;
  labels: FactsLabels;
}) {
  const tel = r.phone.replace(/\s/g, '');
  return (
    <aside className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6">
      <h2 className="font-display text-h3 text-fg">{labels.heading}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-body">
        <div>
          <dt className="text-caption uppercase tracking-wide text-fg-subtle">{labels.address}</dt>
          <dd className="text-fg">
            {r.address.line1}, {[r.address.zip, r.address.city].filter(Boolean).join(' ')}
          </dd>
        </div>
        <div>
          <dt className="text-caption uppercase tracking-wide text-fg-subtle">{labels.phone}</dt>
          <dd>
            <a href={`tel:${tel}`} className="text-fg hover:text-accent">
              {r.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-caption uppercase tracking-wide text-fg-subtle">{labels.hours}</dt>
          <dd className="text-fg">
            <ul>
              {groupHours(r.hours, locale).map((g) => (
                <li key={g.label}>
                  {g.label}: {g.time ?? labels.closed}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {r.acceptsDelivery && (
          <div>
            <dt className="text-caption uppercase tracking-wide text-fg-subtle">
              {labels.delivery}
            </dt>
            <dd className="text-fg">{labels.deliveryValue}</dd>
          </div>
        )}
        {r.acceptsPickup && (
          <div>
            <dt className="text-caption uppercase tracking-wide text-fg-subtle">{labels.pickup}</dt>
            <dd className="text-fg">{labels.pickupValue}</dd>
          </div>
        )}
        <div>
          <dt className="text-caption uppercase tracking-wide text-fg-subtle">{labels.payments}</dt>
          <dd className="text-fg">{labels.paymentsValue}</dd>
        </div>
      </dl>
    </aside>
  );
}

export function MapEmbed({
  restaurant: r,
  heading,
  ariaLabel,
  openInMaps,
}: {
  restaurant: RestaurantPublicDto;
  heading: string;
  ariaLabel: string;
  openInMaps: string;
}) {
  if (!r.geoPoint) return null;
  const d = 0.004;
  const bbox = [
    r.geoPoint.lng - d,
    r.geoPoint.lat - d,
    r.geoPoint.lng + d,
    r.geoPoint.lat + d,
  ].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${r.geoPoint.lat},${r.geoPoint.lng}`;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-h3 text-fg sm:text-h2">{heading}</h2>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card border border-border/[var(--border-alpha)]">
        <iframe
          title={ariaLabel}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <a
        href={directionsHref(r)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 self-start text-small font-medium text-accent hover:underline"
      >
        <MapPin size={14} aria-hidden /> {openInMaps}
      </a>
    </section>
  );
}
