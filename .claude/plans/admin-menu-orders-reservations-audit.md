# Admin pages audit: Menu · Orders · Reservations

**Goal:** make these three sections end-to-end perfect — every button wired, no dead code, no UX dead ends, no money/timezone footguns. This plan is *audit + fix list*; implementation requires approval per `CLAUDE.md`.

---

## Scope (audited files)

| Section | Pages | Feature dir | Backend module |
|---|---|---|---|
| Menu | `menu/page.tsx`, `menu/categories/page.tsx`, `menu/items/page.tsx`, `menu/items/[id]/page.tsx` | `features/menu/**` | `apps/api/src/menu/**` + `uploads` |
| Orders | `orders/page.tsx`, `orders/kitchen/page.tsx`, `orders/[id]/page.tsx` | `features/orders/**`, `features/kitchen/**` | `apps/api/src/orders/**`, `apps/api/src/payments/**`, realtime gateway |
| Reservations | `reservations/page.tsx`, `reservations/[id]/page.tsx` | `features/reservations/**` | `apps/api/src/reservations/**` |

---

## Component trees (high level)

### Menu
```
menu/page.tsx (MenuPage)
├── RequirePermission(menu:read)
├── TwoPaneLayout
│   ├── CategoriesPane (features/menu/components/categories-pane.tsx)
│   │   └── DragReorderList → CategoryRow (InlineEdit + delete)
│   └── ItemsList (features/menu/components/items-list.tsx)
│       ├── FilterPillGroup
│       └── DataTable (image/name/price/dietary/availability switch)
├── ItemEditorDrawer (item-editor-drawer.tsx)
│   ├── SectionedDrawerBody: Details, Dietary, Images, Modifiers
│   └── ModifierGroupsEditor → ModifierGroupCard → ModifierOptionRow
└── DeleteCategoryModal (delete-category-modal.tsx)
```

`menu/categories/page.tsx`, `menu/items/page.tsx`, `menu/items/[id]/page.tsx` → **all three return `null`** (TODO stubs).

### Orders
```
orders/page.tsx (OrdersPage)
├── PageHeader: LivePulseChip + OrdersFilters + SoundToggle
├── DataTable (buildOrderColumns → StatusPill, elapsed timer, row-actions ⋮)
├── BulkActionBar (Advance / Print receipts / Cancel)
├── OrderDetailDrawer  → OrderDrawerBody
├── RefundModal / CancelModal / KeyboardShortcuts

orders/kitchen/page.tsx → redirect('/kds')   ← intentional

orders/[id]/page.tsx (AdminOrderDetailPage)
├── Header: back, status pill, Advance, Refund, Cancel, Print
├── OrderDrawerBody (items / pricing / payment / customer / timeline)
└── Add-note section
```

### Reservations
```
reservations/page.tsx (AdminReservationsPage)
├── EmptyState (no restaurantId)
├── View tabs (Day / Week / Month / List)
├── "New reservation" button   ← DEAD
├── Conflict banner (inline 409)
└── Either ReservationCalendar (drag-to-move in Day only) or ReservationsList

reservations/[id]/page.tsx (AdminReservationDetailPage)
├── Header: back, status badge, Seat / Complete / No-show
├── Booking card (with table reassignment select)
├── Customer + Timeline cards
└── Cancel sidebar (reason textarea + button)
```

---

## Status matrix

Legend: ✅ wired & working · ⚠️ wired but rough/buggy · ❌ dead / not wired

### Menu

