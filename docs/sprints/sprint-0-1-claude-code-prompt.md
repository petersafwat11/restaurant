# Claude Code Prompt — Sprint 0 + Sprint 1 (Foundation + Auth, NO UI)

> Paste this entire prompt into Claude Code at the root of an empty repo. Make sure `restaurant-app-project-plan.md` is also in the repo root so Claude can reference it.

---

## CONTEXT

We are building the restaurant ordering platform described in `restaurant-app-project-plan.md` at the repo root. **Read that file in full before writing anything.** It contains the monorepo structure, full Prisma schema, sprint plan, conventions, and `CLAUDE.md` template that must be respected.

Your job in this run: execute **Sprint 0 (Foundation)** and **Sprint 1 (Auth & User)** from that plan, with one critical constraint:

## HARD CONSTRAINT — NO UI

**Do not build any UI in this run.** That means:
- No JSX content inside page/screen files beyond a placeholder that renders nothing.
- No styled components, no Tailwind classes on elements, no shadcn components generated, no NativeWind components.
- No design tokens authored beyond what is required for the build to compile.
- No marketing pages, no forms with inputs, no buttons, no layouts beyond a minimal `<html><body>{children}</body></html>` shell.

**But everything else must be production-ready.** When I sit down later to build the UI, I will only need to write JSX and styles — every hook, store, type, API endpoint, validator, route file, and config it consumes must already exist and work.

## HARD CONSTRAINT — SCHEMA IS COMPLETE, BACKEND IS SCOPED

The Prisma schema in this run is the **full schema for the entire project** (§4 of the plan), but the backend implementation (modules, controllers, services, endpoints) is scoped to **Sprint 1 only**: auth, users, addresses. Every other table in the schema (Restaurant, MenuItem, Order, etc.) exists in the database but has zero corresponding NestJS code. Resist the temptation to "throw in" endpoints for them — each sprint owns its own backend work.

## What "everything else ready" means concretely

For every Sprint 1 feature (auth + user profile + addresses), the following must be implemented and tested:

1. **Backend (apps/api)** — fully working endpoints, validators, services, guards, tests.
2. **Database (packages/db)** — Prisma schema for the models needed by Sprint 1, migration applied, seed script for roles + permissions + a test user.
3. **Shared types (packages/types)** — all Zod schemas + inferred TS types for every DTO Sprint 1 touches.
4. **Shared API client (packages/api-client)** — typed wrapper functions for every Sprint 1 endpoint.
5. **TanStack Query hooks (in each frontend app's `src/features/`)** — every mutation and query a UI would need, wired to the API client, with proper invalidation, optimistic updates where relevant, and toast hook stubs (don't import a toast library, just call a `notify()` helper that no-ops for now).
6. **Zustand stores** — auth store fully implemented per platform (cookie-based for web/admin, expo-secure-store for mobile), with persistence and token refresh logic.
7. **Routes scaffolded** — every Sprint 1 page/screen file exists at the correct path, exports a default component that returns `null` (or `<></>`), with a one-line comment `// TODO(ui): implement <screen name>`.
8. **Middleware & guards on the frontend** — Next.js middleware that protects `(account)` and `(dashboard)` route groups; mobile expo-router auth guard.

If any of those eight things is missing for a Sprint 1 feature, the sprint is not done.

---

## REQUIRED WORKFLOW

