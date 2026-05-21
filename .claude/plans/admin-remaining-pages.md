## Admin — Remaining Pages Plan (Phase C + D)

> Covers everything the port plan (`admin-dashboard-port.md`) marked **out of scope**:
> `/orders/[id]`, `/orders/kitchen`, `/reservations`, `/reservations/[id]`, `/locations`, `/locations/[id]`, `/settings`, `/settings/hours`, `/settings/holidays`, `/settings/delivery-zones`.
>
> Goal: every route looks production-grade, behaves correctly against the real backend, and reuses the 18 primitives from Phase 1. No new design system — admin's dark mint/purple palette from `docs/design-prompts/README.md` §4 is the single source of truth.
>
> Audience: a future Claude Code session implementing the pages. Read this top to bottom.

---

### 0. Status snapshot (as of 2026-05-20)

From the codebase survey:

| Route | Page file | Backend | DTOs | api-client | Hooks | Realtime |
|---|---|---|---|---|---|---|
| `/orders/[id]` | stub | `GET /orders/:id` | `OrderSchema` | `orders.getById` | `useOrder` | `order:{id}` room |
| `/orders/kitchen` | stub | `GET /kitchen/tickets` | `KitchenTicketSchema` | `kitchen.list` | `useKitchenFeed`, `useAdvanceKitchenTicket` | `restaurant:{id}:kitchen` (`kitchen.ticket_added`/`removed`) |
| `/reservations` | stub | full CRUD + availability + tables | `ReservationSchema`, `TableSchema`, `AvailabilitySlotSchema` | full | 10 hooks | — |
| `/reservations/[id]` | stub | `GET /reservations/:id` | same | `reservations.getById` | `useReservation` | — |
| `/locations` | stub | **none — single-location platform** | — | — | — | — |
| `/locations/[id]` | stub | none | — | — | — | — |
| `/settings` | stub | `GET/PATCH /admin/restaurants/:id/settings` | `RestaurantSettingsSchema` | `settings.get/update` | `useRestaurantSettings`, `useUpdateRestaurantSettings` | — |
| `/settings/hours` | stub | same PATCH (operating hours nested in settings; also normalized table) | `OperatingHoursSchema` | via `settings.update` | via update | — |
| `/settings/holidays` | stub | `POST` / `DELETE /admin/restaurants/:id/holidays` | `HolidaySchema` | `settings.addHoliday/removeHoliday` | `useAddHoliday`, `useRemoveHoliday` | — |
| `/settings/delivery-zones` | stub | via settings PATCH + `GET /delivery-zones/check` | `DeliveryZoneSchema`, `PolygonSchema` | `settings.update`, `settings.checkDeliveryZone` | via update | — |

**Two structural calls to lock before coding:**

1. **Locations is greenfield.** The Prisma `Restaurant` model is single-tenant — there is no `Location` / `Branch` / `chainId` relation. Multi-location is a schema-wide change far outside this plan's scope. **Recommended:** rename `/locations` to a single-restaurant **Restaurant Profile** page (logo, cover, address, contact, geoPoint, brand colors, public toggles). The `/locations/[id]` route is dropped from the sidebar. If multi-location chains become real later, it's a separate sprint with a Prisma migration and `locationId` plumbing through every domain table.
2. **`/orders/[id]` is a deep-linking shell, not a separate UI.** The drawer-based detail on `/orders` from the port plan is the canonical experience. `/orders/[id]` exists so refresh, share-link, and back/forward work. It mounts the **same** `OrderDetailDrawer` open over a faded `/orders` list (Next.js parallel route, or simpler: render the list under the drawer with `searchParams.id` reflecting URL).

If you push back on either, do it before any other section — both decisions shape everything below.

---

### 1. Locked design tokens (admin only — re-stated for reference)

These are not negotiable — they come from `docs/design-prompts/README.md` §4. The values are listed here so the implementer doesn't have to flip between docs.

```
--bg                  #0B0D12
--surface             #14171F
--surface-elevated    #1A1E27
--border              rgba(255,255,255,.06)
--border-strong       rgba(255,255,255,.12)
--text-primary        #ECEEF3
--text-secondary      #9CA3AF
--text-tertiary       #5B6070
--text-disabled       #3A3F4B
--accent              #7FE8C8   (mint — primary CTA, key data, selection)
--accent-hover        #5BD8B4
--accent-muted        rgba(127,232,200,.10)
--positive            #34D399
--negative            #F87171
--warning             #FBBF24
--info                #A78BFA
```

Status → token map (from README, use everywhere a status pill appears):

| Status | Token |
|---|---|
| `PENDING` | `--text-tertiary` |
| `CONFIRMED` | `--info` |
| `PREPARING` | `--warning` |
| `READY` | `--accent` |
| `OUT_FOR_DELIVERY` | `#60A5FA` |
| `DELIVERED` | `--positive` |
| `CANCELLED` | `--negative` |

Reservation status map (new, follows the same logic):

| Status | Token |
|---|---|
| `CONFIRMED` | `--info` |
| `SEATED` | `--accent` |
| `COMPLETED` | `--positive` |
| `CANCELLED` | `--negative` |
| `NO_SHOW` | `--warning` |

Type rules: 14/400 body, 16/600 H2, 24/600 H1. `font-feature-settings: "tnum"` on every number. 8pt grid (4/8/12/16/20/24/32/48/64). Cards 12px radius, hairline border, no shadow. Sidebar 240px (collapses to 64px) — already built in shell. Motion 150–200ms ease-out only. New realtime rows fade + slide 12px from top with a 2px mint left-border fading over 3s.

---

### 2. Primitive dependencies

These pages assume Phase 1 + Phase 2 of `admin-dashboard-port.md` have landed. Re-used primitives:

