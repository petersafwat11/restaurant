'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface FormFieldProps {
  id?: string;
  label: React.ReactNode;
  required?: boolean;
  helper?: React.ReactNode;
  /** When truthy, replaces helper with the error message and adds error styles. */
  error?: React.ReactNode;
  /** Right-aligned hint shown next to the label (e.g. "1–80 chars"). */
  hint?: React.ReactNode;
  layout?: 'stacked' | 'inline';
  /** Visual size — affects label/input/helper density. Customer site uses lg; admin defaults md. */
  size?: 'sm' | 'md' | 'lg';
  /** Left-side adornment inside the input wrapper (e.g. "+48" prefix). */
  prefix?: React.ReactNode;
  /** Right-side adornment inside the input wrapper (e.g. spinner, clear button, brand icon). */
  suffix?: React.ReactNode;
  className?: string;
  /** Must be exactly one element — gets `id` and `aria-describedby` injected. */
  children: React.ReactElement;
}

const SIZE_LABEL = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-body',
} as const;

/**
 * Standard form field wrapper. Injects `id` and `aria-describedby` into the
 * single child input/select/textarea so screen readers and react-hook-form
 * play nicely. For inline layout (label on the left), pass `layout='inline'`.
 *
 * Web port additions (Phase 1.3, additive — admin keeps current behavior):
 *  - `size` shrinks/grows the label text.
 *  - `prefix`/`suffix` wrap the child in a border ring with adornment slots.
 *    When both are absent, the field renders the bare child (admin path —
 *    child supplies its own border via shadcn `Input`).
 */
export function FormField({
  id,
  label,
  required,
  helper,
  error,
  hint,
  layout = 'stacked',
  size = 'md',
  prefix,
  suffix,
  className,
  children,
}: FormFieldProps) {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const helperId = `${fieldId}-helper`;

  const child = React.Children.only(children);
  const childProps = (child.props ?? {}) as Record<string, unknown>;

  const enhanced = React.cloneElement(child, {
    id: (childProps.id as string | undefined) ?? fieldId,
    'aria-describedby':
      helper || error ? helperId : (childProps['aria-describedby'] as string | undefined),
    'aria-invalid': error ? true : (childProps['aria-invalid'] as boolean | undefined),
  } as Record<string, unknown>);

  const hasAdornment = Boolean(prefix || suffix);

  return (
    <div
      className={cn(
        layout === 'inline'
          ? 'grid grid-cols-[10rem_1fr] items-start gap-3'
          : 'flex flex-col gap-1.5',
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={fieldId} className={cn('font-medium text-fg', SIZE_LABEL[size])}>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-negative">
              *
            </span>
          )}
        </label>
        {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      </div>
      {hasAdornment ? (
        <div
          className={cn(
            'flex items-stretch overflow-hidden rounded-input border bg-surface-2 text-fg transition-colors',
            error
              ? 'border-negative focus-within:ring-2 focus-within:ring-negative/30'
              : 'border-border/[var(--border-strong-alpha)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30',
          )}
        >
          {prefix && (
            <span className="grid shrink-0 place-items-center border-r border-border/[var(--border-alpha)] bg-surface px-3 text-small text-fg-muted">
              {prefix}
            </span>
          )}
          <div className="flex-1 [&_input]:w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-body [&_input]:outline-none [&_input]:focus:ring-0 [&_textarea]:w-full [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:p-3 [&_textarea]:text-body [&_textarea]:outline-none [&_textarea]:focus:ring-0">
            {enhanced}
          </div>
          {suffix && (
            <span className="grid shrink-0 place-items-center px-3 text-small text-fg-subtle">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <div>{enhanced}</div>
      )}
      {(error || helper) && (
        <div
          id={helperId}
          className={cn(
            'text-xs',
            error ? 'text-negative' : 'text-fg-subtle',
            layout === 'inline' && 'col-start-2',
          )}
        >
          {error || helper}
        </div>
      )}
    </div>
  );
}
