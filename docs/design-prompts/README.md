# Admin Dashboard — Design Handoff & Status

> Last updated: 2026-05-16 end of session. Start here when resuming work.

---

## 0. Where we are right now (TL;DR)

We're designing the **admin dashboard** for the restaurant ordering platform.

**Strategy:** 3 design-heavy pages built with **Claude Design** that together cover ~85% of every component pattern. Each page extracts reusable primitives into `packages/ui`. The remaining 11 pages get composed from those primitives in **Claude Code** — plus 4 isolated new pieces (calendar, map, KDS grid, promotion variants).

| Page | Status | Notes |
|---|---|---|
| Page 1 — Overview / Home | ✅ Built, reviewed, greenlit | 5 small carry-over fixes logged |
| Page 2 — Orders + 10 primitives extracted to `@repo/ui` | ✅ Built, reviewed, greenlit | Timeline + Customer sections confirmed below fold |
| Page 3 — Menu + 8 more primitives | 🟡 Prompt sent, awaiting screenshots + primitive APIs | Pre-build replies expected first |
| Pages 4–14 — composition work | ⏳ Pending page 3 | Will port in Claude Code |
| 4 "new pieces" (calendar, map, KDS, promo variants) | ⏳ Pending | Build alongside page 4+ |

**The next concrete action when you come back:** check whether Claude Design has replied for page 3 (3 pre-build replies + screenshots). If yes, review. If no, poke them — see §7.

---

## 1. What's been delivered (in this repo)

```
docs/
  PROJECT-REPORT.md                          ← full project report (every API, every page, every pipeline)
  design-prompts/
    README.md                                ← this file
    admin-01-overview.md                     ← page 1 prompt
    admin-02-orders.md                       ← page 2 prompt
    admin-03-menu.md                         ← page 3 prompt (sent, awaiting response)
```

Living outside this repo (in your Claude Design conversations):
- Page 1 (Overview) — implementation rendered, screenshots in chat history.
- Page 2 (Orders) — implementation rendered, screenshots in chat history.
- Page 3 (Menu) — in flight.

After Claude Design's work is approved, the code (page implementations + the 18 `@repo/ui` primitives) needs to be **brought into this repo**. Two options:
1. Ask Claude Design for the file contents and paste them in.
2. Have Claude Code reproduce them from the screenshots + this handoff. The screenshots + the spec + the locked tokens are enough information to rebuild faithfully — that's actually the safer path because Claude Code lives inside this repo and won't accidentally introduce dependency drift.

Recommended path: **(2)** — use Claude Design's output as visual ground truth, have Claude Code implement the primitives and pages directly into the repo, page by page.

---

## 2. The strategy — why these 3 pages

Each page is chosen to maximize unique pattern coverage:

- **Page 1 (Overview)** locks the **visual language**: tokens, typography, density, motion, KPI cards, charts (line, donut, sparkline), ranked table, status legend, live pulse, sidebar IA, topbar pattern.
- **Page 2 (Orders)** locks the **list + detail pattern**: filter pills, secondary filters, dense table, real-time row arrivals, status pills, detail drawer, activity timeline, action modals, bulk actions, audio chime, browser notifications.
- **Page 3 (Menu)** locks the **form + editor pattern**: two-pane layout, image upload, drag-reorder, nested array editing (modifier groups → options), inline editing, schedule picker, sectioned drawer body, currency input.

Coverage across the remaining 11 pages:
- **80% pure composition** — Customers, Reviews, Promotions, Staff, Audit, Contact, Reports, Locations, Settings/Hours, Settings/Holidays. Just feed the table new column defs and the drawer a new body.
- **15% one new piece each** — Reservations (calendar), Settings/Delivery zones (map editor), Kitchen Display (full-screen card grid). Each is a single isolated component, easy to build once the foundation exists.
- **5% domain logic** — promotion type variants (%/fixed/BOGO/free-delivery), state-machine specifics. Small forms.

---

## 3. The flow we used with Claude Design

This is the loop. Apply it for any future page or any iteration:

