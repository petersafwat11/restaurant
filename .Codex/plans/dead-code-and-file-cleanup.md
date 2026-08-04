# Dead code and file cleanup plan

Date: 2026-07-26

Status: proposed — no cleanup has been implemented yet

## Goal

Reduce the repository to the code, assets, documentation, dependencies, and
runtime data that the web, admin, API, deployment, and supported operational
workflows actually need. Preserve behavior, production data, current design
quality, and the in-progress eService work.

This is not a blind “delete everything reported by a tool” pass. Next.js route
files, NestJS modules, generators, config entry points, public assets, Prisma
exports, tests, deployment scripts, and manually invoked operational scripts
all have conventions that a simple import graph can miss.

## Audit baseline

- Tracked files: 1,306.
- Workspaces: 3 apps, 13 packages, and 4 tooling packages.
- `pnpm typecheck`: passes (16 tasks).
- `pnpm test`: passes (9 workspace tasks; API 134 tests, web 121 passing +
  1 skipped, admin 29, plus shared-package tests).
- Knip normal audit:
  - 48 unused-file candidates.
  - unused dependency candidates in API, feature flags, UI, and tooling.
  - 45 unused exports and 12 unused exported types.
  - no circular dependencies.
- Knip production audit:
  - 62 production-unused-file candidates.
  - it correctly exposes several test-only production modules, but also reports
    generators, test setup, seed scripts, and convention-based entry points that
    must stay.
- Knip entry-export audit:
  - 85 unused exports and 34 unused exported types, including internal-only
    schema building blocks that should be made private rather than deleted.
- Ignored local artifacts currently occupy approximately:
  - `apps/admin/.next`: 1,002 MB.
  - `apps/web/.next`: 575 MB.
  - root `node_modules`: 1,191 MB.
  - `apps/api/dist`: 4 MB.
  - Prisma engine cache: 18 MB.
- The lockfile no longer contains mobile or Stripe importers, but the existing
  `node_modules` still has stale `@repo/mobile`, `@repo/ui-mobile`, Expo,
  React Native, and Stripe-era links. A clean install is required after source
  cleanup.

## Safety constraints

1. Do not mix this cleanup into the currently modified payment/checkout files.
   Preserve all existing tracked and untracked eService work.
2. Take a fresh `git status --short` snapshot at the start of every cleanup
   phase and only edit files assigned to that phase.
3. Delete in small dependency-ordered commits so regressions can be bisected.
4. Do not remove a Next.js convention file merely because it has no static
   importer.
5. Do not remove generated outputs until their generator and runtime contract
   have been checked.
6. Do not remove a Prisma model or column until production counts/coverage have
   been checked and a migration has been reviewed.
7. Do not delete local `.env`, `apps/api/.env.e2e`, uploads, database volumes,
   backups, or current certification evidence.

## Findings and classifications

### A. Safe repository debris

These are browser/accessibility snapshots, debug screenshots, or obsolete
mobile smoke artifacts. They are not referenced by source, deployment, tests,
or current docs. Several also expose historical infrastructure IP/email data,
so they should not remain in the working tree.

Delete the following 17 root files:

- `contabo-vnc-info.md`
- `contabo-vps-after-reboot.md`
- `contabo-vps-status.md`
- `contabo-vps10-page.md`
- `hostinger-dns-after-2nd-add.md`
- `hostinger-dns-after-admin.md`
- `hostinger-dns-edit.md`
- `hostinger-dns-final.md`
- `hostinger-dns-records.md`
- `reinstall2.md`
- `reinstall3.md`
- `reinstall4.md`
- `reinstall5.md`
- `vps-row-snap.md`
- `vps-status.png`
- `smoke-mobile-landing.jpeg`
- `smoke-tracking-token.jpeg`

Current size: about 900 KB.

Delete the 11 unreferenced 68-byte UUID PNGs under
`apps/api/uploads/menu-items/`. They were created by upload tests/runtime
activity and are not seed images. Keep all slug-named JPGs because
`packages/db/seed.ts` constructs their URLs from menu item slugs.

Add an upload-test cleanup/ignore rule so UUID runtime uploads cannot be
accidentally committed again. Do not ignore the committed slug-named seed
images.

Delete `.claude/scheduled_tasks.lock`; it is a stale process lock containing a
dead PID/session.

