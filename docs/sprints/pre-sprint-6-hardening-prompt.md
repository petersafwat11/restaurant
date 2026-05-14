# Claude Code Prompt — Pre-Sprint-6 Hardening (Wrap-up of Sprints 2–5) — NO UI

> Paste into a fresh Claude Code session at the repo root. This is a short hardening pass between Sprint 5 and Sprint 6, fixing gaps identified across the Sprint 2-5 status reports.

---

## CONTEXT

We finished Sprints 2-5. Before starting Sprint 6 (admin overview, live orders, KDS, refund UI), do a focused cleanup pass. Read these files in full first:

1. `docs/restaurant-app-project-plan.md`
2. `docs/sprints/sprint-2-5-claude-code-prompt.md`
3. `.claude/reports/sprint-2-status.md`
4. `.claude/reports/sprint-3-status.md`
5. `.claude/reports/sprint-4-status.md`
6. `.claude/reports/sprint-5-status.md`
7. `.claude/reports/sprints-2-5-complete.md`
8. `CLAUDE.md`

You will see "Known gaps" / "deferred" lists in each report. This prompt picks the subset that's worth fixing **now** because (a) it's a real correctness bug, (b) it would directly hurt Sprint 6 work, or (c) it locks behavior before Sprint 11's i18n pass risks breaking it. Everything else listed in the reports stays deferred to the sprint it belongs to.

---

## HARD CONSTRAINT — STILL NO UI

Same rule as every sprint so far: no JSX content, no Tailwind utility classes on elements, no shadcn or NativeWind components. Page files stay at `return null` with `// TODO(ui):`. This is a backend/hooks/tests pass only.

## HARD CONSTRAINT — DO NOT CHANGE COMPLETED WORK BEYOND THE LISTED FIXES

The Sprint 2-5 status reports document choices that are now locked. Do not refactor existing modules, rename files, restructure imports, or "tidy up" anything beyond what's explicitly listed below.

---

## RESPECT EXISTING DECISIONS (FROM PRIOR REPORTS)

- Hand-rolled `JwtAuthGuard`; `@Public()` with opportunistic user attach.
- Vitest + `unplugin-swc` for API e2e; esbuild for frontend.
- `@swc-node/register` for API dev runtime.
- `pnpm overrides` pin `@types/react@18.3.18`.
- `dotenv -e ../../.env --` prefix.
- `useImportType` Biome rule OFF.
- Biome lint skipped on `apps/api` (Biome 1.9 limitation).
- Web/admin tokens: access in memory, refresh in httpOnly cookie. Mobile: both in `expo-secure-store`.
- `notify()` is a no-op `console.log` — UI sprint replaces.
- Stripe-only payments; PLN target market; P24 + BLIK + cards + Apple/Google Pay.
- Nest 11 + Fastify 5 + `@nestjs/swagger@11` + Swagger UI at `/api/v1/docs`.
- `RealtimeGateway` is a single class (gateway + `@OnEvent` subscriber).
- `REFUNDED` is system-only; post-payment cancellations rejected.
- Money on the wire = fixed-point strings; in DB = `Decimal`.
- Order numbers via Postgres sequence `order_number_seq`.

---

## DEFAULTS — APPLY AUTOMATICALLY

When a sub-decision comes up during implementation, use these and note in the final report:

