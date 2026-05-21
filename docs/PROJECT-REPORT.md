# Restaurant Ordering Platform — Full Project Report

> Generated 2026-05-15. Source of truth for handoff. Reflects what is actually committed in the repo (sprints 0–5, 7–8, plus pre-sprint-6 hardening). The customer-web/admin/mobile UIs are largely TODO stubs; the backend, hooks, stores, types, and infrastructure are fully wired.

---

## Table of contents

1. [Executive snapshot](#1-executive-snapshot)
2. [Tech stack — what is used for what](#2-tech-stack--what-is-used-for-what)
3. [Repository layout](#3-repository-layout)
4. [Database schema (Prisma)](#4-database-schema-prisma)
5. [Auth, roles, permissions](#5-auth-roles-permissions)
6. [User stories per role](#6-user-stories-per-role)
7. [API surface — every endpoint by module](#7-api-surface--every-endpoint-by-module)
8. [Real-time (Socket.IO) — rooms and events](#8-real-time-socketio--rooms-and-events)
9. [Background jobs (BullMQ)](#9-background-jobs-bullmq)
10. [Customer Web app — every page](#10-customer-web-app--every-page)
11. [Admin app — every page](#11-admin-app--every-page)
12. [Mobile app — every screen](#12-mobile-app--every-screen)
13. [End-to-end pipelines (the full story)](#13-end-to-end-pipelines-the-full-story)
14. [Shared packages reference](#14-shared-packages-reference)
15. [Local development & deployment](#15-local-development--deployment)
16. [Sprint status & what's next](#16-sprint-status--whats-next)

---

## 1. Executive snapshot

A four-surface restaurant ordering platform behind one NestJS API and one shared type/contract layer.

| Surface | Stack | Audience | Bundle |
|---|---|---|---|
| Customer Web (`apps/web`) | Next.js 15 App Router | End users | Marketing + ordering + account |
| Admin Dashboard (`apps/admin`) | Next.js 15 App Router | Owner / Manager / Kitchen / Cashier | Operations, KPIs, menu, orders, customers, reservations, reports |
| Customer Mobile (`apps/mobile`) | Expo SDK 52 + expo-router | End users | Native ordering experience, push, deep links |
| API (`apps/api`) | NestJS 11 + Fastify | All clients | REST `/api/v1/*`, Socket.IO, BullMQ workers |

The product is built around: industry-grade ordering UX; real-time order/kitchen updates across all surfaces; multi-location ready; EN/AR with RTL; hard separation of customer apps from admin (no shared route, no shared bundle).

---

## 2. Tech stack — what is used for what

### Backend (`apps/api`)
- **NestJS 11** with the **Fastify** adapter — controllers, modules, guards, interceptors.
- **PostgreSQL 16** through **Prisma 6** — primary data store; migrations in `packages/db/prisma/migrations`.
- **Redis 7** — auth/OTP tokens, idempotency cache, BullMQ broker.
- **BullMQ** — every side-effect (email, SMS, push, receipts, reports, audit, analytics, R2 cleanup) is queued, never awaited in a request.
- **Socket.IO** — `RealtimeGateway` for live order, kitchen, refund events.
- **Stripe** (primary) + **COD** adapter; payment provider is pluggable (`PaymentProvider` interface).
- **Resend** — transactional email.
- **Twilio** — SMS and WhatsApp OTP.
- **Cloudflare R2** (S3-compatible) — image storage with presigned PUT.
- **Sentry** — error tracking (api + workers).
- **PostHog** — backend product analytics.
- **Zod** — env validation, every DTO is a Zod schema in `packages/types`.

### Frontends
- **Next.js 15** App Router on web + admin; RSC where it fits.
- **shadcn/ui + Tailwind v4 + Radix** primitives on web/admin (UI components live in `packages/ui` — placeholder in this commit, planned for the UI sprint).
- **TanStack Query v5** for server state; **React Hook Form** + Zod resolvers for forms.
- **Zustand** for cart + auth state.
- **next-intl** for i18n; **EN + AR** with RTL; locales in `packages/i18n`.
- **Recharts** + **Tremor** for admin charts; **TanStack Table** for admin tables.

### Mobile (`apps/mobile`)
- **Expo SDK 52+** with EAS Build, **expo-router** file-based routing.
- **NativeWind** for styling (tokens shared with web via `tooling/tailwind-config`).
- **TanStack Query** + **React Hook Form** + **Zod** (same patterns as web).
- **Zustand** stores; **expo-secure-store** for tokens + offline cart snapshot.
- **@stripe/stripe-react-native** for Apple/Google Pay (provider wiring deferred to UI sprint).
- **expo-notifications** for push (registration hook ready).
- Deep link scheme: `restaurant://`.

### Tooling
- **Turborepo** with remote caching; **pnpm** workspaces.
- **Biome** for lint + format; ESLint kept only for Next-specific rules.
- **TypeScript 5.6+** strict, project references.
- **GitHub Actions** CI: typecheck, lint, tests.

---

## 3. Repository layout

```
apps/
  api/        NestJS — /api/v1 + Socket.IO + BullMQ workers
  web/        Next.js 15 — customer
  admin/      Next.js 15 — staff/owner
  mobile/     Expo + expo-router — customer

packages/
  db/             Prisma schema + client + seed
  types/          Zod schemas + inferred DTOs (single source of truth)
  api-client/     Typed fetch wrapper, used by all three frontends
  auth-core/      Pure JWT/bcrypt/OTP helpers
  jobs/           Queue names + payload Zod schemas
  i18n/           Locale JSONs + RTL helper + formatters
  utils/          Pure helpers: money, slugify, phone, structured-data, sitemap, loyalty
  config-runtime/ createEnv() Zod helper
  ui/             shadcn components for web + admin (placeholder)
  ui-mobile/      NativeWind components for mobile (placeholder)
  analytics/      PostHog backend client
  observability/  Sentry wrapper
  feature-flags/  Flag catalog + helpers
  realtime-client/ Socket.IO client wrapper

tooling/
  tsconfig/       base / nextjs / react-native / nestjs
  biome-config/   shared biome.json
  eslint-config/  next-only rules
  tailwind-config/ shared token preset

design-assets/    Stitch exports per screen (preview.png + spec.md + exported.tsx)
docs/             plan, runbooks, security, sprints
load/             k6 load tests
scripts/          dev/CI helpers
```

---

## 4. Database schema (Prisma)

Full schema in `packages/db/prisma/schema.prisma`. Models grouped by domain:

**Identity & access**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`, `StaffInvite`.

**Restaurant**: `Restaurant`, `OperatingHours`, `Table`.

**Menu**: `MenuCategory`, `MenuItem`, `MenuItemImage`, `MenuItemModifierGroup`, `MenuItemModifierOption`.

**Cart & order**: `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusEvent`.

**Payments**: `Payment`, `Refund`, `PaymentMethod`, `WebhookEvent`.

**Loyalty & promotions**: `LoyaltyAccount`, `LoyaltyTransaction`, `Promotion`, `Coupon`, `CouponRedemption`.

**Reservations**: `Reservation` (uses `Table`).

**Reviews**: `Review`, `ReviewImage`.

**Notifications**: `Notification`, `NotificationPreference`, `PushToken`.

**Other**: `UserAddress`, `CustomerNote`, `ContactMessage`, `Favorite`, `ReferralCode`, `Referral`, `AuditLog`, `DailyMetric`, `Export`, `FeatureFlag`.

Enums declared in schema: `OrderType` (`DELIVERY | PICKUP | DINE_IN`), `OrderStatus` (`PENDING | CONFIRMED | PREPARING | READY | OUT_FOR_DELIVERY | DELIVERED | COMPLETED | CANCELLED | REFUNDED`), `PaymentStatus` (`PENDING | AUTHORIZED | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED`), `PaymentMethodKind` (`STRIPE_CARD | APPLE_PAY | GOOGLE_PAY | PAYMOB | COD | WALLET | P24 | BLIK`).

Money everywhere is `Decimal(10,2)`. Helpers live in `packages/utils/money.ts`; never use Number arithmetic on money fields.

---

## 5. Auth, roles, permissions

### Auth flows
- **Email + password**: bcrypt (cost 12) via `@repo/auth-core`. Email verification token (24h, one-shot) sent on signup.
- **Phone OTP**: 6-digit code; SHA-256 hashed and stored in Redis (`otp:phone:{phone}`, 5-min TTL); plaintext only ever lives in the SMS job payload.
- **Tokens**:
  - Access JWT (15 min) carries `sub`, `email`, `roles[]`, `permissions[]`.
  - Refresh JWT (~30 d) carries `sub`, `jti`; the hash of `jti` is stored in `RefreshToken.tokenHash`.
  - **Rotation**: every refresh revokes the old DB row and writes a new one. Logout revokes one device; password reset revokes all devices.
- **Password reset**: one-shot token in Redis (1 h); revokes all refresh tokens on use.
- **Email verification required to place orders** (planned gating at checkout).
- 2FA (TOTP) is wired in the plan but not in the current commit.

### Permission keys (33 total, seeded in `packages/db/seed.ts`)
```
order:read           order:create        order:update         order:status_update
order:cancel         order:refund
menu:read            menu:write
restaurant:read      restaurant:write
customer:read        customer:write      customer:notes
promotion:read       promotion:write
reservation:read     reservation:write
review:read          review:moderate
staff:read           staff:write
reports:read         report:read         report:export
settings:read        settings:write
payment:create       payment:read        payment:refund
kitchen:read         analytics:read      audit:read
contact:read         flags:write
```

### Seeded roles (`ROLE_PERMISSIONS` in `packages/types/src/permissions.ts`)
- **owner** — all 33 permissions.
- **manager** — all except `staff:write` and `settings:write`.
- **kitchen** — `order:read`, `order:status_update`, `kitchen:read`.
- **cashier** — `order:read`, `order:create`, `payment:create`, `payment:read`, `kitchen:read`, `reservation:read`, `reservation:write`, `customer:read`.
- **customer** — no admin permissions; a customer is anyone authenticated without a staff role.

### How gating works
- Backend: `PermissionsGuard` reads `@Permissions('key1','key2',…)` metadata and AND-checks against `user.permissions` from the JWT. Public endpoints are marked with `@Public()`.
- Frontend: `useAuthStore().hasPermission(key)` hides/shows UI. Backend is always the source of truth — frontend gating is cosmetic.

### Seeded test users
- `owner@local.test` / `Password123!` — full access.
- `customer@local.test` / `Password123!` — customer.

---

## 6. User stories per role

### Customer (web + mobile)
- I can browse the menu without an account, add items to a guest cart, and check out as a guest *or* create an account first.
- I can sign up with email + password, verify my email, and log in. Or I can log in with phone OTP.
- I can place a delivery, pickup, or dine-in order; apply a coupon; redeem loyalty points; tip; and pay with card / Apple Pay / Google Pay / cash on delivery.
- I get email + SMS + push notifications when my order is confirmed, out for delivery, or delivered; I can see the live status on an order tracking page.
- I can manage my profile, saved addresses, payment methods, favorites, notification preferences, loyalty balance, referrals, and past reviews.
- I can book a table reservation and cancel it.
- I can rate a completed order and post a review.
- I can refer friends with a referral code and earn rewards when they sign up + order.

### Owner
- I see the dashboard KPIs (revenue, orders, AOV, top items, retention).
- I can do everything a manager can do, plus invite/remove staff and change global settings (hours, delivery zones, taxes, holidays, payment provider keys, feature flags).
- I see the audit log of every staff action.
- I can refund any order.

### Manager
- I work the live orders board: accept new orders, advance status, refund, cancel.
- I manage the menu (categories, items, images, modifiers, availability, schedule).
- I manage promotions, coupons, customers, reservations, reviews.
- I run reports (CSV/XLSX exports, analytics dashboards).
- I cannot create staff or edit global settings — that's owner-only.

### Kitchen
- I use the Kitchen Display System (KDS) full-screen: see active tickets in CONFIRMED/PREPARING, tap to advance to PREPARING → READY.
- I do not touch payments, customers, menu, or settings.

### Cashier
- I take counter / phone orders on behalf of customers (`order:create`).
- I capture payments at the counter (`payment:create`).
- I see today's orders and reservations.
- I look up a customer (`customer:read`) but I cannot edit them.

---

## 7. API surface — every endpoint by module

Base path: `/api/v1`. Every protected route enforces `@Permissions(...)`; every DTO is a Zod schema validated by `ZodValidationPipe` (auto-applied). Sensitive endpoints (order create, order status, refund, etc.) carry `@AuditAction(...)` which the global `AuditInterceptor` writes to the `audit` queue after the response is sent.

### Auth (`/auth`) — `apps/api/src/modules/auth`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Body `RegisterSchema`. Hashes pw, creates user with `customer` role, attaches referral if `referralCode` supplied, captures `signup` PostHog event, enqueues `email.verification`. Returns access+refresh+user. |
| POST | `/auth/login` | Public | `LoginSchema`. Returns `AuthResponseDto`. |
| POST | `/auth/refresh` | Public | Rotates refresh token (DB-backed revocation). |
| POST | `/auth/logout` | Auth | Revokes one refresh token. |
| POST | `/auth/request-otp` | Public | Stores hashed code in Redis, enqueues `sms.otp`. |
| POST | `/auth/verify-otp` | Public | Constant-time compare, finds/creates user by phone, marks phone verified, issues tokens. |
| POST | `/auth/forgot-password` | Public | One-shot token in Redis (1 h), enqueues `email.password-reset`. |
| POST | `/auth/reset-password` | Public | Consumes token, sets new hash, revokes **all** refresh tokens. |
| POST | `/auth/verify-email` | Public | Consumes one-shot token, sets `emailVerifiedAt`. |
| GET | `/auth/me` | Auth | Returns `MeDto` (id, email, phone, names, locale, verifiedAt, roles[], permissions[]). |

### Users (`/users`)
- `PATCH /users/me` (auth) — `UpdateProfileSchema`.
- `POST /users/me/change-password` (auth) — `ChangePasswordSchema`.

### Addresses (`/addresses`) — all auth
- `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`, `POST /addresses/:id/default`.

### Restaurants (`/restaurants`)
- `GET /restaurants` (public), `GET /restaurants/:slug` (public).
- `POST /restaurants`, `PATCH /restaurants/:id` — `restaurant:write`.
- `GET /restaurants/:id/hours` (public), `PUT /restaurants/:id/hours` — `restaurant:write`.

### Menu (`/menu`, `/restaurants/:id/menu`)
- **Reads (public)**: `GET /restaurants/:id/menu` → full tree; `GET /restaurants/:id/menu/categories/:categorySlug/items/:itemSlug` → item detail.
- **Categories (`menu:write`)**: create/update/delete; `POST /menu/categories/reorder`.
- **Items (`menu:write`)**: create/update/delete; `POST /menu/items/reorder`; `POST /menu/items/:id/availability`.
- **Images (`menu:write`)**: add/remove/reorder under `/menu/items/:id/images`.
- **Modifier groups + options (`menu:write`)**: CRUD under `/menu/modifier-groups` and `/menu/modifier-options`.

### Uploads (`/uploads`)
- `POST /uploads/presign` — `menu:write`. Returns a one-shot presigned R2 PUT URL + canonical download URL. The `r2.orphan-cleanup` job sweeps unreferenced uploads.

### Cart (`/cart`)
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `DELETE /cart` — public (guest via `sessionKey`) or authed.
- `POST /cart/merge` (auth) — merges guest cart into user cart on login.
- `PATCH /cart/loyalty` (auth) — set intended point redemption.
- `POST /cart/coupon` / `DELETE /cart/coupon` — apply/remove coupon (validated server-side).

### Orders (`/orders`)
- `POST /orders` — public, idempotent (`Idempotency-Key` header). Body `CreateOrderSchema`. Audit `order:create`.
- `GET /orders` — list (auth user's own; staff via permission for restaurant scope).
- `GET /orders/:id` — order detail.
- `GET /orders/:id/tracking` — status timeline + ETA.
- `POST /orders/:id/status` — `order:status_update`. Body `UpdateOrderStatusSchema`. State machine enforced (`order-state-machine.ts`).

### Payments (`/payments`)
- `GET /payments/config` (public) — returns Stripe publishable key + currency.
- `POST /payments/intent` (auth optional) — creates Stripe PaymentIntent; for COD short-circuits to instant approval. Idempotent.
- `GET /payments/by-order/:orderId` — fetches payment by order.
- `POST /payments/:paymentId/refunds` — `payment:refund`. Calls provider's refund, writes `Refund` row, enqueues `email.refund`, emits `order.refunded`.
- `POST /payments/webhooks/stripe` — public. Raw body parsed in `main.ts`; signature verified; dedup via `WebhookEvent` table. Handles `payment_intent.succeeded` (→ Payment PAID, Order CONFIRMED, enqueue receipt) and `charge.refunded` (→ Refund REFUNDED).

### Reservations (`/reservations`)
- `GET /reservations/availability` (public) — slot computation.
- `POST /reservations` (public/auth) — books a slot.
- `GET /reservations/me` (auth) — my reservations.
- `GET /reservations`, `GET /reservations/:id`, `PATCH /reservations/:id`, `POST /reservations/:id/cancel`, `POST /reservations/:id/seat`, `POST /reservations/:id/complete`, `POST /reservations/:id/no-show` — staff transitions, `reservation:read` / `reservation:write`.
- `GET /restaurants/:id/tables` (public). Table CRUD under `reservation:write`.

### Reviews (`/reviews`, `/admin/reviews`)
- `POST /reviews` (auth, after order completion).
- `GET /reviews/me` (auth).
- `GET /restaurants/:id/reviews` + `/summary` (public).
- `GET /admin/reviews`, `PATCH /admin/reviews/:id` (visibility), `POST /admin/reviews/:id/reply`, `DELETE /admin/reviews/:id` — `review:moderate`.

### Loyalty (`/loyalty`)
- `GET /loyalty/me`, `GET /loyalty/me/history`, `POST /loyalty/redeem/quote` (auth).

### Promotions (`/promotions`, `/coupons`)
- `GET /promotions`, `GET /promotions/:id` — `promotion:read`.
- `POST/PATCH/DELETE` — `promotion:write`.
- `GET/POST /promotions/:id/coupons`, `DELETE /coupons/:id` — `promotion:write`.
- `POST /coupons/validate` (public) — used by cart.

### Kitchen (`/kitchen`)
- `GET /kitchen/tickets` — `kitchen:read`. Returns active tickets (CONFIRMED + PREPARING) for the requested restaurant.

### Notifications (`/notifications`)
- `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all` (auth).
- `POST /notifications/push-tokens`, `DELETE /notifications/push-tokens/:token` — device registration.
- `GET /notifications/preferences`, `PATCH /notifications/preferences`.

### Favorites (`/favorites`)
- `GET /favorites`, `GET /favorites/ids`, `PUT /favorites/:menuItemId`, `DELETE /favorites/:menuItemId` — auth.

### Referrals (`/referrals`)
- `GET /referrals/me`, `GET /referrals` — auth.

### Staff (`/admin/staff`, `/staff`)
- `GET /admin/staff` — `staff:read`.
- `POST /admin/staff/invite` — `staff:write`. Generates an invite token, enqueues invite email.
- `POST /staff/accept-invite` (public, token-based) — creates the user with the invited role.
- `PATCH /admin/staff/:userId/role`, `POST /admin/staff/:userId/deactivate`, `POST /admin/staff/:userId/reactivate` — `staff:write`.

### Customers (`/admin/customers`)
- `GET /admin/customers`, `GET /admin/customers/:id` — `customer:read`.
- `PATCH /admin/customers/:id/notes` — `customer:notes`.

### Analytics (`/analytics`) — all `analytics:read`
- `/overview`, `/revenue-timeseries`, `/top-items`, `/orders-by-status`, `/customer-retention`, `/payment-methods`, `/sales-by-hour`, `/sales-by-day-of-week`. Backed by `DailyMetric` rollups with Redis caching.

### Reports (`/reports`)
- `POST /reports/exports` — `report:export`. Queues a generation job.
- `GET /reports/exports`, `GET /reports/exports/:id`, `GET /reports/exports/:id/download` — `report:read`. Download streams R2-stored file.

### Audit (`/admin/audit-log`)
- Read-only viewer — `audit:read`.

### Contact (`/contact`, `/admin/contact`)
- `POST /contact` (public) — captures ip + ua, enqueues internal email.
- `GET /admin/contact`, `PATCH /admin/contact/:id` — `contact:read`.

### Settings (`/admin/restaurants/:id/settings`, etc.)
- `GET/PATCH /admin/restaurants/:id/settings` — `settings:read`/`settings:write` (min order, delivery fee, prep time).
- `POST/DELETE /admin/restaurants/:id/holidays/:date` — `settings:write`.
- `GET /admin/restaurants/:id/delivery-zones/check` (public) — used by the customer checkout.

### Feature flags (`/feature-flags`, `/admin/feature-flags`)
- `GET /feature-flags` (public) — resolved values for the caller.
- `GET /admin/feature-flags`, `PATCH /admin/feature-flags/:key` — `flags:write`.

### Marketing + SEO
- `GET /marketing/landing`, `GET /marketing/about` — CMS content for the customer site.
- `GET /seo/structured-data/:slug`, `/sitemap.xml`, `/robots.txt`, `/meta` — SEO endpoints used by the web app.

### I18n
- `GET /i18n/messages?locale={en|ar}` — returns the merged locale catalog (cached 1h on the client).

---

## 8. Real-time (Socket.IO) — rooms and events

Gateway: `apps/api/src/modules/realtime`. Auth: JWT in the WS handshake (`Authorization: Bearer` header or `auth.token`).

### Rooms
- `order:{orderId}` — joined by the customer + any staff watching that specific order.
- `restaurant:{restaurantId}:orders` — the admin live orders board.
- `restaurant:{restaurantId}:kitchen` — the KDS.

### Server → client events
| Event | Rooms | Payload |
|---|---|---|
| `order.created` | `restaurant:{id}:orders` | `OrderCreatedEvent` |
| `order.status_changed` | `order:{id}`, `restaurant:{id}:orders` | `OrderStatusChangedEvent` |
| `order.cancelled` | same | `OrderCancelledEvent` |
| `order.refunded` | same | `OrderRefundedEvent` |
| `kitchen.ticket_added` | `restaurant:{id}:kitchen` | `KitchenTicketEvent` |
| `kitchen.ticket_removed` | `restaurant:{id}:kitchen` | `KitchenTicketEvent` |

### Client → server
- `subscribe { room }` — gateway re-checks permissions (`order:read`, `restaurant:read`, `kitchen:read`) before joining.
- `unsubscribe { room }`.

Internally the API uses `EventEmitter2` and a bridge to the gateway, so services emit a single `order.created` event and the gateway fans out to the right rooms.

---

## 9. Background jobs (BullMQ)

Queues live in `packages/jobs`. Producers enqueue from `apps/api`. Workers run in the same image but can be scaled out separately.

| Queue | Jobs |
|---|---|
| `email` | `email.verification`, `email.password-reset`, `email.receipt`, `email.refund`, `email.order-status`, `email.contact`, `email.referral-invite` |
| `sms` | `sms.otp`, `sms.order-status` |
| `push` | `push.welcome`, `push.order-status`, `push.loyalty`, `push.token-cleanup` |
| `receipt` | `receipt.generate` (PDF, attached to `email.receipt`) |
| `reports` | `reports.generate`, `reports.cleanup` |
| `analytics` | `analytics.rollup-daily`, `analytics.rollup-finalize` |
| `audit` | `audit.write` (driven by `@AuditAction` decorator + `AuditInterceptor`) |
| `r2.orphan-cleanup` | `r2.orphan-sweep` |

Notification matrix (which channels fire on which event):

| Event | Email | SMS | Push | In-app |
|---|---|---|---|---|
| Welcome / verify email | ✅ | — | — | — |
| OTP login | — | ✅ | — | — |
| Order placed | ✅ | — | ✅ | ✅ |
| Order confirmed | — | ✅ | ✅ | ✅ |
| Out for delivery | — | ✅ | ✅ | ✅ |
| Delivered | — | — | ✅ | ✅ |
| Refund issued | ✅ | — | ✅ | ✅ |
| Promo / loyalty digest | ✅ | — | ✅ (opt-in) | ✅ |

---

## 10. Customer Web app — every page

Web app at `apps/web`. Auth state in `useAuthStore` (Zustand); cart in `useCartStore`. All data via `getApiClient()` (a singleton wrapper around `@repo/api-client`). Real-time via `getRealtimeClient()`. The middleware protects `/account/*` paths. Most pages are currently **TODO stubs**; the hooks, stores, and API wiring are complete.

### `(auth)` route group — public
- `/login` — `auth.login()` → stores access token in Zustand + sends refresh token to `/api/auth/set-session` to set the httpOnly cookie. Toast on success.
- `/register` — `auth.register()`; same session flow as login.
- `/verify-email` — `auth.verifyEmail({ token })`; invalidates `auth/me`.
- `/forgot-password` — `auth.forgotPassword({ email })`.
- `/reset-password` — `auth.resetPassword({ token, password })`; redirects to `/login`.

### `(marketing)` route group — public
- `/about` — `GET /marketing/about`.
- `/contact` — form posts `POST /contact`; backend enqueues `email.contact`.
- `/locations` — `GET /restaurants` + `GET /restaurants/:id/hours`.
- `/reservations` — uses `GET /reservations/availability` + `POST /reservations`.

### Menu — public
- `/menu` — `useMenuTree(restaurantId)` → `GET /restaurants/:id/menu` (5-min stale).
- `/menu/[category]` — filters tree.
- `/menu/[category]/[slug]` — `useMenuItem(...)` → item detail endpoint; "Add to cart" mutates `POST /cart/items` with `AddCartItemSchema`.

### `(shop)` route group — guest or authed
- `/cart` — `useCart(restaurantId)`; mutations: add/update/remove items, apply/remove coupon, set loyalty intent. All optimistically reflected in `useCartStore`.
- `/checkout` — multi-step:
  1. Load cart, addresses (`useAddresses` if logged in), and `usePaymentConfig()`.
  2. Pick type/address/payment.
  3. `useCreatePaymentIntent()` → backend creates intent, returns `clientSecret`.
  4. `useCreateOrder()` → `POST /orders` with `Idempotency-Key` header (regenerated after success).
  5. Frontend confirms with Stripe SDK; the webhook flips the order to CONFIRMED.
- `/checkout/success` — shows order number + tracking link. Subscribes to `order:{id}` immediately.

### `(account)` route group — auth-only
- `/account/orders` — `useOrders()` → `GET /orders`.
- `/account/orders/[id]` — `useOrder()` + `useOrderTracking()` → connects to `order:{id}`, applies `order.status_changed` patches to the cache.
- `/account/profile` — `useMe`, `useUpdateProfile`, `useChangePassword`.
- `/account/addresses` — full CRUD + default toggle.
- `/account/favorites` — `useFavorites`, `useFavoriteIds`, add/remove.
- `/account/loyalty` — `useLoyaltyMe`, `useLoyaltyHistory`, `useLoyaltyRedeemQuote`.
- `/account/referrals` — `useReferralMe`, `useReferralList`.
- `/account/notifications` — feed + preferences.
- `/account/reviews` — `useMyReviews`, `useCreateReview`.
- `/account/reservations` — `useMyReservations`, cancel/update.

### Standalone
- `/staff/accept-invite?token=...` — `POST /staff/accept-invite`. Creates the staff account from the invite token + chosen password.

### Auth + real-time bootstrap
`AppProviders` calls `GET /auth/me` on mount. When `user` becomes non-null it calls `getRealtimeClient().connect()`. On logout it disconnects and clears the session (clears Zustand + `POST /api/auth/clear-session`). The api client refreshes 401s automatically via `/api/auth/get-refresh-token` → `POST /auth/refresh`.

### i18n
`useLocale()` reads/writes a `locale` cookie (1 y). `useMessages(locale)` calls `GET /i18n/messages` (1 h stale). `getDir('ar')` returns `'rtl'`.

---

## 11. Admin app — every page

Admin at `apps/admin`. Middleware guards every `/(dashboard)/*` route by requiring a `refresh_token` cookie and redirects unauthenticated users to `/login?redirect=...`. Same Zustand auth store, same `getApiClient()`, same realtime client as web.

### `(auth)`
- `/login` — same email/password flow; admin login may additionally walk through OTP (`useVerifyOtp`) for 2FA-required roles (owner/manager) when 2FA is turned on (wired in the plan).
- `/register`, `/forgot-password`, `/reset-password`, `/verify-email` — same as web.

### `(dashboard)` — sidebar + topbar layout
Each page is permission-gated via `useAuthStore().hasPermission(...)`. Backend re-checks always.

| Route | Permissions | API calls | Real-time | Key UI |
|---|---|---|---|---|
| `/` (overview) | `analytics:read`, `order:read` | `/analytics/overview`, `/analytics/revenue-timeseries`, `/analytics/top-items`, `/analytics/orders-by-status`, `/orders?limit=10` | — | Recharts KPI cards, revenue line, recent orders table |
| `/orders` | `order:read` | `GET /orders` with filters; cursor pagination | `restaurant:{id}:orders` for `order.created` + `order.status_changed` (chime + new-row highlight) | TanStack Table + filter chips |
| `/orders/[id]` | `order:read` (+ `order:status_update`, `payment:refund` for actions) | `GET /orders/:id`, `GET /orders/:id/tracking`, `GET /payments/by-order/:id`, `POST /orders/:id/status`, `POST /payments/:id/refunds` | `order:{id}` | Order detail drawer, status drop-down, refund flow |
| `/orders/kitchen` (KDS) | `kitchen:read`, `order:status_update` | `GET /kitchen/tickets`, `POST /orders/:id/status` | `restaurant:{id}:kitchen` (`kitchen.ticket_added`/`_removed`) | Full-screen grid, tap to advance |
| `/menu/categories` | `menu:write` | `useMenuTree`, create/update/delete/reorder under `/menu/categories` | — | Drag-reorder list |
| `/menu/items` | `menu:write` | Items CRUD + availability + reorder | — | TanStack Table + bulk actions |
| `/menu/items/[id]` | `menu:write` | item edit, image presign + add/remove/reorder, modifier groups + options CRUD | — | Drawer-style editor |
| `/customers` | `customer:read` | `GET /admin/customers` | — | Table + segments |
| `/customers/[id]` | `customer:read`, `customer:notes` | `GET /admin/customers/:id`, `PATCH /admin/customers/:id/notes` | — | Profile + order history + staff notes |
| `/promotions` | `promotion:read`/`promotion:write` | `/promotions` CRUD | — | Table + drawer |
| `/promotions/[id]` | `promotion:write` | promotion edit + `GET/POST /promotions/:id/coupons`, `DELETE /coupons/:id`, `POST /coupons/validate` | — | Coupons sub-table |
| `/reservations` | `reservation:read`/`reservation:write` | `GET /reservations`, transitions (`/seat`, `/complete`, `/no-show`, `/cancel`) | — | Calendar + table view |
| `/reservations/[id]` | `reservation:write` | reservation detail + `GET /restaurants/:id/tables` | — | Transitions + table assignment |
| `/reviews` | `review:read`/`review:moderate` | `GET /admin/reviews`, `PATCH /admin/reviews/:id`, `POST /admin/reviews/:id/reply`, `DELETE /admin/reviews/:id` | — | Moderation table |
| `/staff` | `staff:read`/`staff:write` | `GET /admin/staff`, invite/role/deactivate/reactivate | — | Staff table + invite modal |
| `/locations` | `restaurant:read` | `GET /restaurants` | — | List |
| `/locations/[id]` | `restaurant:write`, `settings:write` | `PATCH /restaurants/:id`, `PUT /restaurants/:id/hours` | — | Info + hours editor |
| `/settings` | gates | hub for sub-pages | — | Tabs |
| `/settings/hours` | `settings:write` | `GET/PUT /restaurants/:id/hours` | — | Per-day open/close |
| `/settings/holidays` | `settings:write` | `POST/DELETE /admin/restaurants/:id/holidays` | — | Date list |
| `/settings/delivery-zones` | `settings:write` | `PATCH /admin/restaurants/:id/settings` + `GET /admin/restaurants/:id/delivery-zones/check` | — | Map + zone editor + checker |
| `/reports` | `reports:read` | hub | — | Tabs |
| `/reports/exports` | `report:export`, `report:read` | `POST /reports/exports`, `GET /reports/exports`, `GET /reports/exports/:id`, `GET /reports/exports/:id/download` | — | Queue table with status polling |
| `/audit-log` | `audit:read` | `GET /admin/audit-log` | — | Read-only viewer |
| `/contact` | `contact:read` | `GET /admin/contact`, `PATCH /admin/contact/:id` | — | Inbox |

### Mutation pattern
Every mutation uses `useMutation` + `qc.invalidateQueries(...)` on success and `notify(level, message)` for the toast.

---

## 12. Mobile app — every screen

Expo app at `apps/mobile`. File-based routing via `expo-router`. Auth token in `expo-secure-store`; cart snapshot also persisted there for offline display. Stripe React Native SDK is installed; provider wiring deferred to UI sprint. Same hooks pattern as web/admin.

### Layouts
- `app/index.tsx` — redirects to `/(tabs)`.
- `app/(tabs)/_layout.tsx` — auth-guarded tab bar (Home, Menu, Cart, Orders, Profile).
- `app/(auth)/_layout.tsx` — public stack.

### `(auth)` — public
- `/login`, `/register`, `/forgot-password`, `/verify-otp`, `/reset-password` — same API calls as web.

### `(tabs)` — auth-required
- `/(tabs)` (home placeholder).
- `/(tabs)/cart` — `useCart`, add/update/remove/coupon/loyalty.
- `/(tabs)/orders` — `useOrders()`.

### Menu / item / checkout / order tracking
- `/menu` — `useMenuTree`.
- `/item/[id]` — modifier sheet, add to cart.
- `/checkout` — `useAddresses`, `usePaymentConfig`, `useCreatePaymentIntent`, `useCreateOrder` (with idempotency).
- `/checkout/success` — confirmation.
- `/orders/[id]` — `useOrderTracking` subscribes to `order:{id}`, applies `order.status_changed`.

### Account
- `/account/profile`, `/account/addresses`, `/account/favorites`, `/account/notifications`, `/account/loyalty`, `/account/referrals`.

### Reservations + reviews
- `/reservations/index`, `/reservations/new` — availability + create.
- `/reviews/new` — create review.

### Native concerns
- **Push tokens**: `useRegisterPushToken()` hook ready; will be called after login with the device token from `expo-notifications`. Backend stores in `PushToken` and dispatches via the `push` queue.
- **Deep links**: scheme `restaurant://`. `restaurant://orders/123` maps via expo-router to `/orders/[id]`. Used by push notification taps.
- **Offline cart**: `useCartStore.hydrate()` reads `cart.snapshot` from SecureStore on app open so the cart renders instantly; `useCartSync()` refetches once online; guest cart `sessionKey` (UUID) is also persisted in SecureStore.
- **Stripe**: `usePaymentConfig()` returns the publishable key; payment sheet wires up in `<StripeProvider>` once the UI sprint adds it.

---

## 13. End-to-end pipelines (the full story)

This is the most important section if you only have a few minutes. Each pipeline walks the request from a frontend click through every backend side-effect.

### A. Customer registers and verifies email
1. Web `/register` → `auth.register(input)`.
2. **API**: `AuthService.register()`
   - Checks email uniqueness (409 if exists).
   - `hashPassword` (bcrypt 12) via `@repo/auth-core`.
   - DB transaction: insert `User`, attach `customer` role via `UserRole`.
   - If `referralCode` was passed: `ReferralsService.attachReferralOnSignup()`.
   - Captures PostHog event `signup` via `@repo/analytics`.
   - Generates a 24h email-verification token, stores hash in Redis, enqueues `email.verification` to the `email` queue.
   - Signs access JWT (15 m) + refresh JWT (30 d, jti hashed into `RefreshToken.tokenHash`).
   - Returns `AuthResponseDto`.
3. **Web**: stores access token in `useAuthStore`, ships refresh token to `/api/auth/set-session` (httpOnly cookie), navigates to home. Toast: "Account created — check your email to verify."
4. **Worker (`email` queue)**: handles `email.verification` → renders the template, calls Resend API, marks the job complete. Failures are retried by BullMQ.
5. User clicks the email link → web `/verify-email?token=...` → `auth.verifyEmail({ token })` → API consumes the one-shot Redis token, sets `User.emailVerifiedAt`.

### B. Customer places a delivery order with Stripe (the showcase pipeline)
1. **Cart build-up**: every `POST /cart/items` validates the menu item is still available, recomputes the unit price, and snapshots the modifier selection (so receipts are immutable). The cart row is keyed on `(userId, restaurantId)` or `(sessionKey, restaurantId)`.
2. **Apply coupon (optional)**: `POST /cart/coupon` calls `PromotionsService.validate()` against `Coupon` + `Promotion` rules (min subtotal, per-user limit, validity window). On success, the coupon id is stored on the cart and totals recompute.
3. **Set loyalty intent (optional)**: `PATCH /cart/loyalty` checks the user's `LoyaltyAccount.balance` and records intended redemption on the cart (no points moved yet).
4. **Create payment intent**: `POST /payments/intent { orderId?, methodKind }`.
   - Service picks provider: STRIPE_CARD / APPLE_PAY / GOOGLE_PAY / P24 / BLIK → `StripeProvider`; CASH → `CodProvider`.
   - Calls `stripe.paymentIntents.create({ amount, currency, ... metadata })` → returns `clientSecret`.
   - Upserts a `Payment` row (status PENDING, providerRef = intent id).
5. **Create order**: `POST /orders` with `Idempotency-Key` header.
   - Idempotency: Redis lookup `(userId|sessionKey, key) → orderId`. If hit, return cached order.
   - Loads cart, re-fetches menu items, recomputes everything server-side (**never trust client prices**).
   - Validates coupon and loyalty redemption against current rules.
   - `PricingService.compute()` → subtotal, tax, delivery fee, tip, discount, grand total — all `Decimal`.
   - **DB transaction**: insert `Order` (status PENDING) + `OrderItem[]` with `nameSnapshot` and `modifierSnapshot` JSON + `OrderStatusEvent` (initial) + claim coupon redemption + clear cart items.
   - Emits `order.created` via `EventEmitter2`. The `RealtimeGateway` broadcasts to `restaurant:{id}:orders`.
   - Enqueues `receipt.generate` to the `receipt` queue.
   - `@AuditAction('order:create', 'order')` causes the `AuditInterceptor` to enqueue `audit.write` after the response is sent.
   - Captures `order_placed` PostHog event.
   - Caches `(idempotencyKey → orderId)` in Redis.
   - Returns `OrderDto`.
6. **Client confirms with Stripe SDK** using the `clientSecret`.
7. **Stripe webhook** hits `POST /api/v1/payments/webhooks/stripe`.
   - `main.ts` captured the raw body for this route only; signature verified with `stripe.webhooks.constructEvent`.
   - Looks up the `WebhookEvent` table for the event id — if seen, return `{ received: true }` (idempotent).
   - On `payment_intent.succeeded`:
     - Updates `Payment.status = PAID`.
     - Transitions `Order` to CONFIRMED via the state machine; writes `OrderStatusEvent`.
     - Emits `order.status_changed` (rooms: `order:{id}`, `restaurant:{id}:orders`) and `kitchen.ticket_added` (room: `restaurant:{id}:kitchen`).
     - Awards loyalty points (`loyalty.earn`) — `LoyaltyAccount.points += earned`, writes `LoyaltyTransaction`.
     - If the user had a referral pending and this is their first paid order, marks the `Referral` as completed and emits `referral_completed`.
     - Enqueues `email.receipt`, `push.order-status`, `sms.order-status` (per `NotificationPreference`).
8. **Workers fan out**:
   - `receipt.generate` worker → renders PDF, uploads to R2, then enqueues `email.receipt` with `pdfBase64`.
   - `email.receipt` → Resend.
   - `sms.order-status` → Twilio.
   - `push.order-status` → loops through the user's `PushToken[]`, calls Expo / FCM, falls back to `push.token-cleanup` for failures.
   - Each worker writes an in-app `Notification` row so the bell badge updates.
9. **Customer** sees the status live on `/account/orders/[id]` (web) or `/orders/[id]` (mobile) via the `order:{id}` room.
10. **Admin** sees the new order on `/orders` (live list) and on the KDS at `/orders/kitchen`.
11. **Kitchen** taps "Mark preparing" → `POST /orders/:id/status { to: PREPARING }` → state machine validates the transition for the actor's role → emits `order.status_changed` → enqueues another `push.order-status`/`sms.order-status` (per matrix). When status reaches READY, `kitchen.ticket_removed` fires and the KDS card disappears.
12. Final `DELIVERED` transition triggers loyalty finalization (if not already credited) and the review prompt on the customer side.

### C. Owner issues a refund
1. Admin `/orders/[id]` → "Refund" → `POST /payments/:paymentId/refunds { amount, reason }`.
2. **API** `PaymentsService.refund()`:
   - Validates the payment is PAID and amount ≤ remaining.
   - Calls `StripeProvider.refund()` (or COD no-op).
   - Inserts `Refund`; updates `Payment.status` to `PARTIALLY_REFUNDED` or `REFUNDED`.
   - Emits `order.refunded` (`order:{id}` + `restaurant:{id}:orders`).
   - Enqueues `email.refund`.
   - Captures `@AuditAction('order:refund', 'payment')` → `audit.write` job.
   - If loyalty points were earned on this order, enqueues a `loyalty.revoke_earned_points` task (revoking the corresponding `LoyaltyTransaction`).
3. Customer gets the email and the in-app notification; the admin row reflects the new status immediately via the socket event.

### D. Customer phone OTP login
1. Mobile `/login` → toggles to OTP → `POST /auth/request-otp { phone }`.
2. **API**: generates a 6-digit code, hashes it (SHA-256), stores it in Redis at `otp:phone:{phone}` with 5-min TTL, enqueues `sms.otp { phone, code, expiresInSeconds }`.
3. **Worker (`sms` queue)** sends the SMS via Twilio.
4. User enters the code → `POST /auth/verify-otp { phone, code }`.
5. API constant-time compares the hash, deletes the Redis entry, upserts a `User` keyed on phone (synthetic email `phone+{digits}@phone.local`), sets `phoneVerifiedAt`, issues tokens.

### E. Staff invite flow
1. Owner clicks "Invite Staff" → `POST /admin/staff/invite { email, role, restaurantId }`.
2. API creates a `StaffInvite` row with a token, enqueues an invitation email.
3. New staff opens the link `/staff/accept-invite?token=...`, sets a password.
4. `POST /staff/accept-invite { token, password, firstName, lastName }` → API consumes the token, creates the `User`, attaches the invited `Role`, issues tokens. The session works just like a normal login.

### F. Customer leaves a review
1. After `DELIVERED`, the order detail screen surfaces "Rate this order".
2. `POST /reviews { restaurantId, rating, title, comment }` (auth required, must own the order).
3. Review is created with `isVisible = true` by default. Admin moderation may later flip `isVisible` via `PATCH /admin/reviews/:id` and/or post an owner reply via `POST /admin/reviews/:id/reply`.

### G. Audit trail (the "who did what" pipeline)
Every sensitive endpoint carries `@AuditAction(action, resourceType, idFrom?)`. The global `AuditInterceptor` reads response, extracts `id` (default) or a custom field, and enqueues an `audit.write` job with `actorUserId`, `restaurantId`, `action`, `resourceType`, `resourceId`, `afterJson`, `ip`, `userAgent`. The worker writes an `AuditLog` row. Owners view it at `/audit-log`.

### H. Reports export
1. Admin `/reports/exports` → "New export" → `POST /reports/exports { type, dateFrom, dateTo, restaurantId? }`.
2. API creates an `Export` row with status PENDING; enqueues `reports.generate`.
3. Worker queries the data, generates CSV/XLSX, uploads to R2, sets status COMPLETED and writes the download URL.
4. Frontend polls `GET /reports/exports/:id` until COMPLETED; user clicks Download → backend issues a signed R2 URL → file streams.

### I. Idempotency, generally
- `POST /orders` requires `Idempotency-Key` (UUID). Cached at `(userId|sessionKey, key) → orderId`.
- Stripe webhooks are deduplicated via the `WebhookEvent` table by event id.
- All workers retry on failure with exponential backoff (BullMQ default) and dead-letter on max attempts.

---

## 14. Shared packages reference

| Package | Purpose | Key exports |
|---|---|---|
| `@repo/db` | Prisma client + 43 models + seed | `PrismaClient`, enums, `seed.ts` (33 permission keys, 5 roles, demo restaurant + menu) |
| `@repo/types` | Zod schemas + inferred types for every DTO/event | `RegisterSchema`, `CreateOrderSchema`, `OrderStatus`, `PaymentStatus`, `PERMISSION_KEYS`, `ROLE_PERMISSIONS`, `ROOMS`, …|
| `@repo/api-client` | Typed HTTP client (all frontends) | `createApiClient({ baseUrl, getAccessToken, refreshAccessToken, onUnauthorized })` |
| `@repo/auth-core` | JWT + bcrypt + OTP | `signAccess/RefreshToken`, `verify*`, `hashPassword`, `verifyPassword`, `generateOtp`, `hashToken` |
| `@repo/jobs` | BullMQ queue names + job payload schemas | `QUEUE_EMAIL`, `JOB_EMAIL_RECEIPT`, `*Payload` schemas |
| `@repo/i18n` | EN + AR catalogs, formatters, RTL helper | `getDir(locale)`, `negotiate`, `translator`, `format` |
| `@repo/utils` | Pure helpers | `money`, `slugify`, `phone`, `assert`, `deepLink`, `structuredData`, `sitemap`, `loyalty` |
| `@repo/config-runtime` | Env validation | `createEnv(schema)` |
| `@repo/realtime-client` | Socket.IO wrapper | `createRealtimeClient({ url, getAccessToken })`, `ROOMS`, `RealtimeEventMap` |
| `@repo/analytics` | PostHog backend client | `createAnalytics({ apiKey, host })`, typed events |
| `@repo/observability` | Sentry wrapper | `initNodeSentry`, `captureException`, `flushSentry` |
| `@repo/feature-flags` | Flag catalog | `FLAG_CATALOG` (`loyalty.redemption`, `referral.program`, `marketing.new_landing`, `mobile.push_v2`, `soft_launch`) |
| `@repo/ui` | shadcn web components | placeholder — populated in UI sprint |
| `@repo/ui-mobile` | NativeWind components | placeholder — populated in UI sprint |

---

## 15. Local development & deployment

### Local
```
docker compose up -d        # postgres, redis, mailhog
pnpm install
pnpm --filter @repo/db migrate:dev
pnpm --filter @repo/db seed
pnpm dev                    # turbo runs all apps
stripe listen --forward-to localhost:4000/api/v1/payments/webhooks/stripe
```

Env vars validated by `packages/config-runtime`; see `.env.example` for the full list (database, redis, JWT secrets, Stripe, Resend, Twilio, R2, Sentry, PostHog, app URLs, deep link scheme).

### Hosting (planned)
- **API + workers** on Fly.io or Railway (Docker, autoscaling).
- **Postgres** managed (Neon / Supabase / Railway).
- **Redis** Upstash or Railway.
- **R2** Cloudflare for images and report exports.
- **Web + Admin** Vercel (separate projects for blast-radius isolation).
- **Mobile** EAS Build → TestFlight + Play Internal → production.
- **Observability**: Sentry (all apps), PostHog (product analytics + session replay on web), BetterStack uptime, k6 load tests in `load/`.

---

## 16. Sprint status & what's next

From `docs/restaurant-app-project-plan.md` and `.claude/plans/*`. The latest commit landed sprints 0–5, 7–8, and a pre-sprint-6 hardening pass.

- **Sprint 0** ✅ — Turborepo, scaffolds, Docker compose, CI, design assets folder.
- **Sprint 1** ✅ — Auth + users + addresses (backend + hooks + stores + route stubs).
- **Sprint 2** ✅ — Restaurant + menu (categories, items, modifiers, presigned uploads).
- **Sprint 3** ✅ — Cart + checkout API; coupon validation.
- **Sprint 4** ✅ — Stripe + COD; refunds; receipt PDFs (the Apple/Google Pay mobile wiring lands in sprint 9).
- **Sprint 5** ✅ — Order state machine; Socket.IO rooms/events; email/SMS/push processors.
- **Pre-Sprint-6 hardening** ✅ — Audit interceptor, idempotency, webhook dedupe, Sentry, PostHog.
- **Sprint 6** ⏳ — Admin KPI overview + live orders + KDS UI (hooks ready, pages are stubs).
- **Sprint 7** ✅ — Customers, promotions, reservations, reviews, staff, settings (APIs done; admin pages are stubs).
- **Sprint 8** ✅ — Reports, analytics rollups, audit log viewer (APIs done; admin pages are stubs).
- **Sprint 9** ⏳ — Mobile polish + push notifications (registration hook ready; UI deferred).
- **Sprint 10** ⏳ — Marketing pages + SEO (endpoints exist; web pages are stubs).
- **Sprint 11** ⏳ — Full EN/AR translations, RTL audit, loyalty + referrals UI polish.
- **Sprint 12** ⏳ — Soft launch hardening (load tests scaffolded in `load/`, runbooks in `docs/runbooks/`, security checklist in `docs/security/`).

### Practical handoff notes
- **Backend is the real source of truth** for what works today. The frontends are skeletons: routes exist, hooks exist, stores exist, but each `page.tsx` is `() => null` with a TODO comment. The UI sprints (and the `design-assets/` folder) are where the actual visual implementation will happen.
- **Never trust the client**: prices, coupon validity, and loyalty redemption are always recomputed server-side at checkout.
- **Side effects belong in queues**, not request handlers. If you need to send an email/SMS/push, enqueue from the service and let the worker handle it.
- **Money is `Decimal`**, never `number`. Use `packages/utils/money.ts`.
- **Add a new permission**: seed it in `packages/db/seed.ts`, update `ROLE_PERMISSIONS` in `packages/types/src/permissions.ts`, then `@Permissions('your:new-key')` on the controller.
- **Plan first**: per `CLAUDE.md`, any non-trivial change goes to `.claude/plans/<task-slug>.md` for approval before implementation.
