'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { useAddHoliday, useRemoveHoliday, useRestaurantSettings } from '@/features/settings/hooks';
import type { HolidayDto } from '@repo/types';
import { ActionModal, EmptyState, RelativeTime, SettingsSectionCard, Spinner } from '@repo/ui';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextMonthIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const ms = new Date(`${iso}T00:00:00`).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

interface AddForm {
  date: string;
  label: string;
  mode: 'closed' | 'modified';
  openOverride: string;
  closeOverride: string;
}

const EMPTY_FORM: AddForm = {
  date: nextMonthIso(),
  label: '',
  mode: 'closed',
  openOverride: '12:00',
  closeOverride: '18:00',
};

export default function AdminHolidaysPage() {
  usePageHeader({ title: 'Holidays' });
  const { data, isLoading, isError, error, refetch } = useRestaurantSettings();
  const add = useAddHoliday();
  const remove = useRemoveHoliday();

  const [form, setForm] = React.useState<AddForm>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = React.useState<HolidayDto | null>(null);

  const holidays = data?.holidayDates ?? [];
  const today = todayIso();
  const upcoming = holidays
    .filter((h) => h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = holidays.filter((h) => h.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const dateAlreadyUsed = holidays.some((h) => h.date === form.date);
  const labelValid = form.label.trim().length >= 1 && form.label.trim().length <= 120;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(form.date);
  const overridesValid =
    form.mode === 'closed' ||
    (form.openOverride < form.closeOverride &&
      /^\d{2}:\d{2}$/.test(form.openOverride) &&
      /^\d{2}:\d{2}$/.test(form.closeOverride));
  const canSubmit = dateValid && labelValid && overridesValid && !dateAlreadyUsed && !add.isPending;

  function submit() {
    if (!canSubmit) return;
    const payload: HolidayDto = {
      date: form.date,
      label: form.label.trim(),
      isClosed: form.mode === 'closed',
      openOverride: form.mode === 'modified' ? form.openOverride : null,
      closeOverride: form.mode === 'modified' ? form.closeOverride : null,
    };
    add.mutate(payload, {
      onSuccess: () => setForm(EMPTY_FORM),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex h-8 items-center gap-1 text-small text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
      </div>

      <SettingsSectionCard
        id="add-holiday"
        title="Add a holiday"
        description="Close a specific day or override its hours."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-caption uppercase tracking-wider text-fg-subtle">
              Date
            </span>
            <input
              type="date"
              value={form.date}
              min={todayIso()}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="h-9 w-full rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-small tabular-nums text-fg outline-none focus:border-accent"
            />
            {dateAlreadyUsed && (
              <span className="mt-1 block text-small text-negative">
                A holiday already exists for that date
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-caption uppercase tracking-wider text-fg-subtle">
              Label
            </span>
            <input
              type="text"
              value={form.label}
              maxLength={120}
              placeholder="Christmas Day"
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="h-9 w-full rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-small text-fg outline-none focus:border-accent"
            />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-caption uppercase tracking-wider text-fg-subtle">
            Mode
          </legend>
          <label className="flex items-center gap-2 text-small">
            <input
              type="radio"
              name="mode"
              checked={form.mode === 'closed'}
              onChange={() => setForm((f) => ({ ...f, mode: 'closed' }))}
              className="h-4 w-4 border-border/[var(--border-strong-alpha)] bg-transparent text-accent focus:ring-accent"
            />
            <span className="text-fg">Closed all day</span>
          </label>
          <label className="flex items-center gap-2 text-small">
            <input
              type="radio"
              name="mode"
              checked={form.mode === 'modified'}
              onChange={() => setForm((f) => ({ ...f, mode: 'modified' }))}
              className="h-4 w-4 border-border/[var(--border-strong-alpha)] bg-transparent text-accent focus:ring-accent"
            />
            <span className="text-fg">Modified hours</span>
          </label>
          {form.mode === 'modified' && (
            <div className="ml-6 flex items-center gap-2 pt-1">
              <input
                type="time"
                value={form.openOverride}
                onChange={(e) => setForm((f) => ({ ...f, openOverride: e.target.value }))}
                aria-label="Open override"
                className="h-9 w-28 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-2 text-small tabular-nums text-fg outline-none focus:border-accent"
              />
              <span className="text-fg-subtle">–</span>
              <input
                type="time"
                value={form.closeOverride}
                onChange={(e) => setForm((f) => ({ ...f, closeOverride: e.target.value }))}
                aria-label="Close override"
                className="h-9 w-28 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-2 text-small tabular-nums text-fg outline-none focus:border-accent"
              />
            </div>
          )}
        </fieldset>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center gap-2 rounded-button bg-accent px-4 text-small font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {add.isPending ? 'Adding…' : 'Add holiday'}
          </button>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        id="upcoming"
        title="Upcoming holidays"
        description={`${upcoming.length} upcoming.`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn't load holidays"
            description={(error as Error)?.message}
            action={{ label: 'Retry', onClick: () => refetch() }}
          />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming holidays"
            description="Add one above to override a specific date."
            size="sm"
          />
        ) : (
          <ul className="divide-y divide-border/[var(--border-alpha)]">
            {upcoming.map((h) => {
              const days = daysUntil(h.date);
              const soon = days <= 14;
              return (
                <li
                  key={h.date}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className={`min-w-[160px] text-small font-semibold ${
                      soon ? 'text-accent' : 'text-fg'
                    }`}
                  >
                    {fmtDate(h.date)}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-small text-fg">{h.label}</div>
                  <div className="text-small text-fg-muted">
                    {h.isClosed ? 'Closed' : `${h.openOverride}–${h.closeOverride}`}
                  </div>
                  <div className="w-24 text-right text-small text-fg-muted">
                    in {days} {days === 1 ? 'day' : 'days'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(h)}
                    aria-label={`Remove ${h.label}`}
                    className="grid h-8 w-8 place-items-center rounded-button text-fg-subtle hover:bg-negative/10 hover:text-negative"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSectionCard>

      {past.length > 0 && (
        <details className="rounded-card border border-border/[var(--border-alpha)] bg-surface">
          <summary className="cursor-pointer select-none px-6 py-4 text-small font-medium text-fg-muted hover:text-fg">
            Past holidays ({past.length})
          </summary>
          <ul className="divide-y divide-border/[var(--border-alpha)] px-6 pb-4">
            {past.slice(0, 24).map((h) => (
              <li key={h.date} className="flex items-center gap-3 py-2 text-small text-fg-muted">
                <span className="min-w-[140px]">{fmtDate(h.date)}</span>
                <span className="flex-1 truncate text-fg">{h.label}</span>
                <RelativeTime value={`${h.date}T00:00:00Z`} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <ActionModal
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove holiday"
        description={
          pendingDelete ? `Remove "${pendingDelete.label}" on ${fmtDate(pendingDelete.date)}?` : ''
        }
        variant="destructive"
        primary={{
          label: 'Remove',
          loading: remove.isPending,
          onClick: () => {
            if (pendingDelete) {
              remove.mutate(pendingDelete.date, {
                onSuccess: () => setPendingDelete(null),
              });
            }
          },
        }}
        secondary={{
          label: 'Cancel',
          onClick: () => setPendingDelete(null),
        }}
      />
    </div>
  );
}
