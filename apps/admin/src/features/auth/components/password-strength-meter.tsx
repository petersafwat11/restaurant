'use client';

import { cn } from '@repo/ui';
import * as React from 'react';

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; checks: PasswordChecks } {
  const checks: PasswordChecks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length as 0 | 1 | 2 | 3 | 4;
  return { score, checks };
}

interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
}

const LABELS = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'] as const;
const SEGMENT_COLORS = [
  'bg-negative',
  'bg-negative',
  'bg-warning',
  'bg-accent',
  'bg-positive',
] as const;

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, checks } = React.useMemo(() => scorePassword(value), [value]);
  const tone = SEGMENT_COLORS[score];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score ? tone : 'bg-border/[var(--border-strong-alpha)]',
            )}
          />
        ))}
      </div>
      {value && (
        <div className="flex items-center justify-between text-[11px] text-fg-subtle">
          <span>{LABELS[score]}</span>
          <span className="flex gap-2">
            <Hint ok={checks.length}>8+</Hint>
            <Hint ok={checks.upper}>A-Z</Hint>
            <Hint ok={checks.lower}>a-z</Hint>
            <Hint ok={checks.digit}>0-9</Hint>
          </span>
        </div>
      )}
    </div>
  );
}

function Hint({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={ok ? 'text-positive' : 'text-fg-subtle'}>{children}</span>;
}
