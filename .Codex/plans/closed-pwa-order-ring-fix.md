# Fix: Order "ring" alert while Admin PWA is closed

## Problem

The synthesized order alarm (`web-audio-alarm.ts`) rings while the admin app is
open, but when the PWA is closed only the push notification appears — no custom
ring. `sound: '/sounds/order-alarm.wav'` in `sw.js` is a no-op (Chrome never
implemented the `sound` option; Android sound is owned by the notification
channel). Service workers cannot play audio, so the page alarm cannot run when
the app is closed.

## Root causes found in code

1. `apps/admin/public/sw.js:84` — `sound:` option is dead code (misleading).
2. `sw.js:85` — tag fallback `order-${Date.now()}` defeats `renotify: true`
   (renotify only re-alerts when replacing the *same* tag).
3. Server sends exactly **one** push per new order + 5m-interval reminders —
   one OS notification sound is not a "ring".
4. No wake-up message to open (backgrounded) clients on push.

## Fix strategy (max achievable without Capacitor)

A "ring burst" of repeated pushes, each re-triggering the Android notification
channel sound + vibration, plus a one-time device setup to set that channel's
sound to the custom alarm file.

## Changes

### 1. `packages/jobs` — new ring job
- `queues.ts`: add `JOB_WEBPUSH_ORDER_RING = 'webpush.order-ring'`.
- `payloads.ts`: add `WebPushOrderRingPayloadSchema = WebPushNewOrderPayloadSchema.extend({ ringStep: z.number().int().nonnegative() })`.

### 2. `apps/api` — WebPushProcessor / StaffOrderAlertService
- On `JOB_WEBPUSH_NEW_ORDER` completion: schedule first
  `JOB_WEBPUSH_ORDER_RING` at +30s (`ringStep: 1`).
- Ring handler: re-check order is still `PENDING`/`CONFIRMED` (reuse reminder
  guard), re-send push with the **same tag** `order-{orderId}` (so the SW's
  `renotify: true` re-sounds), then chain the next ring +30s up to
  `ringStep === 6` (≈3 min of ringing). After the burst, existing 5m reminder
  chain continues unchanged.
- Constants: `RING_INTERVAL_MS = 30_000`, `RING_MAX_STEPS = 6`.

### 3. `apps/admin/public/sw.js`
- Remove dead `sound:` option.
- Stable tag fallback (`'admin-order-alert'`) so `renotify` always works.
- Keep `renotify: true`, `silent: false`, `vibrate`, `requireInteraction`.
- On push: `clients.matchAll()` + `postMessage({ type: 'ORDER_PUSH' })` so an
  open-but-backgrounded window also starts the Web Audio page alarm.
- Bump `CACHE_NAME` to `v5` so the updated SW activates immediately.

### 4. `apps/admin` page side
- In `OrderAlarmProvider` (or PWA provider): listen for the
  `ORDER_PUSH` service-worker message and trigger an alarm refetch/evaluate —
  covers "app open in background tab" so the Web Audio ring also plays.

### 5. Docs — `docs/runbooks/admin-pwa.md`
Samsung A55 (and general Android) one-time setup:
- Copy `apps/admin/public/sounds/order-alarm.wav` to the phone
  (Notifications folder) via USB/Files app.
- Settings → Apps → Chrome (or the installed PWA) → Notifications →
  notification category → Alert (not Silent) → Sound → select the custom alarm.
- With the ring burst, a closed PWA then rings with the custom alarm every 30s
  until staff respond.

## Explicitly out of scope
- Continuous multi-minute custom ringtone while closed — impossible in a pure
  PWA (SW has no audio; `sound` unimplemented). Requires Capacitor/native
  layer; note as future option only.

## Tests
- Extend `webpush.processor.spec.ts`: ring chains while `PENDING`, stops when
  `CONFIRMED`→acted on (status not PENDING/CONFIRMED), respects max steps.
- Extend `staff-order-alert.spec.ts`: initial ring job enqueued with 30s delay.
- Update `service-worker-contract.test.ts`: no `sound:` option, stable tag,
  `ORDER_PUSH` client message present.

## Verification
- `pnpm --filter api test` (unit), sw contract test via admin test runner.
- Manual: dev push to phone with app closed → expect notification re-sound
  every 30s × 6 (channel sound), then 5m reminders.
