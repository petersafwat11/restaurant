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

export interface CancelModalLabels {
  title: (orderNumber: string) => string;
  titleFallback: string;
  description: string;
  primary: string;
  secondary: string;
  reasonLabel: string;
  notesLabel: string;
  notesHelper: string;
  pickReason: string;
  notesPlaceholderOther: string;
  notesPlaceholder: string;
  reasons: string[];
  otherKey: string;
}

const DEFAULT_CANCEL_LABELS: CancelModalLabels = {
  title: (n) => `Cancel order ${n}?`,
  titleFallback: 'Cancel order',
  description:
    'The customer will be refunded (if pre-paid) and notified. This action cannot be undone.',
  primary: 'Cancel order',
  secondary: 'Keep order',
  reasonLabel: 'Reason',
  notesLabel: 'Notes',
  notesHelper: "Visible in audit log and on the customer's order page.",
  pickReason: 'Pick a reason',
  notesPlaceholderOther: 'Describe the reason…',
  notesPlaceholder: 'Optional extra context…',
  reasons: [
    'Customer requested',
    'Restaurant out of stock',
    'Address out of delivery range',
    'Restaurant closed',
    'Payment failed',
    'Other',
  ],
  otherKey: 'Other',
};

interface CancelModalProps {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  labels?: Partial<CancelModalLabels>;
}

export function CancelModal({ orderId, onOpenChange, labels }: CancelModalProps) {
  const L = { ...DEFAULT_CANCEL_LABELS, ...labels } as CancelModalLabels;
  const REASONS = L.reasons;
  const defaultReason = REASONS[0] ?? L.otherKey;
  const open = orderId !== null;
  const q = useOrder(orderId ?? '');
  const cancel = useCancelOrder();
  const [reason, setReason] = React.useState(defaultReason);
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setReason(defaultReason);
      setNote('');
    }
  }, [open, defaultReason]);

  const order = q.data;
  const valid = reason !== L.otherKey || note.trim().length > 0;

  function submit() {
    if (!order) return;
    const fullReason = reason === L.otherKey ? note.trim() : reason;
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
      title={order ? L.title(order.orderNumber) : L.titleFallback}
      description={L.description}
      primary={{
        label: L.primary,
        onClick: submit,
        disabled: !valid,
        loading: cancel.isPending,
      }}
      secondary={{ label: L.secondary, onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-4">
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

        <FormField label={L.notesLabel} required={reason === L.otherKey} helper={L.notesHelper}>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={reason === L.otherKey ? L.notesPlaceholderOther : L.notesPlaceholder}
          />
        </FormField>
      </div>
    </ActionModal>
  );
}
