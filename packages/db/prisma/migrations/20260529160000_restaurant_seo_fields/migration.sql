-- Discovery / SEO fields on Restaurant. `servesCuisine` and `sameAs` are
-- exposed in the public DTO and emitted as schema.org JSON-LD on every
-- public page; `priceRange` follows schema.org's "$"–"$$$$" convention.
-- Defaults chosen so existing rows pass through without manual backfill.

ALTER TABLE "Restaurant"
  ADD COLUMN "servesCuisine" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "priceRange"    TEXT,
  ADD COLUMN "sameAs"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
