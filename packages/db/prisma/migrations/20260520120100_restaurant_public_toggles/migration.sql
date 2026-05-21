-- Per-channel acceptance flags on Restaurant. These gate the public ordering /
-- reservation surfaces without requiring a full unpublish. Defaults are `true`
-- to preserve current behavior for existing restaurants.

ALTER TABLE "Restaurant"
  ADD COLUMN "acceptsReservations" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "acceptsDelivery"     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "acceptsPickup"       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "acceptsDineIn"       BOOLEAN NOT NULL DEFAULT TRUE;
