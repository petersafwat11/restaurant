# Sprint 7 + 8 — Combined Plan

## Context snapshot (verified)
- Schema present: `Reservation`, `Review`, `Table` exist. Sprint 7 migration only *adds fields/tables* (`StaffInvite`, `CustomerNote`, restaurant settings columns).
- Module conventions verified via `apps/api/src/orders/`: controller + service + module, `@Permissions` decorator, `ZodValidationPipe(Schema)`, `@CurrentUser` / `@Public`, idempotency via Redis service.
- E2E pattern: `createTestApp` + `resetDb` + `resetMenuDb` + `ensureOwnerToken` in `apps/api/test/setup-e2e.ts`.
- BullMQ pattern: queue names in `packages/jobs`, registered in `bullmq.module`, processors in `apps/api/src/jobs/`.
- API-client + hooks: typed wrapper in `packages/api-client/src/client.ts`, hooks live in `apps/{admin,web,mobile}/src/features/<domain>/hooks/`.
- Sprint 5 status report missing but `realtime` module and `packages/realtime-client` exist — consume as-is per prompt.
- No PostGIS, no real Stripe needed in dev (fakes provided).
- Permission keys `reservation:read/write`, `review:moderate`, `staff:read/write`, `settings:read/write` already exist in `packages/types/src/permissions.ts` from Sprint 0. New keys to add: `customer:notes`, `analytics:read`, `report:read`, `report:export`, `audit:read`.

## Defaults applied (all from §DEFAULTS)
All 17 defaults applied as-written. Documented in final report.

## Sprint 7 phases

### Phase 7.A — Schema + types + permissions
- Migration `add-sprint-7-fields`: Restaurant columns (taxRate already exists — keep; add `defaultDeliveryFee`, `minOrderAmount`, `deliveryZones`, `holidayDates`, `reservationSlotMinutes`, `reservationBufferMinutes`); new `StaffInvite`, `CustomerNote` tables.
- Add permission keys + role mapping updates in `packages/types/src/permissions.ts` and mirror in `packages/db/seed.ts`.
- Add Zod DTO files in `packages/types/src/`: `reservation.ts`, `review.ts`, `customer.ts`, `staff.ts`, `settings.ts`. Re-export from `index.ts`.

### Phase 7.B — Backend modules (one slice at a time)
1. `reservations` — service handles slot generation + race-safe booking via $transaction; controller `@Public` for availability/create; admin endpoints for list/transitions; tables CRUD nested.
2. `reviews` — auth POST, public list, admin moderation; URL count auto-hide.
3. `customers` — admin-only segment-aware list/detail; notes append-only.
4. `staff` — invite via signed token (HMAC over `email|expiresAt`); accept route public; hierarchy enforcement in service.
5. `settings` — patch endpoint on Restaurant; zones stored as `Json`; turf `booleanPointInPolygon`.

### Phase 7.C — Jobs
- New BullMQ jobs in `packages/jobs/src/`: `JOB_RESERVATION_REMINDER`, `JOB_RESERVATION_CONFIRMATION`, `JOB_STAFF_INVITE`. Processors in `apps/api/src/jobs/`.
- No-show cron: simple repeatable job runs every 10 min.

### Phase 7.D — Frontend data layer
- Extend `packages/api-client/src/client.ts` with `reservations`, `reviews`, `customers`, `staff`, `settings` resources.
- Hooks (public set on web+mobile, admin set on admin) per prompt §7.4.
- Route placeholders return `null` + `// TODO(ui):`.

### Phase 7.E — Seed
- Extend `packages/db/seed.ts` with `seedTables`, `seedReservations`, `seedReviews` (guard if no orders), `seedDeliveryZones`, `seedStaff`.

### Phase 7.F — Tests
- e2e specs: reservations, reviews, customers, staff, settings.
- Unit: `customer-segments.service`, `delivery-zone.service`, `reservation-availability.service`.

## Sprint 8 phases

### Phase 8.A — Schema
- Migration `add-sprint-8-tables`: `DailyMetric`, `Export`, `AuditLog`. Add appropriate indexes.
- Add types: `analytics.ts`, `reports.ts`, `audit.ts`. Permission keys `analytics:read`, `report:read`, `report:export`, `audit:read`.

### Phase 8.B — analytics module
- Service: per-endpoint queries, all timezone-aware using `date-fns-tz`.
- Redis 15-min cache for overview on non-custom periods.
- Rollup jobs hourly + nightly (BullMQ repeatable).

### Phase 8.C — reports module
- Export endpoints with synchronous (inline streaming) and async (BullMQ-backed) paths.
- CSV generators per kind using a small `stream` writer (UTF-8 BOM).
- PDF generator stub using `@react-pdf/renderer` (already a dep) for tax-summary kind.
- Local file storage under `/tmp/restaurant-exports/` for dev; R2 path stub (parity with uploads).

### Phase 8.D — audit-log module
- `AuditService.record(input)` → enqueues `audit.write`.
- Global `AuditInterceptor` reads `@AuditAction` decorator metadata, captures before/after via service-provided getters (where present), or after-only.
- Apply `@AuditAction` to the writes the prompt lists.

### Phase 8.E — Frontend
- Extend api-client with `analytics`, `reports`, `audit` resources.
- Hooks in `apps/admin/src/features/{analytics,reports,audit}/hooks/`.
- `useExportFlow` composite hook for ergonomic export.
- Route placeholders for reports, audit-log.

### Phase 8.F — Tests
- e2e: analytics, reports, audit-log.
- Unit: rollup job, report generators per kind, useExportFlow with msw + fake timers.

## Verification gates
After Sprint 7: `pnpm typecheck && pnpm --filter @repo/api test:e2e`. Skip global `pnpm lint` per Sprint 5 note (apps/api lint disabled).
After Sprint 8: same.

## Risks / known shortcuts
- PDF generation: only build for tax-summary; other kinds CSV-only initially (defaults #4 says PDF for kinds likely > 5s — most aren't).
- Export storage in dev uses local fs; R2 deferred but interface ready.
- Realtime: reservations module fires `EventEmitter2` events; gateway consumption deferred to Sprint 6's parallel session.
- No actual S3 cleanup job — placeholder logs.

## Open decisions (none currently — all covered by defaults)
