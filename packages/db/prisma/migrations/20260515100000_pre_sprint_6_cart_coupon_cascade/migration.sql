-- Pre-Sprint-6 hardening: pin Cart.appliedCouponId FK behavior to SET NULL
-- so coupon hard-deletes leave the cart pointing at null instead of dangling.
--
-- The initial migration already declared SET NULL (Prisma's default for an
-- optional relation), but the schema.prisma file was implicit. We drop and
-- recreate the constraint with explicit referential actions so the intent is
-- checked into the repo.

ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "Cart_appliedCouponId_fkey";

ALTER TABLE "Cart"
  ADD CONSTRAINT "Cart_appliedCouponId_fkey"
  FOREIGN KEY ("appliedCouponId") REFERENCES "Coupon"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