`PageHeader`, `DataTable<T>`, `FilterPillGroup<TId>`, `StatusPill`, `TypeBadge`, `DetailDrawer`, `ActivityTimeline`, `ActionModal`, `RelativeTime`, `formatMoney`, `FormField`, `CurrencyInput`, `SchedulePicker`, `TwoPaneLayout`, `SectionedDrawerBody`, `InlineEdit`, `BulkActionBar`.

**New primitives this plan introduces** (extract to `@repo/ui` — same theme-agnostic rules as the rest):

| Primitive | Path | Used by |
|---|---|---|
| `KdsTicketCard` | `packages/ui/src/kds-ticket-card/` | KDS only — but generic enough to live in `@repo/ui` |
| `ReservationCalendar` | `packages/ui/src/reservation-calendar/` | Reservations |
| `DateRangePicker` | `packages/ui/src/date-range-picker/` | Reservations, audit log later |
| `PolygonMapEditor` | `packages/ui/src/polygon-map-editor/` | Delivery zones |
| `KeyValueGrid` | `packages/ui/src/key-value-grid/` | Order detail header, reservation drawer, settings sub-headers |
| `EmptyState` | `packages/ui/src/empty-state/` | Every list page — port now even if used elsewhere |
| `SettingsSectionCard` | `packages/ui/src/settings-section-card/` | Settings hub + sub-pages |

Map library decision: **react-leaflet 4.x + leaflet 1.9** (OSM tiles by default, no API key, free, fine for polygon editing). Mapbox is reserved for a future "premium map style" pass — not worth the token plumbing now.

DnD-kit (already in deps from Phase 0) is reused inside `KdsTicketCard` columns and the holiday list reorder.

---

### 3. Page-by-page spec

For each route the format is: **route → top tasks → layout → components → data → states → keyboard → a11y → e2e**.

#### 3.1 `/orders/[id]` — order detail deep link

**Top tasks:** open an order from a shared URL; refresh without losing context; back-button returns to the filtered list.

**Layout.** Render `/orders` page under a focused `DetailDrawer` (right-side, 560px, dark surface, hairline left border). The URL `/orders/:id` writes `?id=<orderId>` into the list page via parallel route or a single page reading `params.id`. Closing the drawer routes back to `/orders` preserving the `searchParams` filter state.

**Drawer body — use `SectionedDrawerBody` with these sections:**

1. **Header (sticky):** order number (`#ORD-23198`, H1), `StatusPill` with transitions dropdown, `TypeBadge` (DINE_IN/DELIVERY/PICKUP), `RelativeTime` since confirmedAt, total in `formatMoney`. Right side: refund / cancel / print menu (Lucide `MoreHorizontal` → dropdown). All gated by `usePermissions('order.write')`.
2. **Customer:** avatar (initial), name, phone (`tel:` link), email, address (delivery only), VIP tier chip if present. `KeyValueGrid` for the data block.
3. **Items:** dense list, one row per line: qty × name, modifiers as indented chips, line subtotal right-aligned. Subtotal / fees / tax / discounts / tip / total at the bottom — money column hard-right-aligned, `tnum`, two decimals enforced.
4. **Payment:** method (card ending in 4242), payment status (`StatusPill` variant), refund list (each with amount + reason + at). Refund-modal trigger as a ghost button.
5. **Timeline:** `ActivityTimeline` from `OrderStatusEventSchema` history. Each entry shows actor (system / staff name), kind (status / note), label, and elapsed time.
6. **Internal notes:** `InlineEdit` list. New note row at the bottom with mint placeholder "Add note…". Persists by writing a status event with `kind: 'NOTE'` to the existing `OrderStatusEvent` model — see §5 Q1 for the rationale and the small backend change required (`UpdateOrderStatusSchema` + `transition()` already accept a `note`; we extend the kind enum + add a `POST /orders/:id/notes` thin wrapper that emits a NOTE event without a status change).

**Data.** `useOrder(id)` (new hook in `apps/admin/src/features/orders/hooks/`) → `orders.getById(id)`. Subscribe to `order:{id}` room via `useOrderRealtime(id)`, patch the query cache on `order.status_changed` / `order.refunded` / `order.cancelled`.

**Mutations:** `useAdvanceOrder`, `useRefundOrder`, `useCancelOrder` already exist — wire them to the dropdown actions with optimistic cache updates and rollback on error.

**States.** Loading skeleton matches the drawer shape: pulse blocks for the 6 sections. Error: centered card with retry. Cancelled / delivered: header status pill stays, action dropdown disables the advance transitions but keeps refund/print enabled.

**Keyboard.** `Esc` closes drawer (Radix handles). `r` opens refund modal. `c` opens cancel modal. `n` focuses the new-note input. `?` shows shortcut overlay.

**A11y.** Drawer is a Radix `Sheet` — focus trap and return are automatic. The status transition dropdown is a Radix `DropdownMenu` with full keyboard. Items list is `<ul role="list">` not a `<table>` — single-column data does not need table semantics.

**E2E.** Visit `/orders/<id>` cold, see drawer open over list, advance status via dropdown, refund $5, close drawer, verify URL returns to `/orders` with prior filters intact.

---

#### 3.2 `/orders/kitchen` — Kitchen Display System

**Top tasks** (kitchen staff, on a tablet, hands busy): glance at active tickets sorted by oldest first; tap a ticket to advance status; never miss a new order (audible + visual cue); zero polling — realtime only.

**Layout (full-screen, no admin shell).** Wrap in a route group `(kitchen)` with its own layout that drops the sidebar + topbar. Page is a Kanban-style 3-column grid:

