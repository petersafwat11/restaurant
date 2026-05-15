-- Sprint 11 — i18n + Loyalty earn/redeem + Reviews + Favorites + Referral.

-- Loyalty: lifetime points (drives tier, never decremented on redeem) +
-- transaction kind + DB-level idempotency for per-order earn/redeem.
ALTER TABLE "LoyaltyAccount" ADD COLUMN "lifetimePoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ADJUST';
CREATE UNIQUE INDEX "LoyaltyTransaction_accountId_orderId_kind_key" ON "LoyaltyTransaction"("accountId", "orderId", "kind");

-- Cart carries the points the customer chose to redeem at checkout.
ALTER TABLE "Cart" ADD COLUMN "loyaltyPointsToRedeem" INTEGER NOT NULL DEFAULT 0;

-- Reviews: owner reply.
ALTER TABLE "Review" ADD COLUMN "ownerReply" TEXT;
ALTER TABLE "Review" ADD COLUMN "ownerReplyAt" TIMESTAMP(3);

-- Favorites.
CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Favorite_userId_menuItemId_key" ON "Favorite"("userId", "menuItemId");
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Referral program.
CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferralCode_userId_key" ON "ReferralCode"("userId");
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Referral" (
  "id" TEXT NOT NULL,
  "codeId" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "refereeId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rewardGranted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");
CREATE INDEX "Referral_referrerId_createdAt_idx" ON "Referral"("referrerId", "createdAt");
CREATE INDEX "Referral_status_idx" ON "Referral"("status");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
