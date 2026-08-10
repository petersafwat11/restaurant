# Admin PWA hardening and closed-app web push

## Goal

Remove the Windows admin-build failure, make repository lint pass, and add opt-in Web Push notifications for new orders so an installed/admin PWA can alert staff while the dashboard is closed.

## Implementation plan

1. **Make standalone builds platform-safe**
   - Keep Next.js `output: "standalone"` on Linux, which is required by the production Docker image.
   - Disable standalone output only for native Windows builds, where Next.js's final traced-file symlink copy fails with `EPERM`; Windows will still produce the normal production `.next` build.
   - Preserve the existing service-worker headers and monorepo file-tracing settings.

2. **Clear the current lint backlog**
   - Apply Biome formatting only to the 20 files currently reported by the admin lint task.
   - Correct the seven React hook dependency diagnostics in the orders, page-title, and promotions code without suppressions or behavior changes.
   - Run `pnpm lint` from the repository root and resolve any remaining diagnostics it exposes.

3. **Add secure per-device Web Push subscriptions**
   - Add shared Zod DTOs for subscribing/unsubscribing and typed API-client methods.
   - Add a Prisma `WebPushSubscription` model related to `User`, with a migration and regenerated client. Store only the browser endpoint and public subscription keys; cascade-delete with the user.
   - Add authenticated admin subscription endpoints protected with `@Permissions('order:read')`; each user can create/update or remove only their own device subscription.
   - Add VAPID configuration to API/admin env validation, example env files, Turborepo env declarations, and production Docker Compose wiring. Missing keys will leave the feature visibly unconfigured instead of breaking application startup.

4. **Deliver new-order alerts through BullMQ**
   - Reuse the historical branch's web-push work as a reference, adapted to the current schema and current notification architecture; do not restore Expo/mobile, WhatsApp, or unrelated restaurant settings.
   - On `order.created`, resolve active users whose role permissions include `order:read`, then enqueue a Web Push job.
   - Send notifications from a dedicated processor using VAPID, validate every job payload with the shared jobs schema, and prune expired subscriptions on HTTP 404/410.
   - Include the order number/summary and a localized admin order URL; keep all sending outside request handlers.

5. **Complete the PWA user experience**
   - Extend the existing PWA settings card with a per-device background-alert control using the current design tokens and Polish/English translations.
   - Request browser notification permission only after the user clicks Enable, register the existing service worker, and synchronize enable/disable state with the API.
   - Add service-worker `push` and `notificationclick` handlers that show the alert while the app is closed and focus or open the correct localized order page.
   - Keep the existing in-dashboard realtime notification behavior intact, avoiding duplicate foreground browser alerts where practical.

6. **Verification**
   - Add API happy-path e2e coverage for subscription ownership/validation and unit coverage for staff targeting, queueing, delivery, and stale-subscription cleanup.
   - Add admin tests for subscription state and service-worker push/click contracts.
   - Run Prisma generate, root lint, relevant package typechecks/tests, the admin production build on Windows, and a browser visual/behavior check of Settings and the PWA service worker.
   - Confirm the Windows build exits successfully and document the required production VAPID key setup. A real push-service delivery test will be performed if valid VAPID keys and a browser subscription are available locally; otherwise the full boundary will be covered by tests and the remaining physical-device check will be stated explicitly.

## Expected result

- `pnpm --filter @repo/admin build` succeeds on Windows while Linux/Docker still emits standalone output.
- `pnpm lint` succeeds repository-wide.
- Authorized staff can enable or disable background new-order alerts per browser/device.
- New orders create visible OS/browser notifications even when the admin dashboard is closed, and clicking one opens the relevant order.
- Existing realtime, email, and SMS notification behavior remains unchanged.