1. **New migrations**: one per logical change, named `pre_sprint_6_<topic>` (e.g. `pre_sprint_6_cart_coupon_cascade`). Never alter existing migrations.
2. **Realtime event payload changes**: add fields, never remove. Bump nothing — the existing event names stay the same; only payload shape grows. Both `packages/types/realtime.ts` schema and `packages/realtime-client` type map update together.
3. **Snapshot tests**: use Vitest's `toMatchSnapshot()` with a `.snap` file committed. PDF snapshots match on extracted text + page count, not raw bytes (binary PDFs are non-deterministic across `@react-pdf/renderer` versions).
4. **Locale pinning**: receipts and emails use `pl-PL` for `PLN` currency by default. The `formatMoney` helper accepts an optional locale + currency; default to `pl-PL` + the restaurant's `currency` field.
5. **R2 orphan cleanup**: scheduled BullMQ repeatable job, runs daily at 03:00 UTC, deletes R2 objects whose keys aren't referenced by any `MenuItemImage.url` (or other future tables that consume the same bucket). Soft window: only delete objects older than 7 days to give in-flight uploads a buffer.
6. **Stripe `charge.refunded` handler**: when a refund event arrives from the dashboard (i.e., `refund.id` not already present in our `Refund` table), create the missing `Refund` row + adjust the order status if the refund is full. Log loudly so it's clear when this path fires.
7. **Cart `appliedCouponId` FK**: change to `onDelete: SetNull` so a coupon hard-delete leaves the cart pointing at `null` instead of dangling.
8. **`useLiveOrders` placeholder fix**: extend the `order.created` realtime event payload to include the full `OrderListItemDto` shape (id, orderNumber, type, status, grandTotal, createdAt, customerName, itemCount) rather than refetching. Server has the data; sending it costs nothing.

---

## REQUIRED WORKFLOW

1. Read the reference files.
2. Write `.claude/plans/pre-sprint-6-hardening.md` covering phases A-D below with file paths + verification steps.
3. **Start implementing immediately.** No mid-pass approval gate.
4. Apply §DEFAULTS as needed; document in the report.
5. After all phases pass verification, write `.claude/reports/pre-sprint-6-hardening-complete.md` and stop for review.

---

## PHASE A — Correctness fixes (real production risks)

### A.1 Stripe `charge.refunded` dashboard sync