1. **Write a self-contained prompt** in `docs/design-prompts/admin-NN-<slug>.md`. Each prompt has the same shape:
   - Recap of what's locked from previous pages (don't redesign settled things)
   - **Extraction directive** — which primitives to extract into `@repo/ui`
   - What staff actually do on this page (top 5 tasks)
   - Full layout spec (topbar slot, page body, sections, components, columns)
   - States (loading, empty, error)
   - Keyboard shortcuts
   - Mock data shape
   - Deliverable file list
   - **Pre-build replies gate** — interpretation paragraph + primitive API signatures + a composition snippet, before any code

2. **Paste into a fresh Claude Design conversation** (one per page; don't reuse the same chat across pages — context bloats).

3. **Read the 3 pre-build replies.** Sanity-check the primitive APIs *before* code. If `DataTable<T>` has the wrong shape, every later page pays for it.

4. Let them build.

5. **Receive screenshots.** Review against the spec point-by-point. List bugs, list things to verify (drawer scrolled to bottom, hover states, etc.), greenlight when ready. Don't sweat mock-data numbers — those get replaced with real data anyway.

6. Move to next page.

**The "pre-build replies" gate is the highest-leverage step.** That's where API shapes get caught before they propagate.

---

## 4. Locked design system (don't drift across pages)

### Color tokens (CSS variables on `:root`)

```css
--bg:                 #0B0D12;
--surface:            #14171F;
--surface-elevated:   #1A1E27;
--border:             rgba(255, 255, 255, 0.06);
--border-strong:      rgba(255, 255, 255, 0.12);

--text-primary:       #ECEEF3;
--text-secondary:     #9CA3AF;
--text-tertiary:      #5B6070;
--text-disabled:      #3A3F4B;

--accent:             #7FE8C8;   /* mint — selection, primary CTA, key data */
--accent-hover:       #5BD8B4;
--accent-muted:       rgba(127, 232, 200, 0.10);

--positive:           #34D399;
--negative:           #F87171;
--warning:            #FBBF24;
--info:               #A78BFA;
```

Chart palette (in order): `#7FE8C8, #A78BFA, #60A5FA, #FBBF24, #F87171`.

### Status → color map (use on every page that shows order status)

| Status | Color token |
|---|---|
| `PENDING` | `--text-tertiary` |
| `CONFIRMED` | `--info` (purple) |
| `PREPARING` | `--warning` (amber) |
| `READY` | `--accent` (mint) |
| `OUT_FOR_DELIVERY` | `#60A5FA` (blue) |
| `DELIVERED` | `--positive` (emerald) |
| `CANCELLED` | `--negative` (red) |

### Typography

- Font: **Inter** or **Geist**, system fallback. `font-feature-settings: "tnum"` on every number.
- Scale: Display 32/600 · H1 24/600 · H2 16/600 · Body 14/400 · Small 13/400 · Caption 12/500 uppercase 0.06em.

### Layout

- Sidebar **240px** (collapse to 64px); five groups: `OPERATE` `CATALOG` `PEOPLE` `INSIGHTS` `CONFIGURE`.
- Topbar **56px** sticky.
- Page content max **1440px**, **24px** horizontal padding.
- **8pt spacing grid**: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Cards: **12px radius**, hairline border (`--border`), no shadow.
- Active nav item: `--accent-muted` background + 2px left accent border.

### Motion

150–200ms ease-out only. New real-time rows fade + slide 12px from top with 2px `--accent` left-border that fades over 3s. Hover = color only, no scale or shadow.

### Density

Target 1440×900, works down to 1280, reflows below.

---

## 5. Primitives in `@repo/ui` (the foundation)

### After page 2 (10 primitives + 1 helper)

| Primitive | Path | Used by |
|---|---|---|
| `PageHeader` | `packages/ui/src/page-header/` | every list page |
| `DataTable<T>` | `packages/ui/src/data-table/` | every list page |
| `FilterPillGroup` | `packages/ui/src/filter-pill-group/` | Orders, Customers, Reviews, Reservations, Promotions |
| `StatusPill` | `packages/ui/src/status-pill/` | Orders, Reservations, Reviews, Payments, Audit |
| `TypeBadge` | `packages/ui/src/type-badge/` | many |
| `DetailDrawer` | `packages/ui/src/detail-drawer/` | Orders, Customers, Promotions, Reservations, Reviews, Contact, Menu |
| `ActivityTimeline` | `packages/ui/src/activity-timeline/` | Order detail, Reservation detail, Audit log |
| `ActionModal` | `packages/ui/src/action-modal/` | Refund, Cancel, Bulk actions, Invite, Delete, Export |
| `BulkActionBar` | `packages/ui/src/bulk-action-bar/` | Orders, Customers, Reviews, Menu items |
| `RelativeTime` | `packages/ui/src/relative-time/` | every table |
| `formatMoney(amount, currency)` | `packages/utils/money.ts` or `packages/ui` | every monetary value |

### After page 3 (8 more)

| Primitive | Path | Used by |
|---|---|---|
| `FormField` | `packages/ui/src/form-field/` | every form |
| `CurrencyInput` | `packages/ui/src/currency-input/` | Menu prices, Promotions value, Settings |
| `ImageUploader` | `packages/ui/src/image-uploader/` | Menu items, Promotions banners, restaurant logo/cover, avatars |
| `DragReorderList<T>` | `packages/ui/src/drag-reorder-list/` | Menu categories, item images, modifier groups, modifier options, more |
| `TwoPaneLayout` | `packages/ui/src/two-pane-layout/` | Menu, Settings, Reports |
| `SectionedDrawerBody` | `packages/ui/src/sectioned-drawer-body/` | Item editor, Customer detail, Promotion detail |
| `SchedulePicker` | `packages/ui/src/schedule-picker/` | Item availability, Operating hours, Promotion windows, Holidays |
| `InlineEdit` | `packages/ui/src/inline-edit/` | Category names, modifier names, customer notes |

**Total: 18 primitives + 1 helper.**

---

## 6. Open issues / carry-over fixes

### From page 1 review
1. Mix positive and negative deltas in mocks — not all green, not all red.
2. All numbers across all surfaces must reconcile to the same base data set.
3. Pluralize correctly (`1 item` / `2 items`).
4. Verify chart gradient fills render at specced opacity (`accent @ 25% → 0%`).
5. Y-axis formatter switches to `$k` above 1000.

### From page 2 review
6. **ELAPSED column math**: should be `now − confirmedAt` (monotonically ascending positive minutes), not reversed.
7. **`formatMoney` must use `minimumFractionDigits: 2`** everywhere — drawer was dropping the second decimal (`$67.0` instead of `$67.00`).

These are all easy fixes when wiring real data + porting to Claude Code. Don't sweat them in the design phase.

---

## 7. When you wake up — first action

### A. Check Claude Design for page 3 reply

Open the page 3 chat. You're looking for **two things**:

1. **The 3 pre-build replies** that the prompt requires before code:
   - One-paragraph interpretation focused on `SectionedDrawerBody` (anchor nav) vs plain scrollable sections.
   - Signatures of the 8 new `@repo/ui` primitives (especially `DragReorderList<T>` and `ImageUploader`).
   - A 5-line snippet showing `DragReorderList<ModifierOption>` composed inside the modifier group card.
2. **Screenshots** of the built page (Menu list + Item Editor open).

### B. Review

- If primitive APIs look clean → greenlight the build.
- If something feels off (e.g., `DragReorderList` baked into a Menu-specific shape) → push back in that chat with the exact API you want.
- Once screenshots arrive, review against the spec in `admin-03-menu.md`. Apply the same "list bugs / list verifies / greenlight" pattern from pages 1 + 2.

### C. After page 3 is greenlit

Move to porting in Claude Code. See §8.

---

## 8. After all 3 design pages — porting plan

Start a fresh Claude Code session in `D:\restaurant`. Paste this opener:

> Read `docs/design-prompts/README.md` to get oriented. Pages 1–3 of the admin dashboard are built in a sibling Claude Design conversation with 18 primitives extracted to `packages/ui`. We're porting the page implementations and primitives into the repo, then composing the remaining 11 admin pages on top. Start by [your choice — see below].

### Suggested porting order

**Phase A — Bring in pages 1–3 + extract primitives** (foundation)
1. Port the 18 primitives into `packages/ui/src/` with the agreed APIs.
2. Port page 1 (`apps/admin/src/app/(dashboard)/page.tsx`) + `features/overview/`.
3. Port page 2 (`apps/admin/src/app/(dashboard)/orders/page.tsx`) + `features/orders/`.
4. Port page 3 (`apps/admin/src/app/(dashboard)/menu/page.tsx`) + `features/menu/`.

**Phase B — Pure composition pages** (cheap, ~2–4 h each)
5. Customers (`/customers`, `/customers/[id]`) — table + drawer.
6. Reviews (`/reviews`) — table + drawer with reply textarea.
7. Staff (`/staff`) — table + invite modal.
8. Audit log (`/audit-log`) — read-only table.
9. Contact messages (`/contact`) — table + drawer.
10. Reports / Exports (`/reports/exports`) — table + create-export modal with status polling.
11. Promotions list (`/promotions`) + Promotion detail (`/promotions/[id]`) — table + drawer with coupons sub-table + type-variant inputs.

**Phase C — Settings & locations** (forms, ~2–3 h each)
12. Locations (`/locations`, `/locations/[id]`) — form reusing item editor pattern.
13. Settings / Hours (`/settings/hours`).
14. Settings / Holidays (`/settings/holidays`).

**Phase D — The 4 "new" pieces** (each is one isolated component)
15. Reservations (`/reservations`, `/reservations/[id]`) — week/day calendar + table view + status transitions.
16. Settings / Delivery zones (`/settings/delivery-zones`) — polygon map editor (consider `react-leaflet` or `mapbox-gl`).
17. Kitchen Display (`/orders/kitchen`) — full-screen card grid, no sidebar, large fonts, tap-to-advance. Almost its own micro-app — separate layout.

---

## 9. Wiring the dashboard to the real API (the last mile)

Once UI is done, the work to ship:

1. **Replace every `lib/mock/*.ts`** with TanStack Query hooks. Hooks already exist in `apps/admin/src/features/*/hooks/` — they're wired to `@repo/api-client`.
2. **Wire Socket.IO subscriptions** on Orders + KDS via `@repo/realtime-client`:
   - Orders list subscribes to `restaurant:{id}:orders`, listens for `order.created` / `order.status_changed`.
   - KDS subscribes to `restaurant:{id}:kitchen`, listens for `kitchen.ticket_added` / `kitchen.ticket_removed`.
3. **Real auth gate**: middleware checks the `refresh_token` cookie; `useAuthStore().hasPermission(key)` gates every action button.
4. **Real R2 presigned upload** for `ImageUploader`: call `POST /uploads/presign` → `PUT` direct to R2 → `POST /menu/items/:id/images`.
5. **Real Stripe refunds**: `POST /payments/:paymentId/refunds`.
6. **CSV/XLSX exports**: `POST /reports/exports` → poll `GET /reports/exports/:id` → download via signed R2 URL.
7. **Browser notifications & audio chime**: register `Notification.requestPermission()`, persist mute toggle in `localStorage`.
8. **Accessibility audit**: focus management in drawer (focus trap, return focus on close), keyboard nav in tables, off-screen `<table>` summaries for charts.

---

## 10. How to navigate this repo (quick refs)

- **Full project report**: `docs/PROJECT-REPORT.md` (every API, every page, every pipeline).
- **Database schema**: `packages/db/prisma/schema.prisma`.
- **Zod schemas (single source of truth for types)**: `packages/types/src/`.
- **Permission keys + role mapping**: `packages/db/seed.ts` + `packages/types/src/permissions.ts`.
- **API client (typed routes)**: `packages/api-client/src/client.ts`.
- **Realtime client**: `packages/realtime-client/src/`.
- **Existing admin hooks (TanStack Query)**: `apps/admin/src/features/*/hooks/`.
- **Existing admin stores (Zustand)**: `apps/admin/src/stores/`.

---

## 11. Resume prompt for a fresh Claude Code session

Copy-paste this into a new Claude Code conversation when you come back:

> I'm continuing work on `D:\restaurant` admin dashboard. **Read `docs/design-prompts/README.md` first** — it has the current status, the locked design system, what's done, what's next, and file locations. Then: [tell me today's goal — e.g., "port the 10 primitives from page 2 into `packages/ui` and bring in the Orders page implementation"].

---

## 12. One-line status for the next session

> Pages 1–2 designed and greenlit. Page 3 prompt sent to Claude Design, awaiting pre-build replies and screenshots. After page 3 lands, port 18 primitives + 3 page implementations into the repo, then compose 11 remaining pages in Claude Code (10 cheap, 3 with one new piece each), then wire to real APIs.

Sleep well.
