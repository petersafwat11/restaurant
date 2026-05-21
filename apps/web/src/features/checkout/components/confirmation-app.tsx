'use client';

import { cartItemToDisplay } from '@/features/cart/to-display';
import { useOrderTracking } from '@/features/orders/hooks/use-order-tracking';
import { useRealtimeStatus } from '@/features/orders/hooks/use-realtime-status';
import { type OrderDto, type OrderItemDto, type OrderStatus, type OrderType } from '@repo/types';
import {
  Container,
  type DeliveryRow,
  EmptyState,
  ORDER_TRACKING_STEPS,
  OrderProgressStepper,
  OrderSummaryPanel,
  PageSpinner,
  SuccessHero,
  trackingStateFor,
} from '@repo/ui';
import { Check, Copy, HelpCircle, MapPin, Phone, Receipt, Sparkles, Timer } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

interface ConfirmationAppProps {
  orderId: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label="Copy order number"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          toast.success('Order number copied.');
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="grid h-8 w-8 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-warm/60 hover:text-fg"
    >
      {copied ? <Check size={16} strokeWidth={2.6} className="text-accent" /> : <Copy size={16} />}
    </button>
  );
}

function orderItemToDisplay(item: OrderItemDto) {
  return cartItemToDisplay({
    id: item.id,
    menuItemId: item.menuItemId,
    name: item.nameSnapshot,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    modifierSnapshot: item.modifierSnapshot,
    notes: item.notes,
  });
}

const ETA_LABELS: Record<OrderType, { caption: string; sub: string }> = {
  DELIVERY: {
    caption: 'Estimated delivery time',
    sub: "We'll text you when it's out for delivery.",
  },
  PICKUP: {
    caption: 'Ready for pickup in',
    sub: "We'll text you when it's ready for pickup.",
  },
  DINE_IN: {
    caption: 'Service time',
    sub: "We'll text you when the kitchen starts.",
  },
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Order confirmed',
  PREPARING: 'Kitchen is preparing your meal',
  READY: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Order cancelled',
  REFUNDED: 'Order refunded',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {connected && (
        <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
      )}
      <span
        className={
          connected
            ? 'relative inline-flex h-2.5 w-2.5 rounded-full bg-positive'
            : 'relative inline-flex h-2.5 w-2.5 rounded-full bg-fg-subtle/60'
        }
      />
    </span>
  );
}

