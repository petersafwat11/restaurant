# Audit log coverage — decorate all dropdown resources

## Goal
The admin audit log page (`apps/admin/src/app/(dashboard)/audit-log/page.tsx`) currently shows nothing because only 4 endpoints across orders + payments are decorated with `@AuditAction`. Expand coverage to every resource listed in the page's filter dropdown:

`order`, `payment`, `menu_item`, `menu_category`, `promotion`, `staff`, `review`, `reservation`, `settings`

Action names already exist in `packages/types/src/audit.ts` (`AUDIT_ACTIONS`). Map each endpoint to one of those.

Folds in **option A** from earlier discussion (fix `order:refund` writing `restaurantId: null`).

## Design — extend `@AuditAction` decorator

Today (`apps/api/src/audit-log/audit.decorator.ts`):
```ts
AuditAction(action, resourceType, idFrom = 'id')
```

Change to options object so we can also tell the interceptor where to read `restaurantId` from when it's not on `result.restaurantId`:
```ts
AuditAction(action, resourceType, opts?: { idFrom?: string; restaurantIdFrom?: string })
```

`restaurantIdFrom` accepts paths: `'params.id'`, `'params.restaurantId'`, `'body.restaurantId'`, `'result.<key>'`. Default behaviour (when `restaurantIdFrom` is omitted) stays: result.restaurantId → params.restaurantId → body.restaurantId.

Update `audit.interceptor.ts::extractRestaurantId()` to honour the explicit path before falling back to the default.

Update the 4 existing call sites to the new signature.

## Endpoints to decorate

### orders (already done)
- `POST /orders` → `order:create` / `order` ✅
- `POST /orders/:id/status` → `order:status_changed` / `order` ✅
- `POST /orders/:id/notes` → (no matching AUDIT_ACTION — `order:note_added` is *not* in the enum). **Decision: add `'order:note_added'` to `AUDIT_ACTIONS`** since the code already uses it.

