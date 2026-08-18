# Persistent Order Alarm and Closed-App Web Push Fix

## Goal

Ensure reliable restaurant order alerting across all states:
1. **Diagnosis & Fix for Push Notifications**: Resolve why Web Push fails across environments (dev vs prod, VAPID key configuration, service worker lifecycle, user subscription onboarding, iOS standalone requirements).
2. **Continuous In-App Order Alarm (Open App / Foreground / Background Tab)**: Synthesize an audible repeating ring/chime via Web Audio API that continues until dismissed or acted upon.
3. **5m/10m Snooze Escalation**: If dismissed/snoozed without action (order stays `PENDING`), re-trigger the audible ring loudly after 5 and 10 minutes.
4. **Closed-App Push Escalation**: Schedule BullMQ reminder jobs at +5m and +10m to send urgent Web Push notifications with vibration to staff devices if an order is still pending.
5. **Customer Web App (`apps/web`)**: Order tracking audio cues and push notification support for status updates.

## Key Changes

1. **Global Admin Order Alarm**:
   - Create `OrderAlarmProvider` and mount in Admin Dashboard layout so order monitoring and audio alerting run across all pages.
   - Repeating audio synthesizer with autoplay unlock.
   - Sticky floating banner for new/pending orders with quick "Confirm", "View", and "Snooze 5m" actions.
   - Automatic re-alarm timer when snooze window elapses and order remains `PENDING`.
2. **Backend Push Reminders**:
   - Add `JOB_WEBPUSH_PENDING_ORDER_REMINDER` to `@repo/jobs`.
   - In `StaffOrderAlertService`, queue delayed reminder jobs at +5m and +10m.
   - In `WebPushProcessor`, check if order is still `PENDING`; if so, dispatch urgent Web Push with `renotify: true` and vibration pattern.
3. **Service Worker & Reliability**:
   - Update `apps/admin/public/sw.js` with vibration pattern and notification actions.
   - Allow service worker in development mode if VAPID keys are configured.
   - Add non-intrusive banner on Admin Topbar prompting staff to enable push notifications on first login.
4. **Customer Web App (`apps/web`)**:
   - Status update sound cues on order tracking page.
   - Service worker & manifest for customer push notifications.
