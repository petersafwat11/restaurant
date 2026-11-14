# Umami analytics (stats.szefdonald.pl)

Cookieless, self-hosted web analytics for the customer site. Runs as its own
stack in `/opt/umami` on the shared VPS, joins the external `app-net` network,
and is exposed by the restaurant Caddy through `conf.d/umami.caddy`.

## Install / update on the VPS

1. DNS: `A stats → 207.180.217.159`.
2. `/opt/umami/.env` (mode 600) with `UMAMI_DB_PASSWORD` and `UMAMI_APP_SECRET`
   (random: `openssl rand -hex 24` / `openssl rand -hex 32`).
3. Copy `docker-compose.yml` to `/opt/umami/`, run `docker compose up -d`.
4. Copy `umami.caddy` to `/opt/restaurant/conf.d/`, then
   `docker exec restaurant-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`.
5. Fresh installs create `admin`/`umami` — replace that login at once
   (production: random password in `/opt/umami/admin-credentials.txt`, mode 600).
6. Website id lives in `/opt/umami/website-id.txt`. Set in `/opt/restaurant/.env`:
   ```
   UMAMI_SCRIPT_URL=https://stats.szefdonald.pl/script.js
   UMAMI_WEBSITE_ID=<website id>
   UMAMI_DOMAINS=szefdonald.pl
   ```
   The web container reads these at runtime (`apps/web/src/app/[locale]/layout.tsx`).

Upgrade: bump the image tag (use a release at least ~2 weeks old), `docker compose pull && docker compose up -d`.

## Events sent by the site

| Event | When |
|---|---|
| (page views) | automatic, incl. client-side navigation |
| `add_to_cart` | item added (`use-add-to-cart.ts`) |
| `checkout_start` | checkout page opened |
| `order_placed` | order created (type, payment, guest) |
| `phone_click` | any `tel:` link clicked |
| `directions_click` | any Google Maps link clicked |

Funnel in Umami: menu page → `add_to_cart` → `checkout_start` → `order_placed`.
