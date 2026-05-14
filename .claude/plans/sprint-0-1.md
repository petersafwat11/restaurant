# Sprint 0 + Sprint 1 — Phased Implementation Plan

> Source prompt: `docs/sprints/sprint-0-1-claude-code-prompt.md`
> Source plan:  `docs/restaurant-app-project-plan.md`
> Status: **Awaiting approval before any code is written.**

Hard constraints reiterated:
- **NO UI.** Every page/screen returns `null` with a `// TODO(ui): ...` comment. No JSX content, no Tailwind utility classes on elements, no shadcn components, no NativeWind components.
- **Full Prisma schema** for the whole project lives in this run, but **only auth/users/addresses** modules are implemented in `apps/api`. No other endpoints.
- **Sprint-1-scoped seed data only** (permissions, roles, 2 test users). No restaurants, menu, orders, etc.

---

## Phase 1 — Monorepo skeleton

**Files to create:**
- `package.json` (root, workspace scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:generate`, `db:seed`, `format`)
- `pnpm-workspace.yaml` (covers `apps/*`, `packages/*`, `tooling/*`)
- `turbo.json` (pipelines for the scripts above with proper `dependsOn` and `outputs`)
- `.nvmrc` → `20`
- `.gitignore` (node_modules, dist, .next, .expo, .env, .turbo, *.log, coverage, generated prisma client)
- `.editorconfig`
- `.npmrc` (`save-exact=true`, `strict-peer-dependencies=false`, `auto-install-peers=true`)
- `CLAUDE.md` at repo root (full content from §14 of the project plan)
- Empty placeholder directories with `.gitkeep`:
  - `apps/api/`, `apps/web/`, `apps/admin/`, `apps/mobile/`
  - `packages/db/`, `packages/types/`, `packages/api-client/`, `packages/ui/`, `packages/ui-mobile/`, `packages/auth-core/`, `packages/jobs/`, `packages/i18n/`, `packages/utils/`, `packages/config-runtime/`
  - `tooling/eslint-config/`, `tooling/biome-config/`, `tooling/tailwind-config/`, `tooling/tsconfig/`
  - `design-assets/web/`, `design-assets/admin/`, `design-assets/mobile/`
  - `docs/`

**Verification:**
- `pnpm install` resolves with no errors.
- `pnpm turbo run --help` works.

---

## Phase 2 — Tooling packages

**Files to create:**
- `tooling/tsconfig/package.json`
- `tooling/tsconfig/base.json` (strict, target ES2022, moduleResolution NodeNext or Bundler depending on consumer)
- `tooling/tsconfig/nextjs.json` (extends base, jsx preserve, plugins, paths placeholder)
- `tooling/tsconfig/react-native.json` (extends base, jsx react-native, types `expo`)
- `tooling/tsconfig/nestjs.json` (extends base, decorators, target ES2022, emitDecoratorMetadata)
- `tooling/biome-config/package.json`
- `tooling/biome-config/biome.json` (formatter + linter, ignores generated, single quotes, 2-space)
- `tooling/eslint-config/package.json`
- `tooling/eslint-config/index.js` (Next-specific rules only: `next/core-web-vitals` + a couple of overrides)
- `tooling/tailwind-config/package.json`
- `tooling/tailwind-config/tailwind.preset.ts` (token primitives only: colors, spacing scale, radii, fonts — placeholder values, comment noting they'll be replaced when design system lands)
- `tooling/tailwind-config/postcss.config.js`

**Verification:**
- `pnpm typecheck` (no-op at this point but should succeed).
- `pnpm biome check .` succeeds on the empty tree.

---

## Phase 3 — Docker dev environment

**Files to create:**
- `docker-compose.yml` (services: `postgres:16-alpine`, `redis:7-alpine`, `mailhog/mailhog`; named volumes; healthchecks; ports 5432, 6379, 1025/8025)
- `.env.example` at repo root, listing every env var from §15 of the plan plus Sprint-1 specifics:
  - `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
  - `RESEND_API_KEY` (blank in dev), `MAIL_FROM`, `SMTP_HOST=localhost`, `SMTP_PORT=1025` (mailhog)
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (blank in dev — console adapter)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (blank — Sprint 4)
  - `R2_*` (blank — Sprint 2)
  - `APP_URL_WEB=http://localhost:3000`, `APP_URL_ADMIN=http://localhost:3001`, `APP_DEEP_LINK_SCHEME=restaurant`
  - `API_PORT=4000`, `NODE_ENV=development`
  - `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (for both web + admin)
  - `EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1`
- `docs/local-setup.md` — bring-up steps for a fresh clone

**Verification:**
- `docker compose config` validates the YAML.
- `cp .env.example .env` then `docker compose up -d` brings the three containers healthy. *(User runs this — I'll provide the commands but won't run docker unless asked.)*

---

## Phase 4 — `packages/db`

**Files to create:**
- `packages/db/package.json` (deps: `@prisma/client`, `prisma`, `tsx`, `bcrypt`)
- `packages/db/tsconfig.json`
- `packages/db/prisma/schema.prisma` — **complete schema per §4 of the project plan**, copied verbatim:
  - Identity: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`
  - User data: `UserAddress`, `PaymentMethod`, `PushToken`, `Notification`
  - Restaurant: `Restaurant`, `OperatingHours`
  - Menu: `MenuCategory`, `MenuItem`, `MenuItemImage`, `MenuItemModifierGroup`, `MenuItemModifierOption`
  - Ordering: `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusEvent`
  - Payments: `Payment`, `Refund`
  - Loyalty/promos: `LoyaltyAccount`, `LoyaltyTransaction`, `Promotion`, `Coupon`, `CouponRedemption`
  - Reservations: `Table`, `Reservation`
  - Reviews: `Review`
  - Enums: `OrderType`, `OrderStatus`, `PaymentStatus`, `PaymentMethodKind`
- `packages/db/src/index.ts` (re-exports `PrismaClient`, `Prisma`, and all generated enums/types)
- `packages/db/seed.ts` — structured with named functions (`seedPermissions`, `seedRoles`, `seedUsers`, `main`); uses `upsert` so it's idempotent; **Sprint-1 data only**:
  - Permission keys per §10 of plan (extracted into a single source: `packages/types/permissions.ts` — seed imports from there)
  - Roles: `owner` (all perms), `manager`, `kitchen`, `cashier`, `customer`
  - Users: `owner@local.test` (owner role), `customer@local.test` (customer role) — both `Password123!`, `emailVerifiedAt: now()`

**Verification:**
- `pnpm --filter @repo/db prisma format` formats the schema clean.
- `pnpm --filter @repo/db prisma validate` passes.
- After docker is up + `.env` exists: `pnpm db:migrate` produces exactly one migration `init`. `pnpm db:seed` succeeds. Running `pnpm db:seed` again succeeds (idempotency check).

---

## Phase 5 — Shared packages

### `packages/types`
- `package.json`, `tsconfig.json`
- `src/permissions.ts` — `PermissionKey` literal union + `ROLE_PERMISSIONS` map (single source of truth)
- `src/auth.ts` — Zod schemas + inferred types: `RegisterDto`, `LoginDto`, `RefreshDto`, `RequestOtpDto`, `VerifyOtpDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `VerifyEmailDto`, `AuthTokensDto`, `MeDto`
- `src/user.ts` — `UpdateProfileDto`, `ChangePasswordDto`, `UserPublicDto`
- `src/address.ts` — `CreateAddressDto`, `UpdateAddressDto`, `AddressDto`
- `src/error.ts` — `ErrorDto` standard response shape
- `src/index.ts` — re-exports everything

### `packages/api-client`
- `package.json`, `tsconfig.json`
- `src/errors.ts` — `ApiError` class
- `src/client.ts` — `createApiClient({ baseUrl, getAccessToken, onUnauthorized })` returning grouped resource methods (`auth.*`, `users.*`, `addresses.*`); fetch-based; validates inputs and parses outputs through Zod from `@repo/types`; auto-refresh retry on 401
- `src/index.ts`

### `packages/auth-core` (pure helpers, no framework)
- `package.json`, `tsconfig.json`
- `src/password.ts` — `hashPassword`, `verifyPassword` (bcrypt)
- `src/jwt.ts` — `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`
- `src/otp.ts` — `generateOtp(length)`, `hashToken`
- `src/index.ts`
- `src/__tests__/password.test.ts`, `jwt.test.ts`, `otp.test.ts`

### `packages/utils`
- `package.json`, `tsconfig.json`
- `src/slugify.ts`, `src/phone.ts` (`formatPhone`, `isValidPhone`), `src/assert.ts` (`assertNever`)
- `src/index.ts`

### `packages/config-runtime`
- `package.json`, `tsconfig.json`
- `src/index.ts` — `createEnv(schema)` Zod helper that throws on missing required vars; supports `.env` loading via `dotenv`

### `packages/i18n`
- `package.json`, `tsconfig.json`
- `src/locales/en.json`, `src/locales/ar.json` (both `{}`)
- `src/index.ts` — `getDir(locale): 'rtl' | 'ltr'`

### `packages/jobs`
- `package.json`, `tsconfig.json`
- `src/queues.ts` — queue name constants: `QUEUE_EMAIL`, `QUEUE_SMS`, `QUEUE_PUSH`
- `src/payloads.ts` — Zod payload schemas for: `email.verification`, `email.password-reset`, `sms.otp`, `push.welcome`
- `src/index.ts`

**Verification:**
- `pnpm typecheck` green across all shared packages.
- `pnpm --filter @repo/auth-core test` passes.

---

## Phase 6 — `apps/api` (NestJS)

**Top-level:**
- `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `vitest.config.ts`
- `src/main.ts` — Fastify adapter, global prefix `/api/v1`, CORS from env, global pipes/filters, Swagger at `/api/v1/docs`
- `src/app.module.ts`

**Common:**
- `src/common/pipes/zod-validation.pipe.ts`
- `src/common/filters/http-exception.filter.ts` (returns `ErrorDto`)
- `src/common/guards/jwt-auth.guard.ts`
- `src/common/guards/permissions.guard.ts` (reads `@Permissions(...)`, checks claims)
- `src/common/decorators/permissions.decorator.ts`
- `src/common/decorators/current-user.decorator.ts`
- `src/common/decorators/public.decorator.ts`

**Modules:**
- `src/config/config.module.ts` + `env.ts` (Zod-validated via `@repo/config-runtime`)
- `src/prisma/prisma.module.ts` + `prisma.service.ts` (`onModuleInit` connect, shutdown hooks)
- `src/redis/redis.module.ts` + `redis.service.ts` (shared ioredis)
- `src/bullmq/bullmq.module.ts` (registers the 3 Sprint-1 queues from `@repo/jobs`)
- `src/mailer/mailer.module.ts` + `mailer.service.ts` (Resend in prod, nodemailer→mailhog in dev)
- `src/mailer/templates/EmailVerification.tsx`, `PasswordReset.tsx` (`@react-email/components`)
- `src/sms/sms.module.ts` + `sms.service.ts` (Twilio in prod, console adapter in dev)
- `src/auth/` — module, controller, service, strategies (jwt access + refresh), DTOs imported from `@repo/types`, endpoints listed in prompt §Phase 6.7
- `src/users/` — controller (`PATCH /users/me`, `POST /users/me/change-password`), service
- `src/addresses/` — controller (`GET/POST/PATCH/DELETE /addresses[/:id]`, `POST /addresses/:id/default`), service with ownership scoping
- `src/jobs/email.processor.ts`, `sms.processor.ts`, `push.processor.ts` (push is a stub that logs only)

**Tests:**
- `test/auth.e2e-spec.ts` (happy paths + wrong password / expired token / duplicate email)
- `test/addresses.e2e-spec.ts` (ownership scoping: user A cannot read/edit user B's address)
- `test/jest-e2e.json` or `vitest.e2e.config.ts`

**Verification:**
- `pnpm --filter @repo/api typecheck` green.
- `pnpm --filter @repo/api build` green.
- `pnpm --filter @repo/api test:e2e` green (against a test database).
- `pnpm --filter @repo/api dev` boots and `GET /api/v1/docs` returns the OpenAPI page; `POST /api/v1/auth/login` with seeded `owner@local.test` returns tokens.

---

## Phase 7 — `apps/web`, `apps/admin`, `apps/mobile` structure (NO UI)

### `apps/web` (Next.js 15)
- `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `postcss.config.js`, `tailwind.config.ts` (uses preset from `tooling/tailwind-config`)
- `src/app/layout.tsx` — bare `<html><body>{children}</body></html>`, no styles imported beyond `globals.css` (which contains only `@tailwind base/components/utilities`)
- `src/app/globals.css`
- `src/app/(auth)/{login,register,forgot-password,reset-password,verify-email}/page.tsx` — each returns `null` with `// TODO(ui): ...`
- `src/app/(account)/{profile,addresses}/page.tsx` — same
- `src/app/page.tsx` — returns `null` (so GET / returns 200 empty)
- `src/middleware.ts` — redirects unauthenticated requests to `/login` when path matches `(account)/*`
- `src/features/auth/hooks/` — `use-login.ts`, `use-register.ts`, `use-logout.ts`, `use-me.ts`, `use-forgot-password.ts`, `use-reset-password.ts`, `use-verify-email.ts`, `use-request-otp.ts`, `use-verify-otp.ts`, `use-update-profile.ts`, `use-change-password.ts`, `query-keys.ts`, `index.ts`
- `src/features/addresses/hooks/` — `use-addresses.ts`, `use-create-address.ts`, `use-update-address.ts`, `use-delete-address.ts`, `use-set-default-address.ts`, `query-keys.ts`, `index.ts`
- `src/stores/auth-store.ts` — Zustand; access token in memory; refresh token in httpOnly cookie set via `src/app/api/auth/set-session/route.ts` Route Handler
- `src/app/api/auth/set-session/route.ts`, `src/app/api/auth/clear-session/route.ts` — server-side cookie writers
- `src/lib/api-client.ts` (instantiates `@repo/api-client` with env + token getter + onUnauthorized → refresh)
- `src/lib/query-client.ts`
- `src/lib/notify.ts` (no-op)
- `src/lib/env.ts` (Zod-validated public env)
- `src/providers/app-providers.tsx`
- `src/components/README.md` ("UI to come — do not add components yet")

### `apps/admin` (Next.js 15)
Same as web, with these differences:
- `(account)` replaced by `(dashboard)` route group
- `src/app/(dashboard)/page.tsx` — placeholder for KPI overview (Sprint 6)
- Middleware protects `(dashboard)/*`
- Port 3001

### `apps/mobile` (Expo + expo-router)
- `package.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `expo-env.d.ts`
- `app/_layout.tsx` — bare `Stack`, no theme
- `app/(auth)/{login,register,forgot-password,reset-password,verify-otp}.tsx` — each returns `null` with `// TODO(ui): ...`
- `app/(tabs)/_layout.tsx` — empty `Tabs` config
- `app/(tabs)/index.tsx` — returns `null`
- `app/account/{profile,addresses}.tsx` — returns `null`
- `src/features/auth/hooks/` — same hook files as web
- `src/features/addresses/hooks/` — same
- `src/stores/auth-store.ts` — Zustand persisted via `expo-secure-store`
- `src/lib/secure-storage.ts` — SecureStore wrapper
- `src/lib/api-client.ts`, `query-client.ts`, `notify.ts`, `env.ts`
- `src/providers/app-providers.tsx`
- `src/components/README.md`

**Verification:**
- `pnpm --filter @repo/web typecheck`, `pnpm --filter @repo/admin typecheck`, `pnpm --filter @repo/mobile typecheck` all green.
- `pnpm --filter @repo/web build` and `pnpm --filter @repo/admin build` complete.
- `pnpm --filter @repo/web dev` boots on :3000; `GET /` → 200 empty body.
- `pnpm --filter @repo/admin dev` boots on :3001; `GET /` → 200.
- `pnpm --filter @repo/mobile start` boots Metro without errors.

---

## Phase 8 — TanStack Query hooks

(Implemented during Phase 7; verification is the same.)
- v5 syntax (`useMutation({ mutationFn })`, `useQuery({ queryKey, queryFn })`).
- `queryKeys` factory per feature.
- `onSuccess`/`onError` update auth store + invalidate + `notify()`.
- Fully typed: `UseMutationResult<AuthTokens, ApiError, LoginInput>`, etc.

## Phase 9 — Zustand auth store

(Implemented during Phase 7; verification is the same.)
- Web/admin: access token in memory; refresh token in httpOnly cookie (via Next Route Handler); `hydrate()` calls `/auth/me`; auto-refresh on 401 in API client.
- Mobile: both tokens in `expo-secure-store`; same actions + auto-refresh.
- `hasPermission(key: PermissionKey)` selector exported from both.

---

## Phase 10 — Frontend tests

**Files:**
- `apps/web/vitest.config.ts`, `apps/web/src/test/setup.ts` (MSW server)
- `apps/web/src/features/auth/hooks/__tests__/use-login.test.ts`
- `apps/web/src/features/addresses/hooks/__tests__/use-set-default-address.test.ts`
- One refresh-flow test against the api-client (MSW returns 401 → 200 on retry)
- Equivalent files in `apps/admin` and `apps/mobile` (mobile uses `@testing-library/react-native`)

**Verification:**
- `pnpm test` green at the root.

---

## Phase 11 — CI

**File:**
- `.github/workflows/ci.yml`
  - Triggers: PR + push to main
  - Jobs:
    1. `lint-and-typecheck` — `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`
    2. `test-unit` — runs all unit/component tests
    3. `test-e2e-api` — services: `postgres:16`, `redis:7`; runs `pnpm --filter @repo/db migrate deploy`, `pnpm --filter @repo/db db:seed`, `pnpm --filter @repo/api test:e2e`

**Verification:**
- `act` locally (optional) or push to a feature branch.
- Workflow file passes `actionlint` parse.

---

## Final reporting (per prompt §REPORTING)

After all phases:
- Write `.claude/reports/sprint-0-1-complete.md` with: what was implemented, known gaps / deferred items, fresh-clone bring-up commands, anything to know before starting UI work.

---

## Open questions before I start

1. **Swagger generator** — the prompt says "nestjs-zod or @anatine/zod-openapi". I'll use `nestjs-zod` (more mature integration with Nest's `@nestjs/swagger`). Object if you want the alternative.
2. **NestJS HTTP adapter** — prompt says Fastify. I'll use `@nestjs/platform-fastify`. Confirms?
3. **Web auth storage** — prompt says: access token in memory, refresh token in httpOnly cookie set by a Next.js Route Handler (`/api/auth/set-session`) the store calls after login. The store calls a Route Handler internally — that's the design I'll implement. Confirms?
4. **Mobile NativeWind** — the project plan §2 says mobile uses NativeWind; the prompt says no NativeWind components yet. I'll **install** NativeWind so the build pipeline is wired, but **not author any NativeWind classes** on elements. OK?
5. **Tailwind preset values** — placeholders only; I'll use neutral defaults (`gray-*` palette, standard spacing, `Inter` font). You replace them when the design system lands. OK?
6. **`packages/ui` and `packages/ui-mobile`** — these directories exist in §3 of the plan but the prompt says no shadcn / NativeWind components. I'll scaffold them with `package.json` + `tsconfig.json` + an empty `src/index.ts` so they're ready to fill in Sprint 2's UI work. OK?
7. **Schema verbatim from §4** — the §4 schema has a handful of one-line model definitions (e.g. `model UserRole { ... }`) using inline syntax. I'll expand them to standard multi-line Prisma syntax for readability — same semantics, no field changes. OK?
8. **One thing I noticed in §4** — `Cart.appliedCoupon` is declared as `String?` (just the code), but the rest of the system references `Coupon` rows by id. I'll keep it as `String?` per §4, treating it as the *coupon code* (matching `Coupon.code`). Flagging in case you wanted it as `couponId` instead — say the word and I'll change before generating the migration.
9. **Running migrations / docker** — I will not run `docker compose up`, `pnpm install`, or `pnpm db:migrate` myself unless you ask. I'll provide the commands and a `docs/local-setup.md`. Confirm that's what you want, or tell me to run them.

---

**Awaiting your approval (or answers to the open questions) before I start Phase 1.**
