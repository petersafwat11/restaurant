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

export interface RefundModalLabels {
  title: (orderNumber: string) => string;
  titleFallback: string;
  description: (amount: string) => string;
  footerHelper: string;
  primary: (amount: string) => string;
  primaryFallback: string;
  secondary: string;
  refundAmountAria: string;
  fullRefund: string;
  partialRefund: string;
  amountLabel: string;
  reasonLabel: string;
  notesLabel: string;
  pickReason: string;
  notesPlaceholder: string;
  reasons: string[];
  otherKey: string;
}

const DEFAULT_REFUND_LABELS: RefundModalLabels = {
  title: (n) => `Refund order ${n}`,
  titleFallback: 'Refund order',
  description: (a) => `Up to ${a} available to refund.`,
  footerHelper: 'This will email the customer.',
  primary: (a) => `Issue refund · ${a}`,
  primaryFallback: 'Issue refund',
  secondary: 'Cancel',
  refundAmountAria: 'Refund amount',
  fullRefund: 'Full refund',
  partialRefund: 'Partial refund',
  amountLabel: 'Amount',
  reasonLabel: 'Reason',
  notesLabel: 'Notes',
  pickReason: 'Pick a reason',
  notesPlaceholder: 'What happened?',
  reasons: [
    'Customer requested',
    'Item out of stock',
    'Wrong item delivered',
    'Food quality issue',
    'Duplicate order',
    'Other',
  ],
  otherKey: 'Other',
};

interface RefundModalProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  labels?: Partial<RefundModalLabels>;
}

export function RefundModal({ orderId, onOpenChange, labels }: RefundModalProps) {
  const L = { ...DEFAULT_REFUND_LABELS, ...labels } as RefundModalLabels;
  const REASONS = L.reasons;
  const defaultReason = REASONS[0] ?? L.otherKey;
  const open = orderId !== null;
  const q = useOrder(orderId ?? '');
  const refund = useRefundOrder();
  const [mode, setMode] = React.useState<'full' | 'partial'>('full');
  const [amount, setAmount] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState(defaultReason);
  const [note, setNote] = React.useState('');

  // Reset state when modal opens for a new order
  React.useEffect(() => {
    if (open && q.data) {
      setMode('full');
      setAmount(q.data.grandTotal);
      setReason(defaultReason);
      setNote('');
    }
  }, [open, q.data, defaultReason]);

  const order = q.data;
  const valid = order
    ? (mode === 'full' ||
        (amount !== null && Number(amount) > 0 && Number(amount) <= Number(order.grandTotal))) &&
      (reason !== L.otherKey || note.trim().length > 0)
    : false;

  function submit() {
    if (!order?.payment) return;
    const refundReason = reason === L.otherKey ? note.trim() : reason + (note ? ` — ${note}` : '');
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
      title={order ? L.title(order.orderNumber) : L.titleFallback}
      description={order ? L.description(formatMoney(order.grandTotal, order.currency)) : ''}
      footerHelper={L.footerHelper}
      primary={{
        label: order
          ? L.primary(
              formatMoney(mode === 'full' ? order.grandTotal : (amount ?? '0'), order.currency),
            )
          : L.primaryFallback,
        onClick: submit,
        disabled: !valid,
        loading: refund.isPending,
      }}
      secondary={{ label: L.secondary, onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2" role="radiogroup" aria-label={L.refundAmountAria}>
          {(['full', 'partial'] as const).map((m) => (
            <button
              key={m}
              type="button"
              // biome-ignore lint/a11y/useSemanticElements: radio group is rendered with `<button role="radio">` to keep the segmented-control visual styling
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
              {m === 'full' ? L.fullRefund : L.partialRefund}
            </button>
          ))}
        </div>

        {mode === 'partial' && order && (
          <FormField label={L.amountLabel} required>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              currency={order.currency}
              min={0}
              max={Number(order.grandTotal)}
            />
          </FormField>
        )}

        <FormField label={L.reasonLabel} required>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder={L.pickReason} />
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

        {reason === L.otherKey && (
          <FormField label={L.notesLabel} required>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder={L.notesPlaceholder}
            />
          </FormField>
        )}
      </div>
    </ActionModal>
  );
}
