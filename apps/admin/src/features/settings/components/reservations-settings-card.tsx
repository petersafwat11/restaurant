'use client';

import { useUpdateRestaurantSettings } from '@/features/settings/hooks';
import type { RestaurantSettingsDto, UpdateRestaurantSettingsDto } from '@repo/types';
import { UpdateRestaurantSettingsSchema } from '@repo/types';
import { Button, SettingsSectionCard } from '@repo/ui';
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

export function ReservationsSettingsCard({ settings }: { settings: RestaurantSettingsDto }) {
  const t = useTranslations('admin.settings.general');
  const update = useUpdateRestaurantSettings();

  const [baseline, setBaseline] = React.useState<RestaurantSettingsDto>(settings);
  const [draft, setDraft] = React.useState({
    reservationSlotMinutes: settings.reservationSlotMinutes,
    reservationBufferMinutes: settings.reservationBufferMinutes,
  });

  React.useEffect(() => {
    setBaseline(settings);
  }, [settings]);

  const payload: UpdateRestaurantSettingsDto = {
    reservationSlotMinutes: draft.reservationSlotMinutes,
    reservationBufferMinutes: draft.reservationBufferMinutes,
  };

  const validationResult = UpdateRestaurantSettingsSchema.safeParse(payload);

  const isSlotInvalid =
    draft.reservationSlotMinutes < 15 ||
    draft.reservationSlotMinutes > 360 ||
    (!validationResult.success &&
      validationResult.error.format().reservationSlotMinutes !== undefined);

  const isBufferInvalid =
    draft.reservationBufferMinutes < 0 ||
    draft.reservationBufferMinutes > 120 ||
    (!validationResult.success &&
      validationResult.error.format().reservationBufferMinutes !== undefined);

  const hasErrors = isSlotInvalid || isBufferInvalid;

  const isSlotDirty = draft.reservationSlotMinutes !== baseline.reservationSlotMinutes;
  const isBufferDirty = draft.reservationBufferMinutes !== baseline.reservationBufferMinutes;
  const isDirty = isSlotDirty || isBufferDirty;

  function handleSave() {
    if (!isDirty || hasErrors || update.isPending) return;

    update.mutate(payload, {
      onSuccess: (updated) => {
        setBaseline(updated);
        setDraft({
          reservationSlotMinutes: updated.reservationSlotMinutes,
          reservationBufferMinutes: updated.reservationBufferMinutes,
        });
      },
    });
  }

  function handleDiscard() {
    if (update.isPending) return;
    setDraft({
      reservationSlotMinutes: baseline.reservationSlotMinutes,
      reservationBufferMinutes: baseline.reservationBufferMinutes,
    });
  }

  const slotLengthAria = t('reservations.slotLengthAria');
  const bufferAria = t('reservations.bufferAria');

  return (
    <SettingsSectionCard
      id="reservations"
      title={t('reservations.title')}
      description={t('reservations.description')}
    >
      <div className="space-y-4">
        {/* Slot Length */}
        <div>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: NumberStepper renders its own input */}
          <label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-small text-fg">{t('reservations.slotLength')}</span>
              <span className="block text-caption uppercase tracking-wider text-fg-subtle">
                {t('reservations.slotLengthHelp')}
              </span>
            </div>
            <NumberStepper
              value={draft.reservationSlotMinutes}
              min={15}
              max={360}
              step={15}
              suffix={t('reservations.minSuffix')}
              ariaLabel={slotLengthAria}
              increaseLabel={t('reservations.increase', { field: slotLengthAria })}
              decreaseLabel={t('reservations.decrease', { field: slotLengthAria })}
              onChange={(reservationSlotMinutes) =>
                setDraft((d) => ({ ...d, reservationSlotMinutes }))
              }
            />
          </label>
          {isSlotInvalid && (
            <p className="mt-1 text-right text-caption text-negative">{t('errors.slotLength')}</p>
          )}
        </div>

        {/* Buffer Time */}
        <div>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: NumberStepper renders its own input */}
          <label className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-small text-fg">{t('reservations.buffer')}</span>
              <span className="block text-caption uppercase tracking-wider text-fg-subtle">
                {t('reservations.bufferHelp')}
              </span>
            </div>
            <NumberStepper
              value={draft.reservationBufferMinutes}
              min={0}
              max={120}
              step={5}
              suffix={t('reservations.minSuffix')}
              ariaLabel={bufferAria}
              increaseLabel={t('reservations.increase', { field: bufferAria })}
              decreaseLabel={t('reservations.decrease', { field: bufferAria })}
              onChange={(reservationBufferMinutes) =>
                setDraft((d) => ({ ...d, reservationBufferMinutes }))
              }
            />
          </label>
          {isBufferInvalid && (
            <p className="mt-1 text-right text-caption text-negative">{t('errors.buffer')}</p>
          )}
        </div>

        {/* Footer Save / Discard Controls */}
        <div className="flex items-center justify-end gap-2 border-t border-border/[var(--border-alpha)] pt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDiscard}
            disabled={!isDirty || update.isPending}
          >
            {t('actions.discard')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || hasErrors || update.isPending}
          >
            {update.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
