# Admin Dashboard — Port from Claude Design + Phase B Composition

> Target: take everything from `claude-design/` (Overview, Orders, Menu pages + 18 primitives), bring them into the repo with our architecture, then compose Phase B pages (Customers → Promotions) on top, and end-to-end wire everything to the existing backend.
>
> Scope: **admin app only.** The dark palette and tokens defined here are admin-exclusive. Web (customer) and mobile will get a separate, lighter design system later — kept isolated via the theme architecture in Phase 0.

---

## 0. Guiding constraints (non-negotiable)

Pulled from `CLAUDE.md` + `docs/design-prompts/README.md` §4/§9. Everything below assumes these:

- **Plan-first** — each phase below produces a concrete deliverable list; we approve a phase before starting the next.
- **`@repo/ui` is theme-agnostic.** Primitives only reference *semantic* tokens (`bg-surface`, `text-primary`, `border-strong`, `accent`), never literal hex. This is what keeps the admin-only palette from leaking into the web/mobile customer apps later.
- **All DTOs from `@repo/types`.** No re-declared shapes in admin features. `@repo/api-client` (1613 lines, already complete) is the only HTTP layer.
- **Real-time via `@repo/realtime-client`.** Orders list and KDS subscribe to rooms; no polling for order status.
- **Permissions** — every action button calls `usePermissions()`. Backend re-checks via `@Permissions(...)`.
- **Money** uses `Decimal` + `packages/utils/money.ts`. `formatMoney` enforces `minimumFractionDigits: 2`.
- **Side effects (uploads, exports, emails)** route through BullMQ queues in `@repo/jobs`.
- **No raw SQL, no client-trusted prices, no hardcoded URLs, no payment card storage.** All in CLAUDE.md.

---

## 1. Theme architecture (the load-bearing decision)

**Problem:** the admin uses a dark mint/purple palette (README §4). Web + mobile customer apps will use a different palette. `@repo/ui` is shared — primitives must not embed admin colors.

**Decision: semantic CSS variables, per-app overrides.**

1. **Add semantic tokens to `@repo/tailwind-config/tailwind.preset.ts`** as CSS-variable-backed colors:
   ```ts
   colors: {
     bg:           "rgb(var(--bg) / <alpha-value>)",
     surface:      "rgb(var(--surface) / <alpha-value>)",
     "surface-2":  "rgb(var(--surface-elevated) / <alpha-value>)",
     border:       "rgb(var(--border) / <alpha-value>)",
     "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
     fg:           "rgb(var(--fg) / <alpha-value>)",       // text-primary
     "fg-muted":   "rgb(var(--fg-muted) / <alpha-value>)", // text-secondary
     "fg-subtle":  "rgb(var(--fg-subtle) / <alpha-value>)",
     "fg-disabled":"rgb(var(--fg-disabled) / <alpha-value>)",
     accent:       "rgb(var(--accent) / <alpha-value>)",
     "accent-hover":"rgb(var(--accent-hover) / <alpha-value>)",
     positive:     "rgb(var(--positive) / <alpha-value>)",
     negative:     "rgb(var(--negative) / <alpha-value>)",
     warning:      "rgb(var(--warning) / <alpha-value>)",
     info:         "rgb(var(--info) / <alpha-value>)",
   }
   ```
   Keep the legacy `brand`, `text`, `surface`, `accent` keys for now (web/mobile use them) — we'll rename in a later pass.

2. **Admin palette lives in `apps/admin/src/app/globals.css` `:root`** — the §4 hex values, expressed as space-separated RGB triples so `<alpha-value>` works:
   ```css
   :root {
     --bg: 11 13 18;
     --surface: 20 23 31;
     --surface-elevated: 26 30 39;
     --border: 255 255 255;          /* alpha applied via /6 etc. */
     --accent: 127 232 200;
     /* …rest of §4 */
   }
   ```
   Add status-color tokens (`--status-pending`, `--status-confirmed`, …) the same way so `StatusPill` is theme-driven.

3. **Web/mobile customer apps** get their own `:root` block later. Same semantic names, different hex.

4. **Status palette** lives in a typed map `packages/ui/src/tokens/status.ts` exporting `STATUS_TOKENS: Record<OrderStatus, { token: string; label: string }>`. Status hex is wrapped as a CSS var, not hardcoded.

