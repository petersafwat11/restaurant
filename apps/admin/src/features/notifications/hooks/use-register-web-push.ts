'use client';

import { getApiClient } from '@/lib/api-client';
import { env } from '@/lib/env';
import { notify } from '@/lib/notify';
import * as React from 'react';

const ENABLED_KEY = 'admin.webpush.enabled';

export type WebPushState =
  | 'unsupported' // browser lacks service worker / Push API
  | 'unconfigured' // no VAPID public key configured
  | 'idle' // supported + configured, not yet subscribed
  | 'subscribing'
  | 'enabled'
  | 'denied' // notification permission denied
  | 'error';

/** VAPID keys are base64url; the Push API wants a Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function persist(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(ENABLED_KEY, 'true');
    else localStorage.removeItem(ENABLED_KEY);
  } catch {
    // Storage denied (strict privacy modes) — runtime state still works.
  }
}

/**
 * Manages this browser's Web Push subscription for background "new order"
 * alerts. The admin must be installed/added to home screen on iOS for push to
 * work; on desktop + Android it works in-browser. Enabling registers the
 * service worker, requests notification permission, subscribes with the VAPID
 * key and stores the subscription on the server (per staff user).
 */
export function useRegisterWebPush() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  const configured = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

  const [state, setState] = React.useState<WebPushState>('idle');

  // Derive the initial state from the live subscription / permission.
  React.useEffect(() => {
    if (!supported) return setState('unsupported');
    if (!configured) return setState('unconfigured');
    if (Notification.permission === 'denied') return setState('denied');
    navigator.serviceWorker
      .getRegistration()
      .then(async (reg) => {
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setState(sub ? 'enabled' : 'idle');
      })
      .catch(() => setState('idle'));
  }, [supported, configured]);

  const enable = React.useCallback(async () => {
    if (!supported || !configured) return;
    setState('subscribing');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Incomplete push subscription');
      }
      await getApiClient().notifications.subscribeWebPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });

      persist(true);
      setState('enabled');
      notify('success', 'Background order alerts enabled on this device.');
    } catch (err) {
      setState('error');
      notify('error', err instanceof Error ? err.message : 'Could not enable alerts.');
    }
  }, [supported, configured]);

  const disable = React.useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await getApiClient()
          .notifications.unsubscribeWebPush(sub.endpoint)
          .catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      persist(false);
      setState('idle');
      notify('info', 'Background order alerts disabled on this device.');
    } catch {
      setState('error');
    }
  }, []);

  return { state, supported, configured, enable, disable };
}