1. **First, read `restaurant-app-project-plan.md` completely.** Confirm you've read it.
2. **Write a plan to `.claude/plans/sprint-0-1.md`** breaking the work into ordered phases. Stop and wait for my approval before implementing. The plan should list:
   - Phases (Monorepo skeleton → tooling → db → shared packages → api → web/admin/mobile structure → hooks/stores → tests).
   - For each phase, the files you will create or modify (list paths).
   - Verification commands you'll run after each phase.
   - Open questions if any (don't guess — ask).
3. After I approve, implement phase by phase. After each phase, run the verification commands and confirm green before moving to the next.
4. Use `CLAUDE.md` conventions from §14 of the project plan. Create that file at repo root as the first action so future runs inherit it.

---

## DETAILED SCOPE

### Phase 1 — Monorepo skeleton

- Turborepo + pnpm workspaces.
- `pnpm-workspace.yaml` covering `apps/*`, `packages/*`, `tooling/*`.
- `turbo.json` with pipelines for `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:generate`, `db:seed`.
- Root `package.json` with workspace scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:*`.
- Node version pinned via `.nvmrc` to 20 LTS.
- `.gitignore`, `.editorconfig`, `.npmrc` (`save-exact=true`, `strict-peer-dependencies=false`).
- Directory structure exactly per §3 of the plan. Create empty `.gitkeep` files for placeholder folders.

### Phase 2 — Tooling packages

- `tooling/tsconfig` with `base.json`, `nextjs.json`, `react-native.json`, `nestjs.json`. Strict mode on everywhere.
- `tooling/biome-config` exporting a shared `biome.json`.
- `tooling/eslint-config` with a Next-specific ruleset (kept minimal — Biome does the heavy lifting).
- `tooling/tailwind-config` exporting a preset with **only** the token primitives (colors, spacing, radii, fonts) needed for compilation to succeed. No utility classes used yet — these are just declarations. Use placeholder values; we will replace them when the design system is finalized.

### Phase 3 — Docker dev environment

- `docker-compose.yml` with services: `postgres:16`, `redis:7`, `mailhog`. Named volumes for persistence. Healthchecks on each.
- `.env.example` at root listing every env variable from §15 of the plan with safe defaults for local dev.
- A short `docs/local-setup.md` with bring-up steps.

### Phase 4 — packages/db

- Prisma schema covering the **complete data model for the entire project** as specified in §4 of `restaurant-app-project-plan.md`. This is intentional: we lock the data model upfront so subsequent sprints add features, not tables. Every model, enum, index, unique constraint, and relation from §4 must be present in this initial schema:
  - **Identity & access:** `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`.
  - **User data:** `UserAddress`, `PaymentMethod`, `PushToken`, `Notification`.
  - **Restaurant:** `Restaurant`, `OperatingHours`.
  - **Menu:** `MenuCategory`, `MenuItem`, `MenuItemImage`, `MenuItemModifierGroup`, `MenuItemModifierOption`.
  - **Ordering:** `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusEvent`.
  - **Payments:** `Payment`, `Refund`.
  - **Loyalty & promotions:** `LoyaltyAccount`, `LoyaltyTransaction`, `Promotion`, `Coupon`, `CouponRedemption`.
  - **Reservations:** `Table`, `Reservation`.
  - **Reviews:** `Review`.
  - **Enums:** `OrderType`, `OrderStatus`, `PaymentStatus`, `PaymentMethodKind`.
- Copy field types, defaults, indexes, and `@@unique`/`@@index` clauses **verbatim** from §4. If anything in §4 looks wrong or ambiguous to you as you implement, **stop and flag it before changing the schema** — we want exactly one clean initial migration, not a chain of fixups.
- A `PrismaService` extension is not in this package — Nest's `PrismaService` lives in `apps/api`. This package exports the generated client and types only.
- One initial migration applied: `pnpm --filter @repo/db migrate dev --name init`. The resulting SQL should be the only migration file in the repo at the end of this sprint.
- Seed script (`packages/db/seed.ts`) that **only seeds Sprint 1 entities** — even though the full schema exists, seed data is scoped per-sprint so each sprint's seed remains meaningful when re-run. For Sprint 1:
  - All permission keys listed in plan §10.
  - 5 roles: `owner`, `manager`, `kitchen`, `cashier`, `customer` with the permission assignments from the plan.
  - 1 owner test user: `owner@local.test` / `Password123!` with email verified.
  - 1 customer test user: `customer@local.test` / `Password123!` with email verified.
  - Leave restaurant/menu/order tables empty — Sprint 2's seed script will populate those.
- Structure the seed file with named functions (`seedPermissions()`, `seedRoles()`, `seedUsers()`) and a `main()` that orchestrates. This makes it easy to add `seedRestaurants()`, `seedMenu()`, etc. in later sprints without rewriting.
- `pnpm db:seed` works end-to-end and is idempotent (safe to run twice — use `upsert`, not `create`).

### Phase 5 — Shared packages (no business logic, no Nest, no React)

- **`packages/types`** — Zod schemas + inferred types for every Sprint 1 DTO:
  - `auth.ts` — RegisterDto, LoginDto, RefreshDto, RequestOtpDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, AuthTokensDto, MeDto.
  - `user.ts` — UpdateProfileDto, ChangePasswordDto, UserPublicDto.
  - `address.ts` — CreateAddressDto, UpdateAddressDto, AddressDto.
  - `error.ts` — standard error response shape.
  - `permissions.ts` — `PermissionKey` literal union and `ROLE_PERMISSIONS` map (single source of truth, imported by api seed and frontends).
  - Re-export everything from `index.ts`.
- **`packages/api-client`** — `createApiClient({ baseUrl, getAccessToken, onUnauthorized })` returning an object with typed methods grouped by resource:
  - `auth.register`, `auth.login`, `auth.refresh`, `auth.logout`, `auth.requestOtp`, `auth.verifyOtp`, `auth.forgotPassword`, `auth.resetPassword`, `auth.verifyEmail`, `auth.me`.
  - `users.updateProfile`, `users.changePassword`.
  - `addresses.list`, `addresses.create`, `addresses.update`, `addresses.delete`, `addresses.setDefault`.
  - Use native `fetch`. All inputs validated against Zod schemas from `packages/types` before sending. All responses parsed with the corresponding Zod schema. Throw a typed `ApiError` on non-2xx.
- **`packages/auth-core`** — pure helpers:
  - `hashPassword`, `verifyPassword` (bcrypt).
  - `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` (jsonwebtoken).
  - `generateOtp(length)`, `hashToken(token)` (sha256 for refresh token storage).
  - No framework imports, fully testable in isolation. Unit tests included.
- **`packages/utils`** — only what Sprint 1 needs: `slugify`, `formatPhone`, `isValidPhone`, `assertNever`. Add other helpers in later sprints as needed.
- **`packages/config-runtime`** — `createEnv(schema)` helper using Zod that throws on missing required vars. Each app will define its own schema.
- **`packages/i18n`** — initialize with empty `en.json` and `ar.json`. Helper `getDir(locale)` returning `'rtl' | 'ltr'`. No actual translations yet.
- **`packages/jobs`** — export only the queue **name constants** and **payload Zod schemas** for the four Sprint 1 jobs: `email.verification`, `email.password-reset`, `sms.otp`, `push.welcome`. The processors live in `apps/api`.

### Phase 6 — apps/api (NestJS)

This is the heaviest part of Sprint 1. Build it complete.

- Fastify adapter. `main.ts` wires global pipes, filters, prefix `/api/v1`, CORS for the three frontend origins from env, Swagger at `/api/v1/docs` (auto-generated from Zod via nestjs-zod or @anatine/zod-openapi).
- `PrismaService` extending PrismaClient with `onModuleInit` connect, `enableShutdownHooks`.
- Global `ZodValidationPipe` consuming schemas from `packages/types`.
- Global `HttpExceptionFilter` returning the `ErrorDto` shape from `packages/types`.
- `PermissionsGuard` reading `@Permissions(...)` decorator metadata, fetching user permissions from JWT claims (embed `permissions: string[]` in access token at login).
- `@CurrentUser()` parameter decorator.

**Modules to implement:**

1. **`config`** — Zod-validated env via `packages/config-runtime`.
2. **`prisma`** — PrismaService.
3. **`redis`** — single shared ioredis instance.
4. **`bullmq`** — Queue factories + worker bootstrap. Register the four Sprint 1 queues.
5. **`mailer`** — Resend adapter in production, SMTP-to-mailhog in dev. Templates as TSX via `@react-email/components`. Two templates for Sprint 1: `EmailVerification` and `PasswordReset`. Send via the `email` queue.
6. **`sms`** — Twilio adapter in production, console-log adapter in dev. Used by the `sms.otp` queue.
7. **`auth`** —
   - `POST /auth/register` — email + password, creates user with `customer` role, sends verification email, returns tokens.
   - `POST /auth/login` — email + password, returns access + refresh.
   - `POST /auth/refresh` — rotates refresh token, returns new pair.
   - `POST /auth/logout` — revokes refresh token.
   - `POST /auth/request-otp` — phone, generates 6-digit OTP, stores hashed in Redis with 5-min TTL, queues SMS.
   - `POST /auth/verify-otp` — phone + code, verifies + marks phone verified, returns tokens (or just verification flag if already logged in).
   - `POST /auth/forgot-password` — queues email with signed token.
   - `POST /auth/reset-password` — token + new password.
   - `POST /auth/verify-email` — token from email link.
   - `GET /auth/me` — returns current user + permissions array.
   - All endpoints use Zod DTOs from `packages/types`.
8. **`users`** —
   - `PATCH /users/me` — update profile.
   - `POST /users/me/change-password` — old + new.
9. **`addresses`** —
   - `GET /addresses` — list mine.
   - `POST /addresses` — create.
   - `PATCH /addresses/:id` — update mine.
   - `DELETE /addresses/:id` — delete mine.
   - `POST /addresses/:id/default` — set default (unsets others atomically in a transaction).

**Job processors** (in `apps/api/src/jobs/`):

- `email.processor.ts` — handles `email.verification` and `email.password-reset` jobs.
- `sms.processor.ts` — handles `sms.otp`.
- `push.processor.ts` — `welcome` job stub (logs only — Expo push integration comes in Sprint 9, but the queue + processor scaffolding lives here so we don't refactor later).

**Tests:**

- e2e tests for `auth` module covering happy paths + key failure paths (wrong password, expired token, duplicate email).
- e2e test for `addresses` covering ownership scoping (user A cannot read/edit user B's address).
- Unit tests for `auth-core` package functions.

### Phase 7 — apps/web, apps/admin, apps/mobile structure (NO UI)

For **each** of the three frontend apps, do the following. Differences between web/admin/mobile are noted where relevant.

**apps/web** and **apps/admin** (Next.js 15, App Router):

```
src/
├── app/
│   ├── layout.tsx                     # bare <html><body>{children}</body></html>, no styles
│   ├── (auth)/
│   │   ├── login/page.tsx             # returns null, TODO comment
│   │   ├── register/page.tsx          # returns null
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── verify-email/page.tsx
│   ├── (account)/                     # web only — admin uses (dashboard)
│   │   ├── profile/page.tsx
│   │   └── addresses/page.tsx
│   └── (dashboard)/                   # admin only
│       └── page.tsx                   # placeholder for KPI overview (Sprint 6)
├── middleware.ts                      # redirects unauthenticated users from protected groups to /login
├── features/
│   └── auth/
│       ├── hooks/
│       │   ├── use-login.ts
│       │   ├── use-register.ts
│       │   ├── use-logout.ts
│       │   ├── use-me.ts
│       │   ├── use-forgot-password.ts
│       │   ├── use-reset-password.ts
│       │   ├── use-verify-email.ts
│       │   ├── use-request-otp.ts
│       │   ├── use-verify-otp.ts
│       │   ├── use-update-profile.ts
│       │   ├── use-change-password.ts
│       │   └── index.ts
│       └── schemas/                   # re-export DTOs from @repo/types for convenience
├── features/
│   └── addresses/
│       ├── hooks/
│       │   ├── use-addresses.ts       # query
│       │   ├── use-create-address.ts
│       │   ├── use-update-address.ts
│       │   ├── use-delete-address.ts
│       │   ├── use-set-default-address.ts
│       │   └── index.ts
├── stores/
│   └── auth-store.ts                  # Zustand, persisted in httpOnly cookies via server actions OR localStorage for non-sensitive UI flags only
├── lib/
│   ├── api-client.ts                  # instantiates @repo/api-client with env baseUrl + token getter
│   ├── query-client.ts                # TanStack QueryClient instance + provider
│   ├── notify.ts                      # no-op `notify(level, msg)` for now; UI sprint replaces with real toast
│   └── env.ts                         # Zod-validated client env
├── providers/
│   └── app-providers.tsx              # wraps QueryClientProvider + any future providers
└── components/
    └── README.md                      # "UI to come — do not add components yet"
```

**apps/mobile** (Expo + expo-router):

```
app/
├── _layout.tsx                        # bare Stack, no theme
├── (auth)/
│   ├── login.tsx                      # returns null
│   ├── register.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   └── verify-otp.tsx
├── (tabs)/
│   ├── _layout.tsx                    # empty Tabs config — tabs added in UI sprint
│   └── index.tsx                      # returns null
└── account/
    ├── profile.tsx
    └── addresses.tsx
src/
├── features/auth/hooks/...            # same files as web
├── features/addresses/hooks/...
├── stores/auth-store.ts               # Zustand persisted via expo-secure-store
├── lib/
│   ├── api-client.ts
│   ├── query-client.ts
│   ├── secure-storage.ts              # SecureStore wrapper
│   ├── notify.ts
│   └── env.ts
├── providers/app-providers.tsx
└── components/README.md
```

### Phase 8 — TanStack Query hooks (the part that matters most)

Every hook must:

- Use TanStack Query v5 syntax (`useMutation({ mutationFn })`, `useQuery({ queryKey, queryFn })`).
- Pull `mutationFn`/`queryFn` from the shared `@repo/api-client` instance.
- Define query keys via a small `queryKeys` factory in each feature folder (e.g. `queryKeys.me`, `queryKeys.addresses.all`, `queryKeys.addresses.byId(id)`).
- Handle success/error via `onSuccess`/`onError` callbacks that:
  - Update auth store where relevant (e.g. `useLogin` sets tokens + user).
  - Invalidate related queries (e.g. `useCreateAddress` invalidates `queryKeys.addresses.all`).
  - Call `notify('success', '...')` / `notify('error', err.message)`.
- Be fully typed end-to-end (input + output).
- Export a stable named API: `export function useLogin(): UseMutationResult<AuthTokens, ApiError, LoginInput>`.

Example shape `use-login.ts`:

```ts
import { useMutation } from '@tanstack/react-query';
import type { LoginInput, AuthTokens } from '@repo/types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notify';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthTokens, ApiError, LoginInput>({
    mutationFn: (input) => apiClient.auth.login(input),
    onSuccess: (tokens) => {
      setSession(tokens);
      notify('success', 'Signed in');
    },
    onError: (err) => notify('error', err.message),
  });
}
```

### Phase 9 — Zustand auth store

**Web/admin** store (`apps/web/src/stores/auth-store.ts`):
- State: `accessToken`, `user`, `permissions`, `isHydrated`.
- Refresh token is NOT in the store — it lives in an httpOnly cookie set by a Next.js Server Action / Route Handler `/api/auth/set-session` that the store calls. The store only holds the short-lived access token (in memory) and the user profile.
- Actions: `setSession(tokens)`, `clearSession()`, `setUser(user)`, `hydrate()` (calls `/auth/me` on app boot if cookie exists).
- Auto-refresh: a small interceptor in `lib/api-client.ts` retries 401 responses once by calling `auth.refresh`, updating the access token, and replaying.

**Mobile** store:
- Both tokens stored encrypted via `expo-secure-store` (refresh token has no cookie concept on RN).
- Same actions, same auto-refresh behavior in the API client.

`hasPermission(key: PermissionKey)` selector exported from each store for UI gating later.

### Phase 10 — Frontend tests

- Vitest setup in each frontend app.
- For each hook with non-trivial logic (login, refresh, set-default-address), write a unit test using MSW to mock the API and `@testing-library/react` to render the hook via `renderHook`. We're testing the wire-up, not the UI.
- CI runs `pnpm test` and it must pass.

### Phase 11 — CI

- `.github/workflows/ci.yml` running on PR + push to main:
  - Setup pnpm + Node 20.
  - `pnpm install --frozen-lockfile`.
  - `pnpm typecheck`.
  - `pnpm lint`.
  - `pnpm test`.
  - Spin up postgres + redis services; run `pnpm --filter @repo/db migrate deploy` and the api e2e suite.

---

## VERIFICATION CHECKLIST (run before declaring done)

```bash
# 1. Fresh clone simulation
pnpm install
docker compose up -d
cp .env.example .env

