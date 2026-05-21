'use client';

import { useAdvanceKitchenTicket, useKitchenFeed } from '@/features/kitchen/hooks';
import { Link } from '@/i18n/navigation';
import type { KitchenTicketDto, OrderStatus } from '@repo/types';
import { EmptyState, KdsTicketCard, Spinner } from '@repo/ui';
import { Filter, Maximize2, Minimize2, Volume2, VolumeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type KdsFilter = 'ALL' | 'DELIVERY' | 'PICKUP' | 'DINE_IN';

// Two-tone chime via Web Audio. No asset, no autoplay surprise — caller must
// have interacted with the page (the toggle button click) before this fires
// the first time.
function useChime(enabled: boolean) {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const play = React.useCallback(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    const blip = (freq: number, at: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0, now + at);
      g.gain.linearRampToValueAtTime(0.3, now + at + 0.02);
      g.gain.linearRampToValueAtTime(0, now + at + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(now + at);
      o.stop(now + at + 0.2);
    };
    blip(880, 0);
    blip(1320, 0.1);
  }, [enabled]);
  return play;
}

function ticketsByStatus(tickets: KitchenTicketDto[], status: OrderStatus): KitchenTicketDto[] {
  return tickets.filter((t) => t.status === status);
}

const FILTERS: KdsFilter[] = ['ALL', 'DINE_IN', 'PICKUP', 'DELIVERY'];

function Column({
  title,
  count,
  children,
  empty,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <section
      aria-labelledby={`col-${title}`}
      className="flex h-full min-h-0 flex-col rounded-card border border-border/[var(--border-alpha)] bg-surface/40"
    >
      <header className="flex items-baseline justify-between border-b border-border/[var(--border-alpha)] px-4 py-3">
        <h2 id={`col-${title}`} className="text-caption uppercase tracking-wider text-fg-muted">
          {title}
        </h2>
        <span className="text-h2 font-semibold tabular-nums text-fg">{count}</span>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {count === 0 ? (
          <div className="grid h-32 place-items-center rounded-card border border-dashed border-border/[var(--border-strong-alpha)] text-small text-fg-subtle">
            {empty}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default function KdsPage() {
  const t = useTranslations('admin.kds');
  const tFilters = useTranslations('admin.kds.filters');
  const tStatus = useTranslations('shared.orderStatus');
  const feed = useKitchenFeed();
  const advance = useAdvanceKitchenTicket();
  const [sound, setSound] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('kds.sound') !== 'off';
  });
  const [filter, setFilter] = React.useState<KdsFilter>('ALL');
  const [fullscreen, setFullscreen] = React.useState(false);
  const playChime = useChime(sound);
  const prevCountRef = React.useRef<number>(feed.data?.length ?? 0);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('kds.sound', sound ? 'on' : 'off');
  }, [sound]);

  React.useEffect(() => {
    const next = feed.data?.length ?? 0;
    if (next > prevCountRef.current) playChime();
    prevCountRef.current = next;
  }, [feed.data, playChime]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'f') toggleFullscreen();
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setSound((s) => !s);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  }

  const all = feed.data ?? [];
  const filtered = filter === 'ALL' ? all : all.filter((t) => t.type === filter);
  const lateCount = all.filter((t) => {
    const m = Math.floor((Date.now() - new Date(t.confirmedAt ?? Date.now()).getTime()) / 60_000);
    return (t.status === 'CONFIRMED' || t.status === 'PREPARING') && m > 10;
  }).length;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border/[var(--border-alpha)] bg-surface/60 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3 text-small">
          <Link href="/orders" className="text-fg-muted hover:text-fg" aria-label={t('backAria')}>
            {t('backToAdmin')}
          </Link>
          <span className="text-fg-subtle">/</span>
          <h1 className="text-h2 font-semibold text-fg">{t('title')}</h1>
          <span className="text-fg-subtle">·</span>
          <span className="tabular-nums text-fg-muted">
            <span className="text-fg">{t('tickets', { count: all.length })}</span>
            {lateCount > 0 && (
              <>
                {' '}
                · <span className="text-negative">{t('late', { count: lateCount })}</span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)]">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`inline-flex h-8 items-center gap-1.5 px-3 text-caption uppercase tracking-wider transition-colors ${
                  filter === f
                    ? 'bg-accent-muted text-fg'
                    : 'text-fg-muted hover:bg-surface-warm/30 hover:text-fg'
                }`}
              >
                {f === 'ALL' && <Filter className="h-3 w-3" />}
                {tFilters(f)}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={sound}
            aria-label={sound ? t('muteAria') : t('unmuteAria')}
            onClick={() => setSound((s) => !s)}
            className="grid h-9 w-9 place-items-center rounded-button border border-border/[var(--border-strong-alpha)] text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
          >
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label={t('fullscreenAria')}
            onClick={toggleFullscreen}
            className="grid h-9 w-9 place-items-center rounded-button border border-border/[var(--border-strong-alpha)] text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {feed.isLoading ? (
        <div className="flex flex-1 items-center justify-center p-10">
          <Spinner size="xl" />
        </div>
      ) : feed.isError ? (
        <div className="grid flex-1 place-items-center px-6">
          <EmptyState
            title={t('loadError.title')}
            description={(feed.error as Error)?.message ?? t('loadError.fallback')}
            action={{ label: t('loadError.retry'), onClick: () => feed.refetch() }}
            size="lg"
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-3">
          {(['CONFIRMED', 'PREPARING', 'READY'] as const).map((status) => {
            const list = ticketsByStatus(filtered, status);
            return (
              <Column key={status} title={tStatus(status)} count={list.length} empty={t('empty')}>
                {list.map((t) => (
                  <KdsTicketCard
                    key={t.orderId}
                    orderNumber={t.orderNumber}
                    status={t.status as 'CONFIRMED' | 'PREPARING' | 'READY'}
                    type={t.type}
                    confirmedAt={t.confirmedAt ?? new Date().toISOString()}
                    specialRequests={t.specialRequests}
                    items={t.items.map((it) => ({
                      name: it.name,
                      quantity: it.quantity,
                      modifiers: it.modifiers,
                      notes: it.notes ?? undefined,
                    }))}
                    pending={advance.isPending}
                    onAdvance={
                      t.status === 'READY'
                        ? undefined
                        : () => advance.mutate({ orderId: t.orderId, current: t.status })
                    }
                  />
                ))}
              </Column>
            );
          })}
        </div>
      )}
    </div>
  );
}
