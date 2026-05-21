'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Debounce in ms. Default 200. */
  debounceMs?: number;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
  /** Global keyboard shortcut to focus the input — e.g. `/` for menu search. */
  shortcutKey?: string;
  /** ARIA label (defaults to "Search"). */
  ariaLabel?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SearchInputProps['size']>, string> = {
  sm: 'h-9 text-small',
  md: 'h-11 text-body',
  lg: 'h-12 text-body',
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 200,
  size = 'md',
  autoFocus,
  shortcutKey,
  ariaLabel = 'Search',
  className,
}: SearchInputProps) {
  const [local, setLocal] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync inbound prop changes.
  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce outbound.
  React.useEffect(() => {
    if (local === value) return;
    const t = window.setTimeout(() => onChange(local), debounceMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  // Optional global keyboard shortcut.
  React.useEffect(() => {
    if (!shortcutKey) return;
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const inField =
        active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (!inField && e.key === shortcutKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutKey]);

  // Initial autofocus.
  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className={cn(
        'relative flex items-center overflow-hidden rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 text-fg focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <Search
        aria-hidden
        size={18}
        strokeWidth={2}
        className="pointer-events-none mx-3 shrink-0 text-fg-subtle"
      />
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent pr-3 outline-none placeholder:text-fg-subtle"
      />
      {local && (
        <button
          type="button"
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          aria-label="Clear search"
          className="mr-2 grid h-7 w-7 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-warm/60 hover:text-fg"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