```
┌─────────────────┬─────────────────┬─────────────────┐
│   CONFIRMED     │   PREPARING     │     READY       │
│   (4)           │   (6)           │   (2)           │
├─────────────────┼─────────────────┼─────────────────┤
│  ticket card    │  ticket card    │  ticket card    │
│  ticket card    │  ticket card    │  ticket card    │
│  ...            │  ...            │  ...            │
└─────────────────┴─────────────────┴─────────────────┘
```

Each column scrolls independently. Sort within a column: oldest `confirmedAt` at the top. Density target 1920×1080 (kitchen tablets), works to 1280; below that, columns stack vertically (rare — only as fallback).

**Top bar (within page, 56px).** Left: restaurant name + active count `12 tickets · 4 late`. Center: optional filter pills (`ALL` / `DINE_IN` / `DELIVERY` / `PICKUP`). Right: sound toggle (Lucide `Volume2`/`VolumeOff`, persists in `localStorage`), fullscreen toggle (Lucide `Maximize2`), connection indicator dot (mint = connected, red = disconnected; tooltip explains).

**KdsTicketCard.** 320px wide, dynamic height. Card structure top-to-bottom:

- **Header bar**, 40px tall, status-tinted (CONFIRMED = info, PREPARING = warning, READY = accent). Left: order number `#23198` in H2 with mint accent if `<5min`, warning amber if `5–10min`, negative red if `>10min` since confirmedAt. Right: elapsed clock `7:42`, monospaced, ticking every second via `RelativeTime` `tick='sec'`.
- **Type strip**, 24px: `DINE_IN · TABLE 7` or `DELIVERY · Marszałkowska 102` or `PICKUP · 19:30`. Uppercase eyebrow style, tracking 0.08em.
- **Items list**, padded 16px. Each item: `2× Kebab Tortilla Średni` in 18px (yes, larger than admin density elsewhere — kitchen reads across the room). Modifiers indented in 14px secondary. Notes pinned at the end of the item in mint italic `+ no onions`. Special requests at the bottom of the card in a warning-tinted box if present.
- **Action footer**, 56px, divided into 2 buttons (50/50). For a CONFIRMED ticket: ghost `← Pause` (rare) | solid mint `Start →`. For PREPARING: ghost `← Back` | solid mint `Ready →`. For READY: full-width mint `✓ Picked up`. Buttons are 48px tall (thumb-friendly).
- **New-ticket animation:** card slides in 12px from top + fades 200ms + a mint 2px left-border that fades over 3s, plus the chime.

**Data.** `useKitchenFeed(restaurantId)` already exists — confirm it (a) loads initial via `kitchen.list()`, (b) subscribes to `restaurant:{id}:kitchen`, (c) merges `kitchen.ticket_added` and removes on `kitchen.ticket_removed` (which fires when an order leaves the kitchen lifecycle: DELIVERED, OUT_FOR_DELIVERY, CANCELLED, READY for dine-in). If the hook only does the query, extend it. `useAdvanceKitchenTicket()` already exists — wire to the action buttons; on success, optimistically move the card to the next column.

**States.**
- Loading: 3 columns with 2 skeleton cards each.
- Empty (per column): mint-tinted dotted outline placeholder card `No tickets`.
- Disconnected: red dot in topbar, banner across the top `Reconnecting…`. Cards continue to render last-known state.
- Late warning: cards >10min old in CONFIRMED or PREPARING get a 2px red left-border + a `⚠` pulse next to the elapsed clock.

**Keyboard.** Arrow keys move focus between cards (left/right across columns, up/down within column). `Enter` advances the focused card. `Space` toggles sound. `F` fullscreen. `?` shortcut overlay.

**A11y.** Each card is a `<article role="article" aria-labelledby="ticket-<n>">`. Status changes announce via `aria-live="polite"` region at the page root: "Order 23198 ready". Sound chime is opt-in — never autoplays.

**Audio.** Two-tone beep via `OscillatorNode` (no audio asset). 880Hz → 1320Hz, 180ms total, gain ramp 0→0.3→0. Resume the AudioContext on first user interaction (the toggle click) to satisfy autoplay policies.

**E2E.** API e2e: create order via `POST /orders` (CONFIRMED), assert `kitchen.list` returns it. UI smoke: render KDS with mocked socket, fire `kitchen.ticket_added` event, assert new card appears in the correct column with the slide-in animation class.

---

#### 3.3 `/reservations` — table + calendar view

**Top tasks** (host / floor manager): see today's bookings at a glance; check tomorrow / this week; seat / mark no-show / cancel; create a walk-in.

**Layout.** `TwoPaneLayout` with a **view toggle pill** at the top: `Calendar` | `List`. Default = `Calendar` for today's bookings.

**View 1 — Calendar (`ReservationCalendar` primitive):**

- Three modes: `Day` (default), `Week`, `Month`. Toggle pills under the page header, right side.
- `Day` mode: vertical time axis 09:00–24:00 in 30-min rows; horizontal lanes per table (from `tables.list()`). Reservation blocks are colored by status (use the reservation status → token map). Block shows guest count + name + party size. Drag a block to move it (calls `useUpdateReservation` with new `startAt` + `tableId`). Resize the bottom edge changes `endAt`.
- `Week` mode: 7 columns (Mon–Sun), one row per hour, blocks span their duration. No drag-resize in week view — clicking opens the drawer.
- `Month` mode: standard calendar grid, each cell shows up to 3 reservation chips + a `+N more` link.
- Today is highlighted with a mint underline on the date label. Current-time indicator (mint horizontal line) in Day view, updated every minute.

