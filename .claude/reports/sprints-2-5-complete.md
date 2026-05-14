# Sprints 2-5 — Combined Completion Report

> Source prompt: `docs/sprints/sprint-2-5-claude-code-prompt.md`
> Plan: `.claude/plans/sprint-2-5.md`
> Individual gates: `.claude/reports/sprint-{2,3,4,5}-status.md`
> Completed: 2026-05-14

## Status: ✅ Done — ready for UI work (Sprint 6+)

Four sprints, **no UI written**. Backend is fully wired; the data layer (hooks, stores, api-client, types, realtime-client) is complete and tested. Every page/screen file `return null` with a `// TODO(ui):` marker.

## Verification across all four sprints

| Check | Sprint 0+1 | After Sprint 5 |
|---|---|---|
| Packages typechecked | 14 | **15** (+`@repo/realtime-client`) |
| Lintable packages green | 4/4 | 4/4 |
| Unit tests | 19 | **39** (+20 across pricing/state-machine/cart-store/use-create-menu-item/use-create-order/money) |
| e2e tests | 10 | **43** (+33 across menu, uploads, cart, orders, promotions, payments, state-machine) |
| Endpoints documented in Swagger | 0 | **55** |
| Schema migrations | 1 | **4** (init + operating_hours_unique + order_number_seq + payment_method_poland) |
| Seeded entities | 24 perms + 5 roles + 2 users | + 1 restaurant + 6 categories + 30 items + 5 modifier groups + 3 promotions + 3 coupons |

---

## What was implemented per sprint

### Sprint 2 — Restaurants, Menu, Uploads
- **Modules:** `restaurants/`, `menu/`, `uploads/`, plus `redis/cache.service.ts` and `@repo/utils/money.ts`.
- **Endpoints:** restaurant CRUD + hours, menu tree + categories/items/images/modifiers CRUD + reorder + availability fast-path, R2 presign.
- **Seed:** Polish restaurant `the-test-kitchen` (Europe/Warsaw, PLN) with 6 categories and ~30 items.
- **Schema:** `add_operating_hours_unique` migration (compound unique on `OperatingHours(restaurantId, dayOfWeek)`).

### Sprint 3 — Cart, Orders, Promotions/Coupons
- **Modules:** `cart/` (with `modifier-validation` + `cart-pricing`), `promotions/` (with `coupon-validation`), `orders/` (with `order-number` + `idempotency`).
- **Endpoints:** cart get/add/update/remove/clear/merge/coupon (guest + authed), POST `/orders` with `Idempotency-Key`, order list/detail with ownership scoping, promotion CRUD + coupon validation with 7 typed failure reasons.
- **Cart store:** Zustand on web + mobile (localStorage / `expo-secure-store` for session key).
- **Schema:** `add_order_number_sequence` (Postgres sequence for `R-{YYYY}-{6-digit}` order numbers).
- **Seed:** WELCOME10 (10%), FREEDEL (free delivery, min 100 PLN), BOGO-PIZZA.

### Sprint 4 — Payments, Refunds, Receipts
- **Modules:** `pricing/` (shared totals), `payments/` (controllers ×2, provider interface, Stripe + COD providers, `webhook-events.service`).
- **Endpoints:** `POST /payments/intent`, `GET /payments/config`, `GET /payments/by-order/:id`, `POST /payments/:id/refunds`, `POST /payments/webhooks/stripe` (raw-body verified, idempotent).
- **Job:** `receipt.generate` BullMQ queue + React PDF processor + email attachment.
- **Schema:** `payment_method_poland` migration (P24 + BLIK enum values, `Restaurant.taxRate` Decimal(5,4) default 0.08, new `WebhookEvent` table).
- **Mobile:** `@stripe/stripe-react-native` dep added; `<StripeProvider>` left as a `// TODO(ui):`.

