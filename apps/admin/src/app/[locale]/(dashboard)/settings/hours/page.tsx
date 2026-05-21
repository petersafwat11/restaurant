'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { Link } from '@/i18n/navigation';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type {
  OperatingHoursDto,
  OperatingHoursInputDto,
  UpdateOperatingHoursDto,
} from '@repo/types';
import { EmptyState, SettingsSectionCard, Spinner } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const hoursKey = ['restaurant', 'hours'] as const;

interface Row {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

function defaultsByDay(): Row[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: '11:00',
    closesAt: '22:00',
    isClosed: dayOfWeek === 0,
  }));
}

function hoursToRows(hours: OperatingHoursDto[]): Row[] {
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const defaults = defaultsByDay();
  return Array.from<unknown, Row>({ length: 7 }, (_, dayOfWeek) => {
    const h = byDay.get(dayOfWeek);
    if (h) {
      return {
        dayOfWeek,
        opensAt: h.opensAt,
        closesAt: h.closesAt,
        isClosed: h.isClosed,
      };
    }
    return defaults[dayOfWeek] as Row;
  });
}

function rowsEqual(a: Row[], b: Row[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => {
    const o = b[i];
    if (!o) return false;
    return (
      o.dayOfWeek === r.dayOfWeek &&
      o.opensAt === r.opensAt &&
      o.closesAt === r.closesAt &&
      o.isClosed === r.isClosed
    );
  });
}

function validate(rows: Row[]): Record<number, 'invalidTime' | 'closeAfterOpen'> {
  const errors: Record<number, 'invalidTime' | 'closeAfterOpen'> = {};
  for (const r of rows) {
    if (r.isClosed) continue;
    if (!/^\d{2}:\d{2}$/.test(r.opensAt) || !/^\d{2}:\d{2}$/.test(r.closesAt)) {
      errors[r.dayOfWeek] = 'invalidTime';
      continue;
    }
    if (r.opensAt >= r.closesAt) {
      errors[r.dayOfWeek] = 'closeAfterOpen';
    }
  }
  return errors;
}

export default function AdminHoursPage() {
  const t = useTranslations('admin.settings.hours');
  const tCommon = useTranslations('common');
  usePageHeader({ title: t('title') });
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, error } = useQuery<OperatingHoursDto[]>({
    queryKey: hoursKey,
    queryFn: () => getApiClient().restaurant.getHours(),
  });

  const save = useMutation({
    mutationFn: (input: UpdateOperatingHoursDto) => getApiClient().restaurant.updateHours(input),
    onSuccess: (next) => {
      qc.setQueryData(hoursKey, next);
      notify('success', t('toasts.saved'));
    },
    onError: (err) => notify('error', (err as Error).message),
  });

  const initial = React.useMemo<Row[]>(() => (data ? hoursToRows(data) : defaultsByDay()), [data]);
  const [draft, setDraft] = React.useState<Row[]>(initial);
  React.useEffect(() => setDraft(initial), [initial]);

  const errors = validate(draft);
  const dirty = !rowsEqual(initial, draft);
  const hasErrors = Object.keys(errors).length > 0;

  function patchDay(dayOfWeek: number, patch: Partial<Row>) {
    setDraft((prev) => prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)));
  }

  function submit() {
    if (hasErrors) return;
    const payload: UpdateOperatingHoursDto = {
      hours: draft.map<OperatingHoursInputDto>((r) => ({
        dayOfWeek: r.dayOfWeek,
        opensAt: r.opensAt,
        closesAt: r.closesAt,
        isClosed: r.isClosed,
      })),
    };
    save.mutate(payload);
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex h-8 items-center gap-1 rounded-button text-small text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToSettings')}
        </Link>
      </div>

      <SettingsSectionCard id="hours" title={t('card.title')} description={t('card.description')}>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <EmptyState
            title={t('error.title')}
            description={(error as Error)?.message ?? t('error.fallback')}
            action={{ label: t('error.retry'), onClick: () => refetch() }}
          />
        ) : (
          <fieldset className="space-y-2">
            <legend className="sr-only">{t('card.title')}</legend>
            {draft.map((r) => {
              const dayKey = DAY_KEYS[r.dayOfWeek] as (typeof DAY_KEYS)[number];
              const dayLong = tCommon(`days.${dayKey}`);
              const dayShort = tCommon(`daysShort.${dayKey}`);
              const errCode = errors[r.dayOfWeek];
              return (
                <div
                  key={r.dayOfWeek}
                  className="flex flex-col gap-3 rounded-button border border-border/[var(--border-alpha)] bg-surface-2/30 p-3 sm:flex-row sm:items-center"
                >
                  <div className="w-28 shrink-0">
                    <div className="text-small font-semibold text-fg">{dayLong}</div>
                    <div className="text-caption uppercase tracking-wider text-fg-subtle">
                      {dayShort}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-small text-fg-muted">
                    <input
                      type="checkbox"
                      checked={!r.isClosed}
                      onChange={(e) => patchDay(r.dayOfWeek, { isClosed: !e.target.checked })}
                      className="h-4 w-4 rounded border-border/[var(--border-strong-alpha)] bg-transparent text-accent focus:ring-accent"
                    />
                    {t('open')}
                  </label>
                  <div
                    className={`flex flex-1 items-center gap-2 ${r.isClosed ? 'opacity-40' : ''}`}
                  >
                    <input
                      type="time"
                      value={r.opensAt}
                      disabled={r.isClosed}
                      onChange={(e) => patchDay(r.dayOfWeek, { opensAt: e.target.value })}
                      aria-label={t('openTimeAria', { day: dayLong })}
                      className="h-9 w-28 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-2 text-small tabular-nums text-fg outline-none focus:border-accent"
                    />
                    <span className="text-fg-subtle">–</span>
                    <input
                      type="time"
                      value={r.closesAt}
                      disabled={r.isClosed}
                      onChange={(e) => patchDay(r.dayOfWeek, { closesAt: e.target.value })}
                      aria-label={t('closeTimeAria', { day: dayLong })}
                      className="h-9 w-28 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-2 text-small tabular-nums text-fg outline-none focus:border-accent"
                    />
                    {r.isClosed && (
                      <span className="text-small text-fg-tertiary">{t('closed')}</span>
                    )}
                    {errCode && !r.isClosed && (
                      <span className="text-small text-negative">{t(`errors.${errCode}`)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </fieldset>
        )}
      </SettingsSectionCard>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/[var(--border-alpha)] bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-page-max items-center justify-between gap-4 px-6 py-3">
            <p className="text-small text-fg-muted">{t('unsaved.message')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(initial)}
                className="h-9 rounded-button px-3 text-small text-fg-muted hover:text-fg"
              >
                {t('unsaved.discard')}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={hasErrors || save.isPending}
                className="h-9 rounded-button bg-accent px-4 text-small font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
              >
                {save.isPending ? t('unsaved.saving') : t('unsaved.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
