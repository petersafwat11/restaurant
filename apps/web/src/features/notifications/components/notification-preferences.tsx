'use client';

import type { UpdateNotificationPreferenceDto } from '@repo/types';
import { Spinner, Switch } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks';

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col">
        <span className="text-small font-medium text-fg">{label}</span>
        {hint && <span className="text-[12px] text-fg-subtle">{hint}</span>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Notification preference toggles. Only channels with a real delivery path for
 * web customers are interactive: email + SMS. Push targets the (not-yet-shipped)
 * mobile app, so those rows are shown disabled with a "coming soon" hint rather
 * than as dead switches.
 */
export function NotificationPreferences() {
  const t = useTranslations('web.account.notifications');
  const prefsQuery = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const prefs = prefsQuery.data;

  const set = (patch: UpdateNotificationPreferenceDto) => update.mutate(patch);

  return (
    <div className="rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-5">
      <h2 className="text-body-l font-semibold text-fg">{t('prefs.title')}</h2>
      <p className="mt-0.5 text-small text-fg-muted">{t('prefs.subtitle')}</p>

      {prefsQuery.isLoading || !prefs ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          <section>
            <h3 className="text-caption uppercase tracking-wide text-fg-subtle">
              {t('prefs.orderUpdates')}
            </h3>
            <div className="divide-y divide-border/[var(--border-alpha)]">
              <ToggleRow
                label={t('prefs.email')}
                checked={prefs.orderUpdatesEmail}
                disabled={update.isPending}
                onChange={(v) => set({ orderUpdatesEmail: v })}
              />
              <ToggleRow
                label={t('prefs.sms')}
                checked={prefs.orderUpdatesSms}
                disabled={update.isPending}
                onChange={(v) => set({ orderUpdatesSms: v })}
              />
              <ToggleRow
                label={t('prefs.push')}
                hint={t('prefs.comingSoon')}
                checked={prefs.orderUpdatesPush}
                disabled
              />
            </div>
          </section>

          <section>
            <h3 className="text-caption uppercase tracking-wide text-fg-subtle">
              {t('prefs.promotions')}
            </h3>
            <div className="divide-y divide-border/[var(--border-alpha)]">
              <ToggleRow
                label={t('prefs.email')}
                checked={prefs.promotionsEmail}
                disabled={update.isPending}
                onChange={(v) => set({ promotionsEmail: v })}
              />
              <ToggleRow
                label={t('prefs.push')}
                hint={t('prefs.comingSoon')}
                checked={prefs.promotionsPush}
                disabled
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
