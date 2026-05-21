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
import * as React from 'react';

interface CancelModalProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

const REASONS = [
  'Customer requested',
  'Restaurant out of stock',
  'Address out of delivery range',
  'Restaurant closed',
  'Payment failed',
  'Other',
];

export function CancelModal({ orderId, onOpenChange }: CancelModalProps) {
  const open = orderId !== null;
  const q = useOrder(orderId ?? '');
  const cancel = useCancelOrder();
  const [reason, setReason] = React.useState('Customer requested');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setReason('Customer requested');
      setNote('');
    }
  }, [open]);

  const order = q.data;
  const valid = reason !== 'Other' || note.trim().length > 0;

  function submit() {
    if (!order) return;
    const fullReason = reason === 'Other' ? note.trim() : reason;
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
      title={order ? `Cancel order ${order.orderNumber}?` : 'Cancel order'}
      description="The customer will be refunded (if pre-paid) and notified. This action cannot be undone."
      primary={{
        label: 'Cancel order',
        onClick: submit,
        disabled: !valid,
        loading: cancel.isPending,
      }}
      secondary={{ label: 'Keep order', onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-4">
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

        <FormField
          label="Notes"
          required={reason === 'Other'}
          helper="Visible in audit log and on the customer's order page."
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={reason === 'Other' ? 'Describe the reason…' : 'Optional extra context…'}
          />
        </FormField>
      </div>
    </ActionModal>
  );
}
