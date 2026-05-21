'use client';

import { AUDIT_ACTIONS, type AuditAction } from '@repo/types';
import { Input } from '@repo/ui';
import * as React from 'react';

export interface AuditFiltersState {
  actorUserId: string;
  action: AuditAction | '';
  resourceType: string;
  from: string;
  to: string;
}

const RESOURCE_TYPES = [
  'order',
  'payment',
  'menu_item',
  'menu_category',
  'promotion',
  'staff',
  'review',
  'reservation',
  'settings',
] as const;

interface Props {
  value: AuditFiltersState;
  onChange: (next: AuditFiltersState) => void;
}

export function AuditFilters({ value, onChange }: Props) {
  function update<K extends keyof AuditFiltersState>(key: K, v: AuditFiltersState[K]) {
    onChange({ ...value, [key]: v });
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Actor user id…"
        value={value.actorUserId}
        onChange={(e) => update('actorUserId', e.target.value)}
        className="h-8 w-56 text-sm"
      />
      <select
        value={value.action}
        onChange={(e) => update('action', e.target.value as AuditAction | '')}
        className="h-8 rounded-md border-hairline bg-surface px-2 text-xs text-fg-muted"
      >
        <option value="">All actions</option>
        {AUDIT_ACTIONS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        value={value.resourceType}
        onChange={(e) => update('resourceType', e.target.value)}
        className="h-8 rounded-md border-hairline bg-surface px-2 text-xs text-fg-muted"
      >
        <option value="">All resources</option>
        {RESOURCE_TYPES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-fg-subtle">
        From
        <input
          type="datetime-local"
          value={value.from}
          onChange={(e) => update('from', e.target.value)}
          className="h-8 rounded-md border-hairline bg-surface px-2 text-xs text-fg-muted"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-fg-subtle">
        To
        <input
          type="datetime-local"
          value={value.to}
          onChange={(e) => update('to', e.target.value)}
          className="h-8 rounded-md border-hairline bg-surface px-2 text-xs text-fg-muted"
        />
      </label>
    </div>
  );
}
