'use client';

import { useCancelOrder, useOrder } from '@/features/orders/hooks';
import {
  ActionModal,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const CANCEL_REASON_KEYS = [
  'customerRequested',
  'outOfStock',
  'outOfRange',
  'restaurantClosed',
  'paymentFailed',
  'other',
] as const;

type CancelReasonKey = (typeof CANCEL_REASON_KEYS)[number];

interface CancelModalProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CancelModal({ orderId, onOpenChange }: CancelModalProps) {
  const t = useTranslations('admin.orders.detail');
  const defaultReason = CANCEL_REASON_KEYS[0];
  const open = orderId !== null;
  const q = useOrder(orderId ?? '');
  const cancel = useCancelOrder();
  const [reason, setReason] = React.useState<CancelReasonKey>(defaultReason);
  const [note, setNote] = React.useState('');

  const reasonLabels: Record<CancelReasonKey, string> = {
    customerRequested: t('cancelModal.reasons.customerRequested'),
    outOfStock: t('cancelModal.reasons.outOfStock'),
    outOfRange: t('cancelModal.reasons.outOfRange'),
    restaurantClosed: t('cancelModal.reasons.restaurantClosed'),
    paymentFailed: t('cancelModal.reasons.paymentFailed'),
    other: t('cancelModal.reasons.other'),
  };

  React.useEffect(() => {
    if (open) {
      setReason(defaultReason);
      setNote('');
    }
  }, [open, defaultReason]);

  const order = q.data;
  const valid = reason !== 'other' || note.trim().length > 0;

  function submit() {
    if (!order) return;
    const fullReason = reason === 'other' ? note.trim() : reasonLabels[reason];
    cancel.mutate(
      {
        orderId: order.id,
        reason: fullReason,
        note: note.trim() || undefined,
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
      variant="destructive"
      title={order ? t('cancelModal.title', { number: order.orderNumber }) : t('cancelModal.titleFallback')}
      description={t('cancelModal.description')}
      primary={{
        label: t('cancelModal.primary'),
        onClick: submit,
        disabled: !valid,
        loading: cancel.isPending,
      }}
      secondary={{ label: t('cancelModal.secondary'), onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-4">
        <FormField label={t('cancelModal.reasonLabel')} required>
          <Select value={reason} onValueChange={(v) => setReason(v as CancelReasonKey)}>
            <SelectTrigger>
              <SelectValue placeholder={t('cancelModal.pickReason')} />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASON_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {reasonLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label={t('cancelModal.notesLabel')}
          required={reason === 'other'}
          helper={t('cancelModal.notesHelper')}
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={
              reason === 'other'
                ? t('cancelModal.notesPlaceholderOther')
                : t('cancelModal.notesPlaceholder')
            }
          />
        </FormField>
      </div>
    </ActionModal>
  );
}
