'use client';

import { useOrder, useRefundOrder } from '@/features/orders/hooks';
import {
  ActionModal,
  CurrencyInput,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui';
import { formatMoney } from '@repo/utils';
import * as React from 'react';

interface RefundModalProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

const REASONS = [
  'Customer requested',
  'Item out of stock',
  'Wrong item delivered',
  'Food quality issue',
  'Duplicate order',
  'Other',
];

export function RefundModal({ orderId, onOpenChange }: RefundModalProps) {
  const open = orderId !== null;
  const q = useOrder(orderId ?? '');
  const refund = useRefundOrder();
  const [mode, setMode] = React.useState<'full' | 'partial'>('full');
  const [amount, setAmount] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('Customer requested');
  const [note, setNote] = React.useState('');

  // Reset state when modal opens for a new order
  React.useEffect(() => {
    if (open && q.data) {
      setMode('full');
      setAmount(q.data.grandTotal);
      setReason('Customer requested');
      setNote('');
    }
  }, [open, q.data]);

  const order = q.data;
  const valid = order
    ? (mode === 'full' ||
        (amount !== null && Number(amount) > 0 && Number(amount) <= Number(order.grandTotal))) &&
      (reason !== 'Other' || note.trim().length > 0)
    : false;

  function submit() {
    if (!order?.payment) return;
    const refundReason = reason === 'Other' ? note.trim() : reason + (note ? ` — ${note}` : '');
    refund.mutate(
      {
        orderId: order.id,
        paymentId: order.payment.id,
        amount: mode === 'full' ? undefined : (amount ?? undefined),
        reason: refundReason,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={order ? `Refund order ${order.orderNumber}` : 'Refund order'}
      description={
        order ? `Up to ${formatMoney(order.grandTotal, order.currency)} available to refund.` : ''
      }
      footerHelper="This will email the customer."
      primary={{
        label: order
          ? `Issue refund · ${formatMoney(mode === 'full' ? order.grandTotal : (amount ?? '0'), order.currency)}`
          : 'Issue refund',
        onClick: submit,
        disabled: !valid,
        loading: refund.isPending,
      }}
      secondary={{ label: 'Cancel', onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Refund amount">
          {(['full', 'partial'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                if (m === 'full' && order) setAmount(order.grandTotal);
              }}
              className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                mode === m
                  ? 'border-accent bg-accent/[0.08] text-fg'
                  : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-muted hover:text-fg'
              }`}
            >
              {m === 'full' ? 'Full refund' : 'Partial refund'}
            </button>
          ))}
        </div>

        {mode === 'partial' && order && (
          <FormField label="Amount" required>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              currency={order.currency}
              min={0}
              max={Number(order.grandTotal)}
            />
          </FormField>
        )}

        <FormField label="Reason" required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a reason" />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {reason === 'Other' && (
          <FormField label="Notes" required>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="What happened?"
            />
          </FormField>
        )}
      </div>
    </ActionModal>
  );
}
