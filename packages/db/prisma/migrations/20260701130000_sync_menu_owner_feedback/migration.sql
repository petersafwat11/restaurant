-- Data backfill (no schema change). Syncs the production Szef Donald menu +
-- config to the current seed after the owner's feedback round.
--
-- Why: production runs `prisma migrate deploy` but never `seed`, so its menu
-- rows are frozen at launch. Every change made to seed.ts since then (recipe
-- fixes, prices, the tacos→kebab move, "Polędwiczki" rename, the salad→fries
-- swap, the free delivery / 7 km radius / opening hours) only lives in seed.ts.
-- This migration applies those same values to the live rows.
--
-- Safe + idempotent: scalar changes are UPDATEs keyed by a stable slug / name
-- (same result on re-run, 0 rows where the target is absent); new modifier
-- options/groups use guarded INSERT ... WHERE NOT EXISTS so nothing is
-- duplicated. Runs against empty tables in CI (before the seed) as a no-op.

-- ---------------------------------------------------------------------------
-- 1. Restaurant operational config (owner: free delivery, 7 km, new hours)
-- ---------------------------------------------------------------------------
UPDATE "Restaurant" SET "defaultDeliveryFee" = 0, "deliveryRadiusKm" = 7 WHERE "name" = 'Szef Donald';

-- Opening hours: Mon–Fri 10:00–21:00, Sat 12:00–21:00, Sun closed.
UPDATE "OperatingHours" SET "opensAt" = '10:00', "closesAt" = '21:00', "isClosed" = false WHERE "dayOfWeek" BETWEEN 1 AND 5;
UPDATE "OperatingHours" SET "opensAt" = '12:00', "closesAt" = '21:00', "isClosed" = false WHERE "dayOfWeek" = 6;
UPDATE "OperatingHours" SET "isClosed" = true WHERE "dayOfWeek" = 0;

-- ---------------------------------------------------------------------------
-- 2. Categories: rename "Polędwiczki i Tacos" → "Polędwiczki" (tacos move to
--    kebab below); pin the display order (falafel second-to-last, drinks last).
-- ---------------------------------------------------------------------------
UPDATE "MenuCategory" SET
  "name"          = 'Polędwiczki',
  "nameEn"        = 'Polędwiczki',
  "description"   = 'Polędwiczki z kurczaka — frytki, surówki i sos.',
  "descriptionEn" = 'Chicken tenders with fries, salad and sauce.'
WHERE "slug" = 'strips-tacos';

UPDATE "MenuCategory" SET "position" = 0 WHERE "slug" = 'kebab';
UPDATE "MenuCategory" SET "position" = 1 WHERE "slug" = 'strips-tacos';
UPDATE "MenuCategory" SET "position" = 2 WHERE "slug" = 'zestawy';
UPDATE "MenuCategory" SET "position" = 3 WHERE "slug" = 'dodatki';
UPDATE "MenuCategory" SET "position" = 4 WHERE "slug" = 'falafel';
UPDATE "MenuCategory" SET "position" = 5 WHERE "slug" = 'napoje-zimne';

-- ---------------------------------------------------------------------------
-- 3. Move the Tacos item under Kebab (owner: tacos are part of the kebab
--    family). (categoryId, slug) stays unique — kebab has no 'tacos' yet.
-- ---------------------------------------------------------------------------
UPDATE "MenuItem" SET
  "categoryId"    = (SELECT "id" FROM "MenuCategory" WHERE "slug" = 'kebab'),
  "position"      = 8,
  "description"   = 'Ser, sos, sałata lodowa, frytki i 3 polędwiczki w tortilli.',
  "descriptionEn" = 'Three chicken tenders in a tortilla with cheese, sauce, iceberg lettuce and fries.'
WHERE "slug" = 'tacos';

-- ---------------------------------------------------------------------------
-- 4. Item names + recipes
-- ---------------------------------------------------------------------------
-- Polędwiczki item — drop the word "strips" (PL + EN).
UPDATE "MenuItem" SET
  "name"          = 'Polędwiczki',
  "nameEn"        = 'Polędwiczki',
  "description"   = 'Polędwiczki + frytki + surówki + sos.',
  "descriptionEn" = 'Chicken tenders with fries, fresh salad and sauce.'
WHERE "slug" = 'box-strips';

-- Box: meat + fries + sauce, NO salad (prod EN wrongly said "fresh salad").
UPDATE "MenuItem" SET
  "description"   = 'Mięso, frytki i sos w boxie.',
  "descriptionEn" = 'Meat, fries and sauce in a box.'
