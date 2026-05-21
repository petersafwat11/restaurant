-- Order activity timeline: distinguish status transitions from staff notes.
-- Existing rows are all status transitions; default `STATUS_CHANGE` backfills
-- them atomically. NOTE events store the current order status (non-null
-- column) so the timeline can still sort and label correctly.

CREATE TYPE "OrderEventKind" AS ENUM ('STATUS_CHANGE', 'NOTE');

ALTER TABLE "OrderStatusEvent"
  ADD COLUMN "kind" "OrderEventKind" NOT NULL DEFAULT 'STATUS_CHANGE';

CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx"
  ON "OrderStatusEvent" ("orderId", "createdAt");