| Surface | Action | Status | Notes |
|---|---|---|---|
| Categories pane | Add category | ⚠️ | Uses `window.prompt()` — `menu/page.tsx:73` |
| Categories pane | Inline rename | ✅ | `PATCH /menu/categories/{id}` |
| Categories pane | Drag reorder | ✅ | `POST /menu/categories/reorder` |
| Categories pane | Delete (no items) | ✅ | `DELETE /menu/categories/{id}` |
| Categories pane | Delete (with items, move to sibling) | ❌ | **Broken** — `delete-category-modal.tsx:42,62-66` casts `useUpdateMenuItem(id='')` to a `{itemId,categoryId}` shape; resolves to `PATCH /menu/items/` (empty id) with wrong body. Errors swallowed by `.catch(() => {})`. Items orphan or category fails. |
| Items list | Filter pills (all/available/unavailable/featured) | ✅ | Client-side |
| Items list | Availability switch | ✅ | `POST /menu/items/{id}/availability` |
| Items list | New item / row click → drawer | ✅ | |
| Item drawer | Save (create/edit), Delete, dietary, slug, calories, prep | ✅ | |
| Item drawer | `compareAt` price | ❌ | Field exists in `CreateMenuItemSchema` but not in drawer UI |
| Item drawer | Image upload / reorder / delete | ✅ | uses `useUploadImage` + image endpoints |
| Item drawer | Modifier group CRUD | ✅ | |
| Item drawer | Modifier option add / edit / delete | ✅ | |
| Item drawer | Modifier option drag-reorder | ❌ | `modifier-groups-editor.tsx:148` — `onReorder` is empty TODO; no backend endpoint exposed in api-client |
| Item drawer | ModifierGroupsEditor error state | ⚠️ | Spinner shows forever on detail-query error |
| Routes | `/menu/categories`, `/menu/items`, `/menu/items/[id]` | ❌ | Stub `null` pages — bookmarkable dead ends |
| Hook | `useReorderItems` | ❌ | Exported, never imported anywhere |

### Orders — list page

| Surface | Action | Status | Notes |
|---|---|---|---|
| Realtime | `useLiveAdminOrders` joins `ROOMS.restaurantOrders(...)`, patches `order.created` / `order.status_changed` | ✅ | No polling — correct per CLAUDE.md |
| Realtime | `useOrderChime` + `useOrderNotifications` | ⚠️ | `restaurantName` not passed → generic "You have a new order" — `orders/page.tsx:84` |
| Realtime | `isNew` flag set on incoming orders | ⚠️ | Never rendered — no visual highlight on new rows |
| Filters | Status radios 1-8, search (250ms debounce) | ✅ | |
| Table | Row click → drawer, StatusPill advance | ✅ | `POST /orders/:id/status` |
| Bulk bar | "Advance" (multi-select) | ⚠️ | No permission gate, **no confirm dialog**, no progress feedback |
| Bulk bar | "Print receipts" | ❌ | `onClick: () => {}` — `orders/page.tsx:162` |
| Bulk bar | "Cancel" (1 only) | ✅ | Opens CancelModal |
| Money | `selectedTotal = reduce(..., s + Number(r.grandTotal), 0)` | ❌ | **Violates `CLAUDE.md` money rule** — `orders/page.tsx:105`. Needs `Decimal` / `toDecimal` from `packages/utils/money.ts`. |
| Pagination | `total = items.length + (nextCursor ? pageSize : 0)` | ⚠️ | Inflated when last page is short — `orders/page.tsx:311` |
| Keyboard | `/` `?` `1-8` `Ctrl+A` `J/K/↑/↓` `Enter` `Space` | ✅ | |
| Row ⋮ menu | `onRowActions: () => {}` | ❌ | Placeholder no-op — `orders/page.tsx:123` |

### Orders — detail page

| Surface | Action | Status | Notes |
|---|---|---|---|
| Realtime | Subscribe to `order:{orderId}` | ❌ | **Violates `CLAUDE.md` §realtime** — `orders/[id]/page.tsx:40` uses `useOrder(id)` not `useOrderTracking(id)`. Status changes invisible until refresh. |
| Header | Back link | ✅ | |
| Header | Advance to next status | ✅ | `POST /orders/:id/status` |
| Header | Refund (gated `payment:refund`) | ✅ | RefundModal → `POST /payments/:paymentId/refunds` |
| Header | Cancel (gated `order:cancel`) | ✅ | CancelModal → status=CANCELLED |
| Header | Print | ❌ | No `onClick` — `orders/[id]/page.tsx:160` |
| Add note | Submit | ⚠️ | Textarea not disabled while pending — `orders/[id]/page.tsx:175` |
| Keyboard | `Esc R C N` | ✅ | No feedback when shortcut fires but is disallowed |

