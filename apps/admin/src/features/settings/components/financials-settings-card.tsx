'use client';

import { useUpdateRestaurantSettings } from '@/features/settings/hooks';
import type { RestaurantSettingsDto, UpdateRestaurantSettingsDto } from '@repo/types';
import { UpdateRestaurantSettingsSchema } from '@repo/types';
import { Button, SettingsSectionCard } from '@repo/ui';
import { formatMoney } from '@repo/utils';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface FinancialsDraft {
  taxRatePct: string;
  defaultDeliveryFee: string;
  minOrderAmount: string;
  deliveryRadiusKm: string;
}

function getDraftFromSettings(s: RestaurantSettingsDto): FinancialsDraft {
  const taxNum = Number(s.taxRate);
  const taxPct = Number.isNaN(taxNum) ? '' : String(Number((taxNum * 100).toFixed(4)));
  return {
    taxRatePct: taxPct,
    defaultDeliveryFee: s.defaultDeliveryFee,
    minOrderAmount: s.minOrderAmount,
    deliveryRadiusKm: String(s.deliveryRadiusKm),
  };
}

function normalizeTaxRateDecimal(taxRatePctStr: string): string {
  const n = Number(taxRatePctStr);
  if (Number.isNaN(n)) return '';
  const decimal = n / 100;
  return String(Number(decimal.toFixed(4)));
}

function normalizeMoneyString(str: string): string {
  const n = Number(str);
  if (Number.isNaN(n)) return '';
  return n.toFixed(2);
}

