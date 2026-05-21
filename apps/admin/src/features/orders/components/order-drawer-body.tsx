'use client';

import type { OrderDto, PaymentStatus } from '@repo/types';
import {
  ActivityTimeline,
  PAYMENT_TOKENS,
  STATUS_TOKENS,
  StatusPill,
  type TimelineEntry,
} from '@repo/ui';
import { formatMoney } from '@repo/utils';
import * as React from 'react';

export interface OrderDrawerBodyLabels {
  itemsHeading: string;
  pricingHeading: string;
  paymentHeading: string;
  customerHeading: string;
  timelineHeading: string;
  noteFallback: string;
  subtotal: string;
  tax: string;
  deliveryFee: string;
  tip: string;
  discount: string;
  grandTotal: string;
  refund: string;
  guest: string;
  typeLabel: string;
  notesQuote: string;
  typeLabels: Record<string, string>;
  paymentMethodLabels: Record<string, string>;
}

const DEFAULT_LABELS: OrderDrawerBodyLabels = {
  itemsHeading: 'Items',
  pricingHeading: 'Pricing',
  paymentHeading: 'Payment',
  customerHeading: 'Customer',
  timelineHeading: 'Timeline',
  noteFallback: 'Note',
  subtotal: 'Subtotal',
  tax: 'Tax',
  deliveryFee: 'Delivery fee',
  tip: 'Tip',
  discount: 'Discount',
  grandTotal: 'Grand total',
  refund: 'Refund',
  guest: 'Guest',
  typeLabel: 'Type',
  notesQuote: '',
  typeLabels: {
    DELIVERY: 'Delivery',
    PICKUP: 'Pickup',
    DINE_IN: 'Dine-in',
  },
  paymentMethodLabels: {
    STRIPE_CARD: 'Card',
    APPLE_PAY: 'Apple Pay',
    GOOGLE_PAY: 'Google Pay',
    COD: 'Cash on delivery',
    WALLET: 'Wallet',
    P24: 'Przelewy24',
    BLIK: 'BLIK',
  },
};

interface OrderDrawerBodyProps {
  order: OrderDto;
  labels?: Partial<OrderDrawerBodyLabels>;
}

/**
 * Full body of the order detail drawer. Items, pricing, payment, customer,
 * and the status timeline.
 */
export function OrderDrawerBody({ order, labels }: OrderDrawerBodyProps) {
  const L = { ...DEFAULT_LABELS, ...labels } as OrderDrawerBodyLabels;
  const TYPE_LABEL = L.typeLabels;
  const PAYMENT_METHOD_LABEL = L.paymentMethodLabels;
  const timeline: TimelineEntry[] = React.useMemo(
    () =>
      order.statusEvents.map((ev, i) => {
        const isNote = ev.kind === 'NOTE';
        return {
          id: ev.id,
          title: isNote ? L.noteFallback : (STATUS_TOKENS[ev.status]?.label ?? ev.status),
          at: ev.createdAt,
          note: ev.note ?? undefined,
          dotClassName: isNote ? 'bg-fg-subtle' : STATUS_TOKENS[ev.status]?.bg,
          current: i === order.statusEvents.length - 1,
        };
      }),
    [order.statusEvents, L.noteFallback],
  );

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      <Section title={L.itemsHeading}>
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

      <Section title={L.pricingHeading}>
        <table className="w-full text-sm">
          <tbody className="text-fg-muted">
            <PriceRow label={L.subtotal} value={order.subtotal} currency={order.currency} />
            <PriceRow label={L.tax} value={order.taxTotal} currency={order.currency} />
            {Number(order.deliveryFee) > 0 && (
              <PriceRow
                label={L.deliveryFee}
                value={order.deliveryFee}
                currency={order.currency}
              />
            )}
            {Number(order.tipAmount) > 0 && (
              <PriceRow label={L.tip} value={order.tipAmount} currency={order.currency} />
            )}
            {Number(order.discountTotal) > 0 && (
              <PriceRow
                label={L.discount}
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
              <td className="pt-2 text-fg">{L.grandTotal}</td>
              <td className="pt-2 text-right text-base tabular-nums font-medium text-fg">
                {formatMoney(order.grandTotal, order.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {order.payment && (
        <Section title={L.paymentHeading}>
          <div className="flex items-center justify-between rounded-md border-hairline bg-surface p-3">
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              {PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method}
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
                    <div className="text-fg-muted">{L.refund}</div>
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
        <Section title={L.customerHeading}>
          <div className="rounded-md border-hairline bg-surface p-3 text-sm">
            <div className="font-medium text-fg">{order.customer.name ?? L.guest}</div>
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
            {L.typeLabel}:{' '}
            <span className="text-fg-muted">{TYPE_LABEL[order.type] ?? order.type}</span>
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

      <Section title={L.timelineHeading}>
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
