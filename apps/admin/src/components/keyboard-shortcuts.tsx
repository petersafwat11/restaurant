'use client';

import { ActionModal } from '@repo/ui';
import * as React from 'react';

export interface ShortcutBinding {
  keys: string[];
  label: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutBinding[];
}

export interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ShortcutGroup[];
}

/**
 * Generic shortcuts cheatsheet rendered inside an ActionModal. Pages register
 * their own bindings via the `groups` prop so a single modal serves the whole
 * dashboard. Orders is the first caller (see `ORDERS_SHORTCUT_GROUPS`).
 */
export function KeyboardShortcuts({ open, onOpenChange, groups }: KeyboardShortcutsProps) {
  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Power-user bindings for the current page."
      width={520}
      secondary={{ label: 'Close', onClick: () => onOpenChange(false) }}
    >
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.title}>
            <h4 className="mb-2 text-caption-admin text-fg-subtle">{group.title}</h4>
            <ul className="divide-y divide-border/[var(--border-strong-alpha)] rounded-md border-hairline bg-surface-2">
              {group.shortcuts.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="text-fg-muted">{s.label}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <React.Fragment key={`${s.label}-${i}`}>
                        {i > 0 && <span className="text-[10px] text-fg-subtle">then</span>}
                        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border-hairline-strong bg-surface px-1.5 font-mono text-[11px] text-fg">
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ActionModal>
  );
}

export const ORDERS_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Search & navigation',
    shortcuts: [
      { keys: ['/'], label: 'Focus search' },
      { keys: ['⌘', 'F'], label: 'Focus search (alt)' },
      { keys: ['j'], label: 'Move focus down' },
      { keys: ['k'], label: 'Move focus up' },
      { keys: ['↑'], label: 'Move focus up' },
      { keys: ['↓'], label: 'Move focus down' },
    ],
  },
  {
    title: 'Filtering',
    shortcuts: [
      { keys: ['1'], label: 'All orders' },
      { keys: ['2'], label: 'Pending' },
      { keys: ['3'], label: 'Confirmed' },
      { keys: ['4'], label: 'Preparing' },
      { keys: ['5'], label: 'Ready' },
      { keys: ['6'], label: 'Out for delivery' },
      { keys: ['7'], label: 'Delivered' },
      { keys: ['8'], label: 'Cancelled' },
    ],
  },
  {
    title: 'Selection & actions',
    shortcuts: [
      { keys: ['Space'], label: 'Toggle row selection' },
      { keys: ['Enter'], label: 'Open focused order' },
      { keys: ['⌘', 'A'], label: 'Select all visible' },
      { keys: ['Esc'], label: 'Clear selection / close drawer' },
      { keys: ['?'], label: 'Show this cheatsheet' },
    ],
  },
];
