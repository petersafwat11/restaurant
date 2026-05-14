# Pre-Sprint-6 Hardening — Completion Report

> Source prompt: `docs/sprints/pre-sprint-6-hardening-prompt.md`
> Plan: `.claude/plans/pre-sprint-6-hardening.md`
> Completed: 2026-05-15

## Status: ✅ Done — awaiting review before Sprint 6 kicks off

All four phases (A correctness · B Sprint-6 blockers · C quality/coverage · D docs) shipped. No UI written — strictly backend + hooks + tests + docs.

| Verification | Result |
|---|---|
| `pnpm typecheck` | 15/15 packages green |
| `pnpm lint` | 3/4 lintable packages green; `@repo/admin` has 2 pre-existing Biome errors in Sprint 7/8 code (out of scope — see below) |
| `pnpm test` | utils 10 + web 10 + admin 6 + api 37 = **63/63 unit tests pass** (was 39; +20 from new + extended) |
| `pnpm --filter @repo/api test:e2e` | **60/60 e2e tests pass** (was 43; +17) |
| `pnpm --filter @repo/db migrate:deploy` | applied `20260515100000_pre_sprint_6_cart_coupon_cascade` cleanly |

---

## Per-phase summary

### Phase A — Correctness fixes

**A.1 Stripe `charge.refunded` dashboard sync**
- `apps/api/src/payments/provider.interface.ts` — extended `ParsedWebhookEvent` with `refunds[]` + `amountRefunded` for `charge.refunded` payloads.
- `apps/api/src/payments/providers/stripe.provider.ts` — `parsedFromStripeEvent` now reads `data.object.refunds.data[]` + `amount_refunded` from the charge object; added `fromMinorUnits` helper.
- `apps/api/src/payments/payments.service.ts` — new private `syncDashboardRefund(event)` creates missing `Refund` rows (matched on `Refund.providerRef`), updates `Payment.status`, calls `OrdersService.forceTransition(..., 'REFUNDED', null, 'Refunded via Stripe dashboard')` on full refunds. Every dashboard-originated refund logs with `[STRIPE_DASHBOARD_REFUND]`. WebhookEvent-table dedupe at the top of `handleStripeWebhook` keeps this idempotent end-to-end.
- `apps/api/src/payments/payments.module.ts` — imports `OrdersModule` so `OrdersService.forceTransition` is injectable.
- `PaymentsService.refund()` already wrote `result.providerRef` to `Refund.providerRef` (Sprint 4) — verified, no change needed.
- Stub mode: handler runs the same path; tests exercise it under stub mode.
- **Tests** (`payments.e2e-spec.ts`): 3 new — unknown refund id → row + REFUNDED transition; replay → idempotent; refund id matching an existing `Refund.providerRef` → no-op.

**A.2 Cart.appliedCouponId cascade**
- `packages/db/prisma/schema.prisma` — explicit `onDelete: SetNull` on `Cart.appliedCoupon`.
- `packages/db/prisma/migrations/20260515100000_pre_sprint_6_cart_coupon_cascade/migration.sql` — drops + recreates the FK with explicit `ON DELETE SET NULL`. The initial migration's generated SQL was already SET NULL by Prisma default; this migration pins the intent in the repo.
- **Test** (`promotions.e2e-spec.ts`): hard-delete a coupon with no redemptions, confirm dependent cart's `appliedCouponId` is `null`.

### Phase B — Sprint 6 blockers

**B.1 Realtime payload now carries full list-item shape**
- `packages/types/src/order.ts` — `OrderListItemSchema` gained `restaurantId: z.string()` and `customerName: z.string().nullable()` (nullable to handle guest orders cleanly per advisor feedback).
- `packages/types/src/realtime.ts` — both `OrderCreatedEventSchema` and `OrderStatusChangedEventSchema` extended with `type`, `grandTotal`, `currency`, `itemCount`, `customerName`. `OrderCancelledEventSchema` and `OrderRefundedEventSchema` inherit the new fields via `.extend()` chain.
- `packages/realtime-client/src/index.ts` — event map references the inferred types; no change needed.
- `apps/api/src/orders/orders.service.ts`:
  - `create()` builds the full `OrderCreatedEvent` and loads `customerName` via a new private helper `loadCustomerName(userId)` that picks `firstName + lastName` then falls back to `email`.
  - `applyTransition()` loads `itemCount` + `customerName` in parallel and emits the enriched `OrderStatusChangedEvent`.
  - `list()` populates `restaurantId` + `customerName` on every row (DB query includes `user.{firstName,lastName,email}`).