### Orders — kitchen redirect

| Surface | Status |
|---|---|
| `/orders/kitchen` → `redirect('/kds')` | ✅ Intentional alias |

### Reservations — list page

| Surface | Action | Status | Notes |
|---|---|---|---|
| View tabs | Day / Week / Month / List | ✅ | |
| Calendar | Block click → detail | ✅ | |
| Calendar | Drag-to-move (Day) | ✅ | `POST /reservations/:id/move`, 409 → inline banner |
| Calendar | Drag-to-move (Week / Month) | ❌ | `onMove` prop passed but only DayView wires it — `packages/ui/src/reservation-calendar/index.tsx:115-141` |
| Header | **"New reservation" button** | ❌ | `<Link href="#new">` — no route, no modal, no handler — `reservations/page.tsx:142-147` |
| List view | Row click → detail | ✅ | |
| List view | Table column | ⚠️ | Shows raw `tableId` instead of name — `reservations/page.tsx:288` |
| Constants | `STATUS_TOKENS` (lines 22-31) | ❌ | Defined, never read — `ReservationStatusBadge` redefines the same mapping inline |
| Dates | `toLocaleString()` everywhere | ⚠️ | No `timeZone` arg → uses admin's browser TZ, not restaurant's |

### Reservations — detail page

| Surface | Action | Status | Notes |
|---|---|---|---|
| Header | Back link | ✅ | |
| Header | Seat (requires table) | ✅ | `POST /reservations/:id/seat` |
| Header | Complete | ✅ | `POST /reservations/:id/complete` |
| Header | No-show | ✅ | `POST /reservations/:id/no-show` |
| Booking | Table reassign select | ✅ | Local state; user must click Seat (intentional, but no inline hint) |
| Cancel | Reason textarea + button | ⚠️ | No confirm dialog; **backend route lacks `@Permissions` decorator** (service still checks owner/admin, so works, but defense-in-depth weak) — `apps/api/src/reservations/reservations.controller.ts:110-122` |
| Dates | `toLocaleString()` everywhere | ⚠️ | Same TZ issue as list page |
| Destructive UX | Seat / Complete / No-show / Cancel | ⚠️ | All fire immediately — no confirm step |

---

## Bugs ranked by severity

### Critical — break functionality or violate `CLAUDE.md` rules

1. **Order detail page is not realtime.** `useOrder(orderId)` instead of `useOrderTracking(orderId)`. Status changes from kitchen/courier won't appear until a refetch is triggered by something else.
   *File:* `apps/admin/src/app/(dashboard)/orders/[id]/page.tsx:11,40`
2. **Order list bulk-total uses `Number()` on money strings.** Floating-point loss. `selectedTotal = reduce(..., s + Number(r.grandTotal), 0)`.
   *File:* `apps/admin/src/app/(dashboard)/orders/page.tsx:105`
3. **Delete-category "move items to sibling" is broken.** Hook is pre-bound with empty id then type-cast to a different signature; resulting request is `PATCH /menu/items/` with the wrong body. Errors swallowed by `.catch(() => {})`. Possible data orphaning.
   *File:* `apps/admin/src/features/menu/components/delete-category-modal.tsx:42,59-70`
4. **"New reservation" button is dead.** `<Link href="#new">` — no route, no modal. Admins cannot create reservations through the UI at all.
   *File:* `apps/admin/src/app/(dashboard)/reservations/page.tsx:142-147`

### High — broken UX / missing features

5. **Modifier-option drag-reorder is a no-op.** Order reverts on reload. Backend endpoint not exposed in api-client.
   *File:* `apps/admin/src/features/menu/components/modifier-groups-editor.tsx:148-152`
