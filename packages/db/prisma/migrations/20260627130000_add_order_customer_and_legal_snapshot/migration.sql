-- Order customer snapshot + durable legal-acceptance evidence (plan §C1/§C2).
-- All additive + nullable. `acceptedTermsAt` is intentionally retained for
-- back-compat with already-running code; a later migration drops it once the
-- new legal-bundle fields are fully wired and backfilled.

ALTER TABLE "Order"
  -- C1: immutable customer snapshot (required for guest receipts/notifications)
  ADD COLUMN "customerName"       TEXT,
  ADD COLUMN "customerEmail"      TEXT,
  ADD COLUMN "customerPhone"      TEXT,
  ADD COLUMN "checkoutLocale"     TEXT,
  -- C2: server-generated legal acceptance evidence
  ADD COLUMN "legalAcceptedAt"    TIMESTAMP(3),
  ADD COLUMN "legalBundleVersion" TEXT,
  ADD COLUMN "legalSnapshot"      JSONB,
  ADD COLUMN "legalSnapshotHash"  TEXT;
