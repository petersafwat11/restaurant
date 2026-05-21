'use client';

import * as React from 'react';

const STORAGE_KEY = 'admin.sound.muted';

// Browsers with strict privacy modes (Brave shields, Firefox ETP, Safari ITP,
// sandboxed iframes) can throw SecurityError when accessing localStorage even
// though `window` exists. Fall back to session-only state in that case.
function readMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMuted(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage denied — preference won't survive reload, but the UI still works.
  }
}

/**
 * Web-Audio chime for new orders (decision §11.3: synthetic, no sound asset).
 * Plays a short two-note bell using OscillatorNode + GainNode. Mute toggle
 * persists in localStorage when available.
 *
 * Caller passes a trigger (e.g. `newCount` from useLiveAdminOrders) into
 * `useOrderChime(trigger)` — the chime fires once per change.
 */
export function useOrderChime(trigger: number) {
  const [muted, setMutedState] = React.useState<boolean>(readMuted);

  const setMuted = React.useCallback((next: boolean) => {
    setMutedState(next);
    writeMuted(next);
  }, []);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const prevTrigger = React.useRef(trigger);

  React.useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    if (muted) return;
    playBell(audioCtxRef);
  }, [trigger, muted]);

  return { muted, setMuted };
}

function playBell(ctxRef: React.MutableRefObject<AudioContext | null>) {
  if (typeof window === 'undefined') return;
  try {
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      ctxRef.current = new Ctx();
    }
    const ctx = ctxRef.current;
    const now = ctx.currentTime;
    // Two-note bell: 880 Hz then 660 Hz, each ~150ms with quick attack/decay.
    pluck(ctx, 880, now, 0.18);
    pluck(ctx, 660, now + 0.13, 0.18);
  } catch {
    // AudioContext can be blocked until user interaction — ignore
  }
}

function pluck(ctx: AudioContext, freq: number, startAt: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}