- `apps/api/src/realtime/realtime.gateway.ts` — kitchen ticket relayers now pass through `itemCount` from the source event (previously zeroed).
- `apps/admin/src/features/orders/hooks/use-live-orders.ts` — drops the `'PICKUP'` placeholder and consumes the payload directly (`event.type`, `event.itemCount`, `event.customerName`).
- **Test** (`apps/admin/src/features/orders/hooks/__tests__/use-live-orders.test.ts`): MSW + mocked realtime client. Seeds a cached order list, fires `order.created` with `type: 'DELIVERY'`, asserts the prepended row has `type === 'DELIVERY'` (not the placeholder), `itemCount === 3`, `customerName === 'Anna K.'`. **Scope:** covers `order.created` only. The `order.status_changed` handler in the same hook still patches only `status` on existing rows (it doesn't read the new fields), so adding test coverage there would be testing nothing extra today. Worth a follow-up if Sprint 6 starts consuming `customerName`/`itemCount` on status changes.

**B.2 Realtime e2e test**
- `apps/api/test/realtime.e2e-spec.ts` — new file (6 scenarios).
- Boots the API on a random port via `app.listen(0, '127.0.0.1')` so a real `socket.io-client` can connect. Applies `IoAdapter` against the same instance.
- Scenarios:
  1. Unauthenticated socket connection is disconnected.
  2. Order owner subscribes to `order:{ownId}` → `ok: true`.
  3. Other user subscribing to the same room → `ok: false`.
  4. Subscribed customer receives `order.status_changed` when admin posts to `/orders/:id/status`.
  5. Subscriber on `restaurant:{id}:orders` receives `order.created` with `type` set.
  6. Subscriber on `restaurant:{id}:kitchen` receives `kitchen.ticket_added` on CONFIRMED → PREPARING.
- Helpers (`waitForConnect`, `waitForEvent`, `subscribe`) all use 3s timeouts.

### Phase C — Quality + coverage

**C.1 Receipt PDF snapshot test**
- `apps/api/src/jobs/receipt-pdf.tsx` — new `receiptTextLines(input)` returns the ordered list of visible strings the receipt renders. Snapshot of this is the stable substitute for parsing the binary PDF (`@react-pdf/renderer` output isn't deterministic across versions; the contract we care about is the text).
- `apps/api/src/jobs/receipt-pdf.spec.ts` — 3 tests: happy-path snapshot, refunded variant snapshot, contract substring checks (restaurant name, order number, line items, totals labels, PLN `zł` symbol).
- Snapshot files: `apps/api/src/jobs/__snapshots__/receipt-pdf.spec.ts.snap` (auto-committed on first run).
- **Honest scope of this test.** The snapshot covers `receiptTextLines` — a *parallel* description of the receipt's visible strings. The JSX renderer and `receiptTextLines` share `formatMoney` and the same label strings, but they aren't structurally derived from a single source of truth. If a future edit (e.g. Sprint 11's i18n pass) changes a translated label in the JSX and forgets to update the helper, the snapshot will still pass. The cleanest follow-up is to either (a) refactor the renderer to iterate `receiptTextLines` as its source of truth (collapsing the two), or (b) `Font.register` a TTF in test setup and run a real `renderToBuffer` + decompressed-stream text grep. Picked the lighter option this pass; flagged here so Sprint 11 can decide.
- The end-to-end PDF render is **not** exercised in the unit suite: `@react-pdf/textkit` needs a TTF registered for its text-layout pass, which is a heavy fixture for a unit test. The receipt queue+worker path remains exercised through the existing e2e suite.

**C.2 R2 image orphan cleanup**
- `apps/api/src/uploads/uploads.service.ts`:
  - new `extractKeyFromUrl(url)` — inverse of `publicUrlForKey` covering stub / R2-public-URL / R2-endpoint shapes.
  - new `deleteObject(key)` — best-effort `DeleteObjectCommand`, errors logged (sweep is the safety net).
  - new `listAllKeys()` async generator — paginated `ListObjectsV2Command`.
  - exposes `isStubMode` getter for the sweep processor.
- `apps/api/src/menu/menu.service.ts` — `removeItemImage()` now extracts the key from the row URL and calls `uploads.deleteObject(key)` after the DB delete.
- `apps/api/src/jobs/r2-orphan-cleanup.processor.ts` — new BullMQ processor; `onModuleInit()` enqueues a repeatable job at `cron: '0 3 * * *', tz: 'UTC'`. The processor lists every R2 object, intersects against `MenuItemImage.url`-derived keys, deletes everything older than 7 days that's not referenced. Stub mode logs `skipping — R2 not configured` and exits.
- `packages/jobs/src/queues.ts` — `QUEUE_R2_CLEANUP` + `JOB_R2_ORPHAN_SWEEP`.
- `apps/api/src/bullmq/bullmq.module.ts` + `apps/api/src/jobs/jobs.module.ts` — queue registration + processor wiring + `UploadsModule` import.
- Per §DEFAULTS #5: no unit test (R2 SDK mocking is heavy; logic is straightforward). Behavior documented in `docs/local-setup.md`.

**C.3 `formatMoney` locale pinning**
- `packages/utils/src/money.ts` — `formatMoney(value, currency, locale?)`. Currency-to-locale map: `PLN → pl-PL`, `EUR → de-DE`, `GBP → en-GB`, `USD → en-US`, default `en-US`. Caller-supplied locale wins.
- `packages/utils/src/money.test.ts` — 4 new cases: PLN renders with `zł` suffix, USD with `$` prefix, EUR with `€`, explicit locale override works. Uses `.toMatch()` (not exact equality) because `Intl.NumberFormat` emits a NBSP between number and symbol whose exact codepoint varies across Node ICU builds.
- `apps/api/src/jobs/receipt-pdf.tsx` — every displayed amount routes through `formatMoney(value, currency)` (line items, totals breakdown, "Refunded" line). Snapshot tests for C.1 capture the pinned output.

### Phase D — Documentation

`docs/local-setup.md` — appended a "Live-mode credentials" section covering Stripe, Cloudflare R2, Twilio, Resend, Expo Push (env vars, stub behavior, switch-to-live trigger, `stripe listen` command, P24/BLIK enablement) and a "Troubleshooting" subsection covering the three documented failure modes from the prompt.

---

## Decisions Applied (from §DEFAULTS)

| # | Default | Applied as |
|---|---|---|
| 1 | Migration naming `pre_sprint_6_<topic>` | `20260515100000_pre_sprint_6_cart_coupon_cascade` |
| 2 | Realtime payload changes are additive | `OrderCreatedEvent` / `OrderStatusChangedEvent` gained 4 fields; nothing removed; event names unchanged |
| 3 | Snapshot tests use `toMatchSnapshot()` with `.snap` file | Used for `receiptTextLines` — PDF byte output not snapshotted (per default's caveat) |
| 4 | PLN → pl-PL locale | Implemented in the `CURRENCY_LOCALE` map |
| 5 | R2 orphan cleanup: daily 03:00 UTC, 7-day soft window | Processor `R2OrphanCleanupProcessor` matches exactly |
| 6 | `charge.refunded` handler creates rows + transitions on full | Implemented in `syncDashboardRefund` |
| 7 | Cart FK `onDelete: SetNull` | Both in `schema.prisma` and the migration |
| 8 | `useLiveOrders` placeholder fix via payload extension | `event.type` etc. flow straight through |

---

## Open decisions for review

1. **The Sprint-3 known gap claimed Cart.appliedCouponId had no cascade**, but inspecting the initial migration shows `ON DELETE SET NULL` was already there (Prisma's default for an optional relation). The new migration drops + recreates the FK with **explicit** referential actions and the schema file gained `onDelete: SetNull`. Effectively this codifies the intent rather than fixing a real defect. If you'd rather not run a no-op migration on prod DBs, we can revert just the migration file and keep the schema-side change. (Choosing to keep the migration so the intent is auditable.)
2. **`OrderListItemDto` schema gained two required fields** (`restaurantId`, `customerName`). Every backend producer is updated. Frontend hooks only read the field, so consumers remain backwards-compatible. Any external integration that parses the DTO will need to handle the new fields.
3. **`PaymentsModule` now imports `OrdersModule`** to call `OrdersService.forceTransition` on dashboard-originated refunds. This is the same pattern Sprint 5 set up for the existing admin refund flow's order transition (which used `prisma.order.update` directly). Both paths converging through the state machine is the cleanest place to land; happy to push the admin refund flow onto `forceTransition` too in a future pass.
4. **PDF e2e snapshot is text-only, not byte-stable**. The `renderReceiptPdf` end-to-end render is deliberately not invoked in the unit suite because `@react-pdf/textkit` requires fonts registered to lay out text. The receipt queue+worker path still runs end-to-end in dev/staging; the snapshot covers the contract (text + ordering + locale formatting) that Sprint 11's i18n pass will need a regression net for.
5. **Admin lint baseline degraded between Sprint 5 and this pass.** The Sprint 5 status report claims "4/4 lintable packages green." `pnpm --filter @repo/admin lint` now reports 2 errors and 1 warning in files I did not touch (`src/features/reports/hooks/index.ts` formatter and `src/lib/notify.ts` suppression-unused — both presumably introduced during the Sprint 7/8 work whose migrations and src/ trees are already in the repo). I verified `biome check` is clean on every file I added or edited. Flagging so the reviewer knows the regression predates this pass; happy to fix in a follow-up if you'd like the lint board green before Sprint 6.

---

## Diff in test counts

| Suite | Before | After | Delta |
|---|---|---|---|
| API unit | 18 | 37 | +3 receipt-pdf, **+16 from Sprint 7/8 specs that were already present** |
| API e2e | 43 | 60 | +3 charge.refunded, +1 cart cascade, +6 realtime, **+7 from Sprint 7/8 specs that were already present** |
| Admin unit | 5 | 6 | +1 use-live-orders |
| Utils unit | 6 | 10 | +4 formatMoney locale |
| Web unit | 10 | 10 | — |
| Mobile unit | 0 | 0 | — |

(The pre-existing Sprint 7/8 specs were already in `apps/api/test/` and `apps/api/src/.../*.spec.ts` when I started — they show up in the totals but aren't this pass's work.)

---

## Files created/modified

**Created**
- `packages/db/prisma/migrations/20260515100000_pre_sprint_6_cart_coupon_cascade/migration.sql`
- `apps/api/src/jobs/r2-orphan-cleanup.processor.ts`
- `apps/api/src/jobs/receipt-pdf.spec.ts`
- `apps/api/src/jobs/__snapshots__/receipt-pdf.spec.ts.snap` (auto-generated)
- `apps/api/test/realtime.e2e-spec.ts`
- `apps/admin/src/features/orders/hooks/__tests__/use-live-orders.test.ts`
- `.claude/plans/pre-sprint-6-hardening.md`
- `.claude/reports/pre-sprint-6-hardening-complete.md`

**Modified**
- `packages/db/prisma/schema.prisma`
- `packages/types/src/order.ts`
- `packages/types/src/realtime.ts`
- `packages/utils/src/money.ts`
- `packages/utils/src/money.test.ts`
- `packages/jobs/src/queues.ts`
- `apps/api/src/payments/payments.service.ts`
- `apps/api/src/payments/payments.module.ts`
- `apps/api/src/payments/provider.interface.ts`
- `apps/api/src/payments/providers/stripe.provider.ts`
- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/realtime/realtime.gateway.ts`
- `apps/api/src/menu/menu.service.ts`
- `apps/api/src/uploads/uploads.service.ts`
- `apps/api/src/jobs/jobs.module.ts`
- `apps/api/src/jobs/receipt-pdf.tsx`
- `apps/api/src/bullmq/bullmq.module.ts`
- `apps/api/test/payments.e2e-spec.ts`
- `apps/api/test/promotions.e2e-spec.ts`
- `apps/admin/src/features/orders/hooks/use-live-orders.ts`
- `docs/local-setup.md`

---

## Verification commands run

```bash
pnpm --filter @repo/db migrate:deploy    # applied the cart_coupon_cascade migration
pnpm typecheck                            # 15/15 green
pnpm lint                                 # 3/4 (admin: pre-existing Sprint 7/8 issues — see Open decisions #5)
pnpm test                                 # 63/63 unit tests pass
pnpm --filter @repo/api test:e2e          # 60/60 e2e tests pass
```

---

## Known gaps remaining (still deferred to their proper sprint)

From the Sprint 2-5 reports' open lists:

- **Real R2 credentials in dev** — `.env` still defaults to stub mode. Live-mode toggle now documented in `docs/local-setup.md`. (Operational, not code.)
- **Per-user redemption counting for guest carts** — coupons with `perUserLimit: 1` can technically be reused by guests since we only count authed redemptions. Acceptable per Sprint 3's explicit decision.
- **Item-level BOGO logic** — still flat-discount in `coupon-validation.ts`. Deferred to Sprint 7 per Sprint 3 decision #7.
- **Loyalty point revoke on refund** — Loyalty module doesn't ship until Sprint 11; the TODO comment in `payments.service` survives.
- **Biome lint on `apps/api`** — still skipped; Biome 1.9's parameter-decorator gap is unchanged. Bump on Biome 2.
- **`notify()` is still `console.log`** — UI sprint replaces.
- **`<StripeProvider>` not initialized in mobile** — UI/Sprint 9.
- **Tailwind tokens / shadcn init** — UI sprint.

---

## Notes for Sprint 6

- `useLiveOrders` returns rows with real `type`, `customerName`, `itemCount`, `restaurantId` — Sprint 6 can render the live orders list and the type column will be correct from the moment the row arrives, not just after the next refetch.
- `OrderListItemDto` now mirrors what the live orders list needs end-to-end. The admin orders list endpoint (`GET /orders`) populates the same fields; Sprint 6's admin-side filtered list (per-restaurant) can use the same DTO.
- Realtime e2e suite is in place — Sprint 6's new socket-driven UI can rely on this regression net.
- Receipt template is locale-pinned. When Sprint 11 layers per-user locale on top, only the `formatMoney` `locale` parameter needs to flow down — the renderer is already structured for it.
- Stripe dashboard refund sync closes a real correctness gap that would have surfaced as soon as someone in support hit the refund button in the Stripe Dashboard. The `[STRIPE_DASHBOARD_REFUND]` log prefix makes it easy to grep for in production.
