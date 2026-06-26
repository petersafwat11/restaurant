/* Restaurant Admin service worker — background "new order" alerts.
 *
 * Intentionally minimal: no offline caching, just Web Push handling so staff
 * get notified when a customer places an order while the dashboard tab is
 * closed. The push payload is the JSON sent by the API's WebPushService:
 *   { title, body, url, tag }
 */

self.addEventListener('install', () => {
  // Activate this worker immediately so a freshly-enabled device starts
  // receiving pushes without waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_err) {
    data = { title: 'New order', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'New order';
  const options = {
    body: data.body || 'A customer just placed an order.',
    tag: data.tag || 'new-order',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/orders' },
    icon: '/icon.svg',
    badge: '/icon.svg',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing admin tab if one is open, else open a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
