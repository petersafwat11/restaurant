# Owner / staff new-order alerts

When a customer places an order (`order.created`), the restaurant is alerted
through any combination of **SMS**, **WhatsApp**, and **admin web-push**. This is
separate from the customer-facing order-status notifications.

Pipeline: `StaffOrderAlertService` (`@OnEvent('order.created')`) →
BullMQ queues (`sms`, `whatsapp`, `webpush`) → processors → Twilio / web-push.

## Channels

### SMS (Twilio)
Already-integrated Twilio sender. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM`. Recipients come from `Restaurant.orderAlertPhones` (E.164) and/or
the `ORDER_ALERT_SMS_TO` env fallback. Enable with `Restaurant.orderAlertSmsEnabled`.

### WhatsApp (Twilio)
Set `TWILIO_WHATSAPP_FROM` (sandbox `whatsapp:+14155238886`, or an **approved
WhatsApp Business sender** in production — business-initiated messages need an
approved template + opted-in recipients). Recipients: `Restaurant.orderAlertWhatsApp`
and/or `ORDER_ALERT_WHATSAPP_TO`. Enable with `Restaurant.orderAlertWhatsAppEnabled`.

### Web Push (admin PWA)
Background notification to staff devices even when the dashboard is closed.

1. Generate a VAPID key pair once: `npx web-push generate-vapid-keys`
2. API: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
3. Admin: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same public key)
4. In the admin app → **Settings → Background order alerts → Enable** on each
   device. On iOS the admin must first be **Added to Home Screen** (iOS 16.4+).

Enabled with `Restaurant.orderAlertWebPushEnabled` (default true). Subscriptions
are stored per staff user; dead ones are pruned automatically on 404/410.

## Dev behaviour
With no Twilio/VAPID creds set, every channel logs to the console instead of
sending, so the full pipeline can be exercised locally.

## Notes / follow-ups
- Recipient phone lists are currently set via env fallback or directly on the
  Restaurant row; a dedicated admin Settings form for the phone lists is a
  reasonable follow-up.
- A native staff APK (Expo) was considered but deferred — the admin PWA already
  provides background push + the full management UI.