5. **Mobile note.** NativeWind doesn't read CSS variables. `@repo/ui-mobile` will be a parallel primitive set with the same semantic names but a JS-object theme. We accept this duplication; it's the right boundary.

**Why this path (not className overrides per app):** every consumer of every primitive would otherwise need to pass theme classes. CSS vars push the variation to one place per app.

---

## 2. Conversion conventions (apply to every primitive port)

The Claude Design source is **vanilla JSX + global `window.Icon` + raw CSS classes + a single global `primitives.css`**. Each ported primitive needs:

- `.jsx` → `.tsx` with proper props typing. Generics for `DataTable<T>`, `DragReorderList<T>`, `FilterPillGroup<TId>`.
- `window.Icon.*` → `lucide-react` (already a likely dep — verify and add to `@repo/ui` if missing).
- **One source of truth for styling per primitive: Tailwind utilities backed by the semantic tokens.** No co-located CSS files. The few cases that need it (drawer animations, drag-reorder transforms) use Tailwind's `data-[state=open]` patterns or `framer-motion`.
- File layout: `packages/ui/src/<primitive>/index.tsx` (component), `packages/ui/src/<primitive>/types.ts` (only when there's a non-trivial public type), barrel re-export from `packages/ui/src/index.ts`.
- Use shadcn/ui as the **substrate where it adds value** (Dialog, Sheet/Drawer, Popover, Command, Select) — wrap it, don't bypass it. `DetailDrawer` = shadcn `Sheet` styled. `ActionModal` = shadcn `Dialog`. `Select`/`Combobox` for filter dropdowns. shadcn is a curated copy-in, so the components land in `packages/ui/src/_shadcn/` and we re-export the public primitives from `packages/ui/src/<name>/`.
- All components are server-component-safe by default; mark `"use client"` only where state/refs require it.
- Tests: every primitive gets a `*.test.tsx` (Vitest + Testing Library) covering keyboard nav, ARIA roles, and one render assertion. Visual ground truth = the screenshots in `claude-design/screenshots/`.

---

## 3. Phase 0 — Foundation (do first, ~1 day)

| # | Deliverable | Path | Notes |
|---|---|---|---|
| 0.1 | Extend Tailwind preset with semantic tokens | `tooling/tailwind-config/tailwind.preset.ts` | Adds the CSS-var-backed colors from §1. Don't remove existing keys. |
| 0.2 | Admin `:root` theme variables + base styles | `apps/admin/src/app/globals.css` | Port the §4 palette, status-color tokens, font setup (`font-feature-settings: "tnum"` on `body`), 8pt spacing utilities if any missing. |
| 0.3 | Install shadcn/ui scaffolding into `@repo/ui` | `packages/ui/` | `pnpm dlx shadcn-ui@latest init` aimed at `_shadcn/`. Add: `sheet`, `dialog`, `popover`, `command`, `select`, `dropdown-menu`, `tooltip`, `button`, `input`, `textarea`, `checkbox`, `switch`, `tabs`. Configure import alias and Tailwind path. |
| 0.4 | Install `lucide-react`, `cmdk`, `@dnd-kit/core`, `@dnd-kit/sortable`, `react-day-picker`, `recharts`, `@hello-pangea/dnd` (or pick `@dnd-kit`), `framer-motion`, `sonner` (toasts) in `@repo/ui` | `packages/ui/package.json` | Pick `@dnd-kit` for reordering — it's modern, accessible, keyboard-friendly. |
| 0.5 | Admin shell: Sidebar + Topbar + DashboardLayout | `apps/admin/src/app/(dashboard)/layout.tsx`, `apps/admin/src/components/shell/sidebar.tsx`, `.../topbar.tsx` | Port `claude-design/shell.jsx`. Wire `usePermissions()` to filter nav items. Restaurant switcher uses `useRestaurantStore` (create if missing) backed by `GET /restaurants` from api-client. Search uses shadcn `cmdk` Command palette (`⌘K`). |
| 0.6 | Restaurant store + active-restaurant context | `apps/admin/src/stores/restaurant-store.ts` | Zustand. Persists last-selected `restaurantId`. Every feature hook reads from this. |
| 0.7 | `formatMoney`, `formatPrep`, `fmtPct`, `fmtInt`, `RelativeTime` helpers | `packages/utils/money.ts` (extend), `packages/utils/format.ts` (new), `packages/ui/src/relative-time/` | Money helper enforces `minimumFractionDigits: 2` — fixes the page-2 carry-over bug. |

**Exit gate:** an empty page inside `(dashboard)` renders with the dark theme, sidebar collapses < 1280px, topbar search opens command palette, restaurant switcher lists restaurants from the real API.

---

## 4. Phase 1 — Port the 18 primitives

Source file column = where it lives in `claude-design/`. Target = where it lands in the repo. Notes = what to type/refactor.

### From `primitives.jsx` (10 primitives + helper)

| Primitive | Source | Target | Notes / Type signature |
|---|---|---|---|
| `PageHeader` | `primitives.jsx` | `packages/ui/src/page-header/` | `{ title?: string; rows?: ReactNode[]; bulk?: ReactNode }`. Wrap in `<section>` with `sticky top-14`. |
| `FilterPillGroup<TId>` | `primitives.jsx` | `packages/ui/src/filter-pill-group/` | Generic over id type. `options: { id: TId; label: string; count?: number; color?: string; dot?: boolean }[]`. Color is a semantic token name, not hex. |
| `StatusPill` | `primitives.jsx` | `packages/ui/src/status-pill/` | Driven by `STATUS_TOKENS` map from `@repo/ui/tokens`. Optional `transitions: OrderStatus[]` + `onTransition(next: OrderStatus)` for the dropdown. Strongly type against `OrderStatus` from `@repo/types`. |
| `TypeBadge` | `primitives.jsx` | `packages/ui/src/type-badge/` | `{ value: OrderType }` from `@repo/types`. |
| `RelativeTime` | `primitives.jsx` | `packages/ui/src/relative-time/` | `{ value: Date \| string; tick?: 'sec' \| 'min' }`. Self-updating via `setInterval` cleanup. |
| `BulkActionBar` | `primitives.jsx` | `packages/ui/src/bulk-action-bar/` | `{ count: number; actions: Array<{ id: string; label: string; icon?: ReactNode; variant?: 'default'\|'destructive'; onClick(): void }>; onClear(): void }`. |
| `DetailDrawer` | `primitives.jsx` | `packages/ui/src/detail-drawer/` | Wrap shadcn `Sheet`. Slots: `header`, `footer`, `children`. Width prop. Focus-trap is built-in via Radix. Add `Esc` to close, focus-return on close. |
| `ActivityTimeline` | `primitives.jsx` | `packages/ui/src/activity-timeline/` | `{ entries: { id: string; at: Date; actor?: string; kind: 'status'\|'note'\|'system'; label: ReactNode }[] }`. |
| `ActionModal` | `primitives.jsx` | `packages/ui/src/action-modal/` | Wrap shadcn `Dialog`. `{ title; description; variant: 'default'\|'destructive'; confirmLabel; onConfirm; loading? }` + children for custom body (refund amount input, cancel reason, etc.). |
| `DataTable<T>` | `primitives.jsx` | `packages/ui/src/data-table/` | The biggest port. Props: `data: T[]`, `columns: ColumnDef<T>[]`, `rowKey(r)`, `selection?`, `pagination?`, `sort?`, `onRowClick?(r)`, `rowDecorator?(r): { className?; style? }`, `emptyState`, `loading`. Use TanStack Table v8 under the hood (it's the only sane choice once we need sort/filter/pagination/selection/keyboard nav). Keep the prop surface from `claude-design`; TanStack is implementation detail. |
| `Checkbox`, `Pagination`, `Button` | `primitives.jsx` | `packages/ui/src/_shadcn/` + thin wrappers | Use shadcn directly; no custom wrappers unless we need restyling. |
| `formatMoney` | (mock helper) | `packages/utils/money.ts` | Already exists — verify it uses `minimumFractionDigits: 2` and fix if not. |

### From `structural-primitives.jsx` (5 primitives)

| Primitive | Source | Target | Notes |
|---|---|---|---|
| `TwoPaneLayout` | `structural-primitives.jsx` | `packages/ui/src/two-pane-layout/` | `{ left: ReactNode; right: ReactNode; leftWidth?: number; resizable?: boolean }`. |
| `SectionedDrawerBody` | `structural-primitives.jsx` | `packages/ui/src/sectioned-drawer-body/` | Anchor-nav layout: `{ sections: { id; label; icon?; body: ReactNode }[]; activeId; onActiveChange(id) }`. Scroll-spy via IntersectionObserver. |
| `DragReorderList<T>` | `structural-primitives.jsx` | `packages/ui/src/drag-reorder-list/` | Generic. Built on `@dnd-kit/sortable`. `{ items: T[]; rowKey(i): string; onReorder(next: T[]): void; renderItem(i, dragProps): ReactNode; gap?: number; disabled?: boolean }`. Keyboard nav (Space/Enter to grab, arrows to move, Esc cancel) ships with @dnd-kit. |
| `ImageUploader` | `structural-primitives.jsx` | `packages/ui/src/image-uploader/` | `{ images: { id; url; alt? }[]; onAdd(files: File[]): Promise<void>; onRemove(id): void; onReorder(next): void; max?: number; aspect?: number; layout?: 'grid'\|'row' }`. Internally calls a hook passed via prop or context to do presign-upload — primitive stays storage-agnostic. |
| `SchedulePicker` | `structural-primitives.jsx` | `packages/ui/src/schedule-picker/` | `{ value: WeeklySchedule; onChange(v: WeeklySchedule): void; helper?: string }`. `WeeklySchedule` type lives in `@repo/types/i18n.ts` or new `@repo/types/schedule.ts`. |

### From `form-primitives.jsx` (4 primitives)

| Primitive | Source | Target | Notes |
|---|---|---|---|
| `FormField` | `form-primitives.jsx` | `packages/ui/src/form-field/` | `{ id; label; required?; helper?; error?; layout?: 'stacked'\|'inline'; children }`. Designed to wrap an `<input>` and integrate with `react-hook-form` via `register`. |
| `CurrencyInput` | `form-primitives.jsx` | `packages/ui/src/currency-input/` | Controlled `Decimal`-friendly input. `{ value: string \| Decimal; onChange(v: Decimal): void; currency: CurrencyCode; min?, max?, allowSign? }`. |
| `InlineEdit` | `form-primitives.jsx` | `packages/ui/src/inline-edit/` | Renders text; click → input; Enter saves; Esc cancels. `{ value; onSave(v: string): Promise<void>; placeholder?; validate? }`. |
| `Switch` | shadcn directly | `packages/ui/src/_shadcn/switch` | Use shadcn. |

### Plus tokens

| Asset | Target |
|---|---|
| `STATUS_TOKENS`, `TRANSITIONS`, `PAYMENT_TOKENS`, `TYPE_TOKENS` | `packages/ui/src/tokens/order.ts` (re-exports from `@repo/types` enums) |
| Chart palette | `packages/ui/src/tokens/charts.ts` |

**Exit gate for Phase 1:** an "internal" Storybook-like dev page at `apps/admin/src/app/(dashboard)/_dev/primitives/page.tsx` renders every primitive with sample data, matching the screenshots in `claude-design/screenshots/`. Delete the dev page before Phase 4. Each primitive has at least one unit test passing.

---

## 5. Phase 2 — Port the 3 design pages

Port in this order: **Overview → Orders → Menu**. Each consumes only Phase 1 primitives + recharts.

### 5.1 Overview (`/` of `(dashboard)`)

| File | Source | Target |
|---|---|---|
| Page | `claude-design/Overview.html` + `claude-design/app.jsx` | `apps/admin/src/app/(dashboard)/page.tsx` |
| KPI cards, chart blocks, status legend, ranked-items table | `app.jsx` | `apps/admin/src/features/overview/components/` |
| Mock removal | `claude-design/mock.js` | Replace with `useAnalyticsOverview()` hook in `apps/admin/src/features/analytics/hooks/use-analytics-overview.ts`, backed by `apiClient.getAnalyticsOverview({ restaurantId, range })` (already in api-client, returns `AnalyticsOverviewDto`). |
| Carry-over fixes from README §6 | | Mix positive/negative deltas in *fixtures only* (real API delivers real numbers). Reconcile all numbers to same `range`. Plural-correct labels. Verify chart gradient opacity. Y-axis switches to `$k` above 1000 (recharts `tickFormatter`). |

### 5.2 Orders (`/orders` + `/orders/[id]`)

| File | Source | Target |
|---|---|---|
| Page | `orders-app.jsx` | `apps/admin/src/app/(dashboard)/orders/page.tsx` |
| Filter row, sort dropdown, column defs | `orders-features.jsx` | `apps/admin/src/features/orders/components/` |
| Drawer (CustomerCell, ItemsCell, PaymentCell, ElapsedCell, RowActionsCell, DrawerHeader, DrawerFooter) | `orders-features.jsx` | Same folder |
| Mock removal | `orders-mock.js` | `apps/admin/src/features/orders/hooks/` (`use-orders-list`, `use-order-detail`, `use-advance-order`, `use-refund-order`, `use-cancel-order`, `use-bulk-update-orders`). All call `@repo/api-client`. |
| Real-time | n/a (mock pulse) | `useOrdersRealtime(restaurantId)` hook in same folder. Subscribes to `restaurant:{id}:orders` via `@repo/realtime-client`, dispatches `order.created` / `order.status_changed` into TanStack Query cache via `queryClient.setQueryData`. The mint left-border fade animation triggers on cache-update events with a 3s timeout. |
| Audio chime + browser notifications | (in `orders-app.jsx`) | `useOrderNotifications()` hook. Mute toggle persists in `localStorage`. Permission requested on first opt-in. |
| Keyboard shortcuts | (in `orders-app.jsx`) | `useOrdersKeyboard()` hook. `?` opens shortcuts overlay (a small new `KeyboardShortcuts` modal — track as bonus). |
| Carry-over fixes | README §6 | **ELAPSED column**: `now - confirmedAt`, always ascending positive. **formatMoney**: 2-decimal enforcement at the helper level. |
| E2E test | new | `apps/api/test/orders.e2e.spec.ts` — happy path (create → confirm → preparing → ready → delivered). Already exists? Audit; extend the drawer-action happy path. |

### 5.3 Menu (`/menu`) — **plus design-issue fixes**

| File | Source | Target |
|---|---|---|
| Page | `menu-app.jsx` | `apps/admin/src/app/(dashboard)/menu/page.tsx` |
| Categories pane, items pane, sort dropdown, bulk actions | `menu-features.jsx` | `apps/admin/src/features/menu/components/` |
| Item editor drawer (DetailsSection, DietarySection, ImagesSection, ModifierGroupsSection, ModifierGroupCard) | `menu-editor.jsx` | Same folder |
| Mock removal | `menu-mock.js` | `apps/admin/src/features/menu/hooks/` — `use-menu-categories`, `use-menu-items`, `use-create-menu-item`, `use-update-menu-item`, `use-reorder-categories`, `use-reorder-items`, `use-create-modifier-group`, `use-update-modifier-group`, `use-reorder-modifier-options`, `use-toggle-availability`. |

#### Page-3 design-issue fix list (composition issues)

Per the README handoff and a structural review of `menu-app.jsx` / `menu-editor.jsx` vs the spec in `admin-03-menu.md`, the **candidate issues** are listed below. **Before I implement fixes, please confirm or correct this list** — I don't want to fix the wrong things.

Candidate composition issues observed:

1. **Modifier group card** doesn't use `DragReorderList<ModifierOption>` for options — it inlines its own drag logic. Should be a clean nested compose: `DragReorderList<ModifierGroup>` outer, `DragReorderList<ModifierOption>` inner.
2. **`SectionedDrawerBody` anchor nav** appears to be flat scrollable sections in the source, not the anchor-nav + scroll-spy spec'd in admin-03-menu.md. Either build the anchor nav, or accept plain scroll and remove the primitive from the deliverables list.
3. **`ImageUploader`** is bespoke per-section instead of the shared primitive shape — multiple aspect ratios baked in. Normalize to a single primitive with an `aspect` + `layout` prop.
4. **Two-pane layout** has hardcoded widths in the source. Should consume `TwoPaneLayout` with a `leftWidth` prop and respect 1280px reflow.
5. **Spice-level "dots" + Dietary toggles** are custom inputs that could share a single `IconToggleGroup` primitive — minor, optional.
6. **Category delete with "moveTo" target** is missing a confirmation `ActionModal` with the move-to category picker — currently a prompt.
7. **Inline edit on category names** uses raw `contenteditable`-style behavior; should use the `InlineEdit` primitive.
8. **`SchedulePicker`** appears to be unconnected to the item's availability field — there's a slot but no value/onChange wired.

**Action:** I'll write each fix as an item in the Menu task list with a "before / after" pair so review is mechanical. If you can mark which of 1–8 are real and add anything I missed, the rest is straightforward.

#### Menu — additional API wiring

- **Real R2 presign upload for `ImageUploader`** — flow: `POST /uploads/presign` → `PUT` to R2 → `POST /menu/items/:id/images`. The `ImageUploader` primitive takes an `onAdd(files)` callback; the menu feature provides one bound to `useMenuItemImageUpload(itemId)`.
- E2E: create item with modifier groups → upload image → set unavailable → bulk-move category. Single test exercises drag-reorder via @dnd-kit's testing helpers.

---

## 6. Phase 3 — Wire to backend (mock removal everywhere)

This phase runs *in line with* Phase 2 — i.e. we don't ship a "mock" version of each page, we wire as we port. Listed here as a checklist:

| Surface | Hook | Endpoint(s) | Cache key | Realtime room |
|---|---|---|---|---|
| Overview KPIs | `useAnalyticsOverview` | `GET /analytics/overview` | `['analytics','overview',restaurantId,range]` | — |
| Orders list | `useOrdersList` | `GET /orders` (filters via query) | `['orders','list',restaurantId,filters]` | `restaurant:{id}:orders` |
| Order detail | `useOrderDetail` | `GET /orders/:id` | `['orders','detail',id]` | `order:{id}` |
| Advance order | `useAdvanceOrder` | `POST /orders/:id/advance` | invalidates list+detail | emits status_changed |
| Refund | `useRefundOrder` | `POST /payments/:paymentId/refunds` | invalidates detail | — |
| Cancel | `useCancelOrder` | `POST /orders/:id/cancel` | invalidates list+detail | — |
| Bulk update | `useBulkUpdateOrders` | `PATCH /orders/bulk` | invalidates list | — |
| Menu list | `useMenuTree` | `GET /menu/categories?include=items` | `['menu','tree',restaurantId]` | — |
| Menu CRUD | per-action hooks | `POST/PATCH/DELETE /menu/...` | invalidates tree | — |
| Reorder | `useReorderCategories`, `useReorderItems`, `useReorderModifierOptions` | `PATCH /menu/.../reorder` | optimistic update | — |
| Toggle availability | `useToggleAvailability` | `PATCH /menu/items/:id` | optimistic | — |
| Image presign | `useImagePresign` | `POST /uploads/presign` | n/a | — |
| Image attach | `useAttachMenuItemImage` | `POST /menu/items/:id/images` | invalidates item | — |

**Auth & permissions wire-up:**

- Middleware (`apps/admin/src/middleware.ts`) reads `refresh_token` cookie; redirects unauth'd users to `/login`.
- `useAuthStore().hasPermission(key)` (already exists in `stores/auth-store.ts` — verify) gates every action button via `usePermissions()`.
- Add a `<RequirePermission perm="...">` server component for full-page gates.

---

## 7. Phase 4 — Phase B composition pages

Each page below is a thin composition of Phase 1 primitives + a feature folder that already exists as empty hooks. Format below: **route → DataTable columns → drawer/modal sections → api-client calls → permission key → realtime → jobs → e2e**.

### 7.1 Customers (`/customers`, `/customers/[id]`)

- **Columns:** name+avatar · email · phone · totalOrders · totalSpent (`formatMoney`) · lastOrderAt (`RelativeTime`) · vipTier badge · status pill.
- **Drawer (SectionedDrawerBody sections):** Overview · Order history (mini DataTable) · Addresses · Notes (InlineEdit list) · Loyalty.
- **api-client:** `getCustomers(query)`, `getCustomer(id)`, `addCustomerNote`, `updateCustomerTags`, `mergeCustomers` (admin only).
- **DTOs:** `CustomerListDto`, `CustomerDetailDto`, `CreateCustomerNoteDto` (all in `@repo/types`).
- **Permission:** `customers.read`, `customers.write`.
- **Bulk actions:** export CSV (→ BullMQ via `/reports/exports`), tag, send promo email.
- **E2E:** list + filter + open drawer + add note + tag bulk.

### 7.2 Reviews (`/reviews`)

- **Columns:** rating (stars) · customer · item linked · comment preview · status pill (PENDING/PUBLISHED/HIDDEN) · createdAt.
- **Drawer:** Original review · Reply textarea (publishes via `POST /reviews/:id/reply`) · Moderation actions (hide/publish/flag).
- **api-client:** `getReviews`, `getReview`, `replyToReview`, `moderateReview`.
- **DTOs:** `ReviewDto`, `ReviewReplyDto`, `ModerateReviewDto`.
- **Permission:** `reviews.moderate`.
- **Realtime:** subscribe `restaurant:{id}:reviews` for new-review chime (optional polish).
- **E2E:** moderate + reply + hide.

### 7.3 Staff (`/staff`)

- **Columns:** name · email · role · status (invited/active/disabled) · lastLogin (`RelativeTime`) · 2FA enabled · actions.
- **Invite modal (`ActionModal`):** email + role select + optional restaurants multiselect. Sends `POST /staff/invites`.
- **Accept invite token flow** lives in `(auth)/accept-invite/page.tsx` (already a stub? verify; if not, add).
- **api-client:** `getStaff`, `inviteStaff`, `disableStaff`, `reset2FA`, `assignRole`.
- **DTOs:** `StaffMemberDto`, `StaffInviteDto`, `AcceptStaffInviteDto`.
- **Permission:** `staff.invite`, `staff.assign_role`. The Owner role can't be revoked from oneself — enforce in backend, hide button client-side.
- **Jobs:** invite email goes through BullMQ `email` queue.
- **E2E:** invite → accept token → role change.

### 7.4 Audit log (`/audit-log`)

- **Columns:** at (`RelativeTime` + tooltip ISO) · actor · action · entityType+id · diff button.
- **Drawer / inline expand:** before/after JSON diff (use a lightweight diff component).
- **Filters:** date range · actor · action · entity type.
- **api-client:** `getAuditLogs(query)`.
- **DTOs:** `AuditLogListDto`, `AuditLogListQuery`.
- **Permission:** `audit.read`.
- **Read-only.** No actions. No bulk.
- **E2E:** filter by actor + date.

### 7.5 Contact messages (`/contact`)

- **Columns:** subject · from (name + email) · category · status (new/in-progress/closed) · createdAt.
- **Drawer:** Message body · Reply textarea (sends via `email` queue) · Status changer · Internal notes.
- **api-client:** `getContactMessages`, `getContactMessage`, `replyToContact`, `updateContactStatus`, `addContactInternalNote`.
- **DTOs:** `ContactMessageDto`, `ContactMessageListDto`.
- **Permission:** `contact.handle`.
- **Realtime:** `restaurant:{id}:contact` for new-message badge.
- **E2E:** open → reply → close.

### 7.6 Reports / Exports (`/reports/exports`)

- **Columns:** name (orders.csv, customers.xlsx, …) · createdAt · status pill (PENDING/RUNNING/READY/FAILED) · rows · downloadButton.
- **Create modal (`ActionModal`):** entity select · format · date range · filters preview. Submits `POST /reports/exports` → returns job id.
- **Polling:** TanStack Query with `refetchInterval: 3000` while any row is `PENDING|RUNNING`; stops when all resolved.
- **Download:** `GET /reports/exports/:id/download` returns signed R2 URL; client opens in new tab.
- **api-client:** `createExport`, `listExports`, `getExport`, `downloadExport`.
- **DTOs:** `CreateExportDto`, `ExportJobDto`.
- **Permission:** `reports.export`.
- **Jobs:** BullMQ `exports` queue (already implemented). Reuse — frontend just polls.
- **E2E:** create export → poll until ready → mock download URL.

### 7.7 Promotions (`/promotions`, `/promotions/[id]`)

- **List columns:** name · type badge (% / fixed / BOGO / free-delivery) · code prefix · windows (start–end) · usage / max · status pill (DRAFT/SCHEDULED/ACTIVE/EXPIRED/PAUSED) · actions.
- **Detail drawer / page (SectionedDrawerBody):**
  - Overview (name, description, status toggle)
  - Type-specific inputs:
    - `PERCENT` → CurrencyInput limited to 0–100 (% mode)
    - `FIXED` → CurrencyInput
    - `BOGO` → product picker (free quantity, qualifying quantity)
    - `FREE_DELIVERY` → no extra inputs
  - Windows (SchedulePicker + date range)
  - Eligibility (min cart total, restricted to items/categories, customer segments)
  - Coupons sub-table (`DataTable` nested) — code, max uses, used count, expiration. Inline add row.
  - Analytics (uses redeemed, revenue impacted — small chart).
- **api-client:** `getPromotions`, `getPromotion`, `createPromotion`, `updatePromotion`, `archivePromotion`, `addCoupon`, `removeCoupon`, `bulkGenerateCoupons`.
- **DTOs:** `PromotionDto`, `CreatePromotionDto`, `CouponDto`, `CreateCouponDto`.
- **Permission:** `promotions.write`.
- **E2E:** create % promo → add 50 bulk coupons → schedule → apply at checkout in cart e2e.

---

## 8. Phase 5 — Test, a11y, and the 7 carry-over fixes

| # | Fix | Location |
|---|---|---|
| 1 | Mock fixtures mix positive and negative deltas | Fixtures only — production data is real. |
| 2 | All KPI numbers reconcile to same base | One Zod-validated `AnalyticsOverviewDto` per range; no derived numbers in components. |
| 3 | Pluralize correctly (`1 item` / `2 items`) | Use the `Intl.PluralRules` helper in `@repo/i18n/plural.ts`. Add if missing. |
| 4 | Chart gradient opacity at spec | Tailwind + recharts `<linearGradient>` — verify visually. |
| 5 | Y-axis `$k` above 1000 | `tickFormatter={v => v >= 1000 ? \`$\${v/1000}k\` : \`$\${v}\`}` |
| 6 | Orders ELAPSED column math | `now - confirmedAt`, always ascending. Hook returns derived value. |
| 7 | `formatMoney` enforces 2-decimal | Single helper in `packages/utils/money.ts`. |

**A11y audit:** focus trap in drawers (Radix handles), keyboard nav in DataTable (j/k + Enter), off-screen `<table>` summaries inside chart components for screen readers, motion-reduce media query disables the fade-in animations.

**Tests:**
- Unit: every primitive (Phase 1 already covered).
- Integration (Vitest + Testing Library): each composition page renders with mocked api-client and a happy-path interaction.
- E2E (Vitest + supertest at API layer): one per page listed in §5 and §7.
- Visual: capture screenshots in `apps/admin/screenshots/` and compare against `claude-design/screenshots/` for the 3 design pages.

---

## 9. Out of scope (explicit non-goals for this plan)

- **Reservations calendar** (`/reservations` + `/reservations/[id]`) — needs new calendar component, separate plan.
- **Delivery zones map editor** (`/settings/delivery-zones`) — needs `react-leaflet` or `mapbox-gl`, separate plan.
- **Kitchen Display** (`/orders/kitchen`) — full-screen card grid micro-app with its own layout, separate plan.
- **Settings/Hours**, **Settings/Holidays**, **Locations** detail — Phase C in the README. Covered by a follow-up plan once Phase B lands.
- **Web (customer) + mobile customer apps theming** — different palette. Tracked separately; this plan only ensures `@repo/ui` is theme-agnostic so that work isn't blocked.

---

## 10. Sequencing & rough effort

| Phase | Effort | Blocks on |
|---|---|---|
| 0 — Foundation | 1 day | — |
| 1 — 18 primitives | 4–5 days | Phase 0 |
| 2 — Overview | 0.5 day | Phase 1 |
| 2 — Orders + realtime | 1.5 days | Phase 1, Overview parity |
| 2 — Menu + page-3 fixes + presign upload | 2 days | Phase 1, **page-3 fix list confirmation** |
| 4 — Phase B composition (7 pages) | 2–3 h each = ~2.5 days | Phase 2 |
| 5 — Test + a11y + carry-overs | 1 day | Phase 4 |

**~12 working days total** for a single developer, plus review cycles.

---

## 11. Resolved decisions (locked)

1. **Page-3 fix list** — all 8 candidate issues in §5.3 are confirmed. Fix all of them as part of Phase 2 Menu port.
2. **Restaurant switcher** — single active restaurant at a time. `useRestaurantStore` holds one `activeRestaurantId`; every feature hook reads from it. No aggregate view.
3. **Audio chime** — synthetic via Web Audio API. Implement in `useOrderNotifications()` as a short two-note beep generated with `OscillatorNode` + `GainNode`. No sound-file asset needed.
4. **Promotion BOGO product picker** — search + multi-select is sufficient for v1. Use shadcn `Command` (cmdk) with debounced server-side search against `GET /menu/items?search=...`. No category-level rules in v1.
5. **`/promotions/[id]`** — drawer (not full page). Same `SectionedDrawerBody` pattern as Customers/Reviews. The route `/promotions/[id]` exists for deep-linking and back-button support; the page component opens the drawer over the `/promotions` list.

---

## 12. After approval

I'll work bottom-up: Phase 0 lands first as a single PR (theme + shell + tokens), then primitive PRs in groups of 3–4, then one PR per design page, then composition pages as one PR per route group. Each PR includes its e2e test. We can adjust granularity if smaller PRs are preferred.
