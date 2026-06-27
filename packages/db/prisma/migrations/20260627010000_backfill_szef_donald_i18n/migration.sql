-- Data backfill (no schema change). Populates the EN translation columns and
-- the corrected SEO fields on an existing (production) database, since the
-- production deploy runs `prisma migrate deploy` but never `seed`.
--
-- Safe + idempotent: every statement is an UPDATE keyed by a stable slug/name,
-- so it sets the same values on re-run and affects 0 rows where a row is
-- absent. In fresh/seeded environments (CI) this migration runs against empty
-- tables *before* the seed, so it is a harmless no-op there. `sameAs` is left
-- untouched so owner-managed social links in admin are never clobbered.

-- Restaurant (single tenant) — fix stale geo + fill discovery fields + EN copy.
UPDATE "Restaurant" SET
  "description"   = 'Kebab i falafel na świeżo — Kielce, ul. Ściegiennego. Wszystko robione na miejscu.',
  "descriptionEn" = 'Fresh kebab and falafel in Kielce, on Ściegiennego — everything made to order.',
  "geoPoint"      = '{"lat": 50.8478329, "lng": 20.6231079}'::jsonb,
  "servesCuisine" = ARRAY['Kebab', 'Falafel', 'Middle Eastern', 'Turkish', 'Vegetarian'],
  "priceRange"    = '20–40 zł';

-- Categories
UPDATE "MenuCategory" SET "nameEn"='Kebab',                "descriptionEn"='Meat (chicken, beef or mixed) with fresh salad and sauce.' WHERE "slug"='kebab';
UPDATE "MenuCategory" SET "nameEn"='Vegetarian — Falafel', "descriptionEn"='Falafel and salad with mild, mixed or spicy sauce.'        WHERE "slug"='falafel';
UPDATE "MenuCategory" SET "nameEn"='Box Strips & Tacos',   "descriptionEn"='Chicken strips and tacos.'                                  WHERE "slug"='strips-tacos';
UPDATE "MenuCategory" SET "nameEn"='Combo Deals',          "descriptionEn"='Kebab + Coca-Cola 0.5L at a combo price.'                   WHERE "slug"='zestawy';
UPDATE "MenuCategory" SET "nameEn"='Sides',                "descriptionEn"='Fries and dessert.'                                         WHERE "slug"='dodatki';
UPDATE "MenuCategory" SET "nameEn"='Cold Drinks',          "descriptionEn"='Soft drinks, juices and water.'                             WHERE "slug"='napoje-zimne';

-- Items
UPDATE "MenuItem" SET "nameEn"='Kebab Tortilla (Wrap)', "descriptionEn"='Döner kebab in a tortilla wrap — chicken, beef or mixed meat with fresh salad and your choice of sauce.' WHERE "slug"='kebab-tortilla';
UPDATE "MenuItem" SET "nameEn"='Kebab in Pita',         "descriptionEn"='Döner kebab in pita bread — meat, fresh salad and sauce.'  WHERE "slug"='kebab-pita';
UPDATE "MenuItem" SET "nameEn"='Kebab in a Bun',        "descriptionEn"='Döner kebab in a bun — meat, fresh salad and sauce.'       WHERE "slug"='kebab-w-bulce';
UPDATE "MenuItem" SET "nameEn"='Kapsalon',              "descriptionEn"='Meat over fries, topped with melted cheese and sauce.'     WHERE "slug"='kebab-kapsalon';
UPDATE "MenuItem" SET "nameEn"='Kebab Plate',           "descriptionEn"='Döner kebab on a plate — meat, fresh salad and sauce.'     WHERE "slug"='kebab-na-talerzu';
UPDATE "MenuItem" SET "nameEn"='Kebab Box',             "descriptionEn"='Meat, fresh salad, fries and sauce in a box.'             WHERE "slug"='kebab-box';
UPDATE "MenuItem" SET "nameEn"='Fryto Kebab',           "descriptionEn"='Meat, fresh salad, fries and sauce wrapped in a tortilla.' WHERE "slug"='fryto-kebab';
UPDATE "MenuItem" SET "nameEn"='Kebab Salad',           "descriptionEn"='Salad with kebab meat, fresh veg and sauce.'              WHERE "slug"='salatka-kebab';
UPDATE "MenuItem" SET "nameEn"='Falafel Tortilla (Wrap)', "descriptionEn"='Falafel in a tortilla wrap with salad and sauce.'        WHERE "slug"='tortilla-falafel';
UPDATE "MenuItem" SET "nameEn"='Falafel in a Bun',      "descriptionEn"='Falafel in a bun with salad and sauce.'                   WHERE "slug"='bulka-falafel';
UPDATE "MenuItem" SET "nameEn"='Falafel in Pita',       "descriptionEn"='Falafel in pita bread with salad and sauce.'             WHERE "slug"='pita-falafel';
UPDATE "MenuItem" SET "nameEn"='Falafel Plate',         "descriptionEn"='Falafel on a plate with salad and sauce.'                WHERE "slug"='talerz-falafel';
UPDATE "MenuItem" SET "nameEn"='Chicken Strips Box',    "descriptionEn"='Chicken strips with fries, fresh salad and sauce.'        WHERE "slug"='box-strips';
UPDATE "MenuItem" SET "nameEn"='Tacos',                 "descriptionEn"='Three chicken strips in a tortilla with cheese, sauce, iceberg lettuce and fries.' WHERE "slug"='tacos';
UPDATE "MenuItem" SET "nameEn"='Medium Kebab Tortilla + Coca-Cola 0.5L', "descriptionEn"='Medium kebab tortilla with a Coca-Cola 0.5L. Save 2 zł.' WHERE "slug"='zestaw-kebab-tortilla-sredni-cola';
UPDATE "MenuItem" SET "nameEn"='Large Kapsalon + Coca-Cola 0.5L',        "descriptionEn"='Large kapsalon with a Coca-Cola 0.5L. Save 2 zł.'        WHERE "slug"='zestaw-kapsalon-duzy-cola';
UPDATE "MenuItem" SET "nameEn"='Small Fries',           "descriptionEn"='Small portion of fries.' WHERE "slug"='frytki-male';
UPDATE "MenuItem" SET "nameEn"='Large Fries',           "descriptionEn"='Large portion of fries.' WHERE "slug"='frytki-duze';
UPDATE "MenuItem" SET "nameEn"='Baklava',               "descriptionEn"='Traditional baklava.'    WHERE "slug"='baklawa';
UPDATE "MenuItem" SET "nameEn"='Coca-Cola',             "descriptionEn"='0.5L' WHERE "slug"='coca-cola';
UPDATE "MenuItem" SET "nameEn"='Coca-Cola Zero',        "descriptionEn"='0.5L' WHERE "slug"='coca-cola-zero';
UPDATE "MenuItem" SET "nameEn"='Coca-Cola Light',       "descriptionEn"='0.5L' WHERE "slug"='coca-cola-light';
UPDATE "MenuItem" SET "nameEn"='Fanta',                 "descriptionEn"='0.5L' WHERE "slug"='fanta';
UPDATE "MenuItem" SET "nameEn"='Sprite',                "descriptionEn"='0.5L' WHERE "slug"='sprite';
UPDATE "MenuItem" SET "nameEn"='Kinley',                "descriptionEn"='0.5L' WHERE "slug"='kinley';
UPDATE "MenuItem" SET "nameEn"='Kropla Beskidu',        "descriptionEn"='Still water 0.5L' WHERE "slug"='kropla-beskidu';
UPDATE "MenuItem" SET "nameEn"='Fuze Tea',              "descriptionEn"='0.5L' WHERE "slug"='fuze-tea';
UPDATE "MenuItem" SET "nameEn"='Cappy',                 "descriptionEn"='Juice 0.33L' WHERE "slug"='cappy';
UPDATE "MenuItem" SET "nameEn"='Burn',                  "descriptionEn"='Energy drink 0.25L' WHERE "slug"='burn';

