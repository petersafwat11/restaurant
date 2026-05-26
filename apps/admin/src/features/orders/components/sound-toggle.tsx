'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface SoundToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export function SoundToggle({ muted, onToggle }: SoundToggleProps) {
  const t = useTranslations('admin.orders.list');
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? t('soundToggle.unmuteAria') : t('soundToggle.muteAria')}
      title={muted ? t('soundToggle.unmuteTitle') : t('soundToggle.muteTitle')}
      className="grid h-8 w-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  );
}