export function FinancialsSettingsCard({ settings }: { settings: RestaurantSettingsDto }) {
  const t = useTranslations('admin.settings.general');
  const update = useUpdateRestaurantSettings();

  const [baseline, setBaseline] = React.useState<RestaurantSettingsDto>(settings);
  const [draft, setDraft] = React.useState<FinancialsDraft>(() => getDraftFromSettings(settings));

  // Sync baseline if external server data updates when clean
  React.useEffect(() => {
    setBaseline(settings);
  }, [settings]);

  const normTax = normalizeTaxRateDecimal(draft.taxRatePct);
  const normFee = normalizeMoneyString(draft.defaultDeliveryFee);
  const normMinOrder = normalizeMoneyString(draft.minOrderAmount);
  const normRadius = Number(draft.deliveryRadiusKm);

  const normBaselineTax = normalizeTaxRateDecimal(String(Number(baseline.taxRate) * 100));
  const normBaselineFee = normalizeMoneyString(baseline.defaultDeliveryFee);
  const normBaselineMinOrder = normalizeMoneyString(baseline.minOrderAmount);
  const normBaselineRadius = Number(baseline.deliveryRadiusKm);

  const payload: UpdateRestaurantSettingsDto = {
    taxRate: normTax || undefined,
    defaultDeliveryFee: normFee || undefined,
    minOrderAmount: normMinOrder || undefined,
    deliveryRadiusKm: Number.isNaN(normRadius) ? undefined : normRadius,
  };

  const validationResult = UpdateRestaurantSettingsSchema.safeParse(payload);

  // Field validation errors
  const taxPctNum = Number(draft.taxRatePct);
  const isTaxInvalid =
    draft.taxRatePct === '' ||
    Number.isNaN(taxPctNum) ||
    taxPctNum < 0 ||
    taxPctNum > 100 ||
    (!validationResult.success && validationResult.error.format().taxRate !== undefined);

  const isFeeInvalid =
    draft.defaultDeliveryFee === '' ||
    Number.isNaN(Number(draft.defaultDeliveryFee)) ||
    Number(draft.defaultDeliveryFee) < 0 ||
    (!validationResult.success && validationResult.error.format().defaultDeliveryFee !== undefined);

  const isMinOrderInvalid =
    draft.minOrderAmount === '' ||
    Number.isNaN(Number(draft.minOrderAmount)) ||
    Number(draft.minOrderAmount) < 0 ||
    (!validationResult.success && validationResult.error.format().minOrderAmount !== undefined);

  const isRadiusInvalid =
    draft.deliveryRadiusKm === '' ||
    Number.isNaN(normRadius) ||
    normRadius <= 0 ||
    normRadius > 100 ||
    (!validationResult.success && validationResult.error.format().deliveryRadiusKm !== undefined);

  const hasErrors = isTaxInvalid || isFeeInvalid || isMinOrderInvalid || isRadiusInvalid;

  // Compare normalized draft against normalized baseline
  const isTaxDirty = normTax !== normBaselineTax;
  const isFeeDirty = normFee !== normBaselineFee;
  const isMinOrderDirty = normMinOrder !== normBaselineMinOrder;
  const isRadiusDirty = normRadius !== normBaselineRadius;

  const isDirty = isTaxDirty || isFeeDirty || isMinOrderDirty || isRadiusDirty;

  function handleSave() {
    if (!isDirty || hasErrors || update.isPending) return;

    update.mutate(payload, {
      onSuccess: (updated) => {
        setBaseline(updated);
        setDraft(getDraftFromSettings(updated));
      },
    });
  }

  function handleDiscard() {
    if (update.isPending) return;
    setDraft(getDraftFromSettings(baseline));
  }

  return (
    <SettingsSectionCard
      id="financials"
      title={t('financials.title')}
      description={t('financials.description')}
    >
      <div className="space-y-4">
        {/* Tax Rate (%) */}
        <div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-small text-fg-muted">{t('financials.taxRate')}</span>
            <div className="inline-flex h-9 items-center overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)] focus-within:border-accent">
              <input
                type="text"
                inputMode="decimal"
                value={draft.taxRatePct}
                onChange={(e) => setDraft((d) => ({ ...d, taxRatePct: e.target.value }))}
                className="w-24 bg-transparent px-3 text-right text-small tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="pr-2 text-small text-fg-muted">%</span>
            </div>
          </label>
          {isTaxInvalid && (
            <p className="mt-1 text-right text-caption text-negative">{t('errors.taxRate')}</p>
          )}
        </div>

        {/* Default Delivery Fee ($) */}
        <div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-small text-fg-muted">
              {t('financials.defaultDeliveryFee', { currency: baseline.currency })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={draft.defaultDeliveryFee}
              onChange={(e) => setDraft((d) => ({ ...d, defaultDeliveryFee: e.target.value }))}
              className="h-9 w-32 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-right text-small tabular-nums text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
          {isFeeInvalid && (
            <p className="mt-1 text-right text-caption text-negative">{t('errors.deliveryFee')}</p>
          )}
        </div>

        {/* Minimum Order Amount ($) */}
        <div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-small text-fg-muted">
              {t('financials.minOrder', { currency: baseline.currency })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={draft.minOrderAmount}
              onChange={(e) => setDraft((d) => ({ ...d, minOrderAmount: e.target.value }))}
              className="h-9 w-32 rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-right text-small tabular-nums text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
          {isMinOrderInvalid && (
            <p className="mt-1 text-right text-caption text-negative">{t('errors.minOrder')}</p>
          )}
        </div>

        {/* Delivery Radius (km) */}
        <div>
          <label className="flex items-center justify-between gap-4">
            <span className="text-small text-fg-muted">{t('financials.deliveryRadius')}</span>
            <div className="inline-flex h-9 items-center overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)] focus-within:border-accent">
              <input
                type="text"
                inputMode="decimal"
                value={draft.deliveryRadiusKm}
                onChange={(e) => setDraft((d) => ({ ...d, deliveryRadiusKm: e.target.value }))}
                className="w-20 bg-transparent px-3 text-right text-small tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="pr-2 text-small text-fg-muted">km</span>
            </div>
          </label>
          {isRadiusInvalid && (
            <p className="mt-1 text-right text-caption text-negative">{t('errors.radius')}</p>
          )}
        </div>

        {/* Effective Minimum Display */}
        <div className="flex items-center justify-between border-t border-border/[var(--border-alpha)] pt-3 text-small">
          <span className="text-fg-muted">{t('financials.effectiveMinimum')}</span>
          <span className="tabular-nums text-fg">
            {formatMoney(
              isMinOrderInvalid ? baseline.minOrderAmount : normMinOrder,
              baseline.currency,
            )}
          </span>
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