6. **Print buttons (×2) are dead.** Both list and detail order pages have a Print button with no handler.
   *Files:* `orders/page.tsx:162`, `orders/[id]/page.tsx:160`
7. **Bulk-advance on orders has no permission gate and no confirm.** One click changes N orders.
   *File:* `apps/admin/src/app/(dashboard)/orders/page.tsx:149-173`
8. **Category creation uses `window.prompt()`** — no slug field, easy to dismiss, doesn't match the rest of the admin's look.
   *File:* `apps/admin/src/app/(dashboard)/menu/page.tsx:73`
9. **Three stub routes render blank pages.** Bookmarkable dead ends.
   *Files:* `menu/categories/page.tsx`, `menu/items/page.tsx`, `menu/items/[id]/page.tsx`
10. **Drag-to-move only works in Day view** but the calendar implies it works everywhere. Either implement or document.
    *File:* `packages/ui/src/reservation-calendar/index.tsx:115-141`
11. **`useOrderNotifications` missing `restaurantName`.** Browser notification says "You have a new order" instead of naming the restaurant.
    *File:* `apps/admin/src/app/(dashboard)/orders/page.tsx:84`

### Medium — degraded UX / data correctness

12. **Reservation date display ignores restaurant timezone.** All `toLocaleString()` calls use the browser's local TZ. Multi-location admins see wrong times.
    *Files:* `reservations/page.tsx:269-275`, `reservations/[id]/page.tsx:148-226`
13. **Note textarea on order detail not disabled during submit.** Double-submit possible.
    *File:* `orders/[id]/page.tsx:175-183`
14. **`isNew` flag set on incoming orders but never rendered.** New-row highlight wasted.
    *File:* `apps/admin/src/features/orders/hooks/use-live-admin-orders.ts:64`
15. **Pagination total inflated** when last page is shorter than `pageSize`.
    *File:* `orders/page.tsx:311`
16. **Cancel-reservation backend endpoint missing `@Permissions` decorator.** Service still enforces owner-or-admin, so it works, but the route should match siblings (`seat`, `move`, `complete`, `no-show` all use the decorator).
    *File:* `apps/api/src/reservations/reservations.controller.ts:110-122`
17. **`menu:read` frontend gate has no backend counterpart** (all read endpoints `@Public`). Either remove the gate or require the permission on the API.
    *File:* `apps/admin/src/app/(dashboard)/menu/page.tsx:62`
18. **List view shows raw `tableId` instead of table name.**
    *File:* `apps/admin/src/app/(dashboard)/reservations/page.tsx:288`
19. **Item drawer missing `compareAt` price field** even though schema supports it.
    *File:* `features/menu/components/item-editor-drawer.tsx`
20. **No confirm dialog on destructive reservation actions** (Cancel / Complete / No-show).

### Low — polish

21. **`ModifierGroupsEditor` Min/Max number inputs fire on every keystroke.** Should debounce.
22. **Item drawer `calories` / `prepMinutes` parse via `Number()` — produces `NaN` on bad input.**
23. **`onRowActions` row ⋮ menu is a placeholder no-op.**
    *File:* `orders/page.tsx:123`
24. **`ModifierGroupsEditor` shows spinner forever when item detail fetch fails.**
25. **Reservation list `STATUS_TOKENS` constant defined and unused.**
    *File:* `reservations/page.tsx:22-31`
26. **Unused hook export `useReorderItems`.**

---

## Dead code to delete (after fixing above)

- `apps/admin/src/app/(dashboard)/menu/categories/page.tsx` — stub
- `apps/admin/src/app/(dashboard)/menu/items/page.tsx` — stub
- `apps/admin/src/app/(dashboard)/menu/items/[id]/page.tsx` — stub
- `apps/admin/src/features/menu/hooks/use-reorder-items.ts` — exported, never used
- `STATUS_TOKENS` constant in `reservations/page.tsx:22-31`
- `onRowActions` placeholder in `orders/page.tsx:123` (or replace with real menu)
- The empty `onClick: () => {}` "Print receipts" bulk action — remove until print is real

