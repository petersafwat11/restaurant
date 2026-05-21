'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '@/features/settings/hooks';
import { Link } from '@/i18n/navigation';
import type { HolidayDto, RestaurantSettingsDto } from '@repo/types';
import { EmptyState, PageSpinner, SettingsSectionCard } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { Calendar, Clock, Globe, MapPin, ReceiptText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

function NumberStepper({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  ariaLabel,
  increaseLabel,
  decreaseLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
  ariaLabel: string;
  increaseLabel: string;
  decreaseLabel: string;
}) {
  function clamp(n: number) {
    return Math.max(min, Math.min(max, n));
  }
  return (
    <div className="inline-flex h-9 items-center overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)]">
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={() => onChange(clamp(value - step))}
        className="grid h-full w-8 place-items-center text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(clamp(n));
        }}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        className="w-14 border-0 bg-transparent text-center text-small tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="pr-2 text-small text-fg-muted">{suffix}</span>}
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={() => onChange(clamp(value + step))}
        className="grid h-full w-8 place-items-center text-fg-muted hover:bg-surface-warm/30 hover:text-fg"
      >
        +
      </button>
    </div>
  );
}

function summarizeHolidays(holidays: HolidayDto[]): {
  upcoming: number;
  nextLabel: string | null;
} {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.date >= today);
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return {
    upcoming: upcoming.length,
    nextLabel: upcoming[0]?.label ?? null,
  };
}

function MoneyField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-small text-fg-muted">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (/^-?\d+(\.\d{1,2})?$/.test(draft) && draft !== value) {
            onCommit(draft);
          } else if (draft !== value) {
            setDraft(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setDraft(value);
        }}
        className="h-9 w-32 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-right text-small tabular-nums text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}

function PercentField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  const asPercent = (Number(value) * 100).toFixed(2);
  const [draft, setDraft] = React.useState(asPercent);
  React.useEffect(() => setDraft((Number(value) * 100).toFixed(2)), [value]);

  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-small text-fg-muted">{label}</span>
      <div className="inline-flex h-9 items-center overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)] focus-within:border-accent">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft);
            if (Number.isFinite(n) && n >= 0 && n <= 100) {
              const next = (n / 100).toFixed(4);
              if (next !== value) onCommit(next);
            } else {
              setDraft(asPercent);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setDraft(asPercent);
          }}
          className="w-24 bg-transparent px-3 text-right text-small tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="pr-2 text-small text-fg-muted">%</span>
      </div>
    </label>
  );
}

