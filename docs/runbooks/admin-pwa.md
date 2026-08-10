# Admin PWA operations

The admin dashboard is installable from `https://admin.<DOMAIN>` on supported desktop and mobile
browsers. Installation does not create a second application or a separate deployment: the installed
window runs the same Next.js admin build and uses the same API and Socket.IO connections.

## Install

- Chromium desktop/Android: open **Settings → Install admin app**, then choose **Install app** when
  the browser offers it. The browser's address-bar/menu install action also works.
- iPhone/iPad: open the admin in Safari, tap **Share**, then **Add to Home Screen**.
- The app launches at `/`; next-intl restores the selected language from `NEXT_LOCALE`, and the
  existing auth gate restores or requests the staff session.

## Offline behavior

The service worker caches only the localized offline screen, app icons/manifest, and immutable
`/_next/static/` files used to render that screen. It does **not** cache:

- dashboard or login HTML;
- API responses, orders, customers, or restaurant data;
- authentication/session requests;
- Socket.IO traffic;
- POST/PATCH/PUT/DELETE requests.

If a document navigation fails, the worker shows the Polish or English offline screen. After the
connection returns, **Try again** reloads the originally requested URL. Edits are never queued for
later delivery.

## Updates

`/sw.js` is served with `no-cache, no-store, must-revalidate` and registration uses
`updateViaCache: 'none'`. When a new worker finishes installing, Settings shows **Reload update**.
The worker activates and reloads only after the staff member chooses that action, avoiding an
unexpected reload during order handling.

Cache names start with `szef-donald-admin-pwa-` and contain a version suffix. Activation removes
older caches owned by the admin PWA.

## Troubleshooting

1. Confirm the site is using HTTPS (localhost is the only development exception).
2. Check `/manifest.webmanifest` returns `application/manifest+json` and references valid 192x192,
   512x512, and maskable PNG icons.
3. Check `/sw.js` returns JavaScript with `Cache-Control: no-cache, no-store, must-revalidate` and
   `Service-Worker-Allowed: /`.
4. In browser developer tools, inspect **Application → Service workers / Manifest / Cache storage**.
5. To force a clean reinstall, unregister the worker, delete caches beginning with
   `szef-donald-admin-pwa-`, clear site data, reload once online, and install again.

The PWA does not add background web-push delivery. Existing in-app/realtime order alerts work while
the dashboard is running; email and Twilio SMS remain the supported background channels.
