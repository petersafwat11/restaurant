/* Szef Donald Admin PWA service worker.
 *
 * Authenticated pages and API data are intentionally never cached. The worker
 * stores only the public offline experience, app icons, manifest, and hashed
 * Next.js static assets required to render that fallback.
 */

const CACHE_PREFIX = 'szef-donald-admin-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const OFFLINE_URLS = ['/offline', '/en/offline'];
const PUBLIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/admin-192.png',
  '/icons/admin-512.png',
  '/icons/admin-maskable-512.png',
  '/icons/admin-apple-touch.png',
];

async function cacheOfflinePage(cache, url) {
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error(`Could not cache ${url}`);

  await cache.put(url, response.clone());

  const html = await response.text();
  const assetPaths = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1])
    .filter((path) => path.startsWith('/_next/static/'));

  await Promise.allSettled(
    [...new Set(assetPaths)].map((path) => cache.add(new Request(path, { cache: 'reload' }))),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PUBLIC_ASSETS);
      await Promise.all(OFFLINE_URLS.map((url) => cacheOfflinePage(cache, url)));
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function offlineUrlFor(requestUrl) {
  const pathname = new URL(requestUrl).pathname;
  return pathname === '/en' || pathname.startsWith('/en/') ? '/en/offline' : '/offline';
}

function isPublicStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.protocol.startsWith('http')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(offlineUrlFor(request.url));
      }),
    );
    return;
  }

  if (!isPublicStaticAsset(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});