### B. Legacy prototypes and duplicate design captures

The following directories contain 65 standalone HTML/JSX/CSS/screenshot files
(about 1.17 MB) and are not imported by either application:

- `claude-design/**`
- `Szef Donald/**`

Recommended handling:

1. Confirm the currently shipped admin and web screens are the canonical
   implementations.
2. If any screenshot is still the only approved visual reference, move only
   the final approved preview into the matching `design-assets/<surface>/...`
   location and add/update its `spec.md`.
3. Delete raw prototype JSX, HTML, CSS, mock data, icon copies, debug captures,
   and duplicate progression screenshots.
4. Run the affected screens and compare them to any retained preview before
   closing this phase.

If current screens are already canonical and no historical preview is needed,
delete both directories in full. Git history remains the archive.

### C. Historical planning/documentation debris

The 57 tracked `.claude/plans`, `.claude/reports`, and lock files are historical
execution artifacts (about 762 KB), not current product documentation. Many
describe removed Expo, R2, Vercel, Stripe, and reports/export architecture.

Recommended handling:

- Keep `.Codex/plans/` for current approved plans.
- Remove `.claude/plans/**`, `.claude/reports/**`, and
  `.claude/scheduled_tasks.lock` from the current tree.
- Keep local `.claude/launch.json` and `.claude/settings.local.json` untracked
  only if the owner still uses them; otherwise remove them locally. Add explicit
  ignore entries for local Claude settings if retained.
- Do not delete `CLAUDE.md` blindly. It currently conflicts with `AGENTS.md`
  about production hosting and plan location. Either:
  - replace it with a short pointer to the canonical `AGENTS.md`, or
  - synchronize it exactly if Claude tooling still requires a full file.

Remove obsolete generated planning/status documents after transferring any
still-open action into a current backlog:

- `docs/sprints/**` (4 old sprint prompts).
- `docs/PROJECT-REPORT.md`.
- `docs/restaurant-app-project-plan.md`.
- `WEB-MOCK-DATA.md` after checking its unresolved C/D items against current
  code and moving genuine owner inputs to a concise current backlog.

Keep and update operational/source-of-truth docs:

- `docs/local-setup.md`.
- `deploy/RUNBOOK.md`.
- `docs/runbooks/backup-dr.md`.
- `docs/runbooks/soft-launch.md`.
- current eService certification runbooks/evidence.
- legal design/spec documents.
- current SEO strategy/backlog, but remove stale Vercel/R2 claims.
- `load/**` (manually invoked k6 suite) and `scripts/backup/**`
  (manual operational tools); Knip reports them only because they are CLI entry
  points.

Documentation corrections in this phase:

- Replace stale Stripe wording in `deploy/RUNBOOK.md` and `deploy/Caddyfile`.
- Remove stale Stripe environment names from `turbo.json`; add the current
  eService names if Turbo needs them in task hashing.
- Remove or rewrite stale Expo/mobile, R2, Vercel, managed-PITR, and old reports
  architecture claims from retained docs.
- Update the stack line in `AGENTS.md`/`CLAUDE.md` from Stripe to eService once
  the in-progress payment work is merged.

### D. High-confidence dead application files

Delete complete feature slices that have no production caller:

Admin:

- `apps/admin/src/features/addresses/**` — all five hooks, query keys, barrel,
  and the test-only set-default test. Admin has no address screen; customer
  address functionality in `apps/web` remains.
- `apps/admin/src/features/dashboard/hooks/**` — composite dashboard hook,
  barrel, and test. The live overview page uses the newer overview feature
  directly.
- `apps/admin/src/features/feature-flags/hooks/index.ts` — no admin page or
  caller.
- `apps/admin/src/features/payments/**` — the two unused legacy payment hooks,
  query keys, and barrel. Current admin order refund behavior lives under the
  orders feature.
- `apps/admin/src/features/promotions/hooks/use-validate-coupon.ts` and its
  unused barrel export.
- `apps/admin/src/features/orders/hooks/use-live-orders.ts`,
  `use-orders.ts`, `use-update-order-status.ts`, and the legacy live-orders
  test. The active orders page uses `useLiveAdminOrders`,
  `useAdminOrders`, and the newer mutation hooks.

Delete only unused barrel files, keeping directly imported implementations:

