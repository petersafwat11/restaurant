'use client';

import { useCreateReservation } from '@/features/reservations/hooks';
import { Button, DetailDrawer, FormField, Input, Textarea } from '@repo/ui';
import { CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface ReservationCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional default datetime for the picker (Date object in local TZ). */
  defaultStart?: Date;
}

interface Draft {
  startAtLocal: string;
  partySize: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  occasion: string;
  notes: string;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nextHalfHour(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

function emptyDraft(defaultStart?: Date): Draft {
  return {
    startAtLocal: toLocalInputValue(defaultStart ?? nextHalfHour()),
    partySize: 2,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    occasion: '',
    notes: '',
  };
}

export function ReservationCreateDrawer({
  open,
  onOpenChange,
  defaultStart,
}: ReservationCreateDrawerProps) {
  const t = useTranslations('admin.reservations.list.createDrawer');
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft(defaultStart));
  const create = useCreateReservation();

  React.useEffect(() => {
    if (open) setDraft(emptyDraft(defaultStart));
  }, [open, defaultStart]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const valid =
    draft.startAtLocal.length > 0 &&
    draft.partySize >= 1 &&
    draft.partySize <= 50 &&
    draft.contactName.trim().length > 0 &&
    draft.contactPhone.trim().length >= 3;

  function save() {
    if (!valid) return;
    const startAt = new Date(draft.startAtLocal);
    if (Number.isNaN(startAt.getTime())) return;
    create.mutate(
      {
        startAt: startAt.toISOString(),
        partySize: draft.partySize,
        contactName: draft.contactName.trim(),
        contactPhone: draft.contactPhone.trim(),
        contactEmail: draft.contactEmail.trim() || undefined,
        occasion: draft.occasion.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={520}
      ariaLabel={t('ariaLabel')}
      header={
        <div className="px-6 py-4">
          <div className="text-caption uppercase tracking-wider text-fg-subtle">{t('eyebrow')}</div>
          <div className="mt-1 flex items-center gap-2 text-h2 font-semibold text-fg">
            <CalendarPlus size={18} /> {t('title')}
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={save} disabled={!valid || create.isPending}>
            {create.isPending ? t('submitLoading') : t('submit')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('fields.when')} required className="sm:col-span-2">
          <Input
            type="datetime-local"
            value={draft.startAtLocal}
            onChange={(e) => set('startAtLocal', e.target.value)}
          />
        </FormField>
        <FormField label={t('fields.partySize')} required>
          <Input
            type="number"
            min={1}
            max={50}
            value={draft.partySize}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              set('partySize', Number.isFinite(n) ? n : 1);
            }}
          />
        </FormField>
        <FormField label={t('fields.occasion')} helper={t('fields.occasionHelper')}>
          <Input
            value={draft.occasion}
            maxLength={120}
            onChange={(e) => set('occasion', e.target.value)}
          />
        </FormField>
        <FormField label={t('fields.guestName')} required className="sm:col-span-2">
          <Input
            value={draft.contactName}
            maxLength={120}
            onChange={(e) => set('contactName', e.target.value)}
          />
        </FormField>
        <FormField label={t('fields.phone')} required>
          <Input
            value={draft.contactPhone}
            maxLength={30}
            onChange={(e) => set('contactPhone', e.target.value)}
          />
        </FormField>
        <FormField label={t('fields.email')}>
          <Input
            type="email"
            value={draft.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
        </FormField>
        <FormField
          label={t('fields.notes')}
          className="sm:col-span-2"
          helper={t('fields.notesHelper')}
        >
          <Textarea
            value={draft.notes}
            maxLength={500}
            rows={3}
            onChange={(e) => set('notes', e.target.value)}
          />
        </FormField>
      </div>
    </DetailDrawer>
  );
}
