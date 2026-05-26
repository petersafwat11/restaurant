'use client';

import { cartItemToDisplay } from '@/features/cart/to-display';
import { useOrderTracking } from '@/features/orders/hooks/use-order-tracking';
import { Link } from '@/i18n/navigation';
import { type OrderDto, type OrderItemDto } from '@repo/types';
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
import { Check, Copy, HelpCircle, MapPin, Phone, Sparkles, Timer } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

interface ConfirmationAppProps {
  orderId: string;
}

function CopyButton({ value }: { value: string }) {
  const t = useTranslations('web.shop.checkoutSuccess');
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={t('copy.ariaLabel')}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          toast.success(t('copy.toast'));
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

export function ConfirmationApp({ orderId }: ConfirmationAppProps) {
  const t = useTranslations('web.shop.checkoutSuccess');
  const format = useFormatter();
  const searchParams = useSearchParams();
  const token = searchParams.get('t');
  const orderQuery = useOrderTracking(orderId, token);

  if (orderQuery.isLoading) {
    return (
      <Container size="narrow" className="py-16">
        <PageSpinner label={t('loading')} />
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
          title={t('notFound.title')}
          description={t('notFound.description')}
          action={{ label: t('notFound.action'), href: '/menu' }}
        />
      </Container>
    );
  }

  const order = orderQuery.data;
  const etaCaption = t(`eta.${order.type}.caption`);
  const etaSub = t(`eta.${order.type}.sub`);
  const etaText =
    order.pickupAt != null
      ? format.dateTime(new Date(order.pickupAt), { hour: '2-digit', minute: '2-digit' })
      : order.type === 'DELIVERY'
        ? t('eta.deliveryDefault')
        : order.type === 'PICKUP'
          ? t('eta.pickupDefault')
          : t('eta.dineInDefault');

  const trackingState = trackingStateFor(order.type, order.status);
  const isTerminal =
    order.status === 'DELIVERED' ||
    order.status === 'COMPLETED' ||
    order.status === 'CANCELLED' ||
    order.status === 'REFUNDED';
  const stepLabels = ORDER_TRACKING_STEPS[order.type];
  const currentStageLabel =
    trackingState.kind === 'step' ? stepLabels[trackingState.index] : t(`status.${order.status}`);

  const lines = order.items.map(orderItemToDisplay);
  const delivery: DeliveryRow =
    Number.parseFloat(order.deliveryFee) > 0
      ? { amount: order.deliveryFee }
      : { label: t('summary.free') };

  return (
    <div className="relative isolate">
      {/* Soft brand-accent wash behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(217,85,30,0.10),transparent_70%)]"
      />

      <Container className="pb-24 pt-16">
        <SuccessHero
          title={t('hero.title')}
          description={t('hero.description')}
          meta={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-3 rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated px-4 py-3 shadow-sm">
                <div className="flex flex-col leading-tight">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    {t('hero.orderNumber')}
                  </span>
                  <span className="font-display text-h3 font-medium tabular-nums text-fg">
                    {order.orderNumber}
                  </span>
                </div>
                <CopyButton value={order.orderNumber} />
              </div>
            </div>
          }
        />

        {/* Live status hero card */}
        <section
          aria-label={t('now.regionLabel')}
          className="mx-auto mt-10 max-w-3xl rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated px-6 py-6 shadow-sm sm:px-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Sparkles size={22} strokeWidth={2.2} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-caption uppercase tracking-wide text-fg-subtle">
                  {t('now.label')}
                </span>
                <span className="font-display text-h4 font-medium text-fg">
                  {currentStageLabel}
                </span>
                <span className="text-small text-fg-muted">{etaSub}</span>
              </div>
            </div>

            {!isTerminal && (
              <div className="flex items-center gap-3 self-start rounded-card bg-surface-warm/40 px-4 py-3 sm:self-auto">
                <Timer size={18} className="text-accent" />
                <div className="flex flex-col leading-tight">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    {etaCaption}
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
              aria-label={t('address.regionLabel')}
              className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-warm/60 text-fg">
                  <MapPin size={18} />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-caption uppercase tracking-wide text-fg-subtle">
                    {order.type === 'DELIVERY'
                      ? t('address.deliveryCaption')
                      : order.type === 'PICKUP'
                        ? t('address.pickupCaption')
                        : t('address.dineInCaption')}
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
                      <span className="font-medium text-fg">{t('address.pickupName')}</span>
                      <span className="text-fg">{t('address.pickupStreet')}</span>
                      <span className="text-fg-muted">{t('address.pickupCity')}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-body font-medium text-fg">
                      {t('address.tableRecorded')}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Help card */}
            <section
              aria-label={t('help.regionLabel')}
              className="rounded-card border border-border/[var(--border-alpha)] bg-surface-elevated p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-warm/60 text-fg">
                  <HelpCircle size={18} />
                </span>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-col">
                    <span className="text-body font-semibold text-fg">{t('help.title')}</span>
                    <span className="text-small text-fg-muted">{t('help.description')}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <a
                      href={t('help.phoneHref')}
                      className="inline-flex h-10 items-center gap-2 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-4 text-small font-medium text-fg hover:bg-surface-warm/40"
                    >
                      <Phone size={14} />
                      {t('help.phoneDisplay')}
                    </a>
                    <Link
                      href="/contact"
                      className="inline-flex h-10 items-center gap-2 rounded-button bg-surface-warm/60 px-4 text-small font-medium text-fg hover:bg-surface-warm"
                    >
                      {t('help.messageUs')}
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
              labels={{
                title: t('summary.title'),
                regionLabel: t('summary.regionLabel'),
                subtotal: t('summary.subtotal'),
                delivery: t('summary.delivery'),
                tip: t('summary.tip'),
                total: t('summary.total'),
                notePrefix: t('summary.notePrefix'),
              }}
            />

            <div className="flex flex-col gap-3">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center rounded-button bg-accent px-6 text-[15px] font-medium text-text-on-accent hover:bg-accent-hover"
              >
                {t('backToMenu')}
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
