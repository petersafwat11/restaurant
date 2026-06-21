# Delete reports page + entire reports/exports pipeline

## Motivation

User: the centralized `/reports/exports` analytics pipeline is being retired because per-table CSV/PDF export (the new `TableToolbar` + `/<resource>/export` flow) covers every table individually. The aggregated 9-kind report pipeline is no longer needed.

Per `.claude/plans/admin-table-search-export.md` line 14: that plan explicitly kept the reports pipeline alongside per-table dumps. This change reverses that decision.

## Scope: full removal — frontend + backend + DB + types + queue + permissions + i18n + tests

### 1. Admin frontend

Delete:
- `apps/admin/src/app/[locale]/(dashboard)/reports/page.tsx`
- `apps/admin/src/app/[locale]/(dashboard)/reports/exports/page.tsx`
- The empty `reports/` directory tree after the above
- `apps/admin/src/features/reports/` (hooks + components + create-export-modal)
- `apps/admin/src/app/__tests__/exports-page.test.tsx`

Edit:
- `apps/admin/src/components/shell/nav-config.ts` → drop the `reports` nav item (and remove `FileBarChart` icon import if unused elsewhere)
- `apps/admin/src/features/overview/components/top-items-card.tsx` → remove the "view full report" link to `/reports/exports` (and the bottom `border-t-hairline pt-3` strip + `viewFullReport` translation key if no other consumer). Verify the `viewFullReport` key is unused before pulling.

### 2. i18n

Delete:
- `packages/i18n/messages/en/admin/reports/exports.json`
- `packages/i18n/messages/pl/admin/reports/exports.json`
- Empty `admin/reports/` dirs after

Edit:
- `packages/i18n/src/messages.ts` → drop the two `reports/exports.json` imports and registry entries
- `packages/i18n/messages/{en,pl}/admin/layout.json` → remove the `items.reports` nav label
- `packages/i18n/messages/{en,pl}/admin/staff.json` → check for any `reports:read` / `report:*` label strings (grep showed hits; needs targeted edit)
- `packages/i18n/messages/{en,pl}/admin/dashboard/*.json` → drop the `topItems.viewFullReport` key if it lives there and is otherwise unused

### 3. API (NestJS)

Delete:
- `apps/api/src/reports/` (module, controller, service, report-generators.ts)
- `apps/api/src/jobs/reports.processor.ts`

Edit:
- `apps/api/src/app.module.ts` → drop `ReportsModule` import + entry
- `apps/api/src/jobs/jobs.module.ts` → drop `ReportsModule`, `ReportsProcessor`, `QUEUE_REPORTS` registration
- `apps/api/src/scheduler/scheduler.service.ts` → drop the `reports-cleanup` repeatable + the `@InjectQueue(QUEUE_REPORTS)` constructor param
- `apps/api/src/common/table-export/row-cap.ts` → rewrite the CSV-cap hint to not reference `/reports/exports`
- `apps/api/test/setup-e2e.ts` → remove `reports:read`, `report:read`, `report:export` from the permissions array

### 4. Shared packages

`packages/types`:
- Delete `packages/types/src/reports.ts`
- `packages/types/src/index.ts` → drop `export * from './reports'`
- `packages/types/src/permissions.ts` → remove `'reports:read'`, `'report:read'`, `'report:export'` from `PERMISSION_KEYS`. `manager` filter list stays intact (those keys aren't in it). `owner` derives from `PERMISSION_KEYS` so auto-shrinks.

`packages/api-client/src/client.ts`:
- Drop `CreateExportDto`, `CreateExportSchema`, `ExportDto`, `ExportListSchema`, `ExportSchema` imports
- Delete the `reports` namespace (lines ~1717–1738) and its entry in the returned client object

`packages/jobs`:
- `src/queues.ts` → remove `QUEUE_REPORTS`, `JOB_REPORTS_GENERATE`, `JOB_REPORTS_CLEANUP`, and the `reports:` entry in `QUEUE_NAMES`
- `src/payloads.ts` → remove `ReportsGeneratePayloadSchema` + `ReportsGeneratePayload`

`packages/db`:
- `prisma/schema.prisma` → drop `model Export` (lines 666–681)
- `seed.ts` → drop `'reports:read'`, `'report:read'`, `'report:export'` from `ALL_PERMISSIONS`
- Run `pnpm --filter @repo/db migrate:dev --name drop-export-model` to create the DROP TABLE migration; run `pnpm --filter @repo/db generate`; commit both the migration and the regenerated client

## Verification

1. `pnpm --filter @repo/types build` — must compile
2. `pnpm --filter @repo/api-client build`
3. `pnpm --filter @repo/jobs build`
4. `pnpm --filter @repo/db generate`
5. `pnpm --filter @repo/admin build` (or `tsc --noEmit`)
6. `pnpm --filter @repo/api build`
7. `pnpm --filter @repo/i18n build` if it has a build step
8. Grep sweep: `grep -r "reports/exports\|ReportsModule\|ReportsService\|QUEUE_REPORTS\|report:read\|report:export\|reports:read\|ExportDto\|ExportKind\|CreateExportDto\|ExportStatus\|EXPORT_KINDS" apps packages` → expect zero hits outside `.claude/` plans/reports archive
9. Confirm `/reports*` returns 404 in admin shell, no nav entry shown

## Out of scope / NOT touched

- Per-table `TableToolbar` `ExportFormat` type and per-resource `/export` endpoints — these are the replacement and stay
- `claude-design/`, `docs/sprints/*`, `.claude/reports/*`, `.claude/plans/*.md` historical docs — leave alone (frozen sprint records)
- `docs/PROJECT-REPORT.md` — leave (historical project doc, not load-bearing code)

## Risk

- **DB migration** drops a table. If any prod Export rows exist they are lost. User: confirm OK before running `migrate:dev`. (Files on disk under `EXPORTS_DIR` are not auto-cleaned; user should clear them manually if desired.)
- The CSV row-cap hint loses its pointer to a queued-export alternative. Replacement message will just suggest narrowing filters.
