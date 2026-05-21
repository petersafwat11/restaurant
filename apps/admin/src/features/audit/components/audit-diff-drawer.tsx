'use client';

import type { AuditLogEntryDto } from '@repo/types';
import { DetailDrawer, RelativeTime } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  entry: AuditLogEntryDto | null;
  onOpenChange: (open: boolean) => void;
}

export function AuditDiffDrawer({ entry, onOpenChange }: Props) {
  const t = useTranslations('admin.auditLog');
  const open = entry !== null;
  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={640}
      ariaLabel={t('drawer.ariaLabel')}
      header={
        entry && (
          <div className="px-6 py-4">
            <div className="font-mono text-h2-admin text-fg">{entry.action}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
              <span className="tabular-nums">{entry.resourceType}</span>
              <span className="text-fg-subtle">·</span>
              <span className="font-mono text-fg-subtle">{entry.resourceId}</span>
              <span className="text-fg-subtle">·</span>
              <RelativeTime value={entry.createdAt} />
            </div>
            <div className="mt-2 text-xs text-fg-subtle">
              {t('drawer.actor', { id: entry.actorUserId })}
              {entry.ip && <> · {t('drawer.ip', { ip: entry.ip })}</>}
            </div>
          </div>
        )
      }
    >
      {entry && (
        <div className="space-y-4">
          <DiffPanel label={t('drawer.before')} json={entry.beforeJson} empty={t('drawer.empty')} />
          <DiffPanel label={t('drawer.after')} json={entry.afterJson} empty={t('drawer.empty')} />
        </div>
      )}
    </DetailDrawer>
  );
}

function DiffPanel({ label, json, empty }: { label: string; json: unknown; empty: string }) {
  const body = json == null ? empty : JSON.stringify(json, null, 2);
  return (
    <section>
      <div className="mb-1 text-caption-admin text-fg-subtle">{label}</div>
      <pre className="max-h-80 overflow-auto rounded-md border-hairline bg-surface-2 p-3 text-xs leading-relaxed text-fg-muted">
        {body}
      </pre>
    </section>
  );
}
