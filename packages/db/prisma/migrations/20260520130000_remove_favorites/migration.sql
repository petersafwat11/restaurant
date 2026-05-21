-- Drop the Favorite table. Favorites were dropped from the product — for a
-- single-restaurant ordering site, the repeat-order signal is better served
-- by order history. The cross-references on User and MenuItem disappear with
-- the table.

ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_userId_fkey";
ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_menuItemId_fkey";

DROP INDEX IF EXISTS "Favorite_userId_menuItemId_key";
DROP INDEX IF EXISTS "Favorite_userId_createdAt_idx";

DROP TABLE IF EXISTS "Favorite";
