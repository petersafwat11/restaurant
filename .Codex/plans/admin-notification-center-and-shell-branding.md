# Admin notification center and shell branding

## Goal

Make the admin bell a complete desktop/mobile notification center, use the live restaurant name in
the sidebar, and simplify the sidebar footer to show only the signed-in staff role.

## Plan

1. Extend the staff new-order event handler to create one in-app notification per active user with
   `order:read`, emit the existing per-user realtime event, and continue queueing Web Push once per
   subscribed device. Keep authorization checks and Web Push retry/cleanup behavior intact.
2. Add admin TanStack Query hooks for notification list/count/read actions and realtime invalidation.
   Build an accessible bell panel that opens on click, shows unread count, loading/error/empty states,
   supports mark-one/mark-all read, and opens the related order. Size it as a desktop popover and a
   phone-width panel with touch-friendly rows.
3. Replace the translated `Test Kitchen` shell label with the restaurant name returned by the existing
   restaurant API, with a neutral localized fallback. Remove the sidebar footer avatar and user name,
   leaving the localized role and desktop collapse control.
4. Add Polish/English copy and focused API/admin tests for creation, realtime refresh, interactions,
   order navigation, responsive rendering, branding, and the simplified footer.
5. Run lint, typecheck, relevant unit/e2e tests, production builds, and desktop/mobile browser checks.
   Review the diff, commit with the repository convention, merge into `main`, and push `main` to GitHub.

## Expected result

- Clicking the bell opens a useful notification center on desktop and phones.
- New orders appear live for authorized staff, can be marked read, and open the correct order.
- Closed-app alerts continue through Web Push without duplicating alerts while the dashboard is open.
- The sidebar displays the configured restaurant name and only the staff role at the bottom.
- The validated implementation is merged and pushed to `main`.
