-- Sprint 7 — Restaurant settings columns, StaffInvite, CustomerNote.

ALTER TABLE "Restaurant"
  ADD COLUMN "defaultDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryZones" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "holidayDates" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "reservationSlotMinutes" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "reservationBufferMinutes" INTEGER NOT NULL DEFAULT 15;

CREATE TABLE "StaffInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "restaurantId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffInvite_tokenHash_key" ON "StaffInvite"("tokenHash");
CREATE INDEX "StaffInvite_email_idx" ON "StaffInvite"("email");

CREATE TABLE "CustomerNote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "byUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerNote_userId_createdAt_idx" ON "CustomerNote"("userId", "createdAt");
