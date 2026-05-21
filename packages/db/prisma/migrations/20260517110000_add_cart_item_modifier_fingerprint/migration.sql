-- Cart line dedup (W3 fix): add stable modifier-selection hash and a
-- compound unique key so CartService.addItem can upsert-and-increment
-- instead of creating duplicate lines.
--
-- The fingerprint is computed by apps/api/src/cart/modifier-validation.ts
-- `modifierFingerprint(snapshot)`:
--   sorted "groupId:optionId" pairs joined with "|", or "∅" for an empty
--   selection set.
--
-- Backfill strategy: existing rows are unique by (cartId, menuItemId, '∅')
-- as a starting point — they aren't currently deduplicated, but the unique
-- index would conflict if two existing rows share the same cart+menuItem.
-- We therefore:
--   1. Add the column with default "∅" (NOT NULL via default — Postgres
--      backfills atomically).
--   2. Backfill in a single UPDATE using the persisted modifierSnapshot JSON
--      so existing distinct selections get distinct fingerprints.
--   3. Add the unique index. If duplicates exist at this point (because the
--      pre-fix codebase happily made them), we collapse them in step 4 by
--      merging quantities into the lowest-id row per group.

-- Step 1: add column with default.
ALTER TABLE "CartItem"
  ADD COLUMN "modifierFingerprint" TEXT NOT NULL DEFAULT '∅';

-- Step 2: backfill from modifierSnapshot.
--   modifierSnapshot is an array of { groupId, groupName, optionId, optionName, priceDelta }.
--   The fingerprint is sorted "groupId:optionId" pairs joined by "|", or "∅" empty.
UPDATE "CartItem" ci
SET "modifierFingerprint" = COALESCE(sub.fp, '∅')
FROM (
  SELECT
    ci2.id,
    CASE
      WHEN jsonb_array_length(ci2."modifierSnapshot"::jsonb) = 0 THEN '∅'
      ELSE (
        SELECT string_agg(pair, '|' ORDER BY pair)
        FROM (
          SELECT ((elem->>'groupId') || ':' || (elem->>'optionId')) AS pair
          FROM jsonb_array_elements(ci2."modifierSnapshot"::jsonb) AS elem
        ) pairs
      )
    END AS fp
  FROM "CartItem" ci2
) sub
WHERE ci.id = sub.id;

-- Step 3: collapse pre-existing duplicates (the bug-state rows) — merge
-- quantities into the row with the smallest id; delete the rest.
WITH dups AS (
  SELECT
    "cartId",
    "menuItemId",
    "modifierFingerprint",
    MIN(id) AS keeper_id,
    SUM(quantity)::int AS total_qty,
    array_agg(id) AS all_ids
  FROM "CartItem"
  GROUP BY "cartId", "menuItemId", "modifierFingerprint"
  HAVING COUNT(*) > 1
)
UPDATE "CartItem" ci
SET quantity = dups.total_qty
FROM dups
WHERE ci.id = dups.keeper_id;

DELETE FROM "CartItem"
WHERE id IN (
  SELECT unnest(array_remove(dups.all_ids, dups.keeper_id))
  FROM (
    SELECT
      MIN(id) AS keeper_id,
      array_agg(id) AS all_ids
    FROM "CartItem"
    GROUP BY "cartId", "menuItemId", "modifierFingerprint"
    HAVING COUNT(*) > 1
  ) dups
);

-- Step 4: add the compound unique index.
CREATE UNIQUE INDEX "CartItem_cartId_menuItemId_modifierFingerprint_key"
  ON "CartItem"("cartId", "menuItemId", "modifierFingerprint");
