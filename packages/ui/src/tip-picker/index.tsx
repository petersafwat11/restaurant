'use client';

import * as React from 'react';
import { formatMoney } from '@repo/utils';
import { cn } from '../lib/cn';

export interface TipPickerProps {
  /** MoneyString — the base used for percent calculations. */
  subtotal: string;
  /** MoneyString — the current tip amount. */
  value: string;
  onChange: (next: string) => void;
  /** Percentage presets — first is rendered as "No tip". */
  presets?: number[];
  allowCustom?: boolean;
  currency: string;
  className?: string;
  /** Localizable labels. */
  labels?: {
    /** Label for the 0% preset. Defaults to "No tip". */
    noTip?: React.ReactNode;
    /** Label for the custom-amount preset. Defaults to "Other". */
    other?: React.ReactNode;
    /** Disclaimer text below the picker. Defaults to "100% of tips go to the team.". */
    disclaimer?: React.ReactNode;
    /** Aria-label for the radio group. Defaults to "Tip". */
    groupLabel?: string;
  };
}

function pctToAmount(subtotal: string, pct: number): string {
  return ((parseFloat(subtotal) * pct) / 100).toFixed(2);
}

export function TipPicker({
  subtotal,
  value,
  onChange,
  presets = [0, 5, 10, 15],
  allowCustom = true,
  currency,
  className,
  labels,
}: TipPickerProps) {
  const {
    noTip = 'No tip',
    other = 'Other',
    disclaimer = '100% of tips go to the team.',
    groupLabel = 'Tip',
  } = labels ?? {};
  const [showCustom, setShowCustom] = React.useState(false);
  const [custom, setCustom] = React.useState('');

  const isPresetActive = (p: number) => {
    if (showCustom) return false;
    const amt = pctToAmount(subtotal, p);
    return Math.abs(parseFloat(amt) - parseFloat(value || '0')) < 0.01;
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div role="radiogroup" aria-label={groupLabel} className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = isPresetActive(p);
          const amt = pctToAmount(subtotal, p);
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setShowCustom(false);
                setCustom('');
                onChange(amt);
              }}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-small font-medium transition-colors',
                active
                  ? 'border-accent bg-accent text-text-on-accent'
                  : 'border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg hover:border-accent/40',
              )}
            >
              <span>{p === 0 ? noTip : `${p}%`}</span>
              {p > 0 && (
                <span className="text-[12px] opacity-70 tabular-nums">
                  {formatMoney(amt, currency)}
                </span>
              )}
            </button>
          );
        })}
        {allowCustom && (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={cn(
              'inline-flex h-10 items-center rounded-full border px-4 text-small font-medium transition-colors',
              showCustom
                ? 'border-accent bg-accent text-text-on-accent'
                : 'border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg hover:border-accent/40',
            )}
          >
            {other}
          </button>
        )}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            placeholder="0,00"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              const n = parseFloat(e.target.value.replace(',', '.'));
              onChange(Number.isFinite(n) ? Math.min(100, Math.max(0, n)).toFixed(2) : '0');
            }}
            autoFocus
            className="h-10 w-32 rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <span className="text-small text-fg-muted">
            {currency === 'PLN' ? 'zł' : currency}
          </span>
        </div>
      )}
      <p className="text-[12px] text-fg-subtle">{disclaimer}</p>
    </div>
  );
}