- `apps/admin/src/features/uploads/hooks/index.ts`.
- unused component barrel exports for `CustomerDrawer`,
  `ModifierGroupsEditor`, `OrderDrawerBody`, `KpiCard`, and
  `PromotionDrawer`.

Web:

- `apps/web/src/features/feature-flags/hooks/index.ts`.
- `apps/web/src/features/marketing/hooks/index.ts`; current marketing pages
  use server-side/direct API data paths.
- `apps/web/src/features/reservations/hooks/index.ts`; the current public
  reservation page is a coming-soon surface and has no caller for this hook
  layer.
- `apps/web/src/features/menu/hooks/use-menu-item.ts` plus its barrel export.
- `apps/web/src/features/orders/hooks/use-realtime-status.ts` plus its barrel
  export.
- `apps/web/src/features/payments/hooks/use-create-payment-intent.ts` plus its
  barrel export; checkout calls the typed API client directly. Keep
  `use-payment-config.ts` and payment query keys.
- `apps/web/src/features/landing/sections/testimonials.tsx`, because the owner
  explicitly disabled it and it is mounted only by tests.

Testimonial cascade:

- Remove the testimonial-only test cases/import from
  `landing-content-integrity.test.tsx`.
- Remove commented-out testimonial imports/JSX from the landing page.
- Remove `GOOGLE_REVIEWS_URL` if nothing else consumes it.
- Remove unused testimonial translation keys in both locales.
- Remove `packages/ui/src/testimonial-card/**` and its UI barrel export if it
  remains unreferenced after the section is removed.
- Remove the unused public `useReviews` hook only if no account/admin caller
  appears after the cascade; keep all review creation/account behavior.
- Regenerate `apps/api/src/generated/i18n.generated.ts`.

### E. Dead declarations inside otherwise active files

Delete truly unused functions, not the whole active file:

Admin:

- Analytics hooks: `useCustomerRetention`,
  `usePaymentMethodsBreakdown`, `useSalesByHour`,
  `useSalesByDayOfWeek`.
- Customer tag hooks: `useCreateCustomerTag`, `useDeleteCustomerTag`.
- Orders: `useAdminOrdersInfinite`.
- Reservations: `useReservationAvailability`, `useUpdateReservation`,
  `useMoveReservation`, `useCreateTable`, `useUpdateTable`,
  `useDeleteTable`.
- Reviews: `useToggleReviewVisibility`, `useReviewSummary`.

Auth hook files:

- Admin: remove `use-me.ts`, `use-request-otp.ts`, `use-verify-otp.ts`,
  `use-update-profile.ts`, and `use-change-password.ts`, plus their barrel
  exports. Keep login/register/logout/forgot/reset/verify-email/permissions.
- Web: remove `use-request-otp.ts`, `use-verify-otp.ts`, and
  `use-change-password.ts`, plus their barrel exports. Keep `useMe` and
  `useUpdateProfile`, which the profile page uses.

API:

- Remove the unused `FeatureFlag` decorator/guard infrastructure file and its
  provider/export from `feature-flags.module.ts`; no controller uses
  `@FeatureFlag`. Keep the feature-flag service/controller/catalog.
- Remove the unused referral-invite queue constant and payload schema.
- Delete or make private exports that are only used inside their defining
  module: cookie name/TTL helpers, table-export caps/helpers, mail template
  React components, notification matrix, and similar internal details.
- Do not delete the underlying internal logic when it is used in the same file.

Web/internal API surface:

- Delete unused `useClearCartSession`.
- Delete unused `buildAggregateRatingSchema` unless the reviews surface is
  re-enabled in the same phase.
- Make `fmtMinsRange` and `sectionLabel` private; they are used internally but
  are not package APIs.

Shared utilities:

- Delete `packages/utils/src/assert.ts` and its barrel export.
- Delete `packages/utils/src/phone.ts` and its barrel export.
- Delete unused `sum`, `formatMoneyServer`, and `isZero` from
  `packages/utils/src/money.ts`; retain all Decimal arithmetic and minor-unit
  helpers that are actually imported.
- Make loyalty constants private when they are used only to implement exported
  loyalty functions.
- Remove the ignored `collapseBelow` prop from `TwoPaneLayout`.

### F. Shared package export-surface cleanup

Run Knip with `--include-entry-exports` after phases D/E. For each remaining
report:

