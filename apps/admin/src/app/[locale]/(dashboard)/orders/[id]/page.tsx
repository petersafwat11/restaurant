'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { CancelModal } from '@/features/orders/components/cancel-modal';
import { OrderDrawerBody } from '@/features/orders/components/order-drawer-body';
import { RefundModal } from '@/features/orders/components/refund-modal';
import { useAddOrderNote, useAdvanceOrder, useOrderTracking } from '@/features/orders/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import type { OrderStatus } from '@repo/types';
import {
  Button,
  EmptyState,
  ORDER_TRANSITIONS,
  PageSpinner,
  RelativeTime,
  STATUS_TOKENS,
  StatusPill,
  TypeBadge,
} from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import * as React from 'react';

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;
  const q = useOrderTracking(orderId);
  const order = q.data;
  const advance = useAdvanceOrder();
  const addNote = useAddOrderNote();
  const { has } = usePermissions();
  const [noteDraft, setNoteDraft] = React.useState('');
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

  const t = useTranslations('admin.orders.detail');
  const tStatus = useTranslations('shared.orderStatus');
  const tTypes = useTranslations('admin.orders.detail.types');

  const translatedTokens = React.useMemo(() => {
    const result = { ...STATUS_TOKENS };
    for (const key of Object.keys(STATUS_TOKENS) as OrderStatus[]) {
      result[key] = { ...STATUS_TOKENS[key], label: tStatus(key) };
    }
    return result;
  }, [tStatus]);

  usePageHeader({ title: order ? t('title', { number: order.orderNumber }) : t('titleFallback') });

  const canAdvance = has('order:status_update');
  const canRefund = has('order:refund') || has('payment:refund');
  const canCancel = has('order:cancel');
  const canNote = has('order:update');

  // Cancel has its own dedicated button below, so don't propose it as the
  // primary "advance" target — pick the first non-CANCELLED transition.
  const nextStatus: OrderStatus | undefined = order
    ? ORDER_TRANSITIONS[order.status]?.find((s) => s !== 'CANCELLED')
    : undefined;
  const isTerminal = order ? ['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(order.status) : false;

  const noteRef = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') target.blur();
        return;
      }
      if (e.key === 'Escape') router.push('/orders');
      if (e.key === 'r' && canRefund && !isTerminal) setRefundOpen(true);
      if (e.key === 'c' && canCancel && !isTerminal) setCancelOpen(true);
      if (e.key === 'n' && canNote) {
        e.preventDefault();
        noteRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, canRefund, canCancel, canNote, isTerminal]);

  if (q.isLoading) {
    return <PageSpinner label={t('loading')} />;
  }

  if (q.isError || !order) {
    return (
      <EmptyState
        title={t('notFound.title')}
        description={q.error?.message ?? t('notFound.description')}
        action={{ label: t('notFound.back'), href: '/orders' }}
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6 pb-6" data-print="surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            data-print="hide"
            className="inline-flex h-8 items-center gap-1 rounded-button text-small text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" /> {t('back')}
          </Link>
          <span className="text-fg-subtle">/</span>
          <h1 className="font-mono text-h1 tracking-wide text-fg">{order.orderNumber}</h1>
          <TypeBadge
            label={tTypes(order.type as 'DELIVERY' | 'PICKUP' | 'DINE_IN').toUpperCase()}
          />
          <StatusPill status={order.status} tokens={translatedTokens} />
        </div>
        <div className="flex items-center gap-2" data-print="hide">
          <span className="text-small text-fg-muted">
            <RelativeTime value={order.createdAt} /> ·{' '}
            {formatMoney(order.grandTotal, order.currency)}
          </span>
          <Button
            variant="primary"
            disabled={!nextStatus || !canAdvance || advance.isPending}
            title={!canAdvance ? t('noPermissionAdvanceLong') : undefined}
            onClick={() =>
              nextStatus &&
              advance.mutate({
                orderId: order.id,
                currentStatus: order.status,
                to: nextStatus,
              })
            }
          >
            {nextStatus ? (
              <>
                {t('advanceTo', { status: tStatus(nextStatus) })}
                <ArrowRight size={14} />
              </>
            ) : isTerminal ? (
              t('orderComplete')
            ) : (
              t('noNextState')
            )}
          </Button>
          {!isTerminal && canRefund && (
            <Button variant="ghost" onClick={() => setRefundOpen(true)}>
              {t('refund')}
            </Button>
          )}
          {!isTerminal && canCancel && (
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(true)}
              className="text-negative hover:text-negative"
            >
              {t('cancel')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('print')}
            data-print="hide"
            onClick={() => window.print()}
          >
            <Printer size={14} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface">
          <OrderDrawerBody order={order} />
        </div>

        <aside className="space-y-4" data-print="hide">
          {canNote && (
            <section className="rounded-card border border-border/[var(--border-alpha)] bg-surface p-5">
              <h3 className="mb-3 text-h2 font-semibold text-fg">{t('addNote.heading')}</h3>
              <textarea
                ref={noteRef}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                disabled={addNote.isPending}
                placeholder={t('addNote.placeholder')}
                maxLength={2000}
                rows={4}
                className="w-full resize-y rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 py-2 text-small text-fg outline-none focus:border-accent disabled:opacity-60"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-caption uppercase tracking-wider text-fg-subtle">
                  <Kbd>N</Kbd> {t('addNote.focusHint')}
                </span>
                <Button
                  variant="primary"
                  disabled={noteDraft.trim().length === 0 || addNote.isPending}
                  onClick={() =>
                    addNote.mutate(
                      { orderId: order.id, note: noteDraft.trim() },
                      { onSuccess: () => setNoteDraft('') },
                    )
                  }
                >
                  {addNote.isPending ? t('addNote.submitting') : t('addNote.submit')}
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-card border border-border/[var(--border-alpha)] bg-surface p-5 text-small">
            <h3 className="mb-3 text-h2 font-semibold text-fg">{t('keyboard.heading')}</h3>
            <ul className="space-y-1.5 text-fg-muted">
              <li>
                <Kbd>Esc</Kbd> {t('keyboard.back')}
              </li>
              {canNote && (
                <li>
                  <Kbd>N</Kbd> {t('keyboard.addNote')}
                </li>
              )}
              {!isTerminal && canRefund && (
                <li>
                  <Kbd>R</Kbd> {t('keyboard.refund')}
                </li>
              )}
              {!isTerminal && canCancel && (
                <li>
                  <Kbd>C</Kbd> {t('keyboard.cancel')}
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <RefundModal
        orderId={refundOpen ? order.id : null}
        onOpenChange={(o) => !o && setRefundOpen(false)}
      />
      <CancelModal
        orderId={cancelOpen ? order.id : null}
        onOpenChange={(o) => !o && setCancelOpen(false)}
      />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 inline-block min-w-[24px] rounded border border-border/[var(--border-alpha)] bg-surface-2 px-1.5 py-0.5 text-center text-caption uppercase text-fg-muted">
      {children}
    </kbd>
  );
}
