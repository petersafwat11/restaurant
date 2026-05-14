-- Sprint 4 — Poland-relevant payment methods + per-restaurant tax + webhook dedupe.

-- Add Polish payment methods to the enum. PAYMOB stays (unused but cheap).
ALTER TYPE "PaymentMethodKind" ADD VALUE IF NOT EXISTS 'P24';
ALTER TYPE "PaymentMethodKind" ADD VALUE IF NOT EXISTS 'BLIK';

-- Per-restaurant tax rate (default: Polish reduced-rate VAT on prepared food
-- = 8% as of plan date; verify before launch).
ALTER TABLE "Restaurant"
  ADD COLUMN "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.08;

-- Webhook idempotency table. Storing the event id as the primary key keeps
-- the dedupe O(1) and a unique-constraint violation surfaces double-deliveries.
CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEvent_provider_type_idx" ON "WebhookEvent"("provider", "type");