function HubCard({
  icon,
  title,
  preview,
  href,
  manageLabel,
}: {
  icon: React.ReactNode;
  title: string;
  preview: React.ReactNode;
  href: string;
  manageLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-card border border-border/[var(--border-alpha)] bg-surface p-6 transition-colors hover:border-border/[var(--border-strong-alpha)] hover:bg-surface-2"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-button bg-accent-muted text-accent">
          {icon}
        </div>
        <h3 className="text-h2 font-semibold text-fg">{title}</h3>
      </div>
      <div className="flex-1 text-small text-fg-muted">{preview}</div>
      <div className="mt-6 text-small text-accent group-hover:text-accent-hover">{manageLabel}</div>
    </Link>
  );
}

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings.general');
  usePageHeader({ title: t('title') });
  const { data, isLoading, isError, error, refetch } = useRestaurantSettings();
  const update = useUpdateRestaurantSettings();

  if (isLoading) {
    return <PageSpinner label={t('loading')} />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title={t('error.title')}
        description={error?.message ?? t('error.description')}
        action={{ label: t('error.retry'), onClick: () => refetch() }}
        size="lg"
      />
    );
  }

  const s = data;
  const holidaySummary = summarizeHolidays(s.holidayDates);

  function commit(patch: Partial<RestaurantSettingsDto>) {
    update.mutate(patch);
  }

  const slotLengthAria = t('reservations.slotLengthAria');
  const bufferAria = t('reservations.bufferAria');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HubCard
          icon={<Clock className="h-5 w-5" />}
          title={t('hub.hours.title')}
          href="/settings/hours"
          manageLabel={t('hub.manage')}
          preview={<p>{t('hub.hours.preview')}</p>}
        />
        <HubCard
          icon={<Calendar className="h-5 w-5" />}
          title={t('hub.holidays.title')}
          href="/settings/holidays"
          manageLabel={t('hub.manage')}
          preview={
            <p>
              <span className="text-fg">
                {t('hub.holidays.preview', { count: holidaySummary.upcoming })}
              </span>
              {holidaySummary.nextLabel
                ? t('hub.holidays.next', { label: holidaySummary.nextLabel })
                : ''}
              {t('hub.holidays.trailing')}
            </p>
          }
        />
        <HubCard
          icon={<MapPin className="h-5 w-5" />}
          title={t('hub.deliveryZones.title')}
          href="/settings/delivery-zones"
          manageLabel={t('hub.manage')}
          preview={
            <p>
              <span className="text-fg">
                {t('hub.deliveryZones.preview', { count: s.deliveryZones.length })}
              </span>
            </p>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SettingsSectionCard
          id="financials"
          title={t('financials.title')}
          description={t('financials.description')}
        >
          <PercentField
            label={t('financials.taxRate')}
            value={s.taxRate}
            onCommit={(taxRate) => commit({ taxRate })}
          />
          <MoneyField
            label={t('financials.defaultDeliveryFee', { currency: s.currency })}
            value={s.defaultDeliveryFee}
            onCommit={(defaultDeliveryFee) => commit({ defaultDeliveryFee })}
          />
          <MoneyField
            label={t('financials.minOrder', { currency: s.currency })}
            value={s.minOrderAmount}
            onCommit={(minOrderAmount) => commit({ minOrderAmount })}
          />
          <div className="flex items-center justify-between border-t border-border/[var(--border-alpha)] pt-3 text-small">
            <span className="text-fg-muted">{t('financials.effectiveMinimum')}</span>
            <span className="tabular-nums text-fg">
              {formatMoney(s.minOrderAmount, s.currency)}
            </span>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="reservations"
          title={t('reservations.title')}
          description={t('reservations.description')}
        >
          {/* biome-ignore lint/a11y/noLabelWithoutControl: NumberStepper renders its own input */}
          <label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-small text-fg">{t('reservations.slotLength')}</span>
              <span className="block text-caption uppercase tracking-wider text-fg-subtle">
                {t('reservations.slotLengthHelp')}
              </span>
            </div>
            <NumberStepper
              value={s.reservationSlotMinutes}
              min={15}
              max={360}
              step={15}
              suffix={t('reservations.minSuffix')}
              ariaLabel={slotLengthAria}
              increaseLabel={t('reservations.increase', { field: slotLengthAria })}
              decreaseLabel={t('reservations.decrease', { field: slotLengthAria })}
              onChange={(reservationSlotMinutes) => commit({ reservationSlotMinutes })}
            />
          </label>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: NumberStepper renders its own input */}
          <label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-small text-fg">{t('reservations.buffer')}</span>
              <span className="block text-caption uppercase tracking-wider text-fg-subtle">
                {t('reservations.bufferHelp')}
              </span>
            </div>
            <NumberStepper
              value={s.reservationBufferMinutes}
              min={0}
              max={120}
              step={5}
              suffix={t('reservations.minSuffix')}
              ariaLabel={bufferAria}
              increaseLabel={t('reservations.increase', { field: bufferAria })}
              decreaseLabel={t('reservations.decrease', { field: bufferAria })}
              onChange={(reservationBufferMinutes) => commit({ reservationBufferMinutes })}
            />
          </label>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="locale"
          title={t('locale.title')}
          description={t('locale.description')}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-fg-subtle" />
              <span className="text-small text-fg-muted">{t('locale.timezone')}</span>
            </div>
            <code className="rounded-button bg-surface-2 px-2 py-1 text-small text-fg">
              {s.timezone}
            </code>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-fg-subtle" />
              <span className="text-small text-fg-muted">{t('locale.currency')}</span>
            </div>
            <code className="rounded-button bg-surface-2 px-2 py-1 text-small text-fg">
              {s.currency}
            </code>
          </div>
          <p className="border-t border-border/[var(--border-alpha)] pt-3 text-small text-fg-muted">
            {t.rich('locale.editLink', {
              link: (chunks) => (
                <Link className="text-accent hover:underline" href="/restaurant">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
