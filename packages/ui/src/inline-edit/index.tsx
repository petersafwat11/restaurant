'use client';

import { Pencil } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface InlineEditProps {
  value: string;
  onCommit: (next: string) => void | Promise<void>;
  placeholder?: string;
  /** Visual size — picks the matching admin text scale. */
  variant?: 'body' | 'h1' | 'h2';
  maxLength?: number;
  /** Return a string error to block commit. */
  validate?: (next: string) => string | null;
  multiline?: boolean;
  ariaLabel?: string;
  className?: string;
}

const VARIANT_CLS: Record<NonNullable<InlineEditProps['variant']>, string> = {
  body: 'text-sm',
  h1: 'text-h1-admin',
  h2: 'text-h2-admin',
};

/**
 * Click-to-edit text field. Used for category names, modifier names, and
 * customer notes. Enter commits, Esc cancels, blur commits. Surfaces a
 * validation error inline beneath the input.
 */
export function InlineEdit({
  value,
  onCommit,
  placeholder,
  variant = 'body',
  maxLength,
  validate,
  multiline,
  ariaLabel,
  className,
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  React.useEffect(() => setDraft(value), [value]);
  React.useEffect(() => {
    if (editing) {
      ref.current?.focus();
      if (ref.current && 'select' in ref.current) (ref.current as HTMLInputElement).select();
    }
  }, [editing]);

  async function commit() {
    const v = draft.trim();
    if (validate) {
      const err = validate(v);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    if (v !== value) await onCommit(v);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    const Tag = (multiline ? 'textarea' : 'input') as 'input' | 'textarea';
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Tag
          ref={ref as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={draft}
          aria-label={ariaLabel}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !multiline) {
              e.preventDefault();
              void commit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            'rounded-md border-hairline-strong bg-surface px-2 py-1 text-fg outline-none focus-visible:border-accent',
            error && 'border-negative',
            VARIANT_CLS[variant],
          )}
        />
        {error && <span className="text-xs text-negative">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      className={cn(
        'group inline-flex max-w-full items-center gap-1.5 rounded-md px-1 text-left transition-colors hover:bg-surface-2',
        !value && 'text-fg-subtle italic',
        VARIANT_CLS[variant],
        className,
      )}
    >
      <span className="truncate">{value || placeholder || 'Untitled'}</span>
      <Pencil
        size={12}
        className="opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden
      />
    </button>
  );
}
