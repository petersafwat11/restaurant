'use client';

import type { OrderDto, OrderStatus, PaymentStatus } from '@repo/types';
import {
  ActivityTimeline,
  PAYMENT_TOKENS,
  STATUS_TOKENS,
  StatusPill,
  type TimelineEntry,
} from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface OrderDrawerBodyProps {
  order: OrderDto;
}

export function OrderDrawerBody({ order }: OrderDrawerBodyProps) {
  const t = useTranslations('admin.orders.detail');
  const tStatus = useTranslations('shared.orderStatus');

  const translatedTokens = React.useMemo(() => {
    const result = { ...STATUS_TOKENS };
    for (const key of Object.keys(STATUS_TOKENS) as OrderStatus[]) {
      result[key] = { ...STATUS_TOKENS[key], label: tStatus(key) };
    }
    return result;
  }, [tStatus]);

  const paymentMethodLabels: Record<string, string> = {
    STRIPE_CARD: t('body.paymentMethods.STRIPE_CARD'),
    APPLE_PAY: t('body.paymentMethods.APPLE_PAY'),
    GOOGLE_PAY: t('body.paymentMethods.GOOGLE_PAY'),
    COD: t('body.paymentMethods.COD'),
    WALLET: t('body.paymentMethods.WALLET'),
    P24: t('body.paymentMethods.P24'),
    BLIK: t('body.paymentMethods.BLIK'),
  };

  const typeLabels: Record<string, string> = {
    DELIVERY: t('body.types.DELIVERY'),
    PICKUP: t('body.types.PICKUP'),
    DINE_IN: t('body.types.DINE_IN'),
  };

  const timeline: TimelineEntry[] = React.useMemo(
    () =>
      order.statusEvents.map((ev, i) => {
        const isNote = ev.kind === 'NOTE';
        return {
          id: ev.id,
          title: isNote ? t('body.noteFallback') : (translatedTokens[ev.status as OrderStatus]?.label ?? ev.status),
          at: ev.createdAt,
          note: ev.note ?? undefined,
          dotClassName: isNote ? 'bg-fg-subtle' : STATUS_TOKENS[ev.status as OrderStatus]?.bg,
          current: i === order.statusEvents.length - 1,
        };
      }),
    [order.statusEvents, t, translatedTokens],
  );

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      <Section title={t('body.itemsHeading')}>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 border-b-hairline pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-fg">{item.nameSnapshot}</div>
                {item.modifierSnapshot.length > 0 && (
                  <div className="mt-0.5 text-xs text-fg-subtle">
                    {item.modifierSnapshot.map((m) => m.optionName).join(' · ')}
                  </div>
                )}
                {item.notes && (
                  <div className="mt-0.5 italic text-xs text-fg-subtle">"{item.notes}"</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-fg-subtle">
                  {item.quantity} × {formatMoney(item.unitPrice, order.currency)}
                </div>
                <div className="text-sm tabular-nums text-fg">
                  {formatMoney(item.lineTotal, order.currency)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('body.pricingHeading')}>
        <table className="w-full text-sm">
          <tbody className="text-fg-muted">
            <PriceRow label={t('body.subtotal')} value={order.subtotal} currency={order.currency} />
            <PriceRow label={t('body.tax')} value={order.taxTotal} currency={order.currency} />
            {Number(order.deliveryFee) > 0 && (
              <PriceRow label={t('body.deliveryFee')} value={order.deliveryFee} currency={order.currency} />
            )}
            {Number(order.tipAmount) > 0 && (
              <PriceRow label={t('body.tip')} value={order.tipAmount} currency={order.currency} />
            )}
            {Number(order.discountTotal) > 0 && (
              <PriceRow
                label={t('body.discount')}
                value={`-${order.discountTotal}`}
                currency={order.currency}
                positive
              />
            )}
            <tr>
              <td colSpan={2} className="pt-2">
                <div className="h-px bg-border/[var(--border-strong-alpha)]" />
              </td>
            </tr>
            <tr>
              <td className="pt-2 text-fg">{t('body.grandTotal')}</td>
              <td className="pt-2 text-right text-base tabular-nums font-medium text-fg">
                {formatMoney(order.grandTotal, order.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {order.payment && (
        <Section title={t('body.paymentHeading')}>
          <div className="flex items-center justify-between rounded-md border-hairline bg-surface p-3">
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              {paymentMethodLabels[order.payment.method] ?? order.payment.method}
            </div>
            <StatusPill
              status={order.payment.status as unknown as PaymentStatus}
              tokens={PAYMENT_TOKENS as Record<string, (typeof PAYMENT_TOKENS)[PaymentStatus]>}
              size="sm"
            />
          </div>
          {order.payment.refunds.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {order.payment.refunds.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between rounded-md border-hairline bg-surface-2 p-2 text-xs"
                >
                  <div>
                    <div className="text-fg-muted">{t('body.refund')}</div>
                    {r.reason && <div className="mt-0.5 text-fg-subtle">{r.reason}</div>}
                  </div>
                  <div className="text-right tabular-nums font-medium text-negative">
                    −{formatMoney(r.amount, order.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {order.customer && (
        <Section title={t('body.customerHeading')}>
          <div className="rounded-md border-hairline bg-surface p-3 text-sm">
            <div className="font-medium text-fg">{order.customer.name ?? t('body.guest')}</div>
            <div className="mt-1 text-xs text-fg-subtle">
              <span>{order.customer.email}</span>
              {order.customer.phone && (
                <>
                  <span> · </span>
                  <span className="tabular-nums">{order.customer.phone}</span>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-fg-subtle">
            {t('body.typeLabel')}:{' '}
            <span className="text-fg-muted">{typeLabels[order.type] ?? order.type}</span>
          </div>
          {order.deliveryAddress && order.type === 'DELIVERY' && (
            <div className="mt-2 rounded-md bg-surface p-2 text-xs text-fg-muted">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ''} ·{' '}
              {order.deliveryAddress.city}
            </div>
          )}
          {order.notes && (
            <div className="mt-2 rounded-md bg-surface-2 p-2 text-xs italic text-fg-muted">
              "{order.notes}"
            </div>
          )}
        </Section>
      )}

      <Section title={t('body.timelineHeading')}>
        <ActivityTimeline entries={timeline} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-caption-admin text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}

function PriceRow({
  label,
  value,
  currency,
  positive,
}: {
  label: string;
  value: string;
  currency: string;
  positive?: boolean;
}) {
  return (
    <tr>
      <td className="py-0.5 text-fg-muted">{label}</td>
      <td className={`py-0.5 text-right tabular-nums ${positive ? 'text-positive' : 'text-fg'}`}>
        {formatMoney(value, currency)}
      </td>
    </tr>
  );
}
