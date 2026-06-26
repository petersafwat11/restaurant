-- AlterTable: owner/staff new-order alert configuration on Restaurant
ALTER TABLE "Restaurant"
  ADD COLUMN     "orderAlertSmsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "orderAlertWhatsAppEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "orderAlertWebPushEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN     "orderAlertPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN     "orderAlertWhatsApp" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: browser Web Push subscriptions for the admin PWA
CREATE TABLE "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "WebPushSubscription_userId_idx" ON "WebPushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
