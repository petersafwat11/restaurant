/* Szef Donald Web Customer PWA service worker.
 *
 * Handles order updates and closed-app notifications for customer order tracking.
 */

const CACHE_NAME = 'szef-donald-web-pwa-v1';
const PUBLIC_ASSETS = ['/manifest.webmanifest', '/icon.png', '/apple-icon.png', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PUBLIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('szef-donald-web-pwa-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        payload = event.data?.json() ?? {};
      } catch {
        payload = {};
      }

      const title = payload.title ?? 'Order update';
      const body = payload.body ?? 'Your order status has been updated.';
      const icon = payload.icon ?? '/icon.png';
      const tag = payload.tag ?? 'order-update';
      const url = payload.url ?? '/';

      try {
        await self.registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag,
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url },
        });
      } catch {
        try {
          await self.registration.showNotification(title, {
            body,
            icon,
            tag,
            data: { url },
          });
        } catch {
          await self.registration.showNotification(title, { body });
        }
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const requestedUrl = new URL(event.notification.data?.url ?? '/', self.location.origin);
      const targetUrl =
        requestedUrl.origin === self.location.origin ? requestedUrl.href : self.location.origin;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows[0];
      if (existing) {
        await existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })(),
  );
});
