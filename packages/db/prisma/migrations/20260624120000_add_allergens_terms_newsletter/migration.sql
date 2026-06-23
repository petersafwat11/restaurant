-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "allergens" TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "acceptedTermsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'pl',
    "status" "NewsletterStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "source" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_token_key" ON "NewsletterSubscriber"("token");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");
