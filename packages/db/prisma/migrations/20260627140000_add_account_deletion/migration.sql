-- Account deletion / anonymisation workflow (GDPR erasure, plan §G2).
-- All additive: a new enum type + nullable columns on "User". Pseudonymisation
-- happens in application code (the BullMQ anonymisation job) — the row is never
-- deleted (Review.userId is FK-restrict; retained orders keep their user link).

-- Lifecycle enum. MUST match the Zod `AccountDeletionStatusSchema` enum in
-- packages/types/src/account-deletion.ts and the Prisma `AccountDeletionStatus`.
CREATE TYPE "AccountDeletionStatus" AS ENUM ('NONE', 'PENDING', 'CANCELLED', 'COMPLETED');

ALTER TABLE "User"
  ADD COLUMN "deletionStatus"              "AccountDeletionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "deletionRequestedAt"         TIMESTAMP(3),
  ADD COLUMN "deletionScheduledAt"         TIMESTAMP(3),
  ADD COLUMN "deletionReason"              TEXT,
  -- Single-use email-confirmation token (SHA-256 hash; raw token never stored).
  ADD COLUMN "deletionConfirmTokenHash"    TEXT,
  ADD COLUMN "deletionConfirmTokenExpires" TIMESTAMP(3),
  ADD COLUMN "anonymisedAt"                TIMESTAMP(3);