Each requires a matching audit pass to confirm no other consumer.

---

## Proposed fix plan (ordered)

### Wave 1 — critical correctness (~half day)

1. **Orders detail realtime** — swap `useOrder` → `useOrderTracking` in `orders/[id]/page.tsx`.
2. **Bulk-total Decimal math** — import `toDecimal` / `Decimal` from `@repo/utils`; replace `s + Number(r.grandTotal)` in `orders/page.tsx:105`; render via `formatMoney(decimal.toFixed(2), …)`.
3. **Delete-category move-items fix** — drop the cast; call `getApiClient().menu.items.update(item.id, { categoryId: moveTo })` directly (or add a proper batch endpoint). Stop swallowing errors. Block delete on partial failure.
4. **New reservation flow** — decide: (a) new route `/reservations/new` with a `CreateReservationDto`-driven form, or (b) modal opened from the existing button. My recommendation: **route + form**, because the same shape is reusable for `/reservations/[id]/edit` later. Wire `useCreateReservation`, navigate back on success, refetch list.

### Wave 2 — high-impact UX / safety (~1 day)

5. **Permission-gate bulk Advance** + add a confirm dialog (use existing `ActionModal`).
6. **Implement or remove Print** in both order pages. Recommended: implement minimal `window.print()` of a print-friendly receipt view, or delete the buttons. Don't keep stubs.
7. **Replace `window.prompt`** for category create with a small modal (name + auto-slug + optional override).
8. **Modifier-option reorder** — add backend endpoint + api-client method + `useReorderModifierOptions(groupId)`; wire `onReorder` in `modifier-groups-editor.tsx`.
9. **Decide on Week/Month drag** — either implement in `ReservationCalendar` or remove the `onMove` prop from those view-mode call sites and surface a tooltip "drag available in Day view".
10. **Resolve stub menu routes** — implement or `redirect('/menu')`.

### Wave 3 — data correctness / polish (~half day)

11. **Reservation timezone** — read `timezone` from the restaurant entity, wrap all `toLocaleString` calls via a shared `formatRestaurantDateTime(d, restaurant)` helper using `Intl.DateTimeFormat`.
12. **Add `@Permissions('reservation:write')` to cancel endpoint** to match siblings.
13. **Pass `restaurantName` to `useOrderNotifications`** from the active restaurant store.
14. **Render `isNew` highlight** on order list rows (border / pulse).
15. **Disable note textarea while submitting**.
16. **Fix pagination total** — drop the estimate; fetch `pageSize + 1` and show "more available" instead of a count.
17. **Add `compareAt` to item editor drawer** + form schema.
18. **Confirm dialogs on Cancel / Complete / No-show** in reservation detail.
19. **Show table name (not id)** in reservation list view.
20. **Resolve `menu:read` gate** — pick a side and align.

### Wave 4 — polish & dead-code purge (~2 hours)

21. Debounce ModifierGroup Min/Max inputs.
22. Harden `Number()` parsing in item drawer (`'' → null`, `NaN → 0`).
23. Add error state to `ModifierGroupsEditor` when item-detail fetch fails.
24. Delete unused `STATUS_TOKENS`, `useReorderItems`, `onRowActions` no-op.
25. Remove stub menu route files (after step 10).

---

## Out of scope (flag, don't fix here)

- Implementing a full row-actions menu in the orders table — design decision.
- A proper print/receipt PDF pipeline — Sprint topic.
- Optimistic UI for status transitions — needs design.
- Multi-restaurant timezone settings if the field doesn't already exist on `Restaurant` — verify schema first.

---

## Approval needed

Before I touch any code, please confirm:

- **Scope:** all four "Critical" items + all "High" items? Or trim?
- **New reservation:** modal vs. `/reservations/new` route?
- **Print buttons:** implement minimal `window.print()` or delete?
- **Stub menu routes:** delete files or `redirect('/menu')`?
- **Drag-to-move in Week/Month:** implement or remove?

Once you pick, I'll work the plan top-to-bottom in waves and open a PR per wave.