1. If a symbol has zero references, delete it.
2. If it is used only inside its own file, remove `export` but keep the
   declaration.
3. If it is a schema used to construct a public DTO, keep it private and retain
   the public composite schema/type.
4. If it is intentionally public for a documented external consumer, add an
   explicit Knip configuration/comment rather than leaving an unexplained
   report.

Known areas:

- `packages/db/src/index.ts`: prune unused Prisma enum/type re-exports; keep
  `PrismaClient`, `Prisma`, and every model type imported by API source/tests.
- `packages/types`: de-export internal-only constants and component schemas
  reported by the entry-export audit. Do not delete schemas used to build a
  public DTO.
- `packages/jobs`: remove the unused referral invite job and de-export
  payload-only inferred types not consumed outside the package.
- `packages/feature-flags`: remove unused `FEATURE_FLAG_KEYS` and the unused
  `zod` dependency.
- `packages/observability`: remove the unused `Sentry` namespace export while
  preserving the used initialization/capture API.
- `packages/realtime-client`: prune unused `ROOMS`/public types only after
  confirming the client’s internal typed event map still compiles.
- `packages/types/src/realtime.ts`: retain the intentional cancelled/status
  schema alias unless changing it improves correctness; configure/annotate the
  analyzer’s duplicate-export warning if it remains intentional.

### G. Dependency and tooling cleanup

API `package.json`:

- Remove unused direct dependencies:
  - `@fastify/swagger`
  - `@fastify/swagger-ui`
  - `@nestjs/config`
  - `@nestjs/jwt`
  - `nestjs-zod`
- Remove unused dev dependencies:
  - `@types/supertest`
  - `supertest`
  - `ts-node`
  - `tsconfig-paths`
- Keep `tsx`; production Docker starts the compiled API with
  `node --import tsx/esm` to load TypeScript-source workspace packages. Move it
  to runtime dependencies if needed to make that contract explicit.
- Keep/move `socket.io-client` to dev dependencies; API e2e realtime tests use
  it, but production server code does not.
- Keep `form-data`; upload e2e tests import it.

UI `package.json`:

- Remove unused UI-package dependencies:
  - `date-fns`
  - `framer-motion`
  - `react-leaflet`
  - `recharts`
  - `sonner`
  - `tailwindcss-animate`
- Remove the unused UI `tailwindcss` dev dependency if typechecking/building
  still passes.
- Do not remove app-level `recharts`/`sonner`; admin/web use them directly.
- Do not remove `tailwindcss-animate` from `tooling/tailwind-config`; the shared
  preset imports it.

Tooling:

- Delete `tooling/eslint-config/**` and its workspace/lockfile entries. No app
  runs ESLint; all current lint scripts use Biome, and the Next-specific config
  is not loaded.
- Delete `tooling/tailwind-config/postcss.config.js`; each Next app has its own
  active PostCSS config. Keep `tailwind.preset.ts`.
- Keep `tooling/biome-config/**`; root `biome.json` extends its file by path,
  even though no package-name import exists.
- Keep `tooling/tsconfig/**`; every workspace extends it.
- Move `@repo/tailwind-config` from Next app runtime dependencies to
  devDependencies if Docker standalone builds prove it is build-only.

Regenerate `pnpm-lock.yaml` with `pnpm install`, then verify the removed package
families no longer appear as direct dependencies.

### H. Database cleanup — separate high-risk migration

This phase must be a separate approved change after a production backup.

1. Query production:
   - total `PushToken` rows and distinct users.
   - non-default `orderUpdatesPush` / `promotionsPush` values.
   - count of orders where `acceptedTermsAt` is non-null but
     `legalAcceptedAt` is null.
2. Export counts (not token values) into the migration evidence.
3. If push is confirmed unused:
   - drop `PushToken`.
   - remove `User.pushTokens`.
   - drop `NotificationPreference.orderUpdatesPush` and
     `promotionsPush`.
   - remove account-deletion cleanup for push tokens.
   - remove push fields from API service mapping, DTO schemas, tests, web
     notification UI, and i18n.
   - remove the disabled “coming soon” push rows; the supported channels are
     in-app, email, and SMS.
4. If legal coverage is complete:
   - stop writing deprecated `Order.acceptedTermsAt`.
   - drop the column in the same or a separate migration.
