'use client';

import { cn } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface LivePulseChipProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export function LivePulseChip({ count, onClick, className }: LivePulseChipProps) {
  const t = useTranslations('admin.orders.list');

  if (count > 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex h-8 items-center gap-2 rounded-full border-hairline-strong bg-accent/[0.12] px-3 text-xs font-medium text-fg transition-colors hover:bg-accent/[0.18]',
          className,
        )}
      >
        <span aria-hidden className="relative grid h-2 w-2 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/60 motion-reduce:animate-none" />
          <span className="relative h-2 w-2 rounded-full bg-accent" />
        </span>
        <span>{t('livePulse.newOrders', { count })}</span>
      </button>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border-hairline px-3 text-xs text-fg-subtle',
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg-subtle" />
      {t('livePulse.caughtUp')}
    </span>
  );
}
