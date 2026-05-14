# Restaurant Ordering Platform — Complete Project Plan

> Stack: Turborepo · Next.js · NestJS · PostgreSQL · Prisma · Redis · BullMQ · React Native (Expo) · Tailwind · shadcn/ui · Zod · React Hook Form · TanStack Query · Socket.IO · Stripe

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack Decisions](#2-tech-stack-decisions)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Database Schema (Prisma)](#4-database-schema-prisma)
5. [Backend Architecture (NestJS)](#5-backend-architecture-nestjs)
6. [Web Architecture (Next.js)](#6-web-architecture-nextjs)
7. [Mobile Architecture (Expo)](#7-mobile-architecture-expo)
8. [Feature Specification](#8-feature-specification)
9. [Real-time, Jobs & Notifications](#9-real-time-jobs--notifications)
10. [Auth & RBAC](#10-auth--rbac)
11. [Payments](#11-payments)
12. [Sprint Plan (24 weeks)](#12-sprint-plan-24-weeks)
13. [Design Asset Workflow (Google Stitch → Claude Code)](#13-design-asset-workflow-google-stitch--claude-code)
14. [CLAUDE.md Template](#14-claudemd-template)
15. [Environment & Deployment](#15-environment--deployment)

---

## 1. Executive Summary

A full-stack restaurant ordering platform built around four shippable surfaces sharing one backend and a common type/UI foundation:

| Surface | Stack | Audience | Scope |
|---|---|---|---|
| **Customer Web** | Next.js 15 (App Router) | End users | Marketing pages + ordering + account |
| **Admin Dashboard** | Next.js 15 (App Router) | Staff / owner | Operations, KPIs, menu, orders, customers |
| **Customer Mobile** | Expo (RN) | End users | Native ordering experience |
| **API** | NestJS 11 | All clients | REST + WebSocket + jobs |

Goals:
- Industry-standard ordering UX matching Toast / Sweetgreen / Square Online quality
- Real-time order status across web, mobile, kitchen, and admin
- Multi-location ready (single restaurant launchable, chain expansion later)
- i18n built-in (EN + AR with RTL) so the same codebase ships to Gulf clients
- Hard separation: customer apps never share a route or bundle with admin

---

## 2. Tech Stack Decisions

### Backend
- **NestJS 11** with Fastify adapter
- **PostgreSQL 16** via **Prisma 6**
- **Redis 7** for cache, sessions blacklist, rate limiting, BullMQ
- **BullMQ** for jobs (emails, SMS, push, payment reconciliation, analytics rollups)
- **Socket.IO** Gateway for real-time order updates
- **Stripe** primary, **Paymob** optional adapter for MENA, **Cash on Delivery** native
- **Resend** for transactional email
- **Twilio** for SMS / WhatsApp OTP
- **Cloudflare R2** (S3-compatible) for image storage with image optimization via Next.js / Expo Image
- **Zod** for env, DTOs, and request/response validation (shared with frontend)

### Frontend (Web)
- **Next.js 15** App Router, RSC where it makes sense, Server Actions for mutations on marketing/account pages
- **shadcn/ui** + **Tailwind v4** + **Radix primitives**
- **TanStack Query v5** for client data
- **React Hook Form** + **@hookform/resolvers/zod**
- **Zustand** for cart and ephemeral UI state
- **next-intl** for i18n + RTL switching
- **Recharts** + **Tremor** for admin charts
- **TanStack Table** for admin data tables

### Mobile
- **Expo SDK 52+** with EAS Build
- **expo-router** (file-based routing matches the web mental model)
- **NativeWind** (Tailwind for RN) — keeps tokens consistent with web
- **TanStack Query** (same client setup pattern as web)
- **React Hook Form** + Zod
- **Zustand** for cart
- **expo-notifications** for push
- **Stripe React Native SDK**

### Tooling
- **Turborepo** with remote caching
- **pnpm** workspaces
- **Biome** for lint+format (faster than ESLint+Prettier for a monorepo this size; ESLint kept only for Next-specific rules)
- **TypeScript 5.6+** strict, project references
- **GitHub Actions** for CI, Docker for backend, Vercel for web/admin, EAS for mobile

---

## 3. Monorepo Structure

```
restaurant-app/
├── apps/
│   ├── api/                    # NestJS backend
│   ├── web/                    # Customer-facing Next.js (marketing + ordering)
│   ├── admin/                  # Admin dashboard Next.js
│   └── mobile/                 # Expo app (customer only)
│
├── packages/
│   ├── db/                     # Prisma schema, migrations, seed scripts, generated client
│   ├── types/                  # Shared TS types + Zod schemas (DTOs, enums, errors)
│   ├── api-client/             # Typed HTTP client (generated from OpenAPI or hand-rolled)
│   ├── ui/                     # Shared shadcn components used by web + admin
│   ├── ui-mobile/              # NativeWind components for mobile
│   ├── auth-core/              # JWT + refresh helpers, RBAC permission map
│   ├── jobs/                   # BullMQ queue + processor types (consumed by api, dashboards)
│   ├── i18n/                   # Translation JSONs (en, ar) + helpers
│   ├── utils/                  # Pure helpers: money, dates, slugify, phone, address
│   └── config-runtime/         # Env loaders (Zod-validated) per app
│
├── tooling/
│   ├── eslint-config/
│   ├── biome-config/
│   ├── tailwind-config/        # Shared Tailwind preset (tokens, colors, fonts)
│   └── tsconfig/               # base.json, nextjs.json, react-native.json, nestjs.json
│
├── design-assets/              # Google Stitch exports live here (see §13)
│   ├── web/
│   ├── admin/
│   └── mobile/
│
├── docs/                       # Architecture decisions, runbooks
├── docker-compose.yml          # postgres, redis, mailhog for local dev
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md                   # Workflow rules for Claude Code (see §14)
```

### Why this split

- `ui/` vs `ui-mobile/`: Tailwind classes don't translate to RN. Tokens are shared via `tooling/tailwind-config`, but components are duplicated by design — this is the only honest way to ship native quality.
- `types/` is the contract layer. Every DTO is a Zod schema; types are inferred. The API validates requests with the same schema the frontend uses to validate forms — no drift, ever.
- `api-client/` wraps fetch with typed routes. Consumed identically from web, admin, and mobile.
- `jobs/` exports queue names + payload types. The `api` app produces and consumes; admin/web only produce (e.g., resend-email button).

---

## 4. Database Schema (Prisma)

Key models — full schema lives in `packages/db/prisma/schema.prisma`. RBAC is permission-based, not role-based, so new roles can be composed in seed data.

```prisma
// Identity & access
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  phone           String?   @unique
  passwordHash    String?
  emailVerifiedAt DateTime?
  phoneVerifiedAt DateTime?
  firstName       String?
  lastName        String?
  avatarUrl       String?
  locale          String    @default("en")
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  roles           UserRole[]
  addresses       UserAddress[]
  paymentMethods  PaymentMethod[]
  carts           Cart[]
  orders          Order[]
  reviews         Review[]
  reservations    Reservation[]
  loyaltyAccount  LoyaltyAccount?
  refreshTokens   RefreshToken[]
  pushTokens      PushToken[]
  notifications   Notification[]
}

model Role {
  id          String   @id @default(cuid())
  key         String   @unique         // owner, manager, kitchen, cashier, customer
  name        String
  permissions RolePermission[]
  users       UserRole[]
}

model Permission {
  id    String @id @default(cuid())
  key   String @unique               // order:read, order:update, menu:write, etc.
  roles RolePermission[]
}

model UserRole       { userId String; roleId String; @@id([userId, roleId]); user User @relation(fields:[userId], references:[id]); role Role @relation(fields:[roleId], references:[id]) }
model RolePermission { roleId String; permissionId String; @@id([roleId, permissionId]); role Role @relation(fields:[roleId], references:[id]); permission Permission @relation(fields:[permissionId], references:[id]) }

// Restaurant (multi-location ready)
model Restaurant {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  description  String?
  logoUrl      String?
  coverUrl     String?
  phone        String
  email        String
  address      Json
  geoPoint     Json?                  // { lat, lng }
  timezone     String   @default("UTC")
  currency     String   @default("USD")
  isActive     Boolean  @default(true)
  hours        OperatingHours[]
  menus        MenuCategory[]
  orders       Order[]
  reservations Reservation[]
  tables       Table[]
  promotions   Promotion[]
}

model OperatingHours {
  id           String   @id @default(cuid())
  restaurantId String
  dayOfWeek    Int                    // 0-6
  opensAt      String                 // "09:00"
  closesAt     String                 // "23:00"
  isClosed     Boolean  @default(false)
  restaurant   Restaurant @relation(fields:[restaurantId], references:[id], onDelete: Cascade)
}

// Menu
model MenuCategory {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  slug         String
  description  String?
  imageUrl     String?
  position     Int      @default(0)
  isActive     Boolean  @default(true)
  items        MenuItem[]
  restaurant   Restaurant @relation(fields:[restaurantId], references:[id], onDelete: Cascade)

  @@unique([restaurantId, slug])
}

model MenuItem {
  id            String   @id @default(cuid())
  categoryId    String
  name          String
  slug          String
  description   String?
  basePrice     Decimal  @db.Decimal(10,2)
  compareAt     Decimal? @db.Decimal(10,2)
  calories      Int?
  prepMinutes   Int?
  isAvailable   Boolean  @default(true)
  isFeatured    Boolean  @default(false)
  isVegetarian  Boolean  @default(false)
  isVegan       Boolean  @default(false)
  isGlutenFree  Boolean  @default(false)
  spiceLevel    Int      @default(0)   // 0-3
  position      Int      @default(0)
  images        MenuItemImage[]
  modifierGroups MenuItemModifierGroup[]
  category      MenuCategory @relation(fields:[categoryId], references:[id], onDelete: Cascade)

  @@unique([categoryId, slug])
}

model MenuItemImage { id String @id @default(cuid()); itemId String; url String; alt String?; position Int @default(0); item MenuItem @relation(fields:[itemId], references:[id], onDelete: Cascade) }

model MenuItemModifierGroup {
  id          String   @id @default(cuid())
  itemId      String
  name        String                   // "Size", "Add-ons", "Spice level"
  isRequired  Boolean  @default(false)
  minSelect   Int      @default(0)
  maxSelect   Int      @default(1)
  options     MenuItemModifierOption[]
  item        MenuItem @relation(fields:[itemId], references:[id], onDelete: Cascade)
}

model MenuItemModifierOption {
  id        String  @id @default(cuid())
  groupId   String
  name      String
  priceDelta Decimal @db.Decimal(10,2) @default(0)
  isDefault Boolean @default(false)
  group     MenuItemModifierGroup @relation(fields:[groupId], references:[id], onDelete: Cascade)
}

// Cart & Order
model Cart {
  id            String   @id @default(cuid())
  userId        String?                  // null = guest cart
  restaurantId  String
  sessionKey    String?  @unique         // for guest carts
  items         CartItem[]
  appliedCoupon String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User? @relation(fields:[userId], references:[id])
}

model CartItem {
  id              String  @id @default(cuid())
  cartId          String
  menuItemId      String
  quantity        Int     @default(1)
  unitPrice       Decimal @db.Decimal(10,2)
  modifierSnapshot Json                  // [{ groupId, optionIds, priceDelta }]
  notes           String?
  cart            Cart @relation(fields:[cartId], references:[id], onDelete: Cascade)
}

enum OrderType { DELIVERY PICKUP DINE_IN }
enum OrderStatus { PENDING CONFIRMED PREPARING READY OUT_FOR_DELIVERY DELIVERED COMPLETED CANCELLED REFUNDED }
enum PaymentStatus { PENDING AUTHORIZED PAID FAILED REFUNDED PARTIALLY_REFUNDED }
enum PaymentMethodKind { STRIPE_CARD APPLE_PAY GOOGLE_PAY PAYMOB COD WALLET }

model Order {
  id            String   @id @default(cuid())
  orderNumber   String   @unique         // human-friendly: R-2026-000123
  userId        String?
  restaurantId  String
  type          OrderType
  status        OrderStatus @default(PENDING)
  items         OrderItem[]
  subtotal      Decimal  @db.Decimal(10,2)
  taxTotal      Decimal  @db.Decimal(10,2)
  deliveryFee   Decimal  @db.Decimal(10,2) @default(0)
  tipAmount     Decimal  @db.Decimal(10,2) @default(0)
  discountTotal Decimal  @db.Decimal(10,2) @default(0)
  grandTotal    Decimal  @db.Decimal(10,2)
  currency      String
  deliveryAddress Json?
  pickupAt      DateTime?
  notes         String?
  couponCode    String?
  loyaltyPointsUsed   Int @default(0)
  loyaltyPointsEarned Int @default(0)
  payment       Payment?
  statusEvents  OrderStatusEvent[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User?      @relation(fields:[userId], references:[id])
  restaurant    Restaurant @relation(fields:[restaurantId], references:[id])
  review        Review?

  @@index([restaurantId, status, createdAt])
  @@index([userId, createdAt])
}

model OrderItem {
  id              String  @id @default(cuid())
  orderId         String
  menuItemId      String
  nameSnapshot    String                   // immutable for receipts
  quantity        Int
  unitPrice       Decimal @db.Decimal(10,2)
  modifierSnapshot Json
  lineTotal       Decimal @db.Decimal(10,2)
  notes           String?
  order           Order @relation(fields:[orderId], references:[id], onDelete: Cascade)
}

model OrderStatusEvent {
  id        String      @id @default(cuid())
  orderId   String
  status    OrderStatus
  byUserId  String?
  note      String?
  createdAt DateTime    @default(now())
  order     Order @relation(fields:[orderId], references:[id], onDelete: Cascade)
}

// Payments
model Payment {
  id              String        @id @default(cuid())
  orderId         String        @unique
  provider        String                          // stripe, paymob, cod
  providerRef     String?                         // payment_intent_id
  method          PaymentMethodKind
  amount          Decimal       @db.Decimal(10,2)
  currency        String
  status          PaymentStatus @default(PENDING)
  rawWebhook      Json?
  refunds         Refund[]
  order           Order @relation(fields:[orderId], references:[id], onDelete: Cascade)
}

model Refund {
  id          String   @id @default(cuid())
  paymentId   String
  amount      Decimal  @db.Decimal(10,2)
  reason      String?
  providerRef String?
  createdAt   DateTime @default(now())
  payment     Payment @relation(fields:[paymentId], references:[id], onDelete: Cascade)
}

// Loyalty & Promotions
model LoyaltyAccount {
  id        String   @id @default(cuid())
  userId    String   @unique
  points    Int      @default(0)
  tier      String   @default("bronze")
  history   LoyaltyTransaction[]
  user      User @relation(fields:[userId], references:[id])
}

model LoyaltyTransaction {
  id        String   @id @default(cuid())
  accountId String
  delta     Int                            // + earn, - redeem
  reason    String
  orderId   String?
  createdAt DateTime @default(now())
  account   LoyaltyAccount @relation(fields:[accountId], references:[id], onDelete: Cascade)
}

model Promotion {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  description  String?
  type         String                       // PERCENT, FIXED, BOGO, FREE_DELIVERY
  value        Decimal? @db.Decimal(10,2)
  minSubtotal  Decimal? @db.Decimal(10,2)
  startsAt     DateTime?
  endsAt       DateTime?
  isActive     Boolean  @default(true)
  coupons      Coupon[]
  restaurant   Restaurant @relation(fields:[restaurantId], references:[id], onDelete: Cascade)
}

model Coupon {
  id           String   @id @default(cuid())
  promotionId  String
  code         String   @unique
  maxRedemptions Int?
  perUserLimit Int?     @default(1)
  redemptions  CouponRedemption[]
  promotion    Promotion @relation(fields:[promotionId], references:[id], onDelete: Cascade)
}

model CouponRedemption {
  id        String   @id @default(cuid())
  couponId  String
  userId    String?
  orderId   String?
  createdAt DateTime @default(now())
  coupon    Coupon @relation(fields:[couponId], references:[id], onDelete: Cascade)
}

// Reservations & Tables
model Table {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  capacity     Int
  reservations Reservation[]
  restaurant   Restaurant @relation(fields:[restaurantId], references:[id], onDelete: Cascade)
}

model Reservation {
  id           String   @id @default(cuid())
  userId       String?
  restaurantId String
  tableId      String?
  guestCount   Int
  startAt      DateTime
  endAt        DateTime
  status       String   @default("confirmed")  // confirmed, seated, completed, cancelled, no_show
  contactName  String
  contactPhone String
  notes        String?
  user         User? @relation(fields:[userId], references:[id])
  restaurant   Restaurant @relation(fields:[restaurantId], references:[id])
  table        Table? @relation(fields:[tableId], references:[id])
}

// Reviews
model Review {
  id        String   @id @default(cuid())
  orderId   String   @unique
  userId    String
  rating    Int                            // 1-5
  comment   String?
  isVisible Boolean  @default(true)
  createdAt DateTime @default(now())
  order     Order @relation(fields:[orderId], references:[id])
  user      User  @relation(fields:[userId], references:[id])
}

// Notifications & device tokens
model PushToken { id String @id @default(cuid()); userId String; token String @unique; platform String; user User @relation(fields:[userId], references:[id], onDelete: Cascade) }

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String                          // order_status, promo, system
  title     String
  body      String
  data      Json?
  readAt    DateTime?
  createdAt DateTime @default(now())
  user      User @relation(fields:[userId], references:[id], onDelete: Cascade)
}

// Other
model UserAddress {
  id        String  @id @default(cuid())
  userId    String
  label     String?
  line1     String
  line2     String?
  city      String
  state     String?
  zip       String?
  country   String
  geoPoint  Json?
  isDefault Boolean @default(false)
  user      User @relation(fields:[userId], references:[id], onDelete: Cascade)
}

model PaymentMethod {
  id        String  @id @default(cuid())
  userId    String
  provider  String
  ref       String                  // tokenized provider reference
  brand     String?
  last4     String?
  expMonth  Int?
  expYear   Int?
  isDefault Boolean @default(false)
  user      User @relation(fields:[userId], references:[id], onDelete: Cascade)
}

model RefreshToken { id String @id @default(cuid()); userId String; tokenHash String @unique; expiresAt DateTime; revokedAt DateTime?; user User @relation(fields:[userId], references:[id], onDelete: Cascade) }
```

---

## 5. Backend Architecture (NestJS)

```
apps/api/src/
├── main.ts
├── app.module.ts
├── common/                      # Pipes, guards, interceptors, filters, decorators
│   ├── zod-validation.pipe.ts
│   ├── permissions.guard.ts     # checks user has required permission keys
│   ├── current-user.decorator.ts
│   └── transaction.interceptor.ts
├── config/                      # Zod-validated env
├── prisma/                      # PrismaService (extends + middleware for soft-delete/audit)
├── modules/
│   ├── auth/                    # register, login, refresh, OTP, password reset
│   ├── users/                   # profile, addresses, payment methods
│   ├── restaurants/             # public read + admin CRUD, hours, locations
│   ├── menu/                    # categories, items, modifiers, image upload
│   ├── cart/                    # cart CRUD, merge guest→user on login
│   ├── orders/                  # checkout, status transitions, list, detail
│   ├── payments/                # Stripe + Paymob + COD adapters, webhooks
│   ├── promotions/              # coupon validation + admin CRUD
│   ├── loyalty/                 # earn/redeem
│   ├── reservations/            # availability, booking
│   ├── reviews/                 # post-order reviews + moderation
│   ├── notifications/           # in-app feed, push registration
│   ├── analytics/               # admin KPIs (queries via Prisma + cached in Redis)
│   ├── uploads/                 # presigned R2/S3 URLs
│   └── realtime/                # Socket.IO gateway: order rooms, kitchen feed
├── jobs/                        # BullMQ processors
│   ├── email.processor.ts
│   ├── sms.processor.ts
│   ├── push.processor.ts
│   ├── analytics-rollup.processor.ts
│   └── payment-reconcile.processor.ts
└── seed/
```

### Conventions
- Every controller method has a `@Permissions('order:read')` decorator if non-public.
- Every DTO is a Zod schema imported from `packages/types`. The `ZodValidationPipe` enforces it.
- All money in `Decimal`. Never use float. Helpers in `packages/utils/money.ts`.
- All time-based queries use the restaurant's timezone.
- Soft-delete via Prisma middleware on `User`, `MenuItem`, `Order` (status=CANCELLED only, not actual delete).
- Idempotency keys required on `POST /orders` and `POST /payments/webhooks`.

---

## 6. Web Architecture (Next.js)

### Customer Web (`apps/web`)

```
apps/web/src/
├── app/
│   ├── (marketing)/                # public pages, fully RSC
│   │   ├── page.tsx                # landing
│   │   ├── about/page.tsx
│   │   ├── menu/page.tsx
│   │   ├── menu/[category]/[slug]/page.tsx
│   │   ├── locations/page.tsx
│   │   ├── reservations/page.tsx
│   │   └── contact/page.tsx
│   ├── (shop)/                     # ordering flow
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── checkout/success/page.tsx
│   ├── (account)/
│   │   ├── orders/page.tsx
│   │   ├── orders/[id]/page.tsx    # live tracking
│   │   ├── addresses/page.tsx
│   │   ├── payment-methods/page.tsx
│   │   ├── loyalty/page.tsx
│   │   └── profile/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── verify/page.tsx
│   └── api/                        # only stripe/paymob webhook bridges if needed
├── components/                     # imports from packages/ui + local
├── features/                       # feature-scoped hooks + components
│   ├── cart/                       # useCart store, cart drawer
│   ├── menu/                       # filters, search
│   ├── checkout/
│   └── tracking/                   # socket.io live order
├── lib/                            # api client wrapper, auth helpers, money fmt
├── i18n/
└── styles/
```

### Admin Dashboard (`apps/admin`)

```
apps/admin/src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # sidebar + topbar
│   │   ├── page.tsx                # KPI overview
│   │   ├── orders/
│   │   │   ├── page.tsx            # live orders list (socket)
│   │   │   ├── [id]/page.tsx
│   │   │   └── kitchen/page.tsx    # KDS view (full-screen, station-friendly)
│   │   ├── menu/
│   │   │   ├── categories/page.tsx
│   │   │   └── items/page.tsx      # table + drawer editor
│   │   ├── customers/page.tsx
│   │   ├── promotions/page.tsx
│   │   ├── reservations/page.tsx
│   │   ├── reviews/page.tsx
│   │   ├── reports/page.tsx        # date-range, export csv/pdf
│   │   ├── staff/page.tsx          # users + roles
│   │   ├── locations/page.tsx
│   │   └── settings/page.tsx
└── ...
```

Admin tables use TanStack Table with server-side pagination/filtering. Charts via Recharts inside Tremor cards.

---

## 7. Mobile Architecture (Expo)

```
apps/mobile/
├── app/                           # expo-router file routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Home / Menu / Cart / Orders / Profile
│   │   ├── index.tsx             # home: featured, recent, promos
│   │   ├── menu.tsx
│   │   ├── cart.tsx
│   │   ├── orders.tsx
│   │   └── profile.tsx
│   ├── item/[id].tsx             # item details + modifier sheets
│   ├── checkout.tsx
│   ├── checkout/success.tsx
│   ├── orders/[id].tsx           # live tracking with map
│   └── _layout.tsx
├── src/
│   ├── components/               # NativeWind components
│   ├── features/
│   ├── lib/
│   ├── i18n/
│   └── theme/
└── app.json / eas.json
```

Mobile-only concerns:
- Push notifications via Expo + tokens registered on login
- Apple/Google Pay via Stripe RN SDK
- Deep links to `restaurant://order/[id]` for push notification taps
- Skeleton screens for slow networks
- Offline cart persistence via `@react-native-async-storage/async-storage`

---

## 8. Feature Specification

### Customer Web — Marketing

- Landing: hero with featured dish, value props, today's specials, social proof, locations strip, CTA to order
- About: story, team, values, food philosophy
- Menu: full searchable + filter (dietary, category, spice, price)
- Locations: list + map, hours, contact
- Reservations: date-time-party-size form, confirmation email
- Contact: form → email → ticket
- Blog (optional): MDX, RSS

### Customer Web + Mobile — Ordering

- Browse menu by category, featured carousel
- Item detail: gallery, description, modifiers, allergens, calories, related items
- Add to cart with quantity, modifiers, notes
- Cart drawer (web) / cart tab (mobile): edit, remove, apply coupon
- Checkout multi-step:
  1. Type: delivery / pickup / dine-in
  2. Address (delivery) or pickup time
  3. Payment method
  4. Tip selection
  5. Review + place order
- Order success with tracking link
- Live order tracking: status timeline, ETA, map for delivery
- Account: orders history (re-order button), addresses, payment methods, loyalty, profile
- Loyalty: points balance, tier benefits, redemption catalog
- Reviews: post-order rating, photo upload
- Favorites: wishlist of items
- Notifications center (in-app feed + push)

### Admin Dashboard

**Overview (KPI page)**
- Revenue today / 7d / 30d (vs prior period)
- Order count, AOV, completion rate
- Live orders counter
- Top 5 items (by qty + revenue)
- Revenue chart (hourly today, daily 30d)
- Orders by status (donut)
- New customers (sparkline)
- Recent reviews stream

**Orders**
- Live list with WebSocket updates, audio chime on new order
- Filters: status, type, date, location
- Detail drawer: items, customer, payment, status timeline, action buttons
- Status transitions enforced server-side via state machine
- Print receipt, refund, cancel with reason

**Kitchen Display (KDS)**
- Full-screen view, large fonts
- Cards per ticket grouped by station (or single column for small ops)
- Tap to advance status: confirmed → preparing → ready
- Color-coded by elapsed time

**Menu**
- Categories CRUD with drag-reorder
- Items table: bulk availability toggle, bulk price edit, search, filter
- Item editor: drawer with image upload (presigned to R2), variants, modifier groups inline editor
- "Schedule availability" (e.g., breakfast menu only 6-11am)

**Customers**
- Searchable table, segments (frequent, dormant, VIP)
- Detail: lifetime value, order count, last order, addresses, notes
- Send promo coupon to segment

**Promotions / Coupons**
- Create promotion (% / fixed / BOGO / free delivery)
- Generate codes (single, bulk)
- Conditions: min subtotal, item-level, first-order, etc.
- Performance dashboard

**Reservations**
- Calendar view + list view
- Quick-create + edit, table assignment
- Cancellation flow

**Reviews**
- Moderation queue, hide/unhide, owner reply

**Reports**
- Date range picker, export CSV / PDF
- Sales by item, by category, by hour, by day-of-week
- Tax summary, payment method breakdown
- Customer retention cohort chart

**Staff**
- Users + role assignment, permission matrix
- Activity audit log

**Settings**
- Restaurant info, hours, holidays
- Delivery zones (polygon on map) + fees
- Tax rates
- Payment provider keys
- Email/SMS templates

### Advanced features (post-MVP nice-to-haves)

- Real-time delivery driver tracking (separate driver app or webhooks from third-party like Shipday)
- AI-powered demand forecasting → suggested prep counts
- Inventory linked to menu items (decrement on sale)
- WhatsApp order updates
- Gift cards
- Catering / large-order workflow
- Multi-language menu (auto-translate via Claude API into AR/FR/ES)

---

## 9. Real-time, Jobs & Notifications

### Real-time (Socket.IO)

Rooms:
- `order:{orderId}` — joined by customer + admin staff with that order open
- `restaurant:{id}:orders` — admin live list
- `restaurant:{id}:kitchen` — KDS clients

Events: `order.created`, `order.status_changed`, `order.cancelled`, `order.refunded`, `kitchen.ticket_added`.

### BullMQ queues

| Queue | Producers | Consumers | Examples |
|---|---|---|---|
| `email` | API | api worker | order confirmation, password reset, weekly digest |
| `sms` | API | api worker | OTP, order ready |
| `push` | API | api worker | order status updates |
| `analytics-rollup` | cron (every 15m) | api worker | aggregate daily KPIs into a summary table for fast dashboard reads |
| `payment-reconcile` | cron (hourly) | api worker | match Stripe webhook gaps |
| `cleanup` | cron (daily) | api worker | expire abandoned guest carts older than 7d |

### Notification matrix

| Event | Email | SMS | Push | In-app |
|---|---|---|---|---|
| Welcome / verify email | ✅ | — | — | — |
| OTP login | — | ✅ | — | — |
| Order placed | ✅ | — | ✅ | ✅ |
| Order confirmed | — | ✅ | ✅ | ✅ |
| Out for delivery | — | ✅ | ✅ | ✅ |
| Delivered | — | — | ✅ | ✅ |
| Promo / loyalty | ✅ (digest) | — | ✅ (opt-in) | ✅ |

---

## 10. Auth & RBAC

- Email + password (bcrypt 12) **or** phone + OTP (SMS).
- Access token (JWT, 15 min) + refresh token (random 64-byte, hashed in DB, 30d, rotated on use).
- Refresh tokens scoped per device; revocation revokes that device only.
- Optional 2FA (TOTP) for admin roles — required for `owner` and `manager`.
- Password reset via signed link (24h expiry).
- Email verification required to place an order.
- Permission keys are flat strings; roles aggregate them. Frontend reads `me.permissions` once at boot and uses it for hide/show; backend re-checks on every protected route via `PermissionsGuard`.

Seed roles:
- `owner` — all permissions
- `manager` — everything except `staff:write`, `settings:write`
- `kitchen` — `order:read`, `order:status_update`
- `cashier` — `order:read`, `order:create`, `payment:create`
- `customer` — implicit (no role needed for customer routes)

---

## 11. Payments

### Architecture
- `PaymentsService` is provider-agnostic. Each provider implements `PaymentProvider` interface: `createIntent`, `confirm`, `refund`, `parseWebhook`.
- Order creation flow:
  1. Validate cart server-side (recompute prices to prevent tampering)
  2. Create `Order` (status: PENDING) + `Payment` (status: PENDING) in one DB transaction
  3. Call provider to create payment intent
  4. Return `clientSecret` to client
  5. Client confirms with provider SDK
  6. Webhook updates `Payment` + transitions `Order` to CONFIRMED
- COD short-circuits steps 3-6: order is CONFIRMED immediately, payment marked PAID on delivery completion.

### Idempotency
- `Idempotency-Key` header required on `POST /orders` and `POST /payments/intent`.
- Webhook events stored in `webhook_events` table; duplicate event IDs ignored.

### Refunds
- Partial or full, must reference an OrderItem set or full amount.
- Triggers `loyalty:revoke_earned_points` job.

---

## 12. Sprint Plan (24 weeks)

Two-week sprints. Order assumes you can run web + admin + mobile somewhat in parallel by Sprint 4 onwards. If solo, treat mobile as a separate later phase (push it after Sprint 8 entirely).

### Sprint 0 — Foundation (Week 1)
- Turborepo + pnpm workspaces + Biome + tsconfig presets
- Apps scaffolded (api, web, admin, mobile)
- `packages/db` with Prisma + initial schema
- `packages/types` with first DTOs (auth, user)
- `packages/ui` with shadcn init + design tokens from Stitch
- Docker compose: postgres + redis + mailhog
- GitHub Actions: type-check, lint, test
- `CLAUDE.md` (see §14) committed

**Done when**: every app boots locally with `pnpm dev`, lint+typecheck pass on CI.

### Sprint 1 — Auth & User (Weeks 2-3)
- Email + password + email verification
- Phone OTP (Twilio sandbox)
- Refresh-token rotation
- RBAC seed + `PermissionsGuard`
- `/auth` UI on web + admin: login, register, forgot, verify
- `/account/profile`, `/account/addresses` on web
- Mobile: login + register + forgot

### Sprint 2 — Restaurant + Menu (Weeks 4-5)
- Restaurant model + hours + locations
- Categories + items + images (R2 presigned upload)
- Modifier groups + options
- Public menu API (cached)
- Admin: menu CRUD UI (categories drag-reorder, items table, item editor drawer)
- Web: menu browse page, item detail page
- Mobile: menu tab, item details with modifier sheet

### Sprint 3 — Cart & Checkout UI (Weeks 6-7)
- Cart API (guest + authed, merge on login)
- Cart Zustand store on web + mobile
- Cart drawer (web) / cart tab (mobile)
- Checkout multi-step UI (no payment yet — submit creates order with PENDING payment)
- Order success page with placeholder tracking
- Coupon validation endpoint + UI

### Sprint 4 — Payments (Weeks 8-9)
- Stripe integration: payment intent, webhook, refund
- COD adapter
- Mobile Apple/Google Pay
- Tip selection, tax calculation
- Receipt PDF generation (queued job → email)
- Refund UI in admin

### Sprint 5 — Order Lifecycle & Real-time (Weeks 10-11)
- Order state machine (server-enforced transitions)
- Socket.IO gateway, rooms, events
- Live tracking page on web + mobile
- Admin live orders list with WebSocket updates + new-order chime
- Email/SMS/push notifications on status changes
- BullMQ workers + processors

### Sprint 6 — Admin Core: KPIs + Orders (Weeks 12-13)
- Overview page: KPI cards, revenue chart, top items, recent orders
- Orders list with server-side filtering
- Order detail drawer
- Status transitions UI
- Refund flow
- Kitchen Display (KDS) full-screen view

### Sprint 7 — Admin Advanced (Weeks 14-15)
- Customers table + segments + detail
- Promotions + coupons CRUD
- Reservations calendar + list
- Reviews moderation
- Staff + roles management UI
- Settings (hours, delivery zones, taxes)

### Sprint 8 — Reports & Analytics (Weeks 16-17)
- `analytics-rollup` job: daily summaries
- Reports page: date range, sales by item / category / hour / DOW
- CSV + PDF export
- Cohort retention chart
- Audit log viewer

### Sprint 9 — Mobile Polish + Push (Weeks 18-19)
- Expo notifications full integration with deep links
- Order tracking with map
- Account screens (addresses, payment methods, loyalty, profile)
- Reviews flow (post-order modal + photo upload)
- Skeleton screens, error states, offline cart

### Sprint 10 — Marketing Pages + SEO (Weeks 20-21)
- Landing, about, locations, contact
- Reservations standalone page
- Schema.org markup (Restaurant, Menu, MenuItem, AggregateRating)
- Sitemap, robots, OG images
- Performance budget: LCP < 2s on 4G

### Sprint 11 — i18n + RTL + Loyalty + Reviews (Weeks 22-23)
- Full EN/AR translations
- RTL layout audit (web + mobile)
- Loyalty earn/redeem flow
- Favorites
- Referral program

### Sprint 12 — Hardening + Launch (Weeks 24)
- Sentry on all apps
- PostHog product analytics
- Load test the order endpoint (k6)
- Penetration test pass on auth + payment flows
- Backup + disaster-recovery runbook
- Soft launch with feature flags

---

## 13. Design Asset Workflow (Google Stitch → Claude Code)

This is how you, Stitch, and Claude Code stay in sync.

### Folder convention

```
design-assets/
├── web/
│   ├── 01-landing/
│   │   ├── preview.png            # Stitch export (full screen)
│   │   ├── preview-mobile.png     # responsive variant if relevant
│   │   ├── spec.md                # human notes: spacing, behaviors, edge cases
│   │   └── exported.tsx           # (optional) Stitch HTML/JSX export, REFERENCE ONLY
│   ├── 02-menu/
│   ├── 03-item-detail/
│   ├── 04-cart/
│   ├── 05-checkout/
│   ├── 06-order-tracking/
│   └── ...
├── admin/
│   ├── 01-overview/
│   ├── 02-orders/
│   ├── 03-kds/
│   └── ...
└── mobile/
    ├── 01-home/
    ├── 02-menu/
    ├── 03-item/
    ├── 04-cart/
    ├── 05-checkout/
    ├── 06-tracking/
    └── ...
```

### `spec.md` template

Every screen folder gets one. Fill it before asking Claude Code to implement.

```markdown
# Screen: Menu Browse

## Route
`/menu` (web), `/(tabs)/menu` (mobile)

## States to handle
- empty (no items in category)
- loading (skeleton cards)
- error (with retry)
- happy path

## Data sources
- GET /api/v1/menu/categories
- GET /api/v1/menu/items?categoryId=...

## Interactions
- Sticky category tabs at top
- Tapping a card opens item detail
- Filter chips (vegetarian, spicy) toggle a query param
- Search input debounced 300ms

## Tokens
- Card radius: --radius-lg (16px)
- Card shadow: --shadow-card
- Use `font-display` for category headings, `font-sans` for body

## Notes
- On RTL, swap chevron direction in category tabs
```

### Rules for Claude Code

These belong in `CLAUDE.md` (next section) but worth stating here in the plan:

1. **Always view `preview.png` before writing the screen.** Use the `view` tool. Don't rely on the spec alone — typography weight, spacing, and image cropping live in the visual.
2. **Treat `exported.tsx` as a layout hint, never a copy source.** Stitch exports use generic Tailwind or inline styles that don't match the project's `packages/ui` components. Rewrite using shadcn primitives + project tokens.
3. **Never hardcode colors, spacing, or font sizes.** All tokens come from `tooling/tailwind-config`. If a token is missing, add it there first, then use it.
4. **Mobile vs web are separate implementations.** Don't try to share JSX between Next.js and Expo. Share state hooks, types, API calls — not UI.
5. **Image assets** referenced from Stitch designs (food photos, hero images) go in `apps/web/public/images/` (or `apps/mobile/assets/images/`) using kebab-case filenames matching the design folder: `apps/web/public/images/menu/burger-classic.jpg`.
6. **When the design changes**, update `preview.png` first, bump a `## Changelog` section in `spec.md`, then re-implement. Don't silently drift from the design folder.

---

## 14. CLAUDE.md Template

Drop this at repo root. It's the orientation doc Claude Code reads first.

````markdown
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
- Migrations: `pnpm --filter @repo/db migrate dev`
- After schema changes, run `pnpm --filter @repo/db generate` and commit.
- Don't write raw SQL unless the operation is impossible in Prisma.

**Auth & permissions.**
- Every protected NestJS route has `@Permissions('...')`. Adding a new permission means seeding it in `apps/api/src/seed/permissions.seed.ts` and updating role assignments.
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
- Never hardcode the base URL — use `getApiBaseUrl()` from `packages/api-client`.
````

---

## 15. Environment & Deployment

### Local
- `docker compose up -d` for postgres, redis, mailhog
- `pnpm dev` runs everything; or per-app: `pnpm --filter @repo/web dev`
- Stripe CLI: `stripe listen --forward-to localhost:4000/api/v1/payments/webhook`

### Hosting
- **API**: Fly.io or Railway (single region near customers + read replica) — Docker image, autoscaling
- **Postgres**: managed (Neon, Supabase, or Railway PG)
- **Redis**: Upstash (HTTP for jobs producers from Vercel-hosted apps if needed) or Railway
- **Object storage**: Cloudflare R2 (cheap egress)
- **Web**: Vercel (preview deployments per PR)
- **Admin**: Vercel (separate project for blast-radius isolation)
- **Mobile**: EAS Build → TestFlight + Play Internal Testing → production

### Env variables (all Zod-validated in `packages/config-runtime`)

```
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYMOB_API_KEY=          # optional
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
APP_URL_WEB=
APP_URL_ADMIN=
APP_DEEP_LINK_SCHEME=restaurant
```

### Observability
- Sentry (api, web, admin, mobile)
- PostHog (product analytics + session replay on web)
- Healthchecks: `/healthz` on API; uptime via BetterStack

---

## Appendix A — Suggested seed data

- 1 restaurant (single location to start)
- 6 menu categories: Starters, Mains, Pizzas, Burgers, Desserts, Drinks
- ~30 menu items across categories with at least 5 having modifier groups
- 3 promo codes: `WELCOME10` (10% off, first order), `FREEDEL` (free delivery, min $25), `BOGO-PIZZA` (buy one get one)
- 5 user accounts: owner, manager, kitchen-staff, cashier, customer

## Appendix B — KPI catalog (for Overview page)

| KPI | Calc | Source |
|---|---|---|
| Revenue (period) | sum(grandTotal) where status in (COMPLETED, DELIVERED) | orders |
| Orders | count(*) where status != PENDING | orders |
| AOV | revenue / orders | derived |
| Completion rate | completed / (completed + cancelled) | orders |
| New customers | count(distinct userId) where firstOrderAt in period | derived from User |
| Repeat rate | customers with ≥2 orders / total customers | derived |
| Avg prep time | avg(timestamp(READY) - timestamp(CONFIRMED)) | OrderStatusEvent |
| Top items | sum(quantity), sum(lineTotal) group by menuItemId | OrderItem |

Cache rollups for "last 7d" and "last 30d" in Redis with 15-min TTL; the rollup job (Sprint 8) fills `daily_metrics` table for everything older.