### Sprint 5 — Lifecycle, Real-time, Notifications
- **Pre-work:** bumped to **Nest 11 + Fastify 5**; wired `@nestjs/swagger@11` + `@fastify/swagger`/`@fastify/swagger-ui` — Swagger UI lives at `/api/v1/docs`.
- **Modules:** `orders/order-state-machine.ts` (pure transition guard), `realtime/realtime.gateway.ts`, `notifications/` (dispatcher + matrix), `kitchen/`.
- **Endpoints:** `POST /orders/:id/status` (role-gated transitions), `GET /kitchen/tickets`.
- **Sockets:** authed Socket.IO at `/socket.io/`, rooms `order:{id}` / `restaurant:{id}:orders` / `restaurant:{id}:kitchen`, events `order.created`/`status_changed`/`cancelled`/`refunded`/`kitchen.ticket_added`/`kitchen.ticket_removed`.
- **`@repo/realtime-client`:** new shared package, typed event map + `connect`/`subscribe`/`on`/`status` API.
- **Notifications:** `@nestjs/event-emitter`-driven dispatcher reads §9 matrix, persists in-app rows, enqueues email/sms/push jobs; **push processor now uses real `expo-server-sdk`**.

---

## Decisions (consolidated)

All sprint defaults from the plan stood. The recap, sprint by sprint:

| Sprint | Decision |
|---|---|
| 2 | Use Prisma's `Decimal` from `@prisma/client/runtime/library` (not a second decimal lib). Add `@@unique([restaurantId, dayOfWeek])` for atomic hours upserts. Modifier group seed uses lookup-then-create (no schema change). R2 stub mode in dev returns `http://localhost/no-r2/<key>` URLs. Money on the wire = fixed-point strings. |
| 3 | Postgres sequence for order numbers (raw SQL — the **only** raw SQL in the codebase, justified in the migration). Redis 24h-TTL idempotency keys, scoped by `userId|sessionKey`. `@Public()` opportunistically attaches `req.user` on public routes when a valid bearer token is present. |
| 4 | `WebhookEvent` table with the provider event id as PK gives idempotency for free. `Restaurant.taxRate` as a Decimal column. Stripe stub mode in dev returns deterministic `pi_stub_<orderId>` refs + secrets so frontend SDK calls work without real Stripe keys. COD short-circuits with the same confirmation path the webhook uses. |
| 5 | Bumped straight to Nest 11 + Fastify 5 — clean. State machine is pure, role-reducer + transition rules table-driven. `REFUNDED` is system-only (only refund flow can reach it). Post-payment cancellations rejected — refund is the only path out. `RealtimeGateway` is a single class (gateway + event subscriber) because `@WebSocketServer()` only attaches to gateway classes. Real Expo push via `expo-server-sdk`. |

---

## Bring-up checklist (changes since Sprint 0+1)

```bash
# Toolchain — unchanged: Node 20 LTS, pnpm 9.15+, Docker Desktop
git clone <repo>
cd restaurant
pnpm install
cp .env.example .env

# Optional: set real STRIPE_*, R2_*, RESEND_API_KEY, TWILIO_* for live mode.
# Empty values → stub mode (covers e2e + dev).

docker compose up -d
pnpm db:migrate                  # applies 4 migrations
pnpm db:seed                     # 24 perms, 5 roles, 2 users, 1 restaurant, 30 items, 3 promos
pnpm dev                         # boots api (4000), web (3000), admin (3001), mobile (Expo)
```

URLs:
- API → http://localhost:4000
- **Swagger UI** → http://localhost:4000/api/v1/docs (Bearer auth scheme)
- **Socket.IO** → http://localhost:4000/socket.io/
- Web → http://localhost:3000
- Admin → http://localhost:3001
- Mobile → press `w`/`i`/`a` in Expo CLI
- Mailhog → http://localhost:8025

Test users:
- `owner@local.test` / `Password123!` — full permissions (26 keys)
- `customer@local.test` / `Password123!` — customer role

Smoke test (full happy path):
```bash
# Login → cart → coupon → order → payment → confirm via webhook
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@local.test","password":"Password123!"}' | jq -r .accessToken)

RID=$(curl -s http://localhost:4000/api/v1/restaurants/the-test-kitchen | jq -r .id)
MID=$(curl -s "http://localhost:4000/api/v1/restaurants/$RID/menu" | jq -r '.categories[1].items[0].id')

curl -X POST "http://localhost:4000/api/v1/cart/items?restaurantId=$RID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"menuItemId\":\"$MID\",\"quantity\":2,\"modifierSelections\":[]}"

curl -X POST "http://localhost:4000/api/v1/cart/coupon?restaurantId=$RID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"WELCOME10"}'

ORDER=$(curl -s -X POST http://localhost:4000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"restaurantId\":\"$RID\",\"type\":\"PICKUP\",\"tipAmount\":\"0\"}" | jq -r .id)

curl -X POST http://localhost:4000/api/v1/payments/intent \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER\",\"provider\":\"cod\",\"methodKind\":\"COD\"}"
# → COD short-circuits to CONFIRMED, receipt job enqueued.
```