**View 2 — List:** standard `DataTable` with columns: time (`startAt` formatted `HH:mm`), guests, customer name + phone, table (or `—` if not seated), status pill, source (online/phone/walk-in), created `RelativeTime`. Row click opens drawer. Filters: status pills (ALL / CONFIRMED / SEATED / COMPLETED / CANCELLED / NO_SHOW), date range, search by name/phone.

**Page header.** Left: title `Reservations`. Right (in order): `+ New reservation` (solid mint button — opens create modal), view toggle, range selector (`Today` / `Tomorrow` / `This week` / `Custom`), search input.

**Create-reservation modal (`ActionModal`, size `lg`).** Fields:
- Customer: search existing (cmdk against `GET /customers?search=`) OR fill name + phone for a walk-in.
- Date + time: `DateRangePicker` for start, slot picker showing `useReservationAvailability()` slots (server-filtered).
- Guest count: stepper, min 1, default 2.
- Table: combobox of available tables for the chosen slot (`tables.list()` cross-checked with availability).
- Notes: textarea.
- Submit → `useCreateReservation`, optimistic insert into calendar.

**Drawer body (`SectionedDrawerBody`).** Same sections as `/reservations/[id]` — keep the two routes consistent (drawer = same component). See §3.4.

**States.** Loading: calendar skeleton (greyed lanes). Empty (no bookings for range): mint-tinted `EmptyState` card with `+ Create reservation` CTA. Error: retry card.

**Keyboard.** `n` opens new-reservation modal. `1/2/3` switches day/week/month. `[` / `]` paginates the date range. `t` jumps to today. Arrow keys move focus between visible reservation blocks; `Enter` opens drawer.

**A11y.** Calendar is a `<table>` semantically in day/week modes (time × tables) with proper `<th>` headers. In month mode, each day cell is a `<button>` if it has reservations. `aria-live` region announces drag-move completions.

**E2E.** Create reservation for `2026-05-21 19:00 · 4 guests · Table 7` → appears in calendar → seat it (drawer action) → status flips to SEATED → mark complete.

---

#### 3.4 `/reservations/[id]` — reservation detail (drawer-as-page)

Same drawer component as `/reservations` opens automatically over a faded view of the list (parallel route pattern, mirroring §3.1). Sections:

1. **Header:** guest name, party size, time block (`19:00 – 21:30 · 4 guests`), status pill with transitions dropdown, table assignment (`Table 7` or `Unseated`). Right: actions dropdown (cancel, mark no-show, mark complete — gated by status state machine).
2. **Customer:** phone, email, VIP tier if linked, prior-reservations count.
3. **Notes:** internal staff notes (`InlineEdit`).
4. **Activity timeline:** created, confirmed, seated, completed events.
5. **Linked order (optional):** if dine-in order created during this visit, deep-link to `/orders/<id>`.

**Mutations.** All wired to existing hooks: `useSeatReservation`, `useCompleteReservation`, `useCancelReservation`, `useNoShowReservation`, `useUpdateReservation`.

**A11y / keyboard** identical to orders drawer.

---

#### 3.5 `/locations` — Restaurant Profile (rebranded from greenfield)

**Decision recap.** Platform is single-tenant. Don't build a list — make this the restaurant's own settings page. Sidebar entry renames to `Restaurant` under the `CONFIGURE` group, alongside `Settings`. If we change our minds later and add multi-location, this page becomes the per-location editor unchanged.

**Top tasks:** edit public-facing identity (name, slug, logo, cover, brand color), contact details (phone, email, address, geoPoint), public toggles (accepts reservations, accepts delivery, is published).

**Layout.** `TwoPaneLayout`: left = anchor nav (`SectionedDrawerBody` reused at full width — yes, it works outside a drawer; or duplicate the anchor-nav as a `SettingsAnchorNav` primitive if cleaner). Right = scrollable form, one card per section.

**Sections (cards using `SettingsSectionCard`):**

1. **Identity** — name (`FormField` → input), slug (`FormField`, disabled with explanation tooltip; changing slug breaks public URLs), description (textarea), tagline.
2. **Branding** — logo upload (`ImageUploader`, single image, square aspect, R2 presign), cover upload (single, 16:9), accent color picker (limit to a 6-swatch palette curated to look good with the customer site's warm cream theme — don't ship a freeform picker; it produces bad design choices).
3. **Contact** — phone (E.164), email, support email, two address lines, city, postcode, country (select with EU default).
4. **Location** — latitude / longitude inputs + a small static map (`leaflet` single marker, click-to-place). Geocoder is out of scope; staff fills coordinates by hand or pastes from Google Maps.
5. **Public toggles** — `acceptsReservations`, `acceptsDelivery`, `acceptsPickup`, `acceptsDineIn`, `isPublished`. Each is a Switch with a one-line description.
6. **Danger zone** — at the bottom, a red-tinted card with "Unpublish restaurant" + "Delete restaurant" buttons (both behind `ActionModal` confirm with name-type confirmation).

**Data.** A `useRestaurantProfile(restaurantId)` hook (new) backed by `apiClient.restaurants.getById` (already exists in api-client per the survey) and `apiClient.restaurants.update` (verify; add if missing). Form uses `react-hook-form` + `zodResolver(RestaurantUpdateSchema)`. Submit is per-section (each card has its own Save button); dirty state per section tracked via RHF.

**Sticky footer.** When *any* section is dirty: a footer slides up from the bottom with `Discard` (left) / `Save changes` (right, mint) — the global save commits all dirty sections in one mutation. Mirrors macOS-style preferences.

**States.** Loading skeleton per card. Save success: green toast `Saved`. Validation error: section highlights red, anchor nav badges show error count. Unauthorized: redirect.

**Keyboard.** `Cmd/Ctrl+S` saves the dirty form. `Esc` discards.