**Problem (Sprint 4 report, gap #3)**: refunds initiated from the Stripe dashboard currently just log. The DB has no `Refund` row and the order status doesn't reflect reality.

**Fix**:
- In `payments/payments.webhooks.controller.ts` (or wherever the webhook dispatcher lives), handle `charge.refunded`:
  - Look up the `Payment` by `providerRef` (the original `payment_intent` id).
  - Iterate `event.data.object.refunds.data[]` (or `event.data.object` for newer events — check Stripe's payload shape).
  - For each Stripe refund not yet in our `Refund` table (match on `providerRef = stripe_refund_id`), create the row. Use `WebhookEvent` dedupe — same pattern as `payment_intent.succeeded`.
  - If aggregate `Refund.amount` sum >= original `Payment.amount`, call `OrdersService.forceTransition(orderId, 'REFUNDED', null, 'Refunded via Stripe dashboard')`.
  - Log every dashboard-originated refund at `info` level with a clear `[STRIPE_DASHBOARD_REFUND]` prefix so it's grep-able.
- Update `PaymentsService.refund()` (our own admin-initiated refund) to set `providerRef` on the `Refund` row from Stripe's response, so future webhook dedupe can match.
- Stub mode: when `STRIPE_SECRET_KEY` is empty, skip dashboard-sync entirely (no real Stripe to listen to). Already what the existing handler does.

**Test**: extend `payments.e2e-spec.ts` with:
- Test that a `charge.refunded` webhook for an unknown stripe refund id creates a `Refund` row and transitions the order if full.
- Test idempotency: same event twice → one `Refund` row, no double-transition.
- Test that a `charge.refunded` matching an existing `Refund.providerRef` is a no-op (admin-initiated refund that Stripe then echoed back).

### A.2 `Cart.appliedCouponId` cascade

**Problem (Sprint 3 report, gap #5)**: hard-deleted coupons leave dangling FKs on carts.

**Fix**:
- New migration `pre_sprint_6_cart_coupon_cascade`.
- Update `Cart.appliedCoupon` relation in `schema.prisma`: `appliedCoupon Coupon? @relation(fields: [appliedCouponId], references: [id], onDelete: SetNull)`.
- Run `prisma generate`.

**Test**: add a unit or e2e test that deletes a coupon with no redemption history and verifies any cart pointing at it now has `appliedCouponId: null` and re-reads as coupon-less.

---

## PHASE B — Sprint 6 blockers

### B.1 `useLiveOrders` placeholder `type` field

**Problem (Sprint 5 report)**: when the `order.created` realtime event fires, the realtime payload doesn't include `type`, so `useLiveOrders` injects `'PICKUP'` as a placeholder. Sprint 6 will render the live orders list and the type column will be wrong until the next refetch.

**Fix**:
- Extend the realtime event payload schema in `packages/types/realtime.ts`. The `order.created` and `order.status_changed` events should carry the full `OrderListItemDto`:
  ```ts
  {
    id, orderNumber, type, status, grandTotal,
    currency, customerName, itemCount, createdAt, restaurantId
  }
  ```
- Update `packages/realtime-client`'s typed event map to match.
- Update `OrdersService` event-emission sites (the two callsites — `create()` and `transition()`/`forceTransition()`) to build and emit the full payload.
- Update `useLiveOrders` in `apps/admin/src/features/orders/hooks/use-live-orders.ts` to consume the new payload directly — remove the placeholder.

**Test**: add a unit test on `useLiveOrders` (admin) using a mock socket emit verifying `type` reflects the emitted payload (not a placeholder).

### B.2 Realtime e2e test

**Problem (Sprint 5 report)**: no `realtime.e2e-spec.ts`. Sprint 6 leans heavily on sockets; regressions will only surface in manual testing.

**Fix**:
- Create `apps/api/test/realtime.e2e-spec.ts` covering:
  - Unauthenticated socket connection rejected with code 4401.
  - Valid token connects + can subscribe to `order:{ownId}` for an order the user owns.
  - Subscribing to `order:{otherUserId}` fails with permission ack error.
  - Customer subscribes to `order:{id}`, admin transitions the order via `POST /orders/:id/status`, customer receives `order.status_changed` event with correct payload.
  - Staff with `order:read` permission subscribes to `restaurant:{id}:orders` and receives `order.created` event when a new order is placed (POST flow from Sprint 3).
  - Kitchen subscribes to `restaurant:{id}:kitchen` and receives `kitchen.ticket_added` when an order goes CONFIRMED → PREPARING.
- Use `socket.io-client` as the test client. Bootstrap the Fastify app + Socket.IO server via the existing `setup-e2e.ts` pattern. Awaiting for an event uses a small `Promise` + timeout helper — 2s timeout per assertion is plenty.
- If the existing setup doesn't expose a port for sockets, attach Socket.IO to the same Fastify instance the e2e suite already creates (the `IoAdapter` in `main.ts` does this in dev — replicate in tests).

---

## PHASE C — Quality + coverage

### C.1 Receipt PDF snapshot test

**Problem (Sprint 4 report, gap #2; Sprint 5 report)**: the receipt PDF is exercised end-to-end via queue+worker boot but has no direct test. Sprint 11's i18n pass will touch the template — without a snapshot we'll have no regression net.

**Fix**:
- Add a unit test next to `jobs/receipt-pdf.tsx` (`receipt-pdf.spec.ts`).
- Build a synthetic `Order` + `OrderItem[]` + `Payment` fixture.
- Render the PDF via `renderToBuffer`.
- Extract text using `pdf-parse` (or similar) and snapshot:
  - Page count == 1.
  - Text contains: restaurant name, order number formatted as `R-YYYY-NNNNNN`, each line item name + qty + line total, subtotal/tax/delivery/discount/tip/grandTotal labels with values, payment method label, currency code.
- Add a second snapshot for an order with a `Refund` row to cover the "refunded" branch.

### C.2 R2 image orphan cleanup

**Problem (Sprint 2 report, gap #2)**: `DELETE /menu/items/:id/images/:imageId` removes the row but leaves the R2 object orphaned.

**Fix**:
- Update the existing image-delete service method to also issue a `DeleteObjectCommand` to R2 for the removed key. Wrap in try/catch — log a warning on failure rather than rolling back the DB delete (the orphan sweep is the safety net).
- New BullMQ repeatable queue `r2.orphan-cleanup`, runs daily at 03:00 UTC.
- Processor: list R2 objects in the bucket (paginated), check each key against all rows in `MenuItemImage.url` (extract key from URL). Objects older than 7 days with no DB reference get deleted. Logs delete count.
- Stub mode (no real R2 creds): processor logs "skipping — R2 not configured" and exits.
- Skip writing a unit test for this (R2 SDK mocking is heavy and the logic is straightforward). Document the behavior in `docs/local-setup.md`.

### C.3 `formatMoney` locale pinning

**Problem (Sprint 2 report; Sprint 4 report, gap #4)**: `formatMoney` uses runtime default locale, giving different output on the API server vs Polish browsers.

**Fix**:
- Update `packages/utils/money.ts` `formatMoney(value, currency, locale?)`:
  - Default `locale` to `pl-PL` when `currency === 'PLN'`.
  - Generic mapping: `EUR → de-DE`, `GBP → en-GB`, `USD → en-US`, `PLN → pl-PL`. Fall back to `en-US` for unknowns.
  - Document that this is a baseline — true per-user locale awareness lands in Sprint 11.
- Update receipt PDF (`receipt-pdf.tsx`) and any email templates that show money to pass `restaurant.currency` to `formatMoney` so the locale is correct.
- Update the existing `money.test.ts` with cases: PLN renders as `12,50 zł`, USD as `$12.50`, EUR as `12,50 €`.

---

## PHASE D — Documentation

Update `docs/local-setup.md` with one consolidated "Live-mode credentials" section listing each integration and what changes when real creds are set:

- **Stripe** — set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`. Stub mode active when empty; transitions to live when set. To test webhooks locally: `stripe listen --forward-to localhost:4000/api/v1/payments/webhooks/stripe`. Enable P24 and BLIK in the Stripe Dashboard for your account.
- **Cloudflare R2** — set `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Stub mode returns `http://localhost/no-r2/<key>` URLs when empty. The orphan cleanup job skips when stub mode is detected.
- **Twilio** — set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and a sender phone number env var (document the name). Stub mode prints SMS to the console.
- **Resend** — set `RESEND_API_KEY`. Stub mode sends to local Mailhog via SMTP — visit http://localhost:8025 to see emails.
- **Expo Push** — no env var needed; tokens are read from the `PushToken` table. Stub mode is "no tokens in DB" → processor logs and exits. Add a section noting that mobile clients register their tokens via `useRegisterPushToken()` after login (Sprint 1).

Add a short "Troubleshooting" subsection covering:
- "Cart returns 404 after login" → user has no cart for that restaurant yet (expected; first add-to-cart creates one).
- "Webhook signature verification fails" → confirm you're using the raw body parser branch (already handled in `main.ts` for the webhook path).
- "Socket connection drops after 30s" → check `Authorization` header is being sent on handshake; tokens expire after 15 min.

---

## WHAT NOT TO DO

- No UI work.
- Do not change `notify()`, Tailwind tokens, shadcn init, or `<StripeProvider>` — all UI-sprint territory.
- Do not add loyalty revoke logic — Sprint 11.
- Do not add per-user redemption counting for guests — documented as a known limitation; revisit if it becomes a real abuse vector.
- Do not implement item-level BOGO logic — deferred to Sprint 7 per Sprint 3's decision #7.
- Do not change the existing migrations. New migrations only.
- Do not bump Nest, Fastify, Prisma, or any major dep. Pure code changes + one new repeatable job.
- Do not touch `apps/*/src/features/orders/hooks/use-live-orders.ts` beyond the placeholder fix in B.1 — Sprint 6 will build the UI around this hook.
- Do not split the api-client into per-resource files — the inline pattern is locked.
- Do not "fix" Biome lint on `apps/api` — wait for Biome 2.

---

## REPORTING

Single final report at `.claude/reports/pre-sprint-6-hardening-complete.md` covering:

- Per-phase summary of files created/modified.
- All verification commands run + results (typecheck, lint, unit, e2e, manual smoke).
- **Decisions Applied** section: which §DEFAULTS triggered.
- **Open decisions for review**: anything you had to pick conservatively.
- **Diff in test counts**: e.g., "e2e 43 → 50 (+3 charge.refunded, +1 cart cascade, +6 realtime)".
- Known gaps remaining (anything from the Sprint 2-5 reports that is still deferred, with a one-line reason).
- Anything I should know before kicking off Sprint 6.

---

## START

1. Read all reference files.
2. Write `.claude/plans/pre-sprint-6-hardening.md`.
3. Implement Phase A → B → C → D, running verification between phases.
4. Single stop gate after writing the final report.
