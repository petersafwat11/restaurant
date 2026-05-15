-- Sprint 10 — marketing + SEO: contact form inbox.

CREATE TABLE "ContactMessage" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "handledByUserId" TEXT,
  "handledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
CREATE INDEX "ContactMessage_restaurantId_createdAt_idx" ON "ContactMessage"("restaurantId", "createdAt");