**A11y.** Each section is a `<section aria-labelledby="...">`. Color picker swatches are `<button>` with `aria-pressed`.

**E2E.** Update name + logo + accept-delivery toggle → reload page → values persist → public web shows new logo (cross-app smoke).

**`/locations/[id]`** — drop from sidebar; redirect any old link to `/locations`. Keep the file as a 1-line redirect for safety.

---

#### 3.6 `/settings` — hub

Landing page for the four sub-routes plus the simple top-level scalars.

**Layout.** Four-up grid of `SettingsSectionCard`s (2×2 desktop, 1-up mobile):

1. **Operating hours** card — preview the current weekly summary (e.g. `Mon–Fri 11:00–22:00 · Sat 12:00–23:00 · Sun closed`). Bottom: `Manage hours →` link to `/settings/hours`.
2. **Holidays** card — count of upcoming holidays in next 90 days. Bottom: `Manage holidays →`.
3. **Delivery zones** card — count of zones + a tiny inline map preview (gray). Bottom: `Manage zones →`.
4. **Financials** card — tax rate, default delivery fee, min order amount, currency. Inline-editable via `InlineEdit` + `CurrencyInput` (reusing the existing helpers). Each save fires `useUpdateRestaurantSettings`.

Below the grid, a second row of two cards:

5. **Reservation policy** — slot length (15–360 min stepper), buffer time, default party size, advance booking days. All inline-editable.
6. **Timezone + locale** — timezone picker (cmdk against IANA list), currency (locked to PLN for now), default language.

**Data.** `useRestaurantSettings(restaurantId)` (exists). `useUpdateRestaurantSettings` (exists) — PATCH whatever changes.

**States.** Loading: card skeletons. Errors: per-card retry. Save: ghost toast `Saved`.

**E2E.** Edit tax rate → reload → persists → cart pricing in API integration test reflects new rate.

---

#### 3.7 `/settings/hours`

**Top tasks:** set weekly opening hours; close a specific day; add a second time-window (lunch + dinner split).

**Layout.** Single `SettingsSectionCard` containing the existing `SchedulePicker` primitive at full width. SchedulePicker spec (from `admin-dashboard-port.md` §5.3) accepts `WeeklySchedule` — verify it supports **multiple windows per day** (lunch 11–14 + dinner 17–22). If not, extend the primitive (track as a small primitive update under Phase 1).

**Page structure:**

