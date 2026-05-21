'use client';

import * as React from 'react';

const MUTE_KEY = 'admin.notifications.muted';
const PERMISSION_PROMPT_KEY = 'admin.notifications.permission_prompted';

// Strict privacy modes (Brave shields, Firefox ETP, sandboxed iframes) can
// throw SecurityError on localStorage access. Treat denied storage as "no
// value" — preferences won't survive reload but the page keeps working.
function storageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage denied — silently skip.
  }
}

interface UseOrderNotificationsOptions {
  /** Trigger that increments each time a new order arrives (e.g. newCount). */
  trigger: number;
  /** Label shown in the notification body. */
  restaurantName?: string | null;
}

/**
 * Browser notifications for new orders. Fires only when the tab is hidden
 * (`document.hidden === true`). The chime hook (`useOrderChime`) handles audio
 * when the tab is visible — we deliberately don't duplicate sound here.
 *
 * Permission is requested lazily on the first arrival, and the result is
 * cached in localStorage so we don't re-prompt. The per-restaurant mute toggle
 * also persists in localStorage.
 */
export function useOrderNotifications({ trigger, restaurantName }: UseOrderNotificationsOptions) {
  const [muted, setMutedState] = React.useState<boolean>(() => storageGet(MUTE_KEY) === 'true');

  const [permission, setPermission] = React.useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const setMuted = React.useCallback((next: boolean) => {
    setMutedState(next);
    storageSet(MUTE_KEY, String(next));
  }, []);

  const prevTrigger = React.useRef(trigger);

  React.useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    if (muted) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!document.hidden) return;

    if (Notification.permission === 'granted') {
      fire(restaurantName);
      return;
    }

    if (Notification.permission === 'denied') return;

    // 'default' — request once, then fire if granted.
    if (storageGet(PERMISSION_PROMPT_KEY) === 'true') return;
    storageSet(PERMISSION_PROMPT_KEY, 'true');
    Notification.requestPermission()
      .then((p) => {
        setPermission(p);
        if (p === 'granted') fire(restaurantName);
      })
      .catch(() => {});
  }, [trigger, muted, restaurantName]);

  return { muted, setMuted, permission };
}

function fire(restaurantName?: string | null) {
  try {
    const title = 'New order';
    const body = restaurantName ? `New order at ${restaurantName}` : 'You have a new order';
    const n = new Notification(title, {
      body,
      tag: 'order-new',
      renotify: true,
    } as NotificationOptions & { renotify?: boolean });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some platforms throw if the user dismissed the permission prompt.
  }
}
