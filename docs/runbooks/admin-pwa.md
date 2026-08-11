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

## Background new-order alerts

The Settings PWA card lets staff with `order:read` enable Web Push separately on each browser or
installed device. Permission is requested only after **Enable alerts** is selected. A new order is
queued through BullMQ and delivered by the API's Web Push processor in every app state: foreground,
background, minimized, or closed. The foreground dashboard also records the alert in its notification
center, so system-level delivery remains visible and auditable even while staff are using the app.

Service-worker releases call `skipWaiting()` after their offline assets are cached. Because protected
pages and API data are never cached, the corrected worker can safely activate immediately without
interrupting an order form or forcing a page reload.

Generate one VAPID key pair and keep it stable across deployments:

```bash
pnpm --filter @repo/api exec web-push generate-vapid-keys
```

Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in `/opt/restaurant/.env`. Also add
the pair as GitHub Actions repository secrets `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`; Next.js
receives only the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` while building the admin image. The
deployment workflow securely persists both keys to the VPS `.env`. The private key is used only by
the API container and must never be exposed to the browser.

The admin image build fails when the public key is missing. The production deployment smoke test
also verifies the manifest, service worker, and required icons so a PWA cannot silently deploy with
missing public assets.

Expired browser subscriptions (push-service HTTP 404/410) are deleted automatically. To rotate the
VAPID pair, update both deployment values and the GitHub secret, rebuild the admin image, and ask
staff to enable alerts again on each device.

Native Windows builds intentionally use normal Next.js output because Windows can reject the final
standalone symlink-copy step with `EPERM`. Linux/Docker builds retain standalone output.

## Troubleshooting

1. Confirm the site is using HTTPS (localhost is the only development exception).
2. Check `/manifest.webmanifest` returns `application/manifest+json` and references valid 192x192,
   512x512, and maskable PNG icons.
3. Check `/sw.js` returns JavaScript with `Cache-Control: no-cache, no-store, must-revalidate` and
   `Service-Worker-Allowed: /`.
4. In browser developer tools, inspect **Application → Service workers / Manifest / Cache storage**.
5. To force a clean reinstall, unregister the worker, delete caches beginning with
   `szef-donald-admin-pwa-`, clear site data, reload once online, and install again.