- Page header: `Operating hours` + helper text `Hours customers see and the API uses to gate ordering`.
- The picker. Per day: a toggle (Open/Closed) + a list of windows with `+ Add window` ghost button. Each window: `HH:mm` open + `HH:mm` close inputs with a delete `×`.
- Beneath the picker: a **mirror preview** showing how customers see the hours on the web site (`HoursTable` from `@repo/ui` rendered in admin's dark theme — verify the primitive is theme-agnostic).
- Sticky save footer (`Discard` / `Save changes`).

**Data.** Hours live in the normalized `OperatingHours` table only — they are **not** part of `RestaurantSettingsSchema`. The write endpoint is `PUT /restaurants/:id/hours` (`apps/api/src/restaurants/restaurants.controller.ts:64`), driven by `UpdateOperatingHoursSchema` and `RestaurantsService.updateHours()` which upserts the 7 day rows inside a transaction. Use a new `useUpdateOperatingHours(restaurantId)` hook calling `apiClient.restaurants.updateHours(id, { hours })`. Do **not** route through the settings hook — different endpoint, different cache invalidation key (`['restaurants','hours',restaurantId]`).

**States.** Loading skeleton (7 rows). Validation: `closesAt > opensAt`, no overlapping windows on the same day — errors highlight inline.

**Keyboard.** `Tab` moves through windows. `Enter` adds a window. `Delete` while focused on a window's `×` removes it.

**A11y.** Each day is a `<fieldset>` with `<legend>` = day name. Time inputs are `<input type="time">`.

**E2E.** Update Sunday from closed to 12:00–18:00 → save → reload → persists → `restaurants/me` public endpoint returns the new hours.

---

#### 3.8 `/settings/holidays`

**Top tasks:** add a one-off closed day or modified-hours day; remove an old one; see the rolling list.

**Layout.**

- **Top card — Add holiday:** date picker (single date, defaults to next month), label input (`Christmas Day`, `Independence Day`), radio (`Closed all day` / `Modified hours` → reveals two time inputs for open/close). Submit = mint button `Add holiday`. Calls `useAddHoliday`.
- **List card — Upcoming holidays:** `DataTable` with columns: date (formatted `Sun, 25 Dec 2026`, mint if within 14 days), label, hours (`Closed` / `12:00–16:00`), age (`In 35 days` via `RelativeTime`), actions (`×` delete with confirm modal).
- **Past holidays accordion** at the bottom (collapsed by default) showing prior 12 months.

**Data.** `useAddHoliday`, `useRemoveHoliday`, `useRestaurantSettings` (read the list).

**Sort.** Upcoming = ascending by date. Past = descending.

**Validation.** Duplicate date → inline error `A holiday already exists for that date`. Date in the past → warning, allow but mark with a `(past)` chip.

**E2E.** Add Christmas → appears in list → mark as closed → remove → list updates.

---

#### 3.9 `/settings/delivery-zones`

**Top tasks:** draw a delivery polygon on a map; assign a per-zone fee and minimum order; delete an obsolete zone; preview which zones cover a test address.

**Layout (`TwoPaneLayout`, 320px / fluid).**

**Left pane — Zones list:**
- `+ Add zone` mint button at top.
- One row per zone with a 16px color swatch + name (`InlineEdit`) + fee (`CurrencyInput` inline) + min order (`CurrencyInput`) + `×` delete (with confirm).
- Click a row → highlights its polygon on the map + opens its details below.
- Empty state: mint-dotted card `No delivery zones yet. Click + Add zone to draw one on the map.`

**Right pane — Map (`PolygonMapEditor`):**
- Leaflet map centered on `Restaurant.geoPoint` from the profile, zoom 13.
- Restaurant pin (mint hexagon icon).
- Existing zones rendered as filled polygons (zone color at 25% fill + 100% stroke).
- Edit modes via a small toolbar in the top-right corner of the map: `Draw` (click to add vertices, double-click to close), `Edit` (drag existing vertices), `Delete` (click a vertex to remove). Default: pan/zoom only.
- Bottom strip: address search input → on enter, calls `settings.checkDeliveryZone(restaurantId, { lat, lng })`, drops a marker, shows `Covered by: Zone 1 (Centrum)` or `Not covered`.
- Save button bottom-right: persists the entire `deliveryZones` array via settings PATCH. Optimistic update, rollback on error.

**Data.** `useRestaurantSettings` returns the array; `useUpdateRestaurantSettings` writes it. Polygon shape is GeoJSON (`Polygon` type from `PolygonSchema`). Validate polygon doesn't self-intersect before save (cheap algorithm, do it client-side; surface error inline).

**States.** Loading: skeleton list + greyed map. Error: retry card on map. Drawing in progress: zone list disables clicks until commit.

**Keyboard.** `Esc` cancels the current polygon draw. `Enter` while drawing closes the polygon (≥3 vertices required). `Delete` removes the focused vertex in edit mode.

**A11y.** Map is *not* fully accessible — this is a known limitation of polygon editors. Provide a **fallback list editor** behind a toggle: each zone exposes a `Edit vertices manually` action that opens a modal with editable lat/lng pairs in a `DataTable`. This satisfies keyboard-only users and is the accessibility contract.

**Performance.** Up to ~50 zones with ~30 vertices each = no perf issue with leaflet. Don't preemptively switch to mapbox-gl.

**E2E.** API: draw a 5-vertex polygon → save → `GET /admin/restaurants/:id/settings` returns it → check delivery for a point inside the polygon → covered; for a point outside → not covered.

---

### 4. Sequencing & rough effort

Assumes Phase 0–2 of `admin-dashboard-port.md` have shipped (theme, shell, 18 primitives, Overview/Orders/Menu pages).

| # | Step | Effort | Blocks on |
|---|---|---|---|
| 1 | New primitives: `EmptyState`, `KeyValueGrid`, `DateRangePicker`, `SettingsSectionCard` | 0.5 day | Phase 0 |
| 2 | `/orders/[id]` deep-link wiring + `useOrder` + `useOrderRealtime` | 0.5 day | Step 1 + Phase 2 Orders |
| 3 | `/orders/kitchen` + `KdsTicketCard` + kitchen route group layout + audio chime | 1.5 days | Step 1 |
| 4 | `/settings` hub + `/settings/hours` + `/settings/holidays` (no map yet) | 1 day | Step 1 |
| 5 | `PolygonMapEditor` primitive + react-leaflet integration | 1 day | Step 1 |
| 6 | `/settings/delivery-zones` page | 0.5 day | Step 5 |
| 7 | `/locations` → Restaurant Profile page | 1 day | Step 1 (sticky-save footer pattern reused) |
| 8 | `ReservationCalendar` primitive (day/week/month) + drag-move | 2 days | Step 1 |
| 9 | `/reservations` + `/reservations/[id]` pages | 1 day | Step 8 |
| 10 | A11y audit + e2e tests per page | 1 day | All above |

**Total: ~10 working days** for one developer. Reservations calendar is the single biggest item — start it early in parallel with the simpler settings pages.

---

### 5. Decisions — investigated, with recommendations

Each item below was re-investigated against the actual backend before recommending. Citations are file:line so you can verify in seconds. Mark each `ACCEPT` / `CHANGE` and I'll lock the plan.

---

#### Q1 — `/locations` framing

**Recommendation: ACCEPT — repurpose as "Restaurant Profile" now.**

**Why.**
- The backend supports it today. `PATCH /restaurants/:id` exists (`apps/api/src/restaurants/restaurants.controller.ts:49-56`) with `UpdateRestaurantSchema` (`packages/types/src/restaurant.ts:86-88`) covering every field §3.5 needs: slug, name, description, logoUrl, coverUrl, phone, email, address, geoPoint, timezone, currency, isActive. Client function `restaurants.update(id, input)` is already exposed (`packages/api-client/src/client.ts:579-584`). **Zero new endpoints required.**
- Schema is single-tenant with no multi-location hints — no `Location` model, no `chainId`, no `branches` field, no env-var indicating intent. Building a list page for "locations" today would be pure UI fiction sitting on top of one Restaurant record.
- The information architecture matters: a restaurateur opening the admin needs *one* place to edit their public identity. Burying it inside `/settings` is the SaaS-admin mistake (Square, Toast, Lightspeed) — surfacing it as its own top-level entry under CONFIGURE is what high-end POS interfaces (Square Restaurants, Resy OS) do. The page deserves the real estate.
- Future-proofing is cheap: if multi-location ships, this page becomes the per-location editor with a header switcher above it. No structural change required, just a new `[id]` param wrap.

**Action.** Sidebar entry renames `Locations → Restaurant`. File renames `/locations/page.tsx → /restaurant/page.tsx` (and delete `[id]`). One-line redirect from `/locations` → `/restaurant` for safety. Update §3.5 path references accordingly.

---

#### Q2 — `/orders/[id]` deep-link semantics

**Recommendation: CHANGE — make `/orders/[id]` a dedicated focused page, not a drawer-over-list.**

**Why.**
- The codebase has no precedent for Next.js parallel routes or intercepting routes (`@modal`, `(.)foo`) — verified zero matches in `apps/admin/src/app/`. Adopting those conventions for a single page is high cost: every contributor would need to learn a Next.js feature that exists nowhere else. The previously-recommended pattern is technically clean but socially expensive.
- A dedicated detail page is the industry default for refresh-friendly URLs on order tickets — Toast, Square, Stripe Dashboard, Shopify Orders all do this. Drawer-over-list is great for **in-flow** triage; a detail page is great for **share-link / refresh / deep-context** review (printing, dispute work, refund justification).
- Best of both: build `<OrderDetail>` as a **content-only component** in `features/orders/components/order-detail.tsx`. The list-route drawer wraps it in `DetailDrawer`; the `/orders/[id]/page.tsx` wraps it in a `<main>` with `PageHeader` + back-link + the admin shell visible. Zero duplication.

**Action.** Update §3.1: `/orders/[id]` is a full page with sidebar/topbar intact, `<OrderDetail>` rendered inside `PageHeader`-wrapped layout, back-arrow returns to `/orders` preserving search params via `next/navigation`. Drawer on `/orders` mounts the **same** `<OrderDetail>` component, no URL changes when opening (matches existing `OrderDetailDrawer` behavior the port plan already specifies).

---

#### Q3 — Map library

**Recommendation: ACCEPT — react-leaflet 4 + leaflet 1.9.**

**Why.**
- Zero infra: OSM tiles are free, no API key, no env-var plumbing, no rate-limit billing surprises. For an internal admin tool with ≤10 simultaneous staff users this is the right tradeoff every time.
- The use case is **polygon editing**, not premium cartography. Both libraries render polygons identically; the user is looking at a polygon over a city map, not a Stripe-checkout-grade vector style.
- Bundle weight: leaflet (~42KB gz) vs mapbox-gl (~210KB gz). Five times the bundle for prettier raster tiles is not the deal we want on an admin app.
- Existing OSS ecosystem: `react-leaflet-draw` and `leaflet-geoman` give us draw/edit/delete vertex tooling out of the box. Mapbox's `mapbox-gl-draw` is comparable but its types lag.
- **One escape hatch:** if Polish OSM tile quality is poor for the target cities (Warszawa is well-covered; smaller towns vary), we can swap tile providers (MapTiler, Stadia, Carto) without changing any application code — it's a single `<TileLayer url={...} />` prop.

**Action.** Add `react-leaflet@^4`, `leaflet@^1.9`, `@types/leaflet`, `leaflet-geoman-free` (or `@geoman-io/leaflet-geoman-free`) to `packages/ui/package.json`. Lazy-load the `PolygonMapEditor` primitive (`next/dynamic({ ssr: false })`) — leaflet hard-requires `window`.

---

#### Q4 — Kitchen route group

**Recommendation: ACCEPT — `(kitchen)` route group, no admin shell.**

**Why.**
- Existing convention: the codebase already uses two route groups (`(auth)` no shell, `(dashboard)` full shell — `apps/admin/src/app/(dashboard)/layout.tsx:1-48`). Adding `(kitchen)` is the same pattern, not a new one.
- KDS UX requirements are categorically different: tablet-mounted in a kitchen, glanceable from 2 meters, finger-tap targets ≥48px, no navigation away once running. A sidebar there is dead pixels at best and a tap hazard at worst (cook accidentally navigates away mid-rush).
- Industry consensus: Square KDS, Toast KDS, Otter, BlackBox — none have an admin sidebar in their kitchen views. They're all single-purpose displays.

**Action.** Create `apps/admin/src/app/(kitchen)/layout.tsx` with `<html><body>{children}</body></html>` only (no Shell wrapper, but keep the auth-gate middleware). Move `orders/kitchen/page.tsx → (kitchen)/kds/page.tsx` and redirect `/orders/kitchen` for a transition. Sidebar entry `Kitchen Display` opens in a new tab by default (`target="_blank"`) so the cook can full-screen it without losing the admin's other state.

---

#### Q5 — Reservation calendar drag

**Recommendation: CHANGE — enable drag-to-move in **Day view only**, BUT block it behind a backend conflict-check fix first.**

**Why this is a hard call.**
- **Backend gap.** `PATCH /reservations/:id` accepts both `startAt` and `tableId` (`packages/types/src/reservation.ts:66-74`), and the service applies them (`apps/api/src/reservations/reservations.service.ts:223-253`) — but **it does not re-run the Serializable conflict-check that `create()` runs (`reservations.service.ts:99-140`)**. Today, dragging a 4-top onto an already-booked table will succeed silently. Double-booking risk is real.
- Reservations is a domain where silent failures wreck trust — a double-booked Saturday night turns into a customer-service incident, not a typo. Restaurants accept *anything* over double-booking.

**Two-step action.**
1. **Backend (small):** add a `POST /reservations/:id/move` endpoint that takes `{ startAt, endAt?, tableId }` and runs the same Serializable transaction with overlap-detection as `create()`. Reuse the existing conflict-check helper. Returns 409 with `{ conflictingReservationId }` on overlap. Update `UpdateReservationSchema` so the generic PATCH **rejects** `startAt`/`tableId` changes (force them through `/move`) — keeps notes / partySize / status edits on the cheap PATCH path.
2. **Frontend:** drag-to-move calls `useMoveReservation()`. On 409, snap the block back to its original position and show a toast `Table 7 is already booked at 19:30 — try another table or time` with a `View conflict` link that opens the conflicting reservation's drawer.

**Drag scope:** Day view only. Week view shows static blocks; clicking opens the drawer where time + table can be edited via fields (which submit through the same `/move` endpoint). Month view is read-only navigation.

**This is the only backend change in this plan that's strictly required for correctness.** Everything else (notes endpoint, profile PATCH, hours endpoint) is either an enhancement or already exists.

---

#### Q6 — Color picker on Restaurant Profile

**Recommendation: ACCEPT — curated 6-swatch palette.**

**Why.**
- Brand colors leak into the **customer-facing** web app (header, buttons, hover states) via the brand-color token. A freeform picker is a foot-gun: restaurateurs pick neon green on white, magenta on black, or — worst — a color that fails AA contrast against the cream/copper customer theme.
- Curated palettes are the modern norm for low-friction brand customization: Linear (5 accent colors), Notion (10 swatches), Stripe (8 hues × 2 shades). Each swatch is pre-tested for AA contrast against both the white/cream surface and the dark admin surface.
- 6 swatches is enough variety to feel "yours" without being a design tool: copper (default, matches the existing brand asset), olive, deep navy, plum, terracotta, charcoal. Each is locked at a single HSL value that passes contrast checks.

**Future escape hatch.** Add a `customBrandColor: string` field to the schema *later* if a paying customer demands it (sales-driven feature, not a default). Hidden behind a feature flag.

---

#### Q7 — Backend gaps — consolidated

Now resolved with hard facts. Three items, one true gap.

##### Q7a — Order notes

**Status: small change required.**

**Findings.**
- `Order.notes` exists as a single optional string (`packages/db/prisma/schema.prisma:406`) — this is the **customer's** delivery/order note, not staff annotations. Don't overload it.
- `OrderStatusEvent.note` exists (`schema.prisma:443`) and is already written by `transition()` (`apps/api/src/orders/orders.controller.ts:163,174`) — staff already attach notes when advancing status.
- No freestanding staff-notes endpoint or model.

**Recommendation.** Reuse `OrderStatusEvent` rather than add a new `OrderNote` model. Add a `NOTE` value to the event-kind enum and a `POST /orders/:id/notes` endpoint that writes an event with `kind: 'NOTE'`, no status transition. The `ActivityTimeline` primitive already renders status events — notes render in the same timeline interleaved chronologically, which is the right UX (staff want to see "what happened" in time order, not two parallel streams).

**Why not a separate model.** A separate `OrderNote` table is the textbook normalization answer, but it costs a migration, a new DTO, a new endpoint, a new hook, and forces the UI to interleave two streams in the timeline component. Reusing status events is one enum value + one thin controller method. The audit trail benefit is identical.

**Action.**
- `packages/db/prisma/schema.prisma`: extend `OrderStatusEvent.kind` enum to include `NOTE`. Migration.
- `apps/api/src/orders/orders.controller.ts`: add `POST /orders/:id/notes` calling a new service method `addNote(orderId, note, actorId)`.
- `packages/types/src/order.ts`: add `AddOrderNoteSchema = z.object({ note: z.string().min(1).max(2000) })`.
- `packages/api-client/src/client.ts`: add `orders.addNote(id, { note })`.
- Permission: `order.write`.

##### Q7b — Restaurant profile PATCH

**Status: already exists. No backend work.**

`PATCH /restaurants/:id` covers every field §3.5 needs (`apps/api/src/restaurants/restaurants.controller.ts:49-56` + `restaurants.service.ts:71-97`). Frontend hook: `useUpdateRestaurantProfile(id)` wrapping `apiClient.restaurants.update(id, input)`. Done.

**One small enhancement worth doing inline** while we're here: add the public toggles (`acceptsReservations`, `acceptsDelivery`, `acceptsPickup`, `acceptsDineIn`) to `UpdateRestaurantSchema` if they're not already there. Check `packages/types/src/restaurant.ts:86-88` — if `isActive` is the only boolean, extend the schema; if the toggles already exist, no change.

##### Q7c — Operating hours write path

**Status: already exists, but the plan had it routed through the wrong hook. Fixed.**

Dedicated endpoint: `PUT /restaurants/:id/hours` (`apps/api/src/restaurants/restaurants.controller.ts:64-72`) → `RestaurantsService.updateHours()` → upserts the 7 normalized `OperatingHours` rows in a transaction. Hours are **not** part of `RestaurantSettingsSchema` (`packages/types/src/settings.ts:38-50`).

**Action.** §3.7 has been corrected — `/settings/hours` calls `apiClient.restaurants.updateHours(id, { hours })`, **not** the settings hook. The page is otherwise unchanged.

---

### 5b. Net backend work (single source of truth)

After investigation, the only required backend changes are:

| # | Change | Effort | Files |
|---|---|---|---|
| 1 | Add `NOTE` to `OrderStatusEvent.kind` enum + migration | 15 min | `schema.prisma`, migration |
| 2 | Add `POST /orders/:id/notes` controller + service method | 30 min | `orders.controller.ts`, `orders.service.ts` |
| 3 | Add `AddOrderNoteSchema` + client method | 10 min | `packages/types/src/order.ts`, `packages/api-client/src/client.ts` |
| 4 | Add `POST /reservations/:id/move` with conflict-check (reuse `create`'s helper) | 1 hour | `reservations.controller.ts`, `reservations.service.ts` |
| 5 | Restrict `UpdateReservationSchema` to exclude `startAt`/`tableId` (force through `/move`) | 15 min | `packages/types/src/reservation.ts` |
| 6 | (Optional) Add accept-* toggles to `UpdateRestaurantSchema` if missing | 15 min | `packages/types/src/restaurant.ts` |

**Total: ~2.5 hours of backend work** spread across the implementation, not blocking any frontend page. The reservation `/move` endpoint is the only true correctness fix; everything else is convenience.
