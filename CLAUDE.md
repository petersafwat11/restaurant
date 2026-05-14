# Project: Restaurant Ordering Platform

## Stack
Turborepo · Next.js 15 · NestJS 11 · PostgreSQL · Prisma · Redis · BullMQ · Expo · Tailwind · shadcn/ui · Zod · React Hook Form · TanStack Query · Socket.IO · Stripe

## Working agreement

**Plan first.** For any non-trivial task (more than ~30 lines or touching more than one file), write a short plan to `.claude/plans/<task-slug>.md` and ask for approval before implementing.

**Use the design assets.** Designs live in `design-assets/`. Before implementing any screen:
1. `view` the matching `preview.png` (and `preview-mobile.png` if present)
2. Read `spec.md`
3. Treat `exported.tsx` as reference only — never copy it. Rebuild using `packages/ui` (web/admin) or `packages/ui-mobile` (mobile).
4. All tokens from `tooling/tailwind-config`. If a needed token doesn't exist, add it there and explain why in your PR description.

**Types and validation.**
- Every DTO is a Zod schema in `packages/types`. Don't re-declare types in apps.
- API uses `ZodValidationPipe`. Frontend forms use the same schemas via `@hookform/resolvers/zod`.
- Money fields use `Decimal`. Use `packages/utils/money.ts` helpers, never Number arithmetic.

**Database.**
- Migrations: `pnpm --filter @repo/db migrate:dev`
- After schema changes, run `pnpm --filter @repo/db generate` and commit.
- Don't write raw SQL unless the operation is impossible in Prisma.

**Auth & permissions.**
- Every protected NestJS route has `@Permissions('...')`. Adding a new permission means seeding it in `packages/db/seed.ts` and updating the `ROLE_PERMISSIONS` map in `packages/types/src/permissions.ts`.
- Frontend gates UI via `usePermissions()`. Backend re-checks always.

**Real-time.**
- Order updates flow through `realtime` module's gateway. Don't poll order status from the client.
- Subscribe to room `order:{orderId}` in `useOrderTracking(id)` hook.

**Jobs.**
- Side effects (email, SMS, push, exports) go in BullMQ queues. Never `await` them in request handlers.

**Mobile-specific.**
- Use `expo-router`. No React Navigation imports directly.
- All styling via NativeWind. No StyleSheet.
- Push tokens registered after login via `useRegisterPushToken()`.

**Conventions.**
- File names: kebab-case for files, PascalCase for component default export.
- Imports: absolute paths via `@/*` (per app), `@repo/*` for shared packages.
- Commit format: `type(scope): subject` — types: feat, fix, refactor, chore, docs, test.

**Test before declaring done.**
- For features touching the API: write at least one happy-path e2e test (Vitest + supertest).
- For UI screens: visual check by running the app and matching against `preview.png`.

**Never do.**
- Never store payment card data. Always tokenize.
- Never trust prices from the client; always recompute server-side at checkout.
- Never bypass `PermissionsGuard` on admin routes.
- Never hardcode the base URL — use the `apiClient` from `@/lib/api-client` (which reads it from env).

## Repo map (quick)

```
apps/
  api/      NestJS 11 (Fastify) — /api/v1
  web/      Next.js 15 — customer
  admin/    Next.js 15 — staff/owner
  mobile/   Expo + expo-router — customer
packages/
  db/             Prisma schema + client + seed
  types/          Zod schemas + inferred DTOs (single source of truth)
  api-client/     Typed fetch wrapper, used by all three frontends
  auth-core/      Pure JWT/bcrypt/OTP helpers
  jobs/           Queue names + payload Zod schemas
  i18n/           Locale JSONs + RTL helper
  utils/          Pure utility functions
  config-runtime/ createEnv() Zod helper
  ui/             shadcn components for web + admin (filled in Sprint 2+)
  ui-mobile/      NativeWind components for mobile (filled in Sprint 2+)
tooling/
  tsconfig/       Shared TS configs (base/nextjs/react-native/nestjs)
  biome-config/   Shared biome.json
  eslint-config/  Next-specific rules only
  tailwind-config/ Token preset
```

## Sprint status

- **Sprint 0**: foundation complete
- **Sprint 1**: auth + users + addresses complete (backend + hooks + stores + route stubs)
- **Sprint 2+**: pending — schema is in place but no controllers/services yet
