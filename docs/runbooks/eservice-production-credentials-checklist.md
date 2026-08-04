# eService production credentials — release checklist

Run this checklist only after eService confirms certification and sends production
credentials. Never reuse sandbox credentials or the temporary certification tunnel.

## Before deployment

- Obtain the production application ID, application key, account name, API/HPP base
  URLs, enabled payment methods, supported currencies, and any source-IP allowlist.
- Confirm the final stable public HTTPS endpoints:
  - `https://<production-domain>/api/v1/payments/eservice/return`
  - `https://<production-domain>/api/v1/payments/webhooks/eservice`
- Store secrets in the VPS deployment environment/secret store. Do not put them in
  Git, Docker images, build logs, screenshots, tickets, or email replies.
- Make a database backup and confirm PostgreSQL, Redis, BullMQ workers, Caddy TLS,
  callback routes, and outbound access to eService are healthy.
- Confirm HPP links restrict `allowed_payment_methods` to the method selected by the
  customer and use `capture_mode=AUTO`.

## Controlled activation

1. Deploy with the payment entry point disabled or restricted to an internal test
   account/feature flag.
2. Install production credentials and production base URLs; restart API and workers.
3. Verify health/logs without printing credential values or signed messages.
4. Execute one minimum-value real card payment with an authorized company tester.
5. Verify signed return, provider `CAPTURED`, local Payment `CAPTURED`, Order
   `CONFIRMED`, audit record, receipt job, and correct storefront redirect.
6. Execute one minimum-value BLIK payment and verify the same state chain.
7. With provider agreement, execute one BLIK test where the browser is closed before
   redirect; confirm `status_url` alone supplies the final state.
8. Refund the controlled card sale through the application and verify provider and
   local refund state, audit record, and customer notification.
9. Enable the payment methods for all users only after every check passes.

## Monitoring and rollback

- Monitor callback signature failures, HPP-link creation failures, payments pending
  beyond the short retry window, reconciliation failures, refund failures, queue
  failures, and differences between provider and local totals.
- Keep a fast kill switch that hides eService methods while preserving cash on
  delivery, existing order tracking, callbacks, and reconciliation.
- On incident, disable new eService attempts; do not disable authenticated callbacks
  or reconciliation for already-started transactions.
- Rotate credentials immediately if a secret is exposed and ask eService to revoke
  the old credentials.

