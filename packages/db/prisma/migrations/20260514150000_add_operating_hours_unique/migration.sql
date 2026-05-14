-- Sprint 2 — atomic-upsert support for PUT /restaurants/:id/hours.
-- Adds a unique key on (restaurantId, dayOfWeek) so the 7-day replace
-- operation can be modeled as an upsert loop in one transaction instead of
-- delete-then-create.

-- Drop the existing index that overlaps; the unique index supersedes it.
DROP INDEX IF EXISTS "OperatingHours_restaurantId_idx";

CREATE UNIQUE INDEX "OperatingHours_restaurantId_dayOfWeek_key"
  ON "OperatingHours"("restaurantId", "dayOfWeek");
