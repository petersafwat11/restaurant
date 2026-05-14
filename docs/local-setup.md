# Local setup

## Prerequisites

- Node.js 20 LTS (see `.nvmrc`)
- pnpm 9.15+
- Docker Desktop (or Docker Engine + Compose v2)

## Bring-up

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env
cp .env.example .env

# 3. Start postgres + redis + mailhog
docker compose up -d

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Run everything
pnpm dev
```

After `pnpm dev`:

| Service | URL |
|---|---|
| API | http://localhost:4000 |
| API docs (Swagger) | http://localhost:4000/api/v1/docs |
| Web (customer) | http://localhost:3000 |
| Admin | http://localhost:3001 |
| Mailhog UI | http://localhost:8025 |
| Mobile (Expo) | press `w` for web, `i` for iOS sim, `a` for Android |

## Seeded test users

| Email | Password | Role |
|---|---|---|
| `owner@local.test` | `Password123!` | owner (all permissions) |
| `customer@local.test` | `Password123!` | customer |

## Smoke test

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@local.test","password":"Password123!"}'
```

Expected: `200` with `{ accessToken, refreshToken, user }`.

## Reset everything

```bash
docker compose down -v
rm -rf node_modules
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

## Live-mode credentials

Every external integration ships a stub mode that fires when its env vars are
empty. Setting real credentials flips the same code path to live mode — no app
restart logic to track, just `.env` values.

### Stripe — payments + webhooks

Set:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stub mode (default) returns deterministic `pi_stub_<orderId>` payment-intent
refs and `<ref>_secret_stub` client secrets so the frontend SDK path can be
exercised without a real Stripe account.

To forward real webhooks to your local API while developing:

```bash
stripe listen --forward-to localhost:4000/api/v1/payments/webhooks/stripe
```

For Polish payment methods, enable **P24** and **BLIK** in the Stripe Dashboard
under *Settings → Payment methods* for the test mode account you're using.

`charge.refunded` events fired from the Stripe Dashboard are picked up by the
webhook handler and create the missing `Refund` rows automatically (logged
with `[STRIPE_DASHBOARD_REFUND]`).

### Cloudflare R2 — image uploads

Set:

```
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=restaurant-uploads
R2_PUBLIC_URL=https://cdn.example.com   # optional, falls back to endpoint/bucket
```

Stub mode returns `http://localhost/no-r2/<key>` URLs from the presign endpoint
so e2e tests don't need real credentials. The orphan cleanup job
(`r2.orphan-cleanup`, runs daily at 03:00 UTC) detects stub mode and exits
without listing.

Live mode: image deletes call `DeleteObjectCommand` immediately; the daily
sweep is the safety net for any failures and for keys that were uploaded but
never linked to a DB row. Objects newer than 7 days are skipped from the sweep
to give in-flight uploads a buffer.

### Twilio — SMS

Set:

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+15005550006    # purchase or use a Twilio test number
```

Stub mode prints SMS bodies to the API console instead of sending.

### Resend — transactional email

Set:

```
RESEND_API_KEY=re_...
MAIL_FROM='Restaurant <no-reply@yourdomain.test>'
```

Stub mode sends to Mailhog over SMTP (`localhost:1025`). Browse the inbox at
http://localhost:8025 — receipts, refund confirmations, and order-status
emails all show up there in dev.

### Expo push — mobile notifications

No env var. Tokens are stored per-user in the `PushToken` table. Mobile
clients register their token after login via `useRegisterPushToken()` (added
in Sprint 1). With zero tokens for a user, the `push.processor` logs and
exits; nothing breaks.

## Troubleshooting

**"Cart returns 404 after login"** — the user has no cart for that restaurant
yet. This is expected; the first `POST /cart/items` creates one.

**"Webhook signature verification fails"** — confirm you're hitting the path
that goes through the raw-body parser (`/api/v1/payments/webhooks/stripe`).
Re-check `STRIPE_WEBHOOK_SECRET` matches what `stripe listen` printed.

**"Socket connection drops after 30s"** — the JWT access token expired. Check
that the client is sending the `Authorization: Bearer <token>` header (or the
`auth: { token }` field on the handshake) and that the token is fresh. Tokens
expire 15 minutes after issue; the realtime client should reconnect with a
refreshed token.
