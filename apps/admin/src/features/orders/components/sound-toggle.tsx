'use client';

import { Volume2, VolumeX } from 'lucide-react';
import * as React from 'react';

interface SoundToggleProps {
  muted: boolean;
  onToggle: () => void;
}

/**
 * Topbar mute/unmute for the new-order chime. Persists in localStorage via
 * `useOrderChime` (which owns the state).
 */
export function SoundToggle({ muted, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? 'Unmute new-order chime' : 'Mute new-order chime'}
      title={muted ? 'Unmute chime' : 'Mute chime'}
      className="grid h-8 w-8 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  );
}
