-- Data backfill (no schema change). Populates the `grams` portion sizes on
-- MenuItem + MenuItemModifierOption and the `allergens` declarations on
-- MenuItem, on an existing (production) database.
--
-- Why this is needed: production deploy runs `prisma migrate deploy` but never
-- `seed`. The `grams` columns were added by 20260621120000 (MenuItem) and
-- 20260629120000 (MenuItemModifierOption), and `allergens` by 20260624120000,
-- but their *values* only ever lived in seed.ts — so on production every
-- MenuItem.grams / option grams is NULL and allergens is empty. The earlier
-- i18n backfill (20260627010000) covered the EN/SEO columns but not these.
--
-- Safe + idempotent: every statement is an UPDATE keyed by a stable
-- slug / group+option name, so it sets the same values on re-run and touches 0
-- rows where the target is absent. In fresh/seeded environments (CI) this runs
-- against empty tables *before* the seed, so it is a harmless no-op there.
-- Values mirror packages/db/seed.ts exactly.

-- MenuItem net portion weight (grams). Only the kebab items carry a weight.
UPDATE "MenuItem" SET "grams" = 150 WHERE "slug" = 'kebab-tortilla';
UPDATE "MenuItem" SET "grams" = 150 WHERE "slug" = 'kebab-pita';
UPDATE "MenuItem" SET "grams" = 150 WHERE "slug" = 'kebab-w-bulce';
UPDATE "MenuItem" SET "grams" = 250 WHERE "slug" = 'kebab-kapsalon';
UPDATE "MenuItem" SET "grams" = 150 WHERE "slug" = 'kebab-na-talerzu';
UPDATE "MenuItem" SET "grams" = 150 WHERE "slug" = 'kebab-box';
UPDATE "MenuItem" SET "grams" = 200 WHERE "slug" = 'fryto-kebab';
UPDATE "MenuItem" SET "grams" = 150 WHERE "slug" = 'salatka-kebab';

-- MenuItem allergens (EU FIC 1169/2011 keys). Only the items the seed declares
-- are touched — other items are left untouched so any admin-entered allergens
-- are never clobbered.
UPDATE "MenuItem" SET "allergens" = ARRAY['gluten','milk','sesame'] WHERE "slug" = 'kebab-tortilla';
UPDATE "MenuItem" SET "allergens" = ARRAY['gluten','milk','sesame'] WHERE "slug" = 'kebab-w-bulce';
UPDATE "MenuItem" SET "allergens" = ARRAY['gluten','milk']          WHERE "slug" = 'kebab-kapsalon';
UPDATE "MenuItem" SET "allergens" = ARRAY['milk','sesame']          WHERE "slug" = 'kebab-na-talerzu';

-- Size-option meat weight (grams). Scoped to the kebab size group ("Rozmiar")
-- so the bare size names never collide with the falafel/strips size options,
-- which are named "… (N szt)" and correctly carry no weight.
UPDATE "MenuItemModifierOption" o SET "grams" = 150
  FROM "MenuItemModifierGroup" g
  WHERE o."groupId" = g."id" AND g."name" = 'Rozmiar' AND o."name" = 'Mały';
UPDATE "MenuItemModifierOption" o SET "grams" = 200
  FROM "MenuItemModifierGroup" g
  WHERE o."groupId" = g."id" AND g."name" = 'Rozmiar' AND o."name" = 'Średni';
UPDATE "MenuItemModifierOption" o SET "grams" = 150
  FROM "MenuItemModifierGroup" g
  WHERE o."groupId" = g."id" AND g."name" = 'Rozmiar' AND o."name" = 'Standard';
UPDATE "MenuItemModifierOption" o SET "grams" = 250
  FROM "MenuItemModifierGroup" g
  WHERE o."groupId" = g."id" AND g."name" = 'Rozmiar' AND o."name" = 'Duży';
UPDATE "MenuItemModifierOption" o SET "grams" = 300
  FROM "MenuItemModifierGroup" g
  WHERE o."groupId" = g."id" AND g."name" = 'Rozmiar' AND o."name" = 'Mega';
