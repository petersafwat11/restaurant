'use client';

import { getApiClient } from '@/lib/api-client';
import { env } from '@/lib/env';
import * as React from 'react';
import { registerAdminServiceWorker } from './pwa-provider';

export type WebPushState =
  | 'unsupported'
  | 'unconfigured'
  | 'idle'
  | 'working'
  | 'enabled'
  | 'denied'
  | 'error';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = `${base64}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

async function persistWebPushSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('Incomplete Web Push subscription');
  }

  await getApiClient().notifications.subscribeWebPush({
    endpoint: json.endpoint,
    expirationTime: json.expirationTime,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
}

export function useWebPush() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  const configured = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const [state, setState] = React.useState<WebPushState>('idle');

  const refresh = React.useCallback(async () => {
    if (!supported) {
      setState('unsupported');
      return;
    }
    if (!configured) {
      setState('unconfigured');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        setState('idle');
        return;
      }

      const activeRegistration = registration.active
        ? registration
        : await navigator.serviceWorker.ready;
      let subscription = await activeRegistration.pushManager.getSubscription();

      // If notification permission was already granted on this device, auto-subscribe and sync
      if (!subscription && Notification.permission === 'granted') {
        subscription = await activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });
      }

      if (!subscription) {
        setState('idle');
        return;
      }

      // Reconcile the browser with the API on every mount. This repairs server-side
      // subscription loss without asking staff to toggle alerts off and on again.
      await persistWebPushSubscription(subscription);
      setState('enabled');
    } catch {
      setState('error');
    }
  }, [configured, supported]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = React.useCallback(async (): Promise<boolean> => {
    if (!supported || !configured) return false;
    setState('working');

    try {
      const registration = await registerAdminServiceWorker();
      if (!registration) throw new Error('Service worker unavailable');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return false;
      }

      const activeRegistration = registration.active
        ? registration
        : await navigator.serviceWorker.ready;
      let subscription = await activeRegistration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        });
      }

      await persistWebPushSubscription(subscription);
      setState('enabled');
      return true;
    } catch {
      setState('error');
      return false;
    }
  }, [configured, supported]);

  const disable = React.useCallback(async (): Promise<boolean> => {
    setState('working');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await getApiClient().notifications.unsubscribeWebPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState('idle');
      return true;
    } catch {
      setState('error');
      return false;
    }
  }, []);

  return {
    state,
    supported,
    configured,
    enabled: state === 'enabled',
    busy: state === 'working',
    enable,
    disable,
    refresh,
  };
}
