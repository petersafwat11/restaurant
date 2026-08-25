# Full-Stack Monorepo Architecture Blueprint & Scaffolding Guide

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                  Turborepo + pnpm                      │
                                  └──────────────────────────┬──────────────────────────────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────────────────────┐
                    ▼                                        ▼                                        ▼
             ┌──────────────┐                         ┌──────────────┐                         ┌──────────────┐
             │  apps/web    │                         │ apps/admin   │                         │  apps/api    │
             │  Next.js 15  │                         │  Next.js 15  │                         │  NestJS 11   │
             │  (Customer)  │                         │ (Operations) │                         │  (Fastify)   │
             └──────┬───────┘                         └──────┬───────┘                         └──────┬───────┘
                    │                                        │                                        │
                    └──────────────────┬─────────────────────┴────────────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                          packages/ (Shared Layer)                                       │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
    │  │    types     │ │  api-client  │ │  auth-core   │ │      db      │ │     jobs     │ │      ui      │  │
    │  │ (Zod Schemas)│ │(Typed Fetch) │ │(JWT/Crypto)  │ │(Prisma+Seed) │ │  (BullMQ)    │ │ (shadcn/ui)  │  │
    │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
    │  │    utils     │ │config-runtime│ │     i18n     │ │realtime-clnt │ │observability │ │feature-flags │  │
    │  │(Money/Format)│ │ (createEnv)  │ │ (Catalogs)   │ │ (Socket.IO)  │ │   (Sentry)   │ │  (Flags)     │  │
    │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
    └──────────────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
    ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                          tooling/ (Shared Configs)                                      │
    │           [tsconfig]                 [biome-config]                 [tailwind-config]                   │
    └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Core Architectural Pillars & Philosophy

### 1. Contract-First (Single Source of Truth)
- **Every DTO, model, form, query parameter, and websocket payload is declared once** as a Zod schema in `@repo/types`.
- **Backend**: Uses a custom `ZodValidationPipe` to validate inputs and localize error messages before controllers run.
- **Frontends**: Use the exact same Zod schemas with `@hookform/resolvers/zod` for client-side forms.
- **Client SDK**: `@repo/api-client` uses these schemas to validate request inputs and response payloads.

### 2. Zero-Trust on Client Data
- **Never trust client calculations**: Money, discounts, taxes, and availability are always recomputed server-side.
- **No Float Arithmetic for Money**: All financial fields use PostgreSQL `Decimal(10, 2)` and calculations go through `@repo/utils` (`packages/utils/src/money.ts`) using `decimal.js`.

### 3. Asynchronous Side-Effect Isolation (BullMQ)
- **Request handlers never block on external side effects**: Sending emails, SMS, generating PDFs, auditing actions, and running rollups are dispatched as typed jobs to Redis queues via BullMQ.
- Handlers return immediately; dedicated background worker processors handle retry logic and exponential backoff.

### 4. Event-Driven Real-Time (Socket.IO + EventEmitter2)
- Domain services fire internal events with NestJS `EventEmitter2` (e.g., `order.created`).
- The `RealtimeGateway` bridges these internal events to permission-secured Socket.IO rooms (`order:{id}`, `restaurant:{id}:orders`, `restaurant:{id}:kitchen`).
- Clients subscribe to rooms and receive live delta updates (eliminating polling).

### 5. Granular RBAC (Permission-Based Access Control)
- Access is governed by **Permissions** (`order:read`, `menu:write`, etc.) rather than hardcoded roles.
- Roles are simply sets of permissions mapped in `packages/types/src/permissions.ts`.
- Controllers enforce permissions with `@Permissions('...')` metadata evaluated by `PermissionsGuard`. Frontend checks via `useAuthStore().hasPermission()` are strictly cosmetic UI helpers.

### 6. Fail-Fast Bootstrapping
- All environment variables are parsed and frozen at boot via `createEnv()` against a strict Zod schema. If any variable is missing or malformed, the process immediately exits with a readable bulleted list of issues.

---

## 2. Directory Layout & Organization

### Root Level
```
├── apps/               # Executable deployable applications
├── packages/           # Shared internal libraries (published as @repo/*)
├── tooling/            # Shared compiler, linter, and styling configurations
├── deploy/             # Production deployment scripts, Caddyfile, and Docker Compose
├── docs/               # System architecture documentation, runbooks, and checklists
├── .Codex/plans/       # Task planning and feature implementation records
├── package.json        # Root workspace configuration
├── pnpm-workspace.yaml # Defines packages: ["apps/*", "packages/*", "tooling/*"]
├── turbo.json          # Turborepo task pipeline and caching rules
└── biome.json          # Monorepo-wide linting and formatting configuration
```

---

## 3. Package Layer Breakdown (`packages/`)

Every package in `packages/` is prefixed with `@repo/` and consumed directly by apps via workspace references (`"@repo/types": "workspace:*"`).