# 2. Database
pnpm db:migrate
pnpm db:seed

# 3. Type-check + lint everything
pnpm typecheck
pnpm lint

# 4. Tests (unit + e2e)
pnpm test

# 5. All apps boot without errors (don't expect to see anything in the browser)
pnpm dev
# - apps/api logs "Listening on :4000"
# - apps/web logs "Ready on :3000" and GET / returns 200 with empty body
# - apps/admin logs "Ready on :3001" and GET / returns 200
# - apps/mobile starts Metro without errors

# 6. Smoke test the API via curl (or Postman) against running api:
curl -X POST localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@local.test","password":"Password123!"}'
# -> 200 with { accessToken, refreshToken, user }

curl localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
# -> 200 with user + permissions

# 7. Open Swagger at http://localhost:4000/api/v1/docs and verify every Sprint 1 endpoint is documented.
```

If any step fails, fix it before reporting done.

---

## WHAT NOT TO DO

- Do not generate any shadcn/ui components, NativeWind components, or any styled JSX. Components folders should contain only the `README.md` placeholder.
- Do not add Tailwind utility classes to any element. Tailwind should be configured and compile, but the only authored CSS is whatever's needed in `globals.css` to make the build pass (i.e. the `@tailwind` directives). No tokens applied yet.
- Do not implement any Sprint 2+ features. The full Prisma schema is in place, but the only NestJS modules with controllers/services/endpoints in this run are: `auth`, `users`, `addresses`. **Having a model in the schema is not permission to build endpoints for it.** No restaurant CRUD, no menu endpoints, no order endpoints, no cart, no payments — those modules don't exist yet.
- Do not seed restaurants, menu items, orders, promotions, or any non-auth data. Each sprint owns its own seed data.
- Do not add a state-management library besides Zustand + TanStack Query.
- Do not implement push notifications end-to-end — only the queue and processor stub. Expo push registration lives in Sprint 9.
- Do not commit any real secrets. `.env.example` only.
- Do not skip tests. Hooks without tests are not done.
- Do not deviate from the file structure in §3 of the plan. If you think something should move, ask first.

---

## REPORTING

When each phase completes, post a short status update with:
- Files created/modified count.
- Verification commands run and their results.
- Anything you had to decide that wasn't specified — flag it so we can review.

When all phases are done, write a final summary to `.claude/reports/sprint-0-1-complete.md` covering:
- Everything implemented.
- Known gaps / deferred items.
- Exact commands to run in a fresh clone to bring the project up.
- Anything I should know before starting the UI work.

Begin by reading the project plan and writing your phased plan to `.claude/plans/sprint-0-1.md`. Stop after that and wait for my approval.
