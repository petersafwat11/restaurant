'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '@/features/settings/hooks';
import type { HolidayDto, RestaurantSettingsDto } from '@repo/types';
import { EmptyState, PageSpinner, SettingsSectionCard } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { Calendar, Clock, Globe, MapPin, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

function NumberStepper({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
  ariaLabel: string;
}) {
  function clamp(n: number) {
    return Math.max(min, Math.min(max, n));
  }
  return (
    <div className="inline-flex h-9 items-center overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)]">
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
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
        aria-label={`Increase ${ariaLabel}`}
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
}: {
  icon: React.ReactNode;
  title: string;
  preview: React.ReactNode;
  href: string;
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
      <div className="mt-6 text-small text-accent group-hover:text-accent-hover">Manage →</div>
    </Link>
  );
}

export default function AdminSettingsPage() {
  usePageHeader({ title: 'Settings' });
  const { data, isLoading, isError, error, refetch } = useRestaurantSettings();
  const update = useUpdateRestaurantSettings();

  if (isLoading) {
    return <PageSpinner label="Loading settings…" />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Couldn't load settings"
        description={error?.message ?? 'Try again in a moment.'}
        action={{ label: 'Retry', onClick: () => refetch() }}
        size="lg"
      />
    );
  }

  const s = data;
  const holidaySummary = summarizeHolidays(s.holidayDates);

  function commit(patch: Partial<RestaurantSettingsDto>) {
    update.mutate(patch);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HubCard
          icon={<Clock className="h-5 w-5" />}
          title="Operating hours"
          href="/settings/hours"
          preview={
            <p>Weekly opening hours for the public site and the order / reservation gates.</p>
          }
        />
        <HubCard
          icon={<Calendar className="h-5 w-5" />}
          title="Holidays"
          href="/settings/holidays"
          preview={
            <p>
              <span className="text-fg">
                {holidaySummary.upcoming} {holidaySummary.upcoming === 1 ? 'holiday' : 'holidays'}
              </span>{' '}
              upcoming
              {holidaySummary.nextLabel ? ` · next: ${holidaySummary.nextLabel}` : ''}.
            </p>
          }
        />
        <HubCard
          icon={<MapPin className="h-5 w-5" />}
          title="Delivery zones"
          href="/settings/delivery-zones"
          preview={
            <p>
              <span className="text-fg">{s.deliveryZones.length}</span>{' '}
              {s.deliveryZones.length === 1 ? 'zone' : 'zones'} configured.
            </p>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SettingsSectionCard
          id="financials"
          title="Financials"
          description="Tax and delivery defaults applied to every order."
        >
          <PercentField
            label="Tax rate"
            value={s.taxRate}
            onCommit={(taxRate) => commit({ taxRate })}
          />
          <MoneyField
            label={`Default delivery fee (${s.currency})`}
            value={s.defaultDeliveryFee}
            onCommit={(defaultDeliveryFee) => commit({ defaultDeliveryFee })}
          />
          <MoneyField
            label={`Minimum order (${s.currency})`}
            value={s.minOrderAmount}
            onCommit={(minOrderAmount) => commit({ minOrderAmount })}
          />
          <div className="flex items-center justify-between border-t border-border/[var(--border-alpha)] pt-3 text-small">
            <span className="text-fg-muted">Effective minimum</span>
            <span className="tabular-nums text-fg">
              {formatMoney(s.minOrderAmount, s.currency)}
            </span>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="reservations"
          title="Reservation policy"
          description="How long each booking holds a table and how reservations are spaced."
        >
          <label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-small text-fg">Slot length</span>
              <span className="block text-caption uppercase tracking-wider text-fg-subtle">
                How long a single seating holds the table
              </span>
            </div>
            <NumberStepper
              value={s.reservationSlotMinutes}
              min={15}
              max={360}
              step={15}
              suffix="min"
              ariaLabel="Reservation slot length in minutes"
              onChange={(reservationSlotMinutes) => commit({ reservationSlotMinutes })}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-small text-fg">Buffer time</span>
              <span className="block text-caption uppercase tracking-wider text-fg-subtle">
                Cleanup gap between sittings
              </span>
            </div>
            <NumberStepper
              value={s.reservationBufferMinutes}
              min={0}
              max={120}
              step={5}
              suffix="min"
              ariaLabel="Reservation buffer minutes"
              onChange={(reservationBufferMinutes) => commit({ reservationBufferMinutes })}
            />
          </label>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="locale"
          title="Locale"
          description="Timezone and currency formatting across the admin and customer surfaces."
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-fg-subtle" />
              <span className="text-small text-fg-muted">Timezone</span>
            </div>
            <code className="rounded-button bg-surface-2 px-2 py-1 text-small text-fg">
              {s.timezone}
            </code>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-fg-subtle" />
              <span className="text-small text-fg-muted">Currency</span>
            </div>
            <code className="rounded-button bg-surface-2 px-2 py-1 text-small text-fg">
              {s.currency}
            </code>
          </div>
          <p className="border-t border-border/[var(--border-alpha)] pt-3 text-small text-fg-muted">
            Edit timezone or currency in{' '}
            <Link className="text-accent hover:underline" href="/restaurant">
              Restaurant profile
            </Link>
            .
          </p>
        </SettingsSectionCard>
      </div>
    </div>
  );
}