| Package | Purpose & Key Responsibilities | Key Files / Exports |
|---|---|---|
| **`@repo/types`** | **Single source of truth** for all schemas, enums, DTOs, events, and API interfaces. | `auth.ts`, `order.ts`, `permissions.ts`, `realtime.ts`, `index.ts` |
| **`@repo/db`** | Prisma ORM schema, client export, migrations, and seed script. | `prisma/schema.prisma`, `src/index.ts`, `seed.ts` |
| **`@repo/api-client`** | Isomorphic, typed API client wrapper used by frontend apps. Handles cookies, auth tokens, automatic refresh on 401, and schema validation. | `src/client.ts`, `src/errors.ts` |
| **`@repo/auth-core`** | Pure crypto & auth utility: JWT signing/verification, password hashing (bcrypt), token hashing (SHA-256), OTP generation. | `jwt.ts`, `password.ts`, `otp.ts` |
| **`@repo/jobs`** | BullMQ queue names, job identifiers, and payload Zod schemas. | `queues.ts`, `payloads.ts` |
| **`@repo/ui`** | Reusable UI design system (shadcn/ui + Radix + Tailwind). | `_shadcn/`, `data-table/`, `status-pill/`, `index.ts` |
| **`@repo/utils`** | Pure utilities: `money` arithmetic (`Decimal`), date formatting, slug generation, SEO schema generators. | `money.ts`, `format.ts`, `structured-data.ts`, `geo.ts` |
| **`@repo/config-runtime`** | Environment variable parser using Zod with fail-fast validation. | `src/index.ts` (`createEnv`) |
| **`@repo/realtime-client`** | Typed Socket.IO browser client wrapper with reconnection and auth logic. | `src/index.ts` |
| **`@repo/i18n`** | Localization catalogs (JSONs), loaders, formatters, and RTL helpers. | `messages/`, `src/index.ts` |
| **`@repo/observability`** | Sentry error-reporting integration (safe no-op if unconfigured). | `src/index.ts` |
| **`@repo/analytics`** | Product analytics wrapper (PostHog). | `src/index.ts` |
| **`@repo/feature-flags`** | Feature flag keys and evaluation helpers. | `src/index.ts` |

---

## 4. Backend Architecture (`apps/api`)

Built on **NestJS 11** with the high-performance **Fastify** adapter.

```
apps/api/src/
├── main.ts                       # Fastify adapter bootstrap, CORS, cookie parser, static assets
├── app.module.ts                 # Master module registering all feature modules and global providers
├── config/                       # Runtime env configuration (@repo/config-runtime)
├── common/                       # Shared NestJS infrastructure
│   ├── guards/                   # JwtAuthGuard, PermissionsGuard
│   ├── interceptors/             # SlidingRefreshInterceptor, AuditInterceptor
│   ├── pipes/                    # ZodValidationPipe
│   ├── filters/                  # HttpExceptionFilter (standardized error payload)
│   ├── decorators/               # @Public(), @Permissions(), @CurrentUser(), @AuditAction()
│   └── rate-limit/               # Redis-backed rate limiting guard
├── prisma/                       # PrismaService database connection provider
├── redis/                        # RedisService for cache, locks, OTPs, and rate limiting
├── bullmq/                       # BullMQ integration module and queue registration
├── realtime/                     # Socket.IO RealtimeGateway and event listener bridge
├── jobs/                         # Background processors (email, sms, receipt PDF, audit, analytics)
└── [feature-modules]/            # Domain modules (auth, users, menu, orders, payments, etc.)
```

### Request Lifecycle in API
1. **Fastify Engine**: Parses raw buffers (handling webhooks), cookies, and multiparts.
2. **Global Guards**:
   - `JwtAuthGuard`: Extracts JWT from Bearer header or HTTP-only cookies; triggers sliding refresh or rotation if near expiration.
   - `PermissionsGuard`: Compares token permissions against `@Permissions(...)` decorator.
   - `RateLimitGuard`: Redis sliding-window limiter based on IP / User ID.
3. **Pipes**: `ZodValidationPipe` validates the request body/query against `@repo/types` schemas.
4. **Service Execution**: Executes business logic inside transactional boundaries (`prisma.$transaction`).
5. **Auditing**: `@AuditAction(...)` triggers `AuditInterceptor` to push an audit job to BullMQ post-response.
6. **Real-Time Dispatch**: Internal events emitted via `EventEmitter2` trigger `RealtimeGateway` room broadcasts.

---

## 5. Frontend Architecture (`apps/web` & `apps/admin`)

Both frontends use **Next.js 15 App Router** with hard bundle separation.

### Structure
```
apps/[web|admin]/src/
├── app/
│   ├── [locale]/                 # next-intl i18n route group
│   │   ├── (auth)/               # Login, register, reset password routes
│   │   ├── (dashboard)/          # Authenticated app layout and pages
│   │   └── layout.tsx            # Root localized layout with AppProviders
│   ├── api/                      # Next.js route handlers (cookie session bridge)
│   └── globals.css               # CSS variable token definitions
├── components/                   # App-specific composite components
├── features/                     # Domain feature modules (hooks, components, sub-views)
├── lib/
│   ├── api-client.ts             # Singleton instance of @repo/api-client
│   ├── realtime-client.ts        # Singleton instance of @repo/realtime-client
│   └── query-client.ts           # TanStack Query client configuration
├── providers/
│   └── app-providers.tsx         # QueryClientProvider, Auth hydration, Realtime connection
└── stores/
    ├── auth-store.ts             # Zustand store for user session and permissions
    └── cart-store.ts             # Zustand store for client cart state (web only)
```

