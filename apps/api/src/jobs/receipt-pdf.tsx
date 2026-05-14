import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { formatMoney } from '@repo/utils';
import React from 'react';

export interface ReceiptInput {
  restaurantName: string;
  orderNumber: string;
  createdAt: string;
  currency: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  deliveryFee: string;
  tipAmount: string;
  grandTotal: string;
  paymentMethod: string | null;
  refundedAmount: string | null;
}

const ReceiptDocument = ({ input }: { input: ReceiptInput }) =>
  React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: { padding: 40 } },
      React.createElement(Text, { style: { fontSize: 18, marginBottom: 8 } }, input.restaurantName),
      React.createElement(
        Text,
        { style: { fontSize: 12, marginBottom: 16 } },
        `Order ${input.orderNumber} · ${formatDate(input.createdAt)}`,
      ),

      React.createElement(
        View,
        { style: { marginBottom: 12 } },
        ...input.items.map((it, i) =>
          React.createElement(
            View,
            { key: i, style: { flexDirection: 'row', marginBottom: 4 } },
            React.createElement(
              Text,
              { style: { flex: 1, fontSize: 10 } },
              `${it.quantity} × ${it.name}`,
            ),
            React.createElement(
              Text,
              { style: { fontSize: 10 } },
              formatMoney(it.lineTotal, input.currency),
            ),
          ),
        ),
      ),

      ...renderTotalsBlock(input),

      input.paymentMethod
        ? React.createElement(
            Text,
            { style: { marginTop: 16, fontSize: 10 } },
            `Paid with: ${input.paymentMethod}`,
          )
        : null,

      input.refundedAmount
        ? React.createElement(
            Text,
            { style: { marginTop: 4, fontSize: 10, color: '#d33' } },
            `Refunded: ${formatMoney(input.refundedAmount, input.currency)}`,
          )
        : null,
    ),
  );

function renderTotalsBlock(input: ReceiptInput): React.ReactElement[] {
  const row = (label: string, value: string) =>
    React.createElement(
      View,
      { style: { flexDirection: 'row', marginBottom: 2 } },
      React.createElement(Text, { style: { flex: 1, fontSize: 10 } }, label),
      React.createElement(Text, { style: { fontSize: 10 } }, value),
    );

  const fmt = (v: string) => formatMoney(v, input.currency);
  const out: React.ReactElement[] = [];
  out.push(row('Subtotal', fmt(input.subtotal)));
  if (Number.parseFloat(input.discountTotal) > 0)
    out.push(row('Discount', `-${fmt(input.discountTotal)}`));
  if (Number.parseFloat(input.taxTotal) > 0) out.push(row('Tax', fmt(input.taxTotal)));
  if (Number.parseFloat(input.deliveryFee) > 0) out.push(row('Delivery', fmt(input.deliveryFee)));
  if (Number.parseFloat(input.tipAmount) > 0) out.push(row('Tip', fmt(input.tipAmount)));

  out.push(
    React.createElement(
      View,
      {
        style: {
          flexDirection: 'row',
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid #ccc',
        },
      },
      React.createElement(Text, { style: { flex: 1, fontSize: 12, fontWeight: 'bold' } }, 'Total'),
      React.createElement(
        Text,
        { style: { fontSize: 12, fontWeight: 'bold' } },
        fmt(input.grandTotal),
      ),
    ),
  );
  return out;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace('T', ' ');
}

export async function renderReceiptPdf(input: ReceiptInput): Promise<Buffer> {
  // renderToBuffer wants a `Document` element specifically; our wrapper
  // component returns one but TS infers a generic function-component type.
  const element = React.createElement(ReceiptDocument, { input });
  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0]);
}

/**
 * Return the ordered list of visible text lines on the receipt. Used by the
 * snapshot test as a stable substitute for parsing the binary PDF (the
 * `@react-pdf/renderer` byte output isn't deterministic across versions, but
 * the text content is the contract we care about).
 */
export function receiptTextLines(input: ReceiptInput): string[] {
  const lines: string[] = [];
  lines.push(input.restaurantName);
  lines.push(`Order ${input.orderNumber} · ${formatDate(input.createdAt)}`);

  for (const it of input.items) {
    lines.push(`${it.quantity} × ${it.name}`);
    lines.push(formatMoney(it.lineTotal, input.currency));
  }

  const fmt = (v: string) => formatMoney(v, input.currency);
  lines.push('Subtotal');
  lines.push(fmt(input.subtotal));
  if (Number.parseFloat(input.discountTotal) > 0) {
    lines.push('Discount');
    lines.push(`-${fmt(input.discountTotal)}`);
  }
  if (Number.parseFloat(input.taxTotal) > 0) {
    lines.push('Tax');
    lines.push(fmt(input.taxTotal));
  }
  if (Number.parseFloat(input.deliveryFee) > 0) {
    lines.push('Delivery');
    lines.push(fmt(input.deliveryFee));
  }
  if (Number.parseFloat(input.tipAmount) > 0) {
    lines.push('Tip');
    lines.push(fmt(input.tipAmount));
  }
  lines.push('Total');
  lines.push(fmt(input.grandTotal));

  if (input.paymentMethod) {
    lines.push(`Paid with: ${input.paymentMethod}`);
  }
  if (input.refundedAmount) {
    lines.push(`Refunded: ${fmt(input.refundedAmount)}`);
  }
  return lines;
}
