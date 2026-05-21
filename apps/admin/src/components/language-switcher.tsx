'use client';

import { useLocale } from 'next-intl';
import * as React from 'react';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type LocaleCode = (typeof routing.locales)[number];

const PILLS: Array<{ label: string; code: LocaleCode }> = [
  { label: 'PL', code: 'pl' },
  { label: 'EN', code: 'en' },
];

interface LanguageSwitcherProps {
  className?: string;
}

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
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full border-hairline-strong bg-surface p-0.5 text-xs ${className ?? ''}`}
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
            className={`inline-flex h-6 items-center justify-center rounded-full px-2.5 font-medium tracking-wide transition-colors disabled:opacity-60 ${
              isActive ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
