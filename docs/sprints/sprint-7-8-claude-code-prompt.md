# Claude Code Prompt — Sprints 7 + 8 (Admin Advanced + Reports/Analytics) — NO UI

> Paste into a fresh Claude Code session at the repo root. Sprints 0–5 are already complete; Sprint 6 is being handled in a separate parallel session.

---

## CONTEXT

We are continuing the restaurant ordering platform. Before doing anything else, read these files in full:

1. `docs/restaurant-app-project-plan.md` — master plan (especially §4 schema, §8 features sections "Admin Advanced" and "Reports", §12 sprint plan, §Appendix B KPI catalog)
2. `docs/sprints/sprint-0-1-claude-code-prompt.md` and `docs/sprints/sprint-0-1-complete.md` — original conventions + decisions made
3. `docs/sprints/sprint-2-5-claude-code-prompt.md` and all available `sprint-*-status.md` reports under `.claude/reports/` — what's been built so far
4. `CLAUDE.md` at the repo root — working agreement

The full Prisma schema is already in place from Sprint 0+1. Sprints 7 and 8 add backend modules + frontend data-layer (hooks, stores, route files) — still **no UI**.

**Sprint 6 (live orders + KDS frontend) is being implemented in parallel by another session.** That sprint touches `apps/admin/src/app/(dashboard)/orders/` route files and adds `useLiveOrders` / `useKitchenFeed` hooks. **You will NOT touch those paths.** Anything in this run that needs realtime can use the existing `packages/realtime-client` package from Sprint 5 directly without modifying it.

---

## HARD CONSTRAINT — NO UI

Same rule as previous sprints: **do not write any UI in this run.**

- Page/screen files: `return null` + `// TODO(ui):` comment.
- No JSX, no Tailwind utility classes, no shadcn or NativeWind components, no design tokens.
- Data layer (hooks, stores, API clients, types, endpoints, BullMQ jobs, exports) must be **complete and tested**.

## HARD CONSTRAINT — BACKEND IS SCOPED PER SPRINT

| Sprint | NestJS modules added |
|---|---|
| Sprint 7 | `reservations`, `reviews`, `customers` (admin segments + detail), `staff` (user/role management), `settings` (restaurant config: hours, delivery zones, tax rates) |
| Sprint 8 | `analytics` (KPI endpoints + rollup jobs), `reports` (CSV/PDF export endpoints), `audit-log` (write + read) |

Modules NOT touched: `loyalty` redemption flow, marketing pages (Sprint 10), full i18n (Sprint 11). Sprint 6's modules (live orders feed, kitchen) are owned by the parallel session — do not touch.

---

## RESPECT EXISTING DECISIONS

From the Sprint 0+1 and Sprint 2-5 completion reports, the following are locked. Do not re-debate:

- Hand-rolled `JwtAuthGuard` using `@repo/auth-core`.
- Vitest + `unplugin-swc` for API e2e tests; esbuild for frontend tests.
- `@swc-node/register` for API dev runtime.
- `pnpm overrides` pin `@types/react@18.3.18`.
- `dotenv -e ../../.env --` prefix on scripts needing root `.env`.
- `useImportType` Biome rule OFF.
- Biome lint skipped on `apps/api` until Biome 2.x.
- Web/admin: access token in memory (Zustand), refresh token in httpOnly cookie.
- Mobile: both tokens in `expo-secure-store`.
- `notify(level, msg)` is a no-op for now.
- Stripe-only payments (no Paymob); Poland target market, PLN currency, P24 + BLIK + cards + Apple/Google Pay enabled.
- Fastify 5 + `@nestjs/swagger@8.1` + `nestjs-zod` wired up (or per Sprint 5 report — verify before adding new endpoints, document any deviation in your status report).
- `packages/realtime-client` exists and is used by all three apps for socket connections — consume as-is, don't extend in this run.

---

## DEFAULTS — APPLY AUTOMATICALLY (NO APPROVAL NEEDED)

