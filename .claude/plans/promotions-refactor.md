# Promotions refactor — drawer-only flow + 1:1 coupon

## Goals

1. **Remove the "name + type" popup.** Clicking "New Promotion" opens the side drawer directly in "create" mode. Save persists a new promotion in one shot.
2. **One promotion = one coupon code** (not many). Collapse the `Coupon` model into `Promotion`. Replace the multi-row coupon table with a single inline "Coupon code" section in the drawer.

---

## Schema change (packages/db/prisma/schema.prisma)

Move coupon fields onto `Promotion` and drop `Coupon`:

```prisma
model Promotion {
  id             String    @id @default(cuid())
  name           String
  description    String?
  type           String
  value          Decimal?  @db.Decimal(10, 2)
  minSubtotal    Decimal?  @db.Decimal(10, 2)
  startsAt       DateTime?
  endsAt         DateTime?
  isActive       Boolean   @default(true)
  isArchived     Boolean   @default(false)
  archivedAt     DateTime?

  // moved from Coupon
  code           String?   @unique
  maxRedemptions Int?
  perUserLimit   Int?      @default(1)

  redemptions    CouponRedemption[]
  appliedToCarts Cart[]

  @@index([isArchived])
}

model CouponRedemption {
  id          String   @id @default(cuid())
  promotionId String                       // renamed from couponId
  userId      String?
  orderId     String?
  createdAt   DateTime @default(now())

  promotion Promotion @relation(fields: [promotionId], references: [id], onDelete: Cascade)
  user      User?     @relation(fields: [userId], references: [id])
}

// Cart: rename couponId → promotionId, relation points to Promotion
```

- `code` is optional+unique so promotions can exist as drafts; once set, no two promotions can share it.
- `Coupon` model removed entirely.
- Migration: new `20260530xxxxxx_collapse_coupon_into_promotion` will (a) add columns to Promotion, (b) backfill from any existing Coupon rows (1:1 by promotionId — picking the first/earliest if multiple), (c) rename `Cart.couponId` and `CouponRedemption.couponId` to `promotionId` and repoint FKs, (d) drop `Coupon`.

  Since this is a fresh-ish project (Sprint 2+ pending) and data is from seed, I'll write the migration as a straight schema reshape — backfill only from the single most-recent coupon per promotion. I'll call this out so you can sanity-check before running it.

---

## Backend (apps/api/src/promotions)

- **promotions.service.ts**
  - `create()` accepts the full DTO (name, type, value, schedule, code, maxRedemptions, perUserLimit, isActive). Validates code uniqueness.
  - `update()` allows patching any field, including `code`.
  - Remove `createCoupon`, `bulkGenerateCoupons`, `listCoupons`, `removeCoupon`.
  - `validate()` looks up `Promotion` by `code` instead of `Coupon`. Redemption counting uses `promotion.redemptions`.
  - `toPromotionDto()` now includes coupon fields + redemptions count.
- **promotions.controller.ts**
  - Drop `GET/POST/POST-bulk/DELETE /promotions/:id/coupons` and `DELETE /coupons/:id`.
  - Keep `POST /coupons/validate` (used by checkout) but it now resolves a Promotion.
- **coupon-validation.ts** — rename internal helper params; logic unchanged.
- **report-generators, scheduler, orders** — search for any callers of removed coupon endpoints / `prisma.coupon.*` and update them. (I'll grep before implementing.)

---

## Shared types (packages/types/src/promotion.ts)

- `PromotionDto` gains `code: string | null`, `maxRedemptions: number | null`, `perUserLimit: number | null`, `redemptionsCount: number`.
- `CreatePromotionDto` becomes the full form (everything optional except `name` + `type`); `UpdatePromotionDto` stays as partial.
- Delete: `CouponDto`, `CreateCouponDto`, `BulkGenerateCouponsDto`, `BulkGenerateCouponsResponseDto`.
- `ValidateCouponResponseDto` keeps the same shape (it returns `promotionId`, `code`, `discountAmount`) — just drop `couponId`.

---

## api-client (packages/api-client/src/client.ts)

- Remove `promotions.listCoupons / createCoupon / bulkGenerateCoupons` and `coupons.delete`.
- Keep `coupons.validate` (public endpoint, used in checkout).

---

## Admin frontend (apps/admin/src/features/promotions)

- **Delete** `create-promotion-modal.tsx` + its export from `components/index.ts`.
- **Delete** `promotion-coupons.tsx` + the `useCoupons / useCreateCoupon / useBulkGenerateCoupons` hooks.
- **promotions-list.tsx**: "New Promotion" button now sets `selectedId = 'new'` (sentinel) instead of opening the modal. Drop `createOpen` state.
- **promotion-drawer.tsx**:
  - Add "new" mode: when `promotion` is null/sentinel, render an empty form; the save button calls `create()` instead of `update()`; on success, switch to the newly created promotion's id.
  - Replace the `<PromotionCoupons />` section with an inline "Coupon code" section: three fields — `code` (text), `maxRedemptions` (number, blank = ∞), `perUserLimit` (number, blank = ∞) — wired into the same save flow.
  - Show `redemptionsCount` as a read-only "Used" line next to the code field.
- **promotions-table.tsx / row UI** — if it currently reads coupon count, swap to `redemptionsCount` / `code`.

---

## i18n

- `packages/i18n/messages/{en,pl}/admin/promotions/list.json`: drop the `create` modal strings.
- `packages/i18n/messages/{en,pl}/admin/promotions/detail.json`: replace the `coupons` section (Code/Used/Max/Per user table + bulk gen) with single-coupon labels: `coupon.title`, `coupon.code`, `coupon.maxRedemptions`, `coupon.perUserLimit`, `coupon.used`.

---

## Tests

- Update `apps/api/test/promotions.e2e-spec.ts` (or wherever): drop coupon-CRUD tests; add a "create promotion with code in one POST" happy path; keep a validate-coupon happy path that now finds it via Promotion.
- Frontend tests touching the create modal / coupons table: delete or rewrite to match the new drawer flow.

---

## Build order

1. Schema + migration + `pnpm --filter @repo/db generate`.
2. Shared types in `packages/types`.
3. Backend service/controller + remove dead files.
4. api-client.
5. Admin frontend: drawer rewrite, delete create-modal + coupons component, list wiring.
6. i18n EN + PL.
7. Search-and-fix any stragglers (`prisma.coupon`, `couponId` references in carts/orders/scheduler/exports).
8. Run typecheck + tests.

---

## Things I want to confirm before starting

- **Existing data.** Any real promotions/coupons in dev DB you care about, or is it all reseedable? I'll write the migration as a hard reshape (picking one coupon per promotion) on the assumption that it's reseedable. Say the word if not.
- **"Code" required on create?** I'm planning code as optional/nullable so a promotion can be saved as a draft before you pick the code. OK, or do you want code required?
- **Cart relation rename.** `Cart.couponId → promotionId` ripples through checkout. I'll handle it but flagging since it touches the customer app too.
