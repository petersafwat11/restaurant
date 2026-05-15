-- Sprint 9 — mobile polish + push: notification prefs, review images, push token lifecycle.

ALTER TABLE "PushToken" ADD COLUMN "lastUsedAt" TIMESTAMP(3);

CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderUpdatesPush" BOOLEAN NOT NULL DEFAULT true,
  "orderUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
  "orderUpdatesSms" BOOLEAN NOT NULL DEFAULT true,
  "promotionsPush" BOOLEAN NOT NULL DEFAULT false,
  "promotionsEmail" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReviewImage" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewImage_reviewId_idx" ON "ReviewImage"("reviewId");

ALTER TABLE "ReviewImage"
  ADD CONSTRAINT "ReviewImage_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