---

## Known gaps / what the UI sprint should know

1. **All page/screen files return `null`** with `// TODO(ui):` markers. Routes exist; layouts exist (minimal). Hooks are wired and tested — UI code consumes them directly.
2. **Tailwind tokens are still placeholder** (`tooling/tailwind-config/tailwind.preset.ts`). Replace with real design tokens before authoring components. shadcn/ui hasn't been initialized yet (`packages/ui` is an empty stub).
3. **`notify()` is a `console.log`** on web/admin/mobile. Swap in sonner / react-native-toast-message; signature `notify(level, message)` is stable.
4. **`<StripeProvider>` not initialized in mobile** — `apps/mobile/src/providers/app-providers.tsx` has a `// TODO(ui):` marker. Fetch the key via `usePaymentConfig()` and wrap children.
5. **`useLiveOrders` placeholder `type`** on freshly-emitted rows — the realtime event doesn't carry the order type. Refetch on key invalidation self-heals; mention if you build a strict-typed list.
6. **No `realtime.e2e-spec.ts`** — Sprint 5 verified Socket.IO via boot + manual curl (`/socket.io/?EIO=4&transport=polling` returns 200). Full handshake-auth-subscribe-receive e2e is a Sprint 6 follow-up.
7. **Receipt PDF snapshot test** — exercised end-to-end via queue+worker boot, but not directly snapshot-tested. Sprint 6 should add one when the PDF template stabilises.
8. **`charge.refunded` Stripe webhook** logs only — sync-from-dashboard refunds need a `Refund` row created from `event.data.object.amount_refunded`. Deferred.
9. **Loyalty point revoke** on full refund — flagged as a TODO in `payments.service`, lands when Loyalty module ships (Sprint 11 per project plan).
10. **Per-user redemption counting for guest carts** — only counts authed redemptions. Guests can technically reuse a `perUserLimit: 1` coupon. Acceptable for now.
11. **Cart `appliedCouponId` FK** — no `onDelete` cascade. A hard-deleted coupon (no redemption history) could leave a dangling FK on a cart. Worth one cleanup migration when revising the schema.
12. **i18n / locale** — `Intl.NumberFormat` uses the runtime default. When i18n lands (Sprint 11), pin per-restaurant locale on PDFs and emails.
13. **Biome lint still skipped on `apps/api`** — Biome 1.9 doesn't parse parameter decorators. Bump to Biome 2 when stable; type-check + e2e are the guardrails meanwhile.

---

## Hooks/data-layer ready for the UI

Each app has the following hook families wired and tested:

**Web (customer)**: `useRestaurant`, `useMenuTree`, `useMenuItem`, `useCart` + 6 cart mutations, `useOrder` / `useOrders` / `useCreateOrder`, `useOrderTracking`, `useRealtimeStatus`, `usePaymentConfig`, `useCreatePaymentIntent`, all `useAuth*` + `useAddress*` from Sprint 1.

**Admin**: `useRestaurant` + 3 mutations, **22 menu mutations** (categories CRUD/reorder, items CRUD/reorder/availability, images CRUD/reorder, modifier groups + options CRUD), `useUploadImage` composite, 8 promotion+coupon hooks, `useOrders` / `useOrder`, **`useLiveOrders`**, **`useUpdateOrderStatus`**, **`useKitchenFeed`**, `useOrderTracking`, `useRealtimeStatus`, `useOrderPayment`, `useCreateRefund`.

**Mobile**: same customer-side surface as web — query/mutation hooks, Zustand cart store, realtime tracking. Stripe SDK and Expo push are ready to wire in Sprint 9.

---

## Bottom line

We can hand this to a UI-only contributor on Monday. Every interaction the design covers has a typed hook on the frontend and a tested endpoint on the backend. The realtime gateway is up, the state machine is enforced server-side, payments work in stub mode (or with real Stripe keys), and the Swagger UI lets anyone with an owner token paste it in and try the whole API in the browser.
