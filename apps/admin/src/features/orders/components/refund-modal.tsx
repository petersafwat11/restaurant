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
import { useTranslations } from 'next-intl';
import * as React from 'react';

const REFUND_REASON_KEYS = [
  'customerRequested',
  'itemOutOfStock',
  'wrongItem',
  'qualityIssue',
  'duplicateOrder',
  'other',
] as const;

type RefundReasonKey = (typeof REFUND_REASON_KEYS)[number];

interface RefundModalProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RefundModal({ orderId, onOpenChange }: RefundModalProps) {
  const t = useTranslations('admin.orders.detail');
  const defaultReason = REFUND_REASON_KEYS[0];
  const open = orderId !== null;
  const q = useOrder(orderId ?? '');
  const refund = useRefundOrder();
  const [mode, setMode] = React.useState<'full' | 'partial'>('full');
  const [amount, setAmount] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState<RefundReasonKey>(defaultReason);
  const [note, setNote] = React.useState('');

  const reasonLabels: Record<RefundReasonKey, string> = {
    customerRequested: t('refundModal.reasons.customerRequested'),
    itemOutOfStock: t('refundModal.reasons.itemOutOfStock'),
    wrongItem: t('refundModal.reasons.wrongItem'),
    qualityIssue: t('refundModal.reasons.qualityIssue'),
    duplicateOrder: t('refundModal.reasons.duplicateOrder'),
    other: t('refundModal.reasons.other'),
  };

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
      (reason !== 'other' || note.trim().length > 0)
    : false;

  function submit() {
    if (!order?.payment) return;
    const refundReason =
      reason === 'other'
        ? note.trim()
        : reasonLabels[reason] + (note ? ` — ${note}` : '');
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
      title={order ? t('refundModal.title', { number: order.orderNumber }) : t('refundModal.titleFallback')}
      description={order ? t('refundModal.description', { amount: formatMoney(order.grandTotal, order.currency) }) : ''}
      footerHelper={t('refundModal.footerHelper')}
      primary={{
        label: order
          ? t('refundModal.primary', {
              amount: formatMoney(
                mode === 'full' ? order.grandTotal : (amount ?? '0'),
                order.currency,
              ),
            })
          : t('refundModal.primaryFallback'),
        onClick: submit,
        disabled: !valid,
        loading: refund.isPending,
      }}
      secondary={{ label: t('refundModal.secondary'), onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2" role="radiogroup" aria-label={t('refundModal.amountAria')}>
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
              {m === 'full' ? t('refundModal.fullRefund') : t('refundModal.partialRefund')}
            </button>
          ))}
        </div>

        {mode === 'partial' && order && (
          <FormField label={t('refundModal.amountLabel')} required>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              currency={order.currency}
              min={0}
              max={Number(order.grandTotal)}
            />
          </FormField>
        )}

        <FormField label={t('refundModal.reasonLabel')} required>
          <Select value={reason} onValueChange={(v) => setReason(v as RefundReasonKey)}>
            <SelectTrigger>
              <SelectValue placeholder={t('refundModal.pickReason')} />
            </SelectTrigger>
            <SelectContent>
              {REFUND_REASON_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {reasonLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {reason === 'other' && (
          <FormField label={t('refundModal.notesLabel')} required>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder={t('refundModal.notesPlaceholder')}
            />
          </FormField>
        )}
      </div>
    </ActionModal>
  );
}
