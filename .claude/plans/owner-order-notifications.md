# Owner / Staff order-alert pipeline (SMS + WhatsApp + Admin PWA web-push)

## Problem
Every notification in the system today targets the **customer** (`NotificationDispatcher`
only reads `order.userId`). The owner/staff only learn about a new order if the **admin
web app is open in a browser tab** (chime + Web Notification while the tab is hidden via
`use-order-chime` / `use-order-notifications`). Close the tab / lock the phone → the owner
gets nothing. This is the gap for a real restaurant taking real orders.

## Goal
On `order.created`, alert the restaurant's owner/staff through, in parallel with the
existing customer pipeline and reusing the existing BullMQ queues + EventEmitter:

1. **SMS** to configured owner phone number(s) (Twilio — already integrated).
2. **WhatsApp** to configured owner number(s) (Twilio WhatsApp sender).
3. **Web Push** to staff who installed the **admin app as a PWA** (background push even
   when the dashboard is closed), tapping straight into `/orders/:id`.

Customer-facing notifications are unchanged.

## Architecture
Single new listener `StaffOrderAlertService` (`@OnEvent('order.created')`), sibling to
`NotificationDispatcher`. It resolves recipients from `Restaurant` config (with env
fallback) + staff web-push subscriptions, then enqueues per-channel jobs. One dispatcher,
config-driven channels, no polling.

```
order.created ──▶ StaffOrderAlertService
                    ├─ QUEUE_SMS      JOB_SMS_NEW_ORDER       → SmsProcessor      → Twilio SMS
                    ├─ QUEUE_WHATSAPP JOB_WHATSAPP_NEW_ORDER  → WhatsappProcessor → Twilio WhatsApp
                    └─ QUEUE_WEBPUSH  JOB_WEBPUSH_NEW_ORDER   → WebPushProcessor  → web-push (VAPID)
```

## Changes

### Schema (`packages/db/prisma/schema.prisma` + migration + `generate`)
- `Restaurant`: `orderAlertSmsEnabled`, `orderAlertWhatsAppEnabled`, `orderAlertWebPushEnabled`
  (Booleans), `orderAlertPhones String[]`, `orderAlertWhatsApp String[]`.
- New `WebPushSubscription { id, userId, endpoint @unique, p256dh, auth, userAgent?,
  createdAt, lastUsedAt? }` + relation on `User`.
- Hand-written migration SQL (no DB in this env) following existing migration format.

### `packages/jobs`
- `queues.ts`: `QUEUE_WHATSAPP='whatsapp'`, `QUEUE_WEBPUSH='webpush'`; job names
  `JOB_SMS_NEW_ORDER`, `JOB_WHATSAPP_NEW_ORDER`, `JOB_WEBPUSH_NEW_ORDER`.
- `payloads.ts`: `SmsNewOrderPayload`, `WhatsappNewOrderPayload`, `WebPushNewOrderPayload`.

### `packages/types`
- `notification.ts`: `WebPushSubscriptionInputSchema` (endpoint, keys.p256dh, keys.auth).

### `apps/api`
- `config/env.ts`: `TWILIO_WHATSAPP_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`, plus `ORDER_ALERT_SMS_TO`/`ORDER_ALERT_WHATSAPP_TO` env fallback.
- `whatsapp/`: `WhatsappService` (Twilio `whatsapp:` prefix) + module.
- `webpush/`: `WebPushService` (wraps `web-push`, VAPID) + module. Adds `web-push` dep.
- `jobs/whatsapp.processor.ts`, `jobs/webpush.processor.ts`; extend `sms.processor.ts`
  with `JOB_SMS_NEW_ORDER`. Register new queues/processors in `jobs.module.ts`.
- `notifications/staff-order-alert.service.ts` — the `@OnEvent` fan-out. Wired in
  `notifications.module.ts` (registers the 3 queues).
- `notifications` controller/service: `POST/DELETE /notifications/web-push` to store a
  staff browser subscription (permission: authenticated staff).

### `apps/admin` (PWA)
- `public/manifest.webmanifest` + icons + `public/sw.js` (`push` + `notificationclick`).
- Register SW + `useRegisterWebPush()` hook (asks permission, subscribes with
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, posts to API). Settings card "Background order alerts on
  this device". `next.config` headers for `/sw.js`.
- `packages/api-client`: `notifications.subscribeWebPush/unsubscribeWebPush`.

### Tests
- Unit: `StaffOrderAlertService` enqueues the right jobs given restaurant config.
- Keep existing notification tests green.

### Docs / env
- `.env.example`: new vars. Short `docs/` note on enabling each channel + WhatsApp sender
  approval caveat.

## Out of scope (noted for later)
- Native staff APK (Expo) — management UI already exists on web; revisit if locked-down
  kitchen tablets need it.
- Customer mobile push token acquisition is a separate existing stub.
</content>
</invoke>
