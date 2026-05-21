'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type KdsStatus = 'CONFIRMED' | 'PREPARING' | 'READY';

export type KdsOrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export interface KdsItem {
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface KdsTicketCardLabels {
  typeLabels: Record<KdsOrderType, string>;
  advanceLabels: Record<KdsStatus, string>;
  back: string;
  waitingAria: (minutes: number) => string;
}

export interface KdsTicketCardProps {
  orderNumber: string;
  status: KdsStatus;
  type: KdsOrderType;
  /** Free-text context strip: table number, delivery address, pickup time. */
  context?: string;
  /** Customer-supplied notes pinned to the bottom of the card. */
  specialRequests?: string | null;
  /** Confirmed-at timestamp — drives the elapsed clock. */
  confirmedAt: string;
  items: KdsItem[];
  /** Forward action — primary CTA. */
  onAdvance?: () => void;
  /** Optional revert — appears as a ghost back button. */
  onRevert?: () => void;
  pending?: boolean;
  className?: string;
  /** Optional translation labels. English defaults are used when omitted. */
  labels?: Partial<KdsTicketCardLabels>;
}

const DEFAULT_KDS_LABELS: KdsTicketCardLabels = {
  typeLabels: {
    DELIVERY: 'Delivery',
    PICKUP: 'Pickup',
    DINE_IN: 'Dine-in',
  },
  advanceLabels: {
    CONFIRMED: 'Start',
    PREPARING: 'Ready',
    READY: 'Picked up',
  },
  back: 'Back',
  waitingAria: (m) => `Waiting ${m} minutes`,
};

const STATUS_BG: Record<KdsStatus, string> = {
  CONFIRMED: 'bg-info/15 text-info',
  PREPARING: 'bg-warning/15 text-warning',
  READY: 'bg-accent/15 text-accent',
};

function elapsedMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

function elapsedDisplay(iso: string): string {
  const m = elapsedMinutes(iso);
  const mm = String(m % 60).padStart(2, '0');
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${mm}` : `${m}m`;
}

/**
 * Single KDS ticket card. Designed to be glanceable from 2 meters away on a
 * kitchen tablet. Card colors itself by status, tints the elapsed clock red
 * once a ticket has been waiting too long, and exposes one big advance button
 * tuned for finger taps.
 */
export function KdsTicketCard({
  orderNumber,
  status,
  type,
  context,
  specialRequests,
  confirmedAt,
  items,
  onAdvance,
  onRevert,
  pending,
  className,
  labels,
}: KdsTicketCardProps) {
  const L: KdsTicketCardLabels = {
    ...DEFAULT_KDS_LABELS,
    ...labels,
    typeLabels: { ...DEFAULT_KDS_LABELS.typeLabels, ...labels?.typeLabels },
    advanceLabels: { ...DEFAULT_KDS_LABELS.advanceLabels, ...labels?.advanceLabels },
  };
  const TYPE_LABEL = L.typeLabels;
  const ADVANCE_LABEL = L.advanceLabels;
  // Re-render every second so the elapsed clock stays live.
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(force, 1000);
    return () => window.clearInterval(id);
  }, []);

  const minutes = elapsedMinutes(confirmedAt);
  const isLate = (status === 'CONFIRMED' || status === 'PREPARING') && minutes > 10;
  const isWarning = (status === 'CONFIRMED' || status === 'PREPARING') && minutes > 5 && minutes <= 10;

  return (
    <article
      aria-labelledby={`kds-${orderNumber}-title`}
      className={cn(
        'flex flex-col overflow-hidden rounded-card border bg-surface text-fg',
        isLate
          ? 'border-negative shadow-[inset_2px_0_0_0_var(--color-negative)]'
          : 'border-border/[var(--border-strong-alpha)]',
        className,
      )}
    >
      <header
        className={cn(
          'flex items-baseline justify-between gap-3 px-4 py-2',
          STATUS_BG[status],
        )}
      >
        <h3
          id={`kds-${orderNumber}-title`}
          className="font-mono text-h2 font-semibold tracking-wide"
        >
          {orderNumber}
        </h3>
        <span
          className={cn(
            'font-mono text-h2 tabular-nums',
            isLate
              ? 'text-negative'
              : isWarning
                ? 'text-warning'
                : 'text-fg-muted',
          )}
          aria-label={L.waitingAria(minutes)}
        >
          {elapsedDisplay(confirmedAt)}
        </span>
      </header>

      <div className="border-y border-border/[var(--border-alpha)] bg-surface-2/40 px-4 py-1.5 text-caption uppercase tracking-wider text-fg-muted">
        {TYPE_LABEL[type]}
        {context ? <span> · {context}</span> : null}
      </div>

      <ul className="flex flex-col gap-3 px-4 py-3">
        {items.map((it, i) => (
          <li key={i} className="text-fg">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-h2 tabular-nums text-accent">
                {it.quantity}×
              </span>
              <span className="text-body-l">{it.name}</span>
            </div>
            {it.modifiers && it.modifiers.length > 0 && (
              <p className="ml-7 text-small text-fg-muted">
                {it.modifiers.join(' · ')}
              </p>
            )}
            {it.notes && (
              <p className="ml-7 italic text-small text-accent">+ {it.notes}</p>
            )}
          </li>
        ))}
      </ul>

      {specialRequests && (
        <div className="mx-4 mb-3 rounded-button border border-warning/30 bg-warning/10 p-2 text-small text-warning">
          "{specialRequests}"
        </div>
      )}

      <footer className="mt-auto grid grid-cols-2 border-t border-border/[var(--border-alpha)] bg-surface-2/40">
        {onRevert && status !== 'CONFIRMED' ? (
          <button
            type="button"
            onClick={onRevert}
            disabled={pending}
            className="flex items-center justify-center gap-1 border-r border-border/[var(--border-alpha)] px-3 py-3 text-small text-fg-muted transition-colors hover:bg-surface-warm/30 hover:text-fg disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" /> {L.back}
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onAdvance}
          disabled={pending || !onAdvance}
          className={cn(
            'col-span-2 flex h-12 items-center justify-center gap-2 text-body font-semibold text-bg transition-colors disabled:opacity-50',
            status === 'READY'
              ? 'bg-positive hover:bg-positive/90'
              : 'bg-accent hover:bg-accent-hover',
            onRevert && status !== 'CONFIRMED' && 'col-span-1',
          )}
        >
          {status === 'READY' ? <Check className="h-5 w-5" /> : null}
          {ADVANCE_LABEL[status]}
          {status !== 'READY' && <ArrowRight className="h-4 w-4" />}
        </button>
      </footer>
    </article>
  );
}
