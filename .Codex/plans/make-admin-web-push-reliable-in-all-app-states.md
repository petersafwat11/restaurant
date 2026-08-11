# Make admin Web Push reliable in all app states

## Goal

Deliver every new-order Web Push notification on supported, enabled admin devices whether the PWA
is foregrounded, backgrounded, minimized, or fully closed.

## Plan

1. Remove the service worker's open-window suppression so every received push displays an Android
   system notification. Keep the unique order tag, same-origin click validation, and order deep link.
2. Auto-activate new service-worker versions and bump the cache version so installed devices adopt
   the corrected delivery behavior without remaining on the stale worker.
3. Harden subscription lifecycle handling: wait for an active service worker before subscribing and
   reconcile an existing browser subscription back to the API on refresh, preventing a device from
   showing “enabled” when the server no longer has its subscription.
4. Extend service-worker and Web Push hook tests for foreground/background delivery rules, automatic
   activation, new subscriptions, and existing-subscription reconciliation.
5. Run lint, typecheck, tests, production builds, and container checks; commit, merge, push, monitor
   production deployment, and verify the live worker contains the corrected behavior.

## Expected result

- Foreground dashboard: the notification appears in the bell and as an Android system notification.
- Background/minimized dashboard: Android displays the system notification.
- Fully closed dashboard: Android displays the system notification.
- Tapping the notification focuses or opens the installed PWA at the correct order.
- Installed devices automatically move from the stale suppressing worker to the corrected worker.