### payments
- `POST /payments/:paymentId/refunds` → `order:refund` / `payment`
  - Fix tagging: `RefundDto` has no `restaurantId`. Change `payments.refund()` service to return `{ ...refund, restaurantId }` (looked up from the payment's order). Then default extractor works. **Alternative considered:** add `restaurantIdFrom: 'result.payment.order.restaurantId'`, but enriching the response is cleaner and one-line.

### menu (all CRUD; DTOs have `restaurantId` except modifier groups/options and delete responses)
- `POST /menu/categories` → `menu:category:write` / `menu_category`
- `PATCH /menu/categories/:id` → `menu:category:write` / `menu_category`
- `DELETE /menu/categories/:id` → `menu:category:delete` / `menu_category`
- `POST /menu/items` → `menu:item:write` / `menu_item`
- `PATCH /menu/items/:id` → `menu:item:write` / `menu_item`
- `DELETE /menu/items/:id` → `menu:item:delete` / `menu_item`
- `POST /menu/items/:id/availability` → `menu:item:write` / `menu_item`

Reorder, image, modifier-group/option endpoints: **skip** — too granular, not in dropdown.

For DELETE endpoints (response is `{success:true}` with no `restaurantId`), change the service `deleteItem`/`deleteCategory` to look up the row first and return `{ success: true, restaurantId, id }`. Update the controllers and `MenuDeleteResponseSchema` accordingly (or just stop returning a strict schema and let the controller return `{success, restaurantId, id}` inline).

### promotions (PromotionDto/CouponDto have `restaurantId`)
- `POST /promotions` → `promotion:write` / `promotion`
- `PATCH /promotions/:id` → `promotion:write` / `promotion`
- `DELETE /promotions/:id` → `promotion:delete` / `promotion` (same delete-response treatment as menu)
- `POST /promotions/:id/archive` → `promotion:write` / `promotion`
- `POST /promotions/:id/unarchive` → `promotion:write` / `promotion`

Coupons CRUD (`POST/DELETE /coupons`): skip — not in dropdown, can revisit later.

### staff
StaffMemberDto has no `restaurantId`. The staff controller acts in the caller's restaurant scope (derived in service from `user.id`).
- `POST /admin/staff/invite` → `staff:invite` / `staff`, `restaurantIdFrom: 'body.restaurantId'` (InviteStaffDto has it)
- `PATCH /admin/staff/:userId/role` → `staff:role_change` / `staff`, idFrom='userId'. **restaurantId source:** change service `updateRole()` to return `{ ...member, restaurantId }`. Use default extractor.
- `POST /admin/staff/:userId/deactivate` → `staff:deactivate` / `staff`, same treatment
- `POST /admin/staff/:userId/reactivate` → `staff:reactivate` / `staff`, same treatment

### reservations (ReservationDto has `restaurantId`)
- `POST /reservations/:id/cancel` → `reservation:cancel` / `reservation`
- `POST /reservations/:id/seat` → `reservation:seat` / `reservation`
- `POST /reservations/:id/complete` → `reservation:complete` / `reservation`
- `POST /reservations/:id/no-show` → `reservation:no_show` / `reservation`

Skip create/update/move/tables — not the dropdown's core "actions" semantics (create is implicit, table CRUD is settings-ish).

### reviews (ReviewDto has `restaurantId`)
- `PATCH /admin/reviews/:id` → `review:moderate` / `review`
- `POST /admin/reviews/:id/reply` → `review:moderate` / `review`
- `DELETE /admin/reviews/:id` → `review:moderate` / `review` (response is `ReviewDto` since `setVisibility` returns the row — no extra work)

### settings (route `/admin/restaurants/:id/...`)
- `PATCH /admin/restaurants/:id/settings` → `settings:write` / `settings`, `idFrom: 'restaurantId'`, default extractor works (RestaurantSettingsDto has `restaurantId`)
- `POST /admin/restaurants/:id/holidays` → `settings:write` / `settings`, `idFrom: 'restaurantId'`
- `DELETE /admin/restaurants/:id/holidays/:date` → `settings:write` / `settings`, `idFrom: 'restaurantId'`, `restaurantIdFrom: 'params.id'`

## Files to change

1. `packages/types/src/audit.ts` — add `'order:note_added'` to `AUDIT_ACTIONS`
2. `apps/api/src/audit-log/audit.decorator.ts` — options-object signature, add `restaurantIdFrom`
3. `apps/api/src/audit-log/audit.interceptor.ts` — honour `restaurantIdFrom` path
4. `apps/api/src/orders/orders.controller.ts` — update 3 call sites to new signature
5. `apps/api/src/payments/payments.controller.ts` — update 1 call site
6. `apps/api/src/payments/payments.service.ts` — `refund()` returns `{...refund, restaurantId}`
7. `apps/api/src/menu/menu.controller.ts` — add decorators on 7 endpoints
8. `apps/api/src/menu/menu.service.ts` — `deleteItem`/`deleteCategory` return `{success, id, restaurantId}`
9. `apps/api/src/promotions/promotions.controller.ts` — decorators on 5 endpoints
10. `apps/api/src/promotions/promotions.service.ts` — `remove()` returns `{success, id, restaurantId}`
11. `apps/api/src/staff/staff.controller.ts` — decorators on 4 endpoints
12. `apps/api/src/staff/staff.service.ts` — `updateRole`/`deactivate`/`reactivate` enrich response with `restaurantId`
13. `apps/api/src/reservations/reservations.controller.ts` — decorators on 4 endpoints
14. `apps/api/src/reviews/reviews.controller.ts` — decorators on 3 endpoints
15. `apps/api/src/settings/settings.controller.ts` — decorators on 3 endpoints

DTOs in `packages/types/src` may need optional `restaurantId` added to response schemas where we enriched the service output, OR the controller returns a wider type than its schema (Zod parses input only — output isn't validated against the schema in this project).

## Out of scope

- Auth events (register/login/password-reset). Could be added in a follow-up; user's dropdown doesn't include `user`/`auth` resource type.
- Loosening the admin page's `restaurantId` filter (was option B earlier; user picked A only).
- Modifier-group/option, image, reorder, table CRUD.
- Frontend changes — none needed; the page already filters correctly.

## Verification

After implementing, manual smoke test:
1. Log in as owner/manager.
2. Perform: create category, create item, toggle availability, create promotion, archive promotion, moderate a review, cancel a reservation, update settings.
3. Visit `/audit-log` — all should appear.
4. Run query `SELECT action, "resourceType", "restaurantId" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 30;` — confirm no `restaurantId` is null for the decorated endpoints.