5. Run:
   - `pnpm --filter @repo/db migrate:dev`
   - `pnpm --filter @repo/db generate`
   - API notification/account-deletion/order e2e tests.
6. Update privacy/retention docs and `AGENTS.md` so they describe the final
   schema rather than a later cleanup.

Do not delete historical Prisma migration files. They are an immutable schema
history and are required to build a database from scratch.

### I. Local generated-artifact cleanup

After source/dependency changes and only when no dev server is running:

1. Resolve and verify the exact paths are inside `D:\restaurant`.
2. Remove ignored/rebuildable output:
   - `.turbo`
   - `apps/admin/.next`
   - `apps/web/.next`
   - `apps/api/dist`
   - per-app `.turbo`
   - coverage directories
   - stale Prisma download/cache directories
3. Remove root and workspace `node_modules`, then perform a frozen clean
   install from the regenerated lockfile.
4. Confirm stale mobile/UI-mobile/Expo/React Native/Stripe junctions no longer
   exist.
5. Do not remove `.env`, `.env.e2e`, uploads, backups, or Docker volumes.

This should immediately reclaim roughly 1.6 GB of Next build output; a clean
dependency install will also remove stale mobile-era packages, though the final
`node_modules` size will still reflect active dependencies.

## Implementation order and commits

1. `chore(repo): remove debug snapshots and stale runtime artifacts`
2. `chore(docs): remove historical plans and correct active runbooks`
3. `refactor(admin): remove unused hooks and legacy feature slices`
4. `refactor(web): remove unused hooks and disabled testimonial slice`
5. `refactor(api): remove unused guards exports and test dependencies`
6. `refactor(packages): prune unused exports utilities and dependencies`
7. `chore(tooling): remove unused eslint and postcss configuration`
8. `chore(deps): regenerate lockfile and clean local installation`
9. Separate, production-gated commit:
   `refactor(db): remove retired push and legal compatibility fields`

Prototype/design deletion may be combined with documentation only after its
preview-preservation decision is complete.

## Verification after every code/dependency phase

- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @repo/api test:e2e` with Postgres + Redis.
- Knip normal, production, entry-export, and cycle checks.
- `rg` checks for removed filenames, symbols, mobile/Expo, Stripe env names,
  retired push fields, R2/Vercel claims, and removed package names.
- Validate `pnpm-lock.yaml` importers and direct dependency graph.
- Start API, web, and admin; smoke:
  - web landing/menu/checkout/return/tracking/account flows.
  - admin login/overview/orders/kitchen/menu/customers/reservations/reviews/
    settings.
  - API docs/health, upload serving, realtime order room, email/SMS job enqueue,
    payment stub/return/webhook/reconciliation.
- For every UI-affecting deletion, compare desktop/mobile rendering against any
  retained design preview and check browser console/network errors.
- Build all three Docker images and run the production Compose health checks.

Existing baseline warnings to distinguish from cleanup regressions:

- Vitest emits the Vite CJS API deprecation warning.
- Some admin UI tests log unhandled MSW requests/aborted localhost fetches while
  still passing.
- Turbo warns that test tasks declare `coverage/**` output without creating it.
- These warnings should be fixed or explicitly tracked, but they are not proof
  that a deleted file was required.

## Acceptance criteria

- No high-confidence unused source files or dependencies remain.
- Remaining analyzer exceptions are documented convention entry points or
  intentional public APIs.
- No current docs claim Expo/mobile push, R2, Vercel, managed PITR, or Stripe
  when production uses web/admin, local uploads, Contabo, self-hosted data
  services, and eService.
- No browser debug/accessibility snapshots remain at repository root.
- Seed menu images remain available; runtime/test uploads are not tracked.
- Fresh clone + install + Prisma generate + typecheck + lint + unit + e2e +
  production builds pass.
- Web/admin visual and behavioral smoke checks pass.
- Production database cleanup is performed only with backup and recorded count
  checks.
- The current eService worktree changes remain intact and are not accidentally
  folded into cleanup commits.

## Approval requested

Approve the plan before implementation. The recommended default is:

- delete root debug snapshots and historical planning artifacts;
- delete high-confidence dead source/dependencies/tooling;
- delete raw prototype directories after preserving any final approved previews;
- keep manual load/backup scripts and generated/convention entry points;
- defer Prisma push/legal column removal to a separate production-checked
  migration.