function StatusTimeline({ order }: { order: OrderDto }) {
  const events = [...order.statusEvents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  if (events.length === 0) return null;

  return (
    <ol className="relative flex flex-col gap-4">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <li key={event.id} className="flex items-start gap-3">
            <div className="relative flex h-full flex-col items-center">
              <span
                aria-hidden
                className={
                  isLast
                    ? 'grid h-6 w-6 place-items-center rounded-full bg-accent text-text-on-accent shadow-[0_0_0_4px_rgba(217,85,30,0.12)]'
                    : 'grid h-6 w-6 place-items-center rounded-full bg-positive text-text-on-accent'
                }
              >
                <Check size={12} strokeWidth={3} />
              </span>
              {!isLast && (
                <span
                  aria-hidden
                  className="mt-1 w-px flex-1 bg-border/[var(--border-strong-alpha)]"
                  style={{ minHeight: 12 }}
                />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-small font-medium text-fg">{STATUS_LABEL[event.status]}</span>
              <span className="text-caption tabular-nums text-fg-subtle">
                {formatTime(event.createdAt)}
              </span>
              {event.note && <span className="mt-0.5 text-small text-fg-muted">{event.note}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ConfirmationApp({ orderId }: ConfirmationAppProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');
  const orderQuery = useOrderTracking(orderId, token);
  const realtime = useRealtimeStatus();

  if (orderQuery.isLoading) {
    return (
      <Container size="narrow" className="py-16">
        <PageSpinner label="Loading your order…" />
      </Container>
    );
  }

  // If we have data (from cache, e.g. just-placed guest order), trust it even
  // if a background refetch errored — guest orders can't be re-fetched without
  // a signed token, and the cache is canonical for the success surface.
  if (!orderQuery.data) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          size="lg"
          title="Order not found"
          description="We couldn't find this order. It may have been placed under a different account."
          action={{ label: 'Back to menu', href: '/menu' }}
        />
      </Container>
    );
  }

  const order = orderQuery.data;
  const eta = ETA_LABELS[order.type];
  const etaText =
    order.pickupAt != null
      ? formatTime(order.pickupAt)
      : order.type === 'DELIVERY'
        ? '~25 min'
        : order.type === 'PICKUP'
          ? '~12 min'
          : '~10 min';

  const trackingState = trackingStateFor(order.type, order.status);
  const isTerminal =
    order.status === 'DELIVERED' ||
    order.status === 'COMPLETED' ||
    order.status === 'CANCELLED' ||
    order.status === 'REFUNDED';
  const stepLabels = ORDER_TRACKING_STEPS[order.type];
  const currentStageLabel =
    trackingState.kind === 'step' ? stepLabels[trackingState.index] : STATUS_LABEL[order.status];

  const lines = order.items.map(orderItemToDisplay);
  const delivery: DeliveryRow =
    Number.parseFloat(order.deliveryFee) > 0 ? { amount: order.deliveryFee } : { label: 'Free' };

  const connected = realtime === 'connected';

  return (
    <div className="relative isolate">
      {/* Soft brand-accent wash behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(217,85,30,0.10),transparent_70%)]"
      />

      <Container className="pb-24 pt-16">
        <SuccessHero
          title="Order confirmed"
          description={<>Thanks — we got it. A receipt has been sent to your inbox.</>}
          meta={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-3 rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated px-4 py-3 shadow-sm">
                <div className="flex flex-col leading-tight">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    Order number
                  </span>
                  <span className="font-display text-h3 font-medium tabular-nums text-fg">
                    {order.orderNumber}
                  </span>
                </div>
                <CopyButton value={order.orderNumber} />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/[var(--border-alpha)] bg-surface-elevated px-3 py-2 text-caption text-fg-muted shadow-sm">
                <LiveDot connected={connected} />
                <span className="font-medium text-fg">
                  {connected ? 'Live updates active' : 'Reconnecting…'}
                </span>
              </div>
            </div>
          }
        />

        {/* Live status hero card */}
        <section
          aria-label="Current order status"
          className="mx-auto mt-10 max-w-3xl rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated px-6 py-6 shadow-sm sm:px-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Sparkles size={22} strokeWidth={2.2} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-caption uppercase tracking-wide text-fg-subtle">
                  Right now
                </span>
                <span className="font-display text-h4 font-medium text-fg">
                  {currentStageLabel}
                </span>
                <span className="text-small text-fg-muted">{eta.sub}</span>
              </div>
            </div>

            {!isTerminal && (
              <div className="flex items-center gap-3 self-start rounded-card bg-surface-warm/40 px-4 py-3 sm:self-auto">
                <Timer size={18} className="text-accent" />
                <div className="flex flex-col leading-tight">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    {eta.caption}
                  </span>
                  <span className="font-display text-h4 font-medium tabular-nums text-accent">
                    {etaText}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <OrderProgressStepper mode={order.type} status={order.status} />
          </div>
        </section>

        {/* Two-column body */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left column */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Address / pickup card */}
            <section
              aria-label="Where it's going"
              className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-warm/60 text-fg">
                  <MapPin size={18} />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    {order.type === 'DELIVERY'
                      ? 'Deliver to'
                      : order.type === 'PICKUP'
                        ? 'Pick up from'
                        : 'Your table'}
                  </span>
                  {order.deliveryAddress ? (
                    <div className="mt-1 flex flex-col text-body leading-relaxed">
                      <span className="font-medium text-fg">{order.deliveryAddress.line1}</span>
                      {order.deliveryAddress.line2 && (
                        <span className="text-fg">{order.deliveryAddress.line2}</span>
                      )}
                      <span className="text-fg-muted">{order.deliveryAddress.city}</span>
                    </div>
                  ) : order.type === 'PICKUP' ? (
                    <div className="mt-1 flex flex-col text-body leading-relaxed">
                      <span className="font-medium text-fg">Szef Donald</span>
                      <span className="text-fg">Marszałkowska 102</span>
                      <span className="text-fg-muted">00-026 Warszawa</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-body font-medium text-fg">Table number recorded</div>
                  )}
                </div>
              </div>
            </section>

            {/* Live activity timeline */}
            <section
              aria-label="Order activity"
              className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-fg-subtle" />
                  <h2 className="text-body font-semibold text-fg">Order activity</h2>
                </div>
                <span className="inline-flex items-center gap-2 text-caption text-fg-subtle">
                  <LiveDot connected={connected} />
                  Live
                </span>
              </div>
              <StatusTimeline order={order} />
            </section>

            {/* Help card */}
            <section
              aria-label="Need help"
              className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-warm/60 text-fg">
                  <HelpCircle size={18} />
                </span>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-col">
                    <span className="text-body font-semibold text-fg">Need help?</span>
                    <span className="text-small text-fg-muted">
                      Allergy concern, missing item, or address change? We're a quick call away.
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <a
                      href="tel:+48221234567"
                      className="inline-flex h-10 items-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-4 text-small font-medium text-fg hover:bg-surface-warm/40"
                    >
                      <Phone size={14} />
                      +48 22 123 45 67
                    </a>
                    <Link
                      href="/contact"
                      className="inline-flex h-10 items-center gap-2 rounded-button bg-surface-warm/60 px-4 text-small font-medium text-fg hover:bg-surface-warm"
                    >
                      Message us
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right column — receipt + CTAs */}
          <aside className="flex flex-col gap-6 lg:col-span-5">
            <OrderSummaryPanel
              variant="inline"
              lines={lines}
              subtotal={order.subtotal}
              delivery={delivery}
              tip={Number.parseFloat(order.tipAmount) > 0 ? order.tipAmount : undefined}
              total={order.grandTotal}
              currency={order.currency}
              showEditCart={false}
            />

            <div className="flex flex-col gap-3">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center rounded-button bg-accent px-6 text-[15px] font-medium text-text-on-accent hover:bg-accent-hover"
              >
                Back to menu
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
