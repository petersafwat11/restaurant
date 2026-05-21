-- Admin phase 3 remaining: promotion archive, review moderation states,
-- contact notes/replies, customer tags. Apply with `pnpm --filter @repo/db migrate:dev`.

-- Promotion: soft-archive support.
ALTER TABLE "Promotion"
  ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Promotion_restaurantId_isArchived_idx"
  ON "Promotion"("restaurantId", "isArchived");

-- Review: explicit moderation status (PUBLISHED/HIDDEN/FLAGGED) + flag reason.
-- Backfill: existing rows where isVisible=true → 'PUBLISHED', else 'HIDDEN'.
ALTER TABLE "Review"
  ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "flagReason" TEXT;

UPDATE "Review"
  SET "moderationStatus" = CASE WHEN "isVisible" THEN 'PUBLISHED' ELSE 'HIDDEN' END;

CREATE INDEX "Review_moderationStatus_idx" ON "Review"("moderationStatus");

-- Contact: per-message notes (kind = NOTE | REPLY).
CREATE TABLE "ContactNote" (
  "id"        TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "kind"      TEXT NOT NULL DEFAULT 'NOTE',
  "body"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactNote_messageId_createdAt_idx"
  ON "ContactNote"("messageId", "createdAt");

ALTER TABLE "ContactNote"
  ADD CONSTRAINT "ContactNote_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "ContactMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Customer tags (catalogue + many-to-many to User).
CREATE TABLE "CustomerTag" (
  "id"        TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "color"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerTag_slug_key" ON "CustomerTag"("slug");

CREATE TABLE "UserTag" (
  "userId"    TEXT NOT NULL,
  "tagId"     TEXT NOT NULL,
  "byUserId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserTag_pkey" PRIMARY KEY ("userId", "tagId")
);

CREATE INDEX "UserTag_tagId_idx"  ON "UserTag"("tagId");
CREATE INDEX "UserTag_userId_idx" ON "UserTag"("userId");

ALTER TABLE "UserTag"
  ADD CONSTRAINT "UserTag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
