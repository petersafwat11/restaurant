'use client';

import type { LocaleCode } from '@repo/types';

interface LanguageSwitcherProps {
  value: LocaleCode;
  onChange: (next: LocaleCode) => void;
  className?: string;
}

const PILLS: Array<{ label: string; code: LocaleCode }> = [
  { label: 'PL', code: 'pl' },
  { label: 'EN', code: 'en' },
];

/**
 * Compact PL|EN pill toggle. Emits the real `LocaleCode` value so the parent
 * can persist it to the locale cookie and refresh translations. Polish copy
 * lives in `@repo/i18n/locales/pl.json`; missing keys fall back to en at
 * translate-time.
 */
export function LanguageSwitcher({ value, onChange, className }: LanguageSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full border border-border/[var(--border-strong-alpha)] bg-surface/60 p-0.5 text-xs ${className ?? ''}`}
    >
      {PILLS.map(({ label, code }) => {
        const isActive = value === code;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(code)}
            className={`inline-flex h-6 items-center justify-center rounded-full px-2.5 font-medium tracking-wide transition-colors duration-web-color ${
              isActive ? 'bg-fg text-surface' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