WHERE "slug" = 'kebab-box';

-- Plate: meat + fries + salad + sauce (prod EN was missing the fries).
UPDATE "MenuItem" SET
  "description"   = 'Kebab na talerzu — mięso, frytki, surówki i sos.',
  "descriptionEn" = 'Döner kebab on a plate — meat, fries, fresh salad and sauce.'
WHERE "slug" = 'kebab-na-talerzu';

-- ---------------------------------------------------------------------------
-- 5. Prices
-- ---------------------------------------------------------------------------
-- Combo Tortilla Średni + Cola: 34 → 31 (a real ~1.50 zł saving).
UPDATE "MenuItem" SET
  "basePrice"     = 31.00,
  "descriptionEn" = 'Medium kebab tortilla with a Coca-Cola 0.5L. Save 1.50 zł.'
WHERE "slug" = 'zestaw-kebab-tortilla-sredni-cola';

-- Extra sauce add-on: 1 → 3 zł.
UPDATE "MenuItemModifierOption" SET "priceDelta" = 3.00 WHERE "name" = 'Dodatkowy sos';

-- ---------------------------------------------------------------------------
-- 6. Ensure the owner's option groups exist on the wraps + plate (guarded, so
--    re-runs and already-present rows are untouched). Applies to Tortilla,
--    Pita, Bułka and the Plate. New rows get a generated id (Prisma's cuid
--    default is client-side, so raw SQL supplies one).
-- ---------------------------------------------------------------------------
-- Salad→fries swap group ("Zamiana").
INSERT INTO "MenuItemModifierGroup" ("id", "itemId", "name", "nameEn", "isRequired", "minSelect", "maxSelect")
SELECT gen_random_uuid()::text, i."id", 'Zamiana', 'Swap', false, 0, 1
FROM "MenuItem" i
WHERE i."slug" IN ('kebab-tortilla', 'kebab-pita', 'kebab-w-bulce', 'kebab-na-talerzu')
  AND NOT EXISTS (
    SELECT 1 FROM "MenuItemModifierGroup" g WHERE g."itemId" = i."id" AND g."name" = 'Zamiana'
  );

-- "Holenderski" swap option (fries instead of salad) — 9 zł.
INSERT INTO "MenuItemModifierOption" ("id", "groupId", "name", "nameEn", "priceDelta", "isDefault")
SELECT gen_random_uuid()::text, g."id", 'Holenderski (frytki zamiast sałatki)', 'Holenderski (fries instead of salad)', 9.00, false
FROM "MenuItemModifierGroup" g
JOIN "MenuItem" i ON i."id" = g."itemId"
WHERE g."name" = 'Zamiana'
  AND i."slug" IN ('kebab-tortilla', 'kebab-pita', 'kebab-w-bulce', 'kebab-na-talerzu')
  AND NOT EXISTS (
    SELECT 1 FROM "MenuItemModifierOption" o
    WHERE o."groupId" = g."id" AND o."name" = 'Holenderski (frytki zamiast sałatki)'
  );

-- Extra fries add-on (+5 zł) in the "Dodatki" group.
INSERT INTO "MenuItemModifierOption" ("id", "groupId", "name", "nameEn", "priceDelta", "isDefault")
SELECT gen_random_uuid()::text, g."id", 'Frytki', 'Fries', 5.00, false
FROM "MenuItemModifierGroup" g
JOIN "MenuItem" i ON i."id" = g."itemId"
WHERE g."name" = 'Dodatki'
  AND i."slug" IN ('kebab-tortilla', 'kebab-pita', 'kebab-w-bulce', 'kebab-na-talerzu')
  AND NOT EXISTS (
    SELECT 1 FROM "MenuItemModifierOption" o WHERE o."groupId" = g."id" AND o."name" = 'Frytki'
  );

-- Extra meat add-on (+10 zł) in the "Dodatki" group.
INSERT INTO "MenuItemModifierOption" ("id", "groupId", "name", "nameEn", "priceDelta", "isDefault")
SELECT gen_random_uuid()::text, g."id", 'Dodatkowe mięso', 'Extra meat', 10.00, false
FROM "MenuItemModifierGroup" g
JOIN "MenuItem" i ON i."id" = g."itemId"
WHERE g."name" = 'Dodatki'
  AND i."slug" IN ('kebab-tortilla', 'kebab-pita', 'kebab-w-bulce', 'kebab-na-talerzu')
  AND NOT EXISTS (
    SELECT 1 FROM "MenuItemModifierOption" o WHERE o."groupId" = g."id" AND o."name" = 'Dodatkowe mięso'
  );
