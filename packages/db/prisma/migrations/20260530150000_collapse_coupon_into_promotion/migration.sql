-- Collapse Coupon into Promotion: one promotion = one coupon code.
-- Dev data is throwaway, so we drop existing coupon rows + redemptions; carts
-- pointing at coupons become coupon-less.

-- 1. Drop FK constraints from dependents.
ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "Cart_appliedCouponId_fkey";
ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_couponId_fkey";
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_promotionId_fkey";

-- 2. Rename Cart.appliedCouponId → Cart.appliedPromotionId, and null it out
--    (we can't preserve the link — the source rows are about to be deleted).
ALTER TABLE "Cart" RENAME COLUMN "appliedCouponId" TO "appliedPromotionId";
UPDATE "Cart" SET "appliedPromotionId" = NULL;

-- 3. Rename CouponRedemption.couponId → promotionId, then clear those rows
--    (redemption history was tied to specific coupon rows that are going away).
ALTER TABLE "CouponRedemption" RENAME COLUMN "couponId" TO "promotionId";
TRUNCATE TABLE "CouponRedemption";

-- 4. Drop the Coupon table entirely.
DROP TABLE "Coupon";

-- 5. Add the coupon fields to Promotion.
ALTER TABLE "Promotion" ADD COLUMN "code" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "maxRedemptions" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN "perUserLimit" INTEGER DEFAULT 1;
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- 6. Re-add the FKs against Promotion.
ALTER TABLE "Cart"
  ADD CONSTRAINT "Cart_appliedPromotionId_fkey"
  FOREIGN KEY ("appliedPromotionId") REFERENCES "Promotion"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
