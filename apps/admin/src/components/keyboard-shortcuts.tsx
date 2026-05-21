'use client';

import { ActionModal } from '@repo/ui';
import { useTranslations } from 'next-intl';
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
 * dashboard. Orders is the first caller (see `useOrdersShortcutGroups`).
 */
export function KeyboardShortcuts({ open, onOpenChange, groups }: KeyboardShortcutsProps) {
  const t = useTranslations('admin.keyboardShortcuts');
  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      width={520}
      secondary={{ label: t('close'), onClick: () => onOpenChange(false) }}
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
                        {i > 0 && <span className="text-[10px] text-fg-subtle">{t('then')}</span>}
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

/**
 * Localized shortcut definitions for the Orders page. Built via a hook so
 * `useTranslations` resolves against the active locale on each render.
 */
export function useOrdersShortcutGroups(): ShortcutGroup[] {
  const t = useTranslations('admin.keyboardShortcuts');
  return React.useMemo(
    () => [
      {
        title: t('groups.searchNav'),
        shortcuts: [
          { keys: ['/'], label: t('shortcuts.focusSearch') },
          { keys: ['⌘', 'F'], label: t('shortcuts.focusSearchAlt') },
          { keys: ['j'], label: t('shortcuts.moveFocusDown') },
          { keys: ['k'], label: t('shortcuts.moveFocusUp') },
          { keys: ['↑'], label: t('shortcuts.moveFocusUp') },
          { keys: ['↓'], label: t('shortcuts.moveFocusDown') },
        ],
      },
      {
        title: t('groups.filtering'),
        shortcuts: [
          { keys: ['1'], label: t('shortcuts.allOrders') },
          { keys: ['2'], label: t('shortcuts.pending') },
          { keys: ['3'], label: t('shortcuts.confirmed') },
          { keys: ['4'], label: t('shortcuts.preparing') },
          { keys: ['5'], label: t('shortcuts.ready') },
          { keys: ['6'], label: t('shortcuts.outForDelivery') },
          { keys: ['7'], label: t('shortcuts.delivered') },
          { keys: ['8'], label: t('shortcuts.cancelled') },
        ],
      },
      {
        title: t('groups.selectionActions'),
        shortcuts: [
          { keys: ['Space'], label: t('shortcuts.toggleRowSelection') },
          { keys: ['Enter'], label: t('shortcuts.openFocusedOrder') },
          { keys: ['⌘', 'A'], label: t('shortcuts.selectAllVisible') },
          { keys: ['Esc'], label: t('shortcuts.clearSelection') },
          { keys: ['?'], label: t('shortcuts.showCheatsheet') },
        ],
      },
    ],
    [t],
  );
}
