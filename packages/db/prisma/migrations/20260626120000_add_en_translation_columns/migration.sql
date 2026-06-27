-- EN translation columns. Polish columns remain the source/default; these
-- nullable EN columns are served per-locale on the public menu + SEO endpoints
-- and fall back to the PL value when null. All nullable, so existing rows pass
-- through without backfill.

ALTER TABLE "Restaurant"
  ADD COLUMN "descriptionEn" TEXT;

ALTER TABLE "MenuCategory"
  ADD COLUMN "nameEn"        TEXT,
  ADD COLUMN "descriptionEn" TEXT;

ALTER TABLE "MenuItem"
  ADD COLUMN "nameEn"        TEXT,
  ADD COLUMN "descriptionEn" TEXT;

ALTER TABLE "MenuItemModifierGroup"
  ADD COLUMN "nameEn" TEXT;

ALTER TABLE "MenuItemModifierOption"
  ADD COLUMN "nameEn" TEXT;
