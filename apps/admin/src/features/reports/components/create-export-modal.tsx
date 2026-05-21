'use client';

import { useCreateExport } from '@/features/reports/hooks';
import { EXPORT_FORMATS, EXPORT_KINDS, type ExportFormat, type ExportKind } from '@repo/types';
import { ActionModal, Label } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateExportModal({ open, onOpenChange }: Props) {
  const t = useTranslations('admin.reports.exports');
  const create = useCreateExport();
  const [kind, setKind] = React.useState<ExportKind>('orders-detail');
  const [format, setFormat] = React.useState<ExportFormat>('csv');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the modal opens/closes — `create` is a fresh object every render and listing it would cause an infinite loop
  React.useEffect(() => {
    if (!open) {
      setKind('orders-detail');
      setFormat('csv');
      setFrom('');
      setTo('');
      create.reset();
    }
  }, [open]);

  function submit() {
    create.mutate(
      {
        kind,
        format,
        params: {
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to).toISOString() : undefined,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('modal.title')}
      description={t('modal.description')}
      primary={{
        label: create.isPending ? t('modal.queueing') : t('modal.queue'),
        onClick: submit,
        disabled: create.isPending,
        loading: create.isPending,
      }}
      secondary={{ label: t('modal.cancel'), onClick: () => onOpenChange(false) }}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="export-kind">{t('modal.report')}</Label>
          <select
            id="export-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ExportKind)}
            className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
          >
            {EXPORT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="export-format">{t('modal.format')}</Label>
          <select
            id="export-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
          >
            {EXPORT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {t(`format.${f}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="export-from">{t('modal.from')}</Label>
            <input
              id="export-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="export-to">{t('modal.to')}</Label>
            <input
              id="export-to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
            />
          </div>
        </div>
        {create.error && <div className="text-xs text-negative">{create.error.message}</div>}
      </div>
    </ActionModal>
  );
}
