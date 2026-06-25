'use client';

import { Check, Sparkles, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface AppliedLoyalty {
  points: number;
  /** Caller-formatted display label, e.g. "120 pts · −1,20 zł". */
  label: string;
}

export type LoyaltyApplyResult = { ok: true; label?: string } | { ok: false; error: string };

export interface LoyaltyRedeemInputProps {
  /** Max points redeemable on this order (min of balance and order cap). */
  maxPoints: number;
  applied: AppliedLoyalty | null;
  /** Validate + persist; resolves with an error message to show inline. */
  onApply: (points: number) => Promise<LoyaltyApplyResult>;
  onRemove: () => void;
  /** Show as a "Use points?" link until clicked. Default true. */
  collapsed?: boolean;
  className?: string;
  labels?: {
    /** Collapsed trigger. Defaults to "Use points?". */
    trigger?: React.ReactNode;
    /** Balance/help line above the input (caller interpolates the count). */
    balanceLabel?: React.ReactNode;
    placeholder?: string;
    apply?: React.ReactNode;
    applying?: React.ReactNode;
    useMax?: React.ReactNode;
    inputAriaLabel?: string;
    removeAriaLabel?: string;
    /** Shown when the entered amount is empty / out of range. */
    invalid?: string;
  };
}

/**
 * Loyalty-points redemption control — the server-backed sibling of
 * `PromoCodeInput`. The caller owns the i18n (balance + applied label) and the
 * apply logic (quote → persist on cart); this stays presentational.
 */
export function LoyaltyRedeemInput({
  maxPoints,
  applied,
  onApply,
  onRemove,
  collapsed = true,
  className,
  labels,
}: LoyaltyRedeemInputProps) {
  const {
    trigger = 'Use points?',
    balanceLabel,
    placeholder = 'Points',
    apply = 'Redeem',
    applying = '…',
    useMax = 'Use max',
    inputAriaLabel = 'Points to redeem',
    removeAriaLabel = 'Remove points',
    invalid = 'Enter a valid amount',
  } = labels ?? {};
  const [open, setOpen] = React.useState(!collapsed || !!applied);
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  if (applied) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-input bg-accent/[0.10] px-3 py-2',
          className,
        )}
      >
        <Check size={14} strokeWidth={2.6} className="text-accent" />
        <span className="text-small text-fg">{applied.label}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeAriaLabel}
          className="ml-auto grid h-5 w-5 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-warm/60 hover:text-fg"
        >
          <X size={11} strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 text-small text-accent hover:underline',
          className,
        )}
      >
        <Sparkles size={14} /> {trigger}
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const points = Math.floor(Number(value));
    if (!Number.isFinite(points) || points <= 0 || points > maxPoints) {
      setError(invalid);
      return;
    }
    setLoading(true);
    setError('');
    const res = await onApply(points);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else setValue('');
  };

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-1.5', className)}>
      {balanceLabel && <span className="text-[12px] text-fg-muted">{balanceLabel}</span>}
      <div className="flex items-center gap-2">
        <input
          aria-label={inputAriaLabel}
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^0-9]/g, ''));
            setError('');
          }}
          className="h-10 min-w-0 flex-1 rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        {maxPoints > 0 && (
          <button
            type="button"
            onClick={() => {
              setValue(String(maxPoints));
              setError('');
            }}
            className="h-10 shrink-0 rounded-button border border-border/[var(--border-strong-alpha)] px-3 text-small font-medium text-fg hover:bg-surface-warm/40"
          >
            {useMax}
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !value}
          className="h-10 shrink-0 rounded-button bg-accent px-4 text-small font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? applying : apply}
        </button>
      </div>
      {error && <p className="text-[12px] text-negative">{error}</p>}
    </form>
  );
}
