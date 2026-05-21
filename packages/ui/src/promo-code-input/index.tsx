'use client';

import { Check, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface AppliedPromo {
  code: string;
  /** Display label like "15% off — first order" or "5,00 zł off". */
  label: string;
}

export type PromoApplyResult =
  | { ok: true; label?: string }
  | { ok: false; error: string };

export interface PromoCodeInputProps {
  applied: AppliedPromo | null;
  onApply: (code: string) => Promise<PromoApplyResult>;
  onRemove: () => void;
  /** Show as a "Have a code?" link until clicked. Default true. */
  collapsed?: boolean;
  className?: string;
}

export function PromoCodeInput({
  applied,
  onApply,
  onRemove,
  collapsed = true,
  className,
}: PromoCodeInputProps) {
  const [open, setOpen] = React.useState(!collapsed || !!applied);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  if (applied) {
    return (
      <div className={cn('flex items-center gap-2 rounded-input bg-accent/[0.10] px-3 py-2', className)}>
        <Check size={14} strokeWidth={2.6} className="text-accent" />
        <strong className="text-small text-fg">{applied.code}</strong>
        <span className="text-small text-fg-muted">· {applied.label}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove promo"
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
        className={cn('text-small text-accent hover:underline', className)}
      >
        Have a code?
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const res = await onApply(code.trim().toUpperCase());
    setLoading(false);
    if (!res.ok) setError(res.error);
    else setCode('');
  };

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <input
          aria-label="Promo code"
          placeholder="Enter code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          className="h-10 flex-1 rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="h-10 rounded-button bg-accent px-4 text-small font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? '…' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-[12px] text-negative">{error}</p>}
    </form>
  );
}
