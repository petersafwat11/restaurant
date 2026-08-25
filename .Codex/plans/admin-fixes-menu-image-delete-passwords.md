# Plan: Admin fixes — menu image update, staff hard delete, password management

Four issues, three shared areas (menu editor, staff page, settings).

---

## 1. Fix: menu item image changes don't stick (bug)

**Root cause** — `apps/admin/src/app/[locale]/(dashboard)/menu/page.tsx:73` stores a
*snapshot* of the clicked item in `drawerState` (`setDrawerState({ mode: 'edit', item })`).
Image add/remove/reorder mutations invalidate and refetch `menuQueryKeys.tree()`, but the
drawer keeps rendering the stale snapshot (`item.images` in `ImagesSection`,
`item-editor-drawer.tsx:247`) — so new/removed images never appear and saving looks broken.

**Fix**
- `MenuPage`: keep only `{ mode: 'edit', itemId }` in drawer state; derive the live
  `MenuItemDto` from fresh tree data via id lookup each render.
- Drawer props stay the same; it now always receives current data.

## 2. Staff page: Disable/Enable → hard Delete

**API** (`apps/api/src/staff/`)
- Add `DELETE /admin/staff/:userId` (owner-only service check like `create`, `staff:write`
  permission, audit log entry).
- Hard delete in one transaction:
  - `review.deleteMany({ userId })` first (Review FK is RESTRICT),
  - orphan cleanup for relation-less columns: `CustomerNote` (userId/byUserId), `UserTag`,
  - `user.delete()` — cascades roles, refresh tokens, addresses, payment methods,
    notifications, push/web-push tokens, loyalty, referrals; orders/carts/reservations are
    SET NULL per schema.
- Remove `deactivate`/`reactivate` endpoints + service methods (only used by staff page).

**Frontend**
- `packages/api-client`: replace `deactivate/reactivate` with `remove(userId)`.
- `features/staff/hooks`: drop deactivate/reactivate hooks, add `useDeleteStaff`.
- `staff/page.tsx`: single "Delete" action → confirmation modal (`ActionModal`); hide for
  self; keep role select as-is. Status column keeps showing invited/active state.

## 3. Owner sets any user's password (staff + customers)

- `packages/types/src/user.ts`: `AdminSetUserPasswordSchema = { newPassword: PasswordSchema }`.
- Permissions (per AGENTS.md): add `'user:set_password'` to
  `packages/types/src/permissions.ts` PERMISSION_KEYS **and** `packages/db/seed.ts`
  ALL_PERMISSIONS (lists must stay in sync). Only owner holds it (owner = all keys);
  requires seed re-run — will note in summary.
- API (`users.controller.ts` / `users.service.ts`): `POST users/:id/password`
  with `@Permissions('user:set_password')` + audit; service re-verifies actor has `owner`
  role (defense-in-depth, mirrors `StaffService.create`), hashes, revokes target's refresh
  tokens.
- api-client: `users.setPassword(userId, input)`.
- UI (gated on `has('user:set_password')`, i.e. owner):
  - Staff row action "Set password" → small modal with new-password field.
  - Customer drawer header button "Set password" → same modal component
    (`SetPasswordModal`, shared in `features/staff/components` or `lib`).

## 4. Settings: self-service password change

- New hook `useChangeOwnPassword()` wrapping existing `POST /users/me/change-password`.
- New `AccountPasswordCard` in `features/settings/components` (current / new / confirm
  fields), rendered on `/settings` page grid. All users can change their own password —
  no permission gate needed beyond being logged in.

## i18n

Add keys (en + pl): `admin.staff` actions/delete + setPassword modal strings;
`admin.customers.detail` setPassword strings; `admin.settings.general.account.*`.

## Tests

- e2e (Vitest + supertest-style inject, pattern of `test/staff-create.e2e-spec.ts`):
  - happy path owner deletes staff → user gone from DB, tokens revoked;
  - user with review → review removed, delete succeeds;
  - non-owner gets 403; owner sets customer/staff password → old password rejected,
    new works; non-owner 403.
- Update admin unit test `features/staff/components/__tests__` if it touches buttons.

## Verification

- `pnpm --filter @repo/types build && pnpm --filter api-client build` (schema consumers)
- `pnpm --filter api test:e2e` (needs local DB)
- `pnpm --filter admin test` + biome lint/typecheck on touched apps.

## Assumptions to confirm

1. Hard-deleting a user **permanently deletes their reviews** (FK restrict leaves no other
   option short of anonymising). Acceptable?
2. Deactivate/Enable feature removed entirely (UI + API), since Delete replaces it.