The previous sprint prompts asked you to flag decisions. **For this run, when faced with the choices below, just pick the listed default and proceed.** Note the choice in your final status report under a "Decisions Applied" section so I can review at the end.

1. **Idempotency storage**: Redis keys with TTL (matching Sprint 3+4 pattern). 24h TTL on user-facing actions, 7d on webhooks.
2. **Pagination**: cursor-based (`?cursor=&limit=`) for any list endpoint expected to grow past 1000 rows (orders, customers, reservations, audit logs). Offset-based (`?page=&pageSize=`) for bounded lists (staff, settings entries).
3. **CSV export**: server-side generation via a streaming response (no full in-memory load). Filename pattern `{report-type}-{restaurantSlug}-{YYYYMMDD-HHmm}.csv`. UTF-8 with BOM (Excel-friendly).
4. **PDF export**: `@react-pdf/renderer` (same library used by Sprint 4 receipts) — reuse the existing styling primitives. Generate via a BullMQ job for reports likely to exceed 5s; serve smaller reports inline.
5. **Async export download flow**: long exports → `POST /reports/exports` creates an `Export` record (new table — see §migration below) and queues a job; client polls `GET /reports/exports/:id` until status is `READY` then downloads via signed URL. Short exports return the file directly.
6. **Audit log scope**: log all admin-side writes (anything with `@Permissions(...)` that's not a read). Include actor user id, action key, target resource type + id, before/after JSON diff (truncated to 8KB), IP, user agent, timestamp. Async via a BullMQ `audit.write` queue so it never blocks the request.
7. **KPI cache TTL**: 15 minutes in Redis for the "live" KPI summary (used by admin overview). Historical aggregates older than today come from a daily rollup table (never Redis).
8. **Rollup job schedule**: hourly job aggregates the current day's metrics into a working row; nightly job at 02:00 (restaurant timezone) finalizes the previous day. Both implemented as BullMQ repeatable jobs.
9. **Time zone handling**: all date-range filters use the restaurant's `timezone` field. UTC stored in DB. Use `date-fns-tz` for conversions.
10. **Delivery zones**: store as GeoJSON polygons in the existing `Restaurant.address` JSON via a new `deliveryZones` JSON column (add via migration). No PostGIS in this run — point-in-polygon checks done in TS using `@turf/boolean-point-in-polygon`. Document this for the team and flag PostGIS as a future migration if delivery volume warrants.
11. **Settings storage**: extend `Restaurant` with explicit columns where appropriate (`taxRate Decimal`, `defaultDeliveryFee Decimal`, `minOrderAmount Decimal`, `deliveryZones Json`, `holidayDates Json`) rather than dumping into a generic settings blob. Easier to query, easier to validate.
12. **Reservation availability**: simple slot generation based on restaurant hours + table capacity + a `slotDurationMinutes` setting (default 90 min). No overbooking allowed. Buffer time between reservations: 15 min (configurable per restaurant).
13. **Customer segments**: computed on-the-fly in queries (not stored). Definitions:
    - `vip`: lifetime orders ≥ 20 OR lifetime spend ≥ 2000 PLN
    - `frequent`: 5+ orders in last 90 days
    - `dormant`: had ≥ 1 order, none in last 60 days
    - `new`: account created in last 30 days, ≤ 1 order
    - `active`: anything else with at least one completed order
14. **Review moderation**: reviews default to `isVisible: true` on creation. Admin can hide. Spam heuristic: if review contains ≥ 2 URLs, auto-hide and flag for review. No external content moderation API in this run.
15. **Staff invite flow**: admin creates a user with an email, no password — system queues an "invite" email with a signed token; recipient sets password on first login. Token TTL 7 days. New `StaffInvite` model needed — add via migration.
16. **Permission model for staff endpoint**: only `owner` can manage other owners. `manager` can manage `kitchen` and `cashier`. Enforce in service layer, not just permissions decorator.
17. **Export retention**: completed exports kept 30 days, then deleted by a daily cleanup job. R2 lifecycle rule documented in `docs/local-setup.md`.

---

## REQUIRED WORKFLOW

1. **Read all reference files in CONTEXT.**
2. **Write a combined plan** to `.claude/plans/sprint-7-8.md` organized by sprint with phases, file paths, verification commands, and a list of any open questions (only ones not covered by the defaults above).
3. **Do NOT stop after the plan.** Start implementation immediately.
4. **Do NOT stop between Sprint 7 and Sprint 8.** Implement Sprint 7 → run its verification commands → implement Sprint 8 → run its verification commands → write the combined final report.
5. **Single stop gate at the end**: after writing `.claude/reports/sprints-7-8-complete.md`, stop and wait for my review.
6. If during implementation you hit a real blocker not covered by defaults (something requiring me to make a choice), document it inline in the report and proceed with the most conservative reasonable option. The report's "Open decisions for review" section is where these get flagged.

---

## SPRINT 7 — Admin Advanced (Reservations, Reviews, Customers, Staff, Settings)

### 7.1 Schema additions

New migration `add-sprint-7-fields`:
- `Restaurant`: add `taxRate Decimal @db.Decimal(5,4) @default(0.08)`, `defaultDeliveryFee Decimal @db.Decimal(10,2) @default(0)`, `minOrderAmount Decimal @db.Decimal(10,2) @default(0)`, `deliveryZones Json @default("[]")`, `holidayDates Json @default("[]")`, `reservationSlotMinutes Int @default(90)`, `reservationBufferMinutes Int @default(15)`.
- New model `StaffInvite { id, email, roleId, tokenHash, invitedByUserId, expiresAt, acceptedAt?, createdAt }`.

### 7.2 Backend modules

**`reservations`**
- `GET /reservations/availability?restaurantId=&date=&partySize=` — public. Returns array of available slot times. Algorithm: enumerate operating hours for the day, generate slots at `slotDurationMinutes` intervals + buffer, filter out slots where total capacity (sum of available table seats) < partySize.
- `POST /reservations` — public or auth. Body: `{ restaurantId, startAt, partySize, contactName, contactPhone, contactEmail, occasion?, notes? }`. Validates slot is still available (race-safe via transaction + recheck), creates reservation in `confirmed` status, queues confirmation email, queues SMS confirmation 24h before via delayed BullMQ job.
- `GET /reservations` — admin, paginated, filter by date range / status / restaurantId.
- `GET /reservations/:id` — admin or owner.
- `PATCH /reservations/:id` — admin (`reservation:write`) or customer (limited: notes only, can't change date/time within 24h of start).
- `POST /reservations/:id/cancel` — body: `{ reason }`. Queues cancellation email.
- `POST /reservations/:id/seat` — admin, transitions to `seated`, requires table assignment.
- `POST /reservations/:id/complete` — admin, transitions to `completed`.
- `POST /reservations/:id/no-show` — admin, transitions to `no_show`. Auto-triggered by cron job 30 min after `startAt` for any still-confirmed reservations.
- Tables: `GET /restaurants/:id/tables`, `POST /restaurants/:id/tables`, `PATCH /tables/:id`, `DELETE /tables/:id`.

**`reviews`**
- `POST /reviews` — auth required. Body: `{ orderId, rating, comment? }`. Validates: order is mine, status is `COMPLETED|DELIVERED`, no existing review for this order. Auto-hide if comment has 2+ URLs.
- `GET /restaurants/:id/reviews` — public, paginated, `isVisible: true` only. Sort by recent or rating.
- `GET /reviews/me` — auth, customer's own reviews.
- `GET /admin/reviews` — admin, `review:moderate`, includes hidden ones, filter by visibility/rating/restaurant.
- `PATCH /admin/reviews/:id` — admin, body `{ isVisible }`.
- `DELETE /admin/reviews/:id` — admin, soft-delete via `isVisible: false`. Actual delete is not allowed (preserve for analytics).

**`customers` (admin lens on User table)**
- `GET /admin/customers` — admin, paginated. Query params: `search` (matches name/email/phone), `segment` (vip|frequent|dormant|new|active), `restaurantId` (filters to customers who ordered there). Returns aggregate columns: `lifetimeOrders`, `lifetimeSpend`, `lastOrderAt`, `firstOrderAt`, computed `segment`.
- `GET /admin/customers/:id` — admin, full detail: profile, addresses, payment methods (last4 only), order history summary, review history, lifetime stats, segment, notes.
- `PATCH /admin/customers/:id/notes` — admin, free-text note appended to a `Notification`-style `CustomerNote` table.
  - New model needed: `CustomerNote { id, userId, byUserId, body, createdAt }`. Add to the sprint 7 migration.

**`staff` (user + role management)**
- `GET /admin/staff` — admin (`staff:read`), lists users with non-customer roles. Filter by role, restaurant.
- `POST /admin/staff/invite` — admin (`staff:write`). Body: `{ email, roleKey, restaurantId? }`. Validates role hierarchy (manager cannot invite owners). Creates `StaffInvite`, queues invite email with signed token.
- `POST /staff/accept-invite` — public. Body: `{ token, password, firstName, lastName }`. Consumes invite, creates user with role assignment.
- `PATCH /admin/staff/:userId/role` — admin (`staff:write`). Body: `{ roleKey }`. Permission hierarchy enforced in service.
- `POST /admin/staff/:userId/deactivate` — admin. Sets `isActive: false`, revokes all refresh tokens.
- `POST /admin/staff/:userId/reactivate` — admin.

**`settings`**
- `GET /admin/restaurants/:id/settings` — admin (`settings:read`). Returns tax rate, delivery fee, min order, delivery zones, holidays, reservation slot/buffer durations.
- `PATCH /admin/restaurants/:id/settings` — admin (`settings:write`). Body: partial settings object validated by Zod. On `deliveryZones` change, invalidate any cached zone lookups.
- `POST /admin/restaurants/:id/holidays` — body: `{ date, label, isClosed?, openOverride?, closeOverride? }`. Append to `holidayDates` JSON.
- `DELETE /admin/restaurants/:id/holidays/:date`.
- `GET /admin/restaurants/:id/delivery-zones/check?lat=&lng=` — service endpoint used by checkout to determine which zone (and therefore which fee) applies to a delivery address.

### 7.3 Shared types

- `reservation.ts` — `ReservationDto`, `CreateReservationDto`, `UpdateReservationDto`, `AvailabilityQueryDto`, `AvailabilitySlotDto`, `TableDto`, `CreateTableDto`.
- `review.ts` — `ReviewDto`, `CreateReviewDto`, `ReviewModerationDto`, `ReviewListQueryDto`.
- `customer.ts` — `CustomerSummaryDto`, `CustomerDetailDto`, `CustomerSegment`, `CustomerNoteDto`.
- `staff.ts` — `StaffMemberDto`, `InviteStaffDto`, `AcceptStaffInviteDto`, `UpdateStaffRoleDto`.
- `settings.ts` — `RestaurantSettingsDto`, `UpdateRestaurantSettingsDto`, `DeliveryZoneDto` (GeoJSON polygon with `name`, `fee`, `minOrderAmount?`), `HolidayDto`, `DeliveryZoneCheckResponseDto`.
- New permission keys: `reservation:read`, `reservation:write`, `review:moderate`, `customer:read`, `customer:notes`, `staff:read`, `staff:write`, `settings:read`, `settings:write`. Update `ROLE_PERMISSIONS`:
  - `owner`: all of the above.
  - `manager`: all except `staff:write` (can only invite kitchen/cashier per hierarchy — enforce in service), and except `settings:write` (read only).
  - `cashier`: `reservation:read`, `reservation:write` (host duties), `customer:read`.
  - `kitchen`: nothing new.

### 7.4 API client + hooks

Add resources: `reservations.*`, `reviews.*`, `customers.*`, `staff.*`, `settings.*`.

Hooks per app (admin gets the full set; web + mobile get the public-facing subset):

**Public (web + mobile)**:
- `useReservationAvailability(restaurantId, date, partySize)` (query, no caching beyond 30s)
- `useCreateReservation`
- `useMyReservations`
- `useCancelReservation`
- `useCreateReview`
- `useMyReviews`
- `useRestaurantReviews(restaurantId)`

**Admin only**:
- Reservations: `useReservations`, `useReservation`, `useUpdateReservation`, `useSeatReservation`, `useCompleteReservation`, `useNoShowReservation`, `useCancelReservation` (admin variant), tables CRUD.
- Reviews: `useAdminReviews`, `useToggleReviewVisibility`.
- Customers: `useCustomers` (paginated), `useCustomer`, `useUpdateCustomerNote`.
- Staff: `useStaff`, `useInviteStaff`, `useUpdateStaffRole`, `useDeactivateStaff`, `useReactivateStaff`.
- Settings: `useRestaurantSettings`, `useUpdateRestaurantSettings`, `useAddHoliday`, `useRemoveHoliday`, `useCheckDeliveryZone`.

### 7.5 Route placeholders

```
apps/web/src/app/(marketing)/reservations/page.tsx
apps/web/src/app/(account)/reservations/page.tsx
apps/web/src/app/(account)/reviews/page.tsx
apps/web/src/app/staff/accept-invite/page.tsx          # public, no group

apps/admin/src/app/(dashboard)/reservations/page.tsx
apps/admin/src/app/(dashboard)/reservations/[id]/page.tsx
apps/admin/src/app/(dashboard)/reviews/page.tsx
apps/admin/src/app/(dashboard)/customers/page.tsx
apps/admin/src/app/(dashboard)/customers/[id]/page.tsx
apps/admin/src/app/(dashboard)/staff/page.tsx
apps/admin/src/app/(dashboard)/settings/page.tsx
apps/admin/src/app/(dashboard)/settings/delivery-zones/page.tsx
apps/admin/src/app/(dashboard)/settings/hours/page.tsx
apps/admin/src/app/(dashboard)/settings/holidays/page.tsx

apps/mobile/app/reservations/index.tsx
apps/mobile/app/reservations/new.tsx
apps/mobile/app/reviews/new.tsx
```

All return `null` + `// TODO(ui):`.

### 7.6 Seed data (additive)

Extend `packages/db/seed.ts`:
- `seedTables()` — 8 tables for the test restaurant with varied capacities (2x2-top, 3x4-top, 2x6-top, 1x8-top).
- `seedReservations()` — 5 future reservations across the next 7 days for the customer test user.
- `seedReviews()` — 10 reviews on completed orders (requires orders to exist — skip gracefully if not).
- `seedDeliveryZones()` — 2 example polygons around Warsaw for the test restaurant with different fees.
- `seedStaff()` — 1 manager (`manager@local.test`), 1 kitchen (`kitchen@local.test`), 1 cashier (`cashier@local.test`), all `Password123!`, all email verified.

### 7.7 Tests

- e2e `reservations.e2e-spec.ts`: availability respects hours + table capacity, race-safe booking (two concurrent attempts on the same slot — only one wins), cancellation flow, no-show auto-trigger.
- e2e `reviews.e2e-spec.ts`: customer can review only own completed orders, can't double-review, auto-hide on 2+ URLs, admin moderation toggles visibility.
- e2e `customers.e2e-spec.ts`: segment computation correctness (seed specific users → query → assert segments), cross-restaurant data isolation, customer detail aggregates match underlying orders.
- e2e `staff.e2e-spec.ts`: invite flow end-to-end (invite → token email → accept → login), permission hierarchy (manager can't invite owner, can't manage other manager), deactivation revokes tokens.
- e2e `settings.e2e-spec.ts`: delivery zone point-in-polygon check returns correct zone, partial settings updates don't wipe other fields, holiday CRUD.
- Unit: `customer-segments.service` — table-test the segment definitions with synthetic data.
- Unit: `delivery-zone.service` — point-in-polygon edge cases (point on boundary, multipolygon, empty zones list).
- Unit: `reservation-availability.service` — slot generation with buffer, capacity aggregation.

### 7.8 Sprint 7 verification (run before moving to Sprint 8)

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
pnpm dev   # all apps boot, new admin routes return null but don't error
# Spot check: open Swagger /api/v1/docs and verify the new endpoints appear
```

Move on to Sprint 8 immediately if green.

---

## SPRINT 8 — Reports, Analytics, Audit Log

### 8.1 Schema additions

New migration `add-sprint-8-tables`:
- `DailyMetric { id, restaurantId, date, revenue Decimal, orderCount Int, newCustomerCount Int, completedOrderCount Int, cancelledOrderCount Int, refundedOrderCount Int, avgPrepMinutes Float?, avgOrderValue Decimal, paymentMethodBreakdown Json, topItems Json, @@unique([restaurantId, date]) }`.
- `Export { id, requestedByUserId, restaurantId?, kind, params Json, status (queued|processing|ready|failed), filePath?, fileSize?, errorMessage?, createdAt, completedAt?, expiresAt }`.
- `AuditLog { id, actorUserId, restaurantId?, action, resourceType, resourceId, beforeJson Json?, afterJson Json?, ip String?, userAgent String?, createdAt, @@index([restaurantId, createdAt]), @@index([actorUserId, createdAt]) }`.

### 8.2 Backend modules

**`analytics`**

Endpoints — all `@Permissions('analytics:read')` unless noted:

- `GET /analytics/overview?restaurantId=&period=today|7d|30d|custom&from=&to=` — returns the KPI summary used by the admin overview page:
  ```ts
  {
    revenue: { value: Decimal, delta: Decimal, deltaPercent: number },
    orders: { value: number, delta: number, deltaPercent: number },
    aov: { value: Decimal, delta: Decimal, deltaPercent: number },
    completionRate: { value: number, delta: number },
    newCustomers: { value: number, delta: number },
    repeatRate: { value: number },
    avgPrepMinutes: { value: number | null },
    liveOrdersCount: number,
  }
  ```
  Cached 15 min in Redis for non-custom periods.

- `GET /analytics/revenue-timeseries?restaurantId=&period=&granularity=hour|day|week` — array of `{ bucket, revenue, orders }`. Today defaults to hourly, 7d/30d to daily.
- `GET /analytics/top-items?restaurantId=&period=&limit=10` — array of `{ menuItemId, name, quantity, revenue }`.
- `GET /analytics/orders-by-status?restaurantId=&period=` — donut data.
- `GET /analytics/customer-retention?restaurantId=&cohortMonth=` — cohort retention chart data (array of `{ cohort, periodIndex, retainedCount, retainedPercent }`).
- `GET /analytics/payment-methods?restaurantId=&period=` — breakdown by method kind.
- `GET /analytics/sales-by-hour?restaurantId=&period=` — heatmap data (7 days × 24 hours).
- `GET /analytics/sales-by-day-of-week?restaurantId=&period=`.

All time-range queries use the restaurant's timezone. Use `date-fns-tz`.

**Implementation strategy**:
- For today/live: compute on-demand from `Order` table (cached 15 min).
- For historical: prefer reads from `DailyMetric` rollup table, fall back to direct aggregation only if the rollup hasn't been built yet for that date (and trigger a backfill job).

**`reports`**

- `POST /reports/exports` — body: `{ kind, restaurantId, params }`. Kinds:
  - `sales-by-item` — CSV/PDF, columns: item name, category, qty sold, revenue, avg price.
  - `sales-by-category` — same shape, by category.
  - `sales-by-hour` — 24 rows, qty + revenue.
  - `sales-by-day-of-week` — 7 rows.
  - `tax-summary` — per period: subtotal, tax, discount, total, refunds.
  - `payment-methods` — breakdown of order count + total by method.
  - `customer-retention` — cohort table flattened.
  - `orders-detail` — full order line dump (CSV only, can be huge).
  
  Returns the `Export` record with status `queued`. Job picks it up. If estimated row count < 10000, generate inline and return `READY` synchronously with file already saved.

- `GET /reports/exports` — list mine.
- `GET /reports/exports/:id` — status polling.
- `GET /reports/exports/:id/download` — signed URL or direct stream depending on size. Validates ownership.

**`audit-log`**
- `GET /admin/audit-log?restaurantId=&actorUserId=&action=&from=&to=` — paginated list.
- Write path: `AuditService.record(input)` enqueues to `audit.write` BullMQ queue → processor inserts. Used by interceptor.
- New interceptor `AuditInterceptor` registered globally, fires on any controller method with `@AuditAction(actionKey, resourceType)` decorator. Decorator extraction: resource id from response or specific param.

**BullMQ jobs**:
- `analytics.rollup-daily` — repeatable, runs hourly. For each active restaurant, recompute today's `DailyMetric` row (upsert). Idempotent.
- `analytics.rollup-finalize` — repeatable, runs at 02:00 daily (UTC; per-restaurant timezone awareness via cron-with-tz wrapper). Finalizes the previous day.
- `analytics.backfill` — on-demand, computes a specific date range when an analytics query hits a missing rollup.
- `reports.generate` — processor for exports.
- `reports.cleanup` — daily, deletes exports older than 30d (and their R2 files).
- `audit.write` — fast insert processor.

### 8.3 Shared types

- `analytics.ts` — all KPI DTOs, period enums, granularity enums.
- `reports.ts` — `ExportDto`, `ExportKind` enum, `CreateExportDto`, `ExportStatus` enum.
- `audit.ts` — `AuditLogEntryDto`, `AuditAction` enum (start with the keys you'll record from the modules in Sprints 1–7: `order:create`, `order:status_changed`, `order:refund`, `menu:item:write`, `menu:item:delete`, `promotion:write`, `staff:invite`, `staff:role_change`, `staff:deactivate`, `settings:write`, `review:moderate`).
- New permission keys: `analytics:read`, `report:read`, `report:export`, `audit:read`. Roles:
  - `owner`: all.
  - `manager`: all.
  - `cashier`, `kitchen`: none.

### 8.4 API client + hooks (admin only — these are admin-side)

- Client: `analytics.overview`, `analytics.revenueTimeseries`, `analytics.topItems`, `analytics.ordersByStatus`, `analytics.customerRetention`, `analytics.paymentMethods`, `analytics.salesByHour`, `analytics.salesByDayOfWeek`, `reports.createExport`, `reports.listExports`, `reports.getExport`, `reports.downloadExport`, `audit.list`.

- Hooks (`apps/admin/src/features/analytics/hooks/` + `apps/admin/src/features/reports/hooks/` + `apps/admin/src/features/audit/hooks/`):
  - `useAnalyticsOverview(filters)`
  - `useRevenueTimeseries(filters)`
  - `useTopItems(filters)`
  - `useOrdersByStatus(filters)`
  - `useCustomerRetention(filters)`
  - `usePaymentMethodsBreakdown(filters)`
  - `useSalesByHour(filters)`
  - `useSalesByDayOfWeek(filters)`
  - `useCreateExport` — mutation, returns export id.
  - `useExportStatus(exportId)` — query with polling (refetchInterval 2s while status ∈ {queued, processing}, off when done).
  - `useExports` — list.
  - `useDownloadExport(exportId)` — composes signed URL fetch + browser download trigger.
  - `useAuditLog(filters)` — paginated.

A small composite hook `useExportFlow(kind, params)` ties create + status polling + download into one ergonomic call for whoever writes the UI later. Internally it manages local state for the export id and chains the queries; returns `{ start, status, downloadUrl, reset, error }`.

### 8.5 Route placeholders

```
apps/admin/src/app/(dashboard)/page.tsx                     # already exists from Sprint 0+1; leave null
apps/admin/src/app/(dashboard)/reports/page.tsx
apps/admin/src/app/(dashboard)/reports/exports/page.tsx
apps/admin/src/app/(dashboard)/audit-log/page.tsx
```

### 8.6 Tests

- e2e `analytics.e2e-spec.ts`: seed orders across dates → overview KPIs match hand-computed expected values; period delta math correct; cache returns same data on second call within TTL; cross-restaurant isolation.
- e2e `reports.e2e-spec.ts`: small export returns inline READY, large export goes through queue + status polling, download URL is signed and TTL'd, ownership check rejects others' exports, expired exports return 410.
- e2e `audit-log.e2e-spec.ts`: a write action records a log entry asynchronously (poll up to 2s), filtering works, only `audit:read` can list.
- Unit: rollup job — synthesize a day of orders, run rollup, assert DailyMetric matches.
- Unit: report generators — for each kind, generate against fixture data, snapshot the CSV header + row count.
- Unit: `useExportFlow` — MSW + fake timers to simulate the poll-to-ready transition.

### 8.7 Sprint 8 verification (run before final report)

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @repo/api test:e2e
pnpm dev
# Manual smoke: POST /reports/exports → poll status → download file → opens correctly
# Spot check Swagger /api/v1/docs for the new endpoints
```

---

## CROSS-CUTTING NON-NEGOTIABLES

- All money in `Decimal`. Use `@repo/utils/money` helpers.
- Permission decorators on every protected route. Permission hierarchy enforced in service for staff.
- Idempotency on any state-mutating endpoint that a client might retry (reservations, exports).
- Cache invalidation on every settings/menu write.
- All time-bucketed queries timezone-aware using restaurant's `timezone`.
- Audit log is async — never block the request on it.
- No raw SQL unless impossible in Prisma (justify in code comment). Analytics queries may legitimately need `prisma.$queryRaw` for performance on aggregations — that's fine, document why.

---

## WHAT NOT TO DO

- No UI work. Pages return `null` with `// TODO(ui):` comments.
- Do not touch `apps/admin/src/app/(dashboard)/orders/*` or any orders/KDS related code — Sprint 6's parallel session owns those paths.
- Do not extend `packages/realtime-client` — consume as-is.
- Do not regenerate or alter existing migrations. Add the two new migrations per the sprint plan.
- Do not change the access-token / refresh-token flow.
- Do not add PostGIS — point-in-polygon is in TS for now (default #10).
- Do not implement loyalty redemption flow, marketing pages, or i18n.

---

## REPORTING

Single final report at `.claude/reports/sprints-7-8-complete.md` covering:
- Per-sprint summary of files created/modified by package.
- All verification commands run + results.
- **Decisions Applied** section: list each default from §DEFAULTS that was actually used (note any cases where you deviated and why).
- **Open decisions for review**: any blocker hit during implementation where you had to pick conservatively without a default — flag these clearly so I can confirm or override.
- Known gaps / deferred items.
- Updated bring-up notes (new seed data, new env vars if any).
- Anything I should know before the next sprint.

---

## START

1. Read the reference files in CONTEXT.
2. Write `.claude/plans/sprint-7-8.md` with the planned phases.
3. **Start implementing immediately** — Sprint 7 first, then Sprint 8.
4. Apply the §DEFAULTS automatically when relevant; note them in the final report.
5. Run verification commands at each sprint boundary.
6. Single stop gate: after writing `.claude/reports/sprints-7-8-complete.md`, stop and wait for review.
