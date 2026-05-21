'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import * as React from 'react';
import { useTransition } from 'react';

type LocaleCode = (typeof routing.locales)[number];

const PILLS: Array<{ label: string; code: LocaleCode }> = [
  { label: 'PL', code: 'pl' },
  { label: 'EN', code: 'en' },
];

interface LanguageSwitcherProps {
  className?: string;
}

/**
 * Compact PL|EN pill toggle. Switches the URL locale via next-intl's
 * navigation helpers — the `NEXT_LOCALE` cookie is updated by the middleware
 * on the resulting request so the preference persists across pages.
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale() as LocaleCode;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: LocaleCode) {
    if (next === locale || isPending) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> would force default form styling on a pill switch
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full border border-border/[var(--border-strong-alpha)] bg-surface/60 p-0.5 text-xs ${className ?? ''}`}
    >
      {PILLS.map(({ label, code }) => {
        const isActive = locale === code;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={isActive}
            onClick={() => switchTo(code)}
            disabled={isPending}
            className={`inline-flex h-6 items-center justify-center rounded-full px-2.5 font-medium tracking-wide transition-colors duration-web-color disabled:opacity-60 ${
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