-- Modifier groups
UPDATE "MenuItemModifierGroup" SET "nameEn"='Size'    WHERE "name"='Rozmiar';
UPDATE "MenuItemModifierGroup" SET "nameEn"='Meat'    WHERE "name"='Mięso';
UPDATE "MenuItemModifierGroup" SET "nameEn"='Sauce'   WHERE "name"='Sos';
UPDATE "MenuItemModifierGroup" SET "nameEn"='Add-ons' WHERE "name"='Dodatki';

-- Modifier options
UPDATE "MenuItemModifierOption" SET "nameEn"='Mild'        WHERE "name"='Łagodny';
UPDATE "MenuItemModifierOption" SET "nameEn"='Spicy'       WHERE "name"='Ostry';
UPDATE "MenuItemModifierOption" SET "nameEn"='Mixed'       WHERE "name"='Mieszany';
UPDATE "MenuItemModifierOption" SET "nameEn"='Chicken'     WHERE "name"='Kurczak';
UPDATE "MenuItemModifierOption" SET "nameEn"='Beef'        WHERE "name"='Wołowina';
UPDATE "MenuItemModifierOption" SET "nameEn"='Mixed'       WHERE "name"='Mieszane';
UPDATE "MenuItemModifierOption" SET "nameEn"='Cheese'      WHERE "name"='Ser żółty';
UPDATE "MenuItemModifierOption" SET "nameEn"='Feta'        WHERE "name"='Ser feta';
UPDATE "MenuItemModifierOption" SET "nameEn"='Extra sauce' WHERE "name"='Dodatkowy sos';
UPDATE "MenuItemModifierOption" SET "nameEn"='Packaging'   WHERE "name"='Opakowanie';
UPDATE "MenuItemModifierOption" SET "nameEn"='Small'       WHERE "name"='Mały';
UPDATE "MenuItemModifierOption" SET "nameEn"='Medium'      WHERE "name"='Średni';
UPDATE "MenuItemModifierOption" SET "nameEn"='Large'       WHERE "name"='Duży';
UPDATE "MenuItemModifierOption" SET "nameEn"='Mega'        WHERE "name"='Mega';
UPDATE "MenuItemModifierOption" SET "nameEn"='Standard'    WHERE "name"='Standard';
UPDATE "MenuItemModifierOption" SET "nameEn"='Standard (2 pcs)' WHERE "name"='Standard (2 szt)';
UPDATE "MenuItemModifierOption" SET "nameEn"='Medium (3 pcs)'   WHERE "name"='Średni (3 szt)';
UPDATE "MenuItemModifierOption" SET "nameEn"='Large (4 pcs)'    WHERE "name"='Duży (4 szt)';
UPDATE "MenuItemModifierOption" SET "nameEn"='Mega (5 pcs)'     WHERE "name"='Mega (5 szt)';
UPDATE "MenuItemModifierOption" SET "nameEn"='Small (3 pcs)'    WHERE "name"='Mały (3 szt)';
UPDATE "MenuItemModifierOption" SET "nameEn"='Standard (3 pcs)' WHERE "name"='Standard (3 szt)';