### Frontend State Strategy
- **Server State**: Managed via **TanStack Query v5**. Real-time socket events directly invalidate or patch Query cache keys (`queryClient.invalidateQueries(...)`).
- **Client State**: Lightweight **Zustand** stores for auth session, permissions, and transient cart state.
- **Forms**: React Hook Form connected to `@repo/types` Zod schemas via `@hookform/resolvers/zod`.
- **UI Styling**: Shared design tokens via `@repo/tailwind-config` mapped to CSS custom variables in `globals.css` (semantic themes: `--bg`, `--surface`, `--accent`, `--border`, `--fg`).

---

## 6. Database Design Pattern (`packages/db`)

### Key Prisma Schema Practices:
- **CUID Identifiers**: All primary keys use `@default(cuid())` for distributed uniqueness and URL safety.
- **Snapshot Immutability**: Critical transactional data (such as order items, pricing breakdowns, applied taxes, modifier choices, legal version accepted) is serialized as JSON snapshots in the order record so future menu/tax edits never alter historical receipts.
- **Soft Archival & Deletion Lifecycle**: Comprehensive support for account deactivation, GDPR anonymization (`AccountDeletionStatus`), and order cancellation workflows.
- **Audit Trails**: Built-in `AuditLog` table capturing actor ID, IP, user-agent, action, resource type, and JSON state diffs.

---

## 7. Tooling & Build System Configuration

### 1. Turborepo (`turbo.json`)
- Configured with strict topological dependencies (`"dependsOn": ["^build"]`).
- Explicit cache keys and outputs (`.next/**`, `dist/**`).
- Environment variable passthrough declaration (`globalEnv`) ensuring cache validity when configuration changes.

### 2. TypeScript (`tooling/tsconfig`)
- Project references with shared base configs:
  - `base.json`: Strict mode, `target: "ES2022"`, `moduleResolution: "bundler"`, `noUncheckedIndexedAccess: true`.
  - `nextjs.json`: Next.js JSX and App Router plugin settings.
  - `nestjs.json`: Decorator metadata and CommonJS/Node compatibility for backend.

### 3. Biome (`tooling/biome-config`)
- Single tool replacing Prettier and ESLint for 95% of tasks.
- Strict rules for import ordering, console warnings, and syntax consistency across all packages.

---

## 8. Deployment & DevOps Architecture (`deploy/`)

- **Hosting Target**: Self-contained VPS running Docker Compose.
- **Caddy Reverse Proxy**: Automatic TLS (Let's Encrypt), static asset compression, security headers (CSP, HSTS), and proxying to:
  - Web: `domain.com` → Port 3000
  - Admin: `admin.domain.com` → Port 3001
  - API: `api.domain.com` → Port 4000
- **Storage**: Local filesystem uploads mapped via Docker volumes (`/var/uploads`) with an automated BullMQ orphan cleanup job (avoiding external S3/R2 overhead when self-hosting).
- **CI/CD**: GitHub Actions workflows (`.github/workflows/`) for automated typechecking, linting, Vitest unit/e2e testing, Docker image building, and SSH-based rolling container updates.

---

# 🚀 Blueprint for Scaffolding a New Project

When starting your new project based on this architecture, follow this sequence:

```
Step 1: Monorepo Foundation
  ├── Initialize pnpm workspace & package.json
  ├── Set up turbo.json with build/dev/lint/typecheck pipelines
  └── Configure tooling/ (tsconfig, biome.json, tailwind preset)

Step 2: Core Contracts & Utilities
  ├── Create packages/config-runtime (Zod env validation)
  ├── Create packages/types (domain schemas, DTOs, permissions)
  ├── Create packages/utils (math, formatting, helpers)
  └── Create packages/auth-core (JWT, hashing)

Step 3: Database & Jobs Foundation
  ├── Create packages/db (Prisma schema + seed script)
  ├── Create packages/jobs (BullMQ queue and payload definitions)
  └── Run initial migration and generate Prisma client

Step 4: Backend API Architecture (apps/api)
  ├── Setup NestJS 11 with Fastify adapter
  ├── Implement ZodValidationPipe, JwtAuthGuard, PermissionsGuard
  ├── Implement BullmqModule & RedisModule
  └── Build authentication and core domain modules

Step 5: Shared UI & API Client
  ├── Create packages/ui (shadcn base components)
  ├── Create packages/api-client (typed isomorphic HTTP client)
  └── Create packages/realtime-client (Socket.IO client)

Step 6: Frontend Applications (apps/web & apps/admin)
  ├── Setup Next.js 15 App Router with i18n
  ├── Configure Zustand stores, TanStack Query client, and AppProviders
  └── Build feature routes using shared @repo/ui components

Step 7: Production Infrastructure & CI/CD
  ├── Configure deploy/docker-compose.prod.yml & Caddyfile
  └── Setup .github/workflows for CI lint/test and CD deployment
```
