/**
 * Seed script. Idempotent — safe to re-run.
 *
 * Sprint 1: permissions + roles + 2 test users.
 * Sprint 2: 1 Polish restaurant (Europe/Warsaw, PLN) + 6 categories +
 *           ~30 menu items + 5 items with modifier groups + operating hours.
 *
 * Later sprints append their own seed functions below; do NOT rewrite the
 * earlier seeders.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Keep this list in sync with packages/types/src/permissions.ts.
const ALL_PERMISSIONS = [
	"order:read",
	"order:create",
	"order:update",
	"order:status_update",
	"order:cancel",
	"order:refund",
	"menu:read",
	"menu:write",
	"restaurant:read",
	"restaurant:write",
	"customer:read",
	"customer:write",
	"customer:notes",
	"promotion:read",
	"promotion:write",
	"reservation:read",
	"reservation:write",
	"review:read",
	"review:moderate",
	"staff:read",
	"staff:write",
	"reports:read",
	"settings:read",
	"settings:write",
	"payment:create",
	"payment:read",
	"payment:refund",
	"kitchen:read",
	"analytics:read",
	"report:read",
	"report:export",
	"audit:read",
	"contact:read",
] as const;

type PermissionKey = (typeof ALL_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<string, readonly PermissionKey[]> = {
	owner: ALL_PERMISSIONS,
	manager: ALL_PERMISSIONS.filter(
		(p) => p !== "staff:write" && p !== "settings:write",
	),
	kitchen: ["order:read", "order:status_update", "kitchen:read"],
	cashier: [
		"order:read",
		"order:create",
		"payment:create",
		"payment:read",
		"kitchen:read",
		"reservation:read",
		"reservation:write",
		"customer:read",
	],
	customer: [],
};

const ROLE_NAMES: Record<string, string> = {
	owner: "Owner",
	manager: "Manager",
	kitchen: "Kitchen",
	cashier: "Cashier",
	customer: "Customer",
};

async function seedPermissions() {
	console.log(`▸ Seeding ${ALL_PERMISSIONS.length} permissions`);
	for (const key of ALL_PERMISSIONS) {
		await prisma.permission.upsert({
			where: { key },
			update: {},
			create: { key },
		});
	}
}

async function seedRoles() {
	console.log(`▸ Seeding ${Object.keys(ROLE_PERMISSIONS).length} roles`);
	for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS)) {
		const role = await prisma.role.upsert({
			where: { key: roleKey },
			update: { name: ROLE_NAMES[roleKey] ?? roleKey },
			create: { key: roleKey, name: ROLE_NAMES[roleKey] ?? roleKey },
		});

		await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

		if (perms.length === 0) continue;

		const permissionRows = await prisma.permission.findMany({
			where: { key: { in: [...perms] } },
			select: { id: true },
		});

		await prisma.rolePermission.createMany({
			data: permissionRows.map((p) => ({
				roleId: role.id,
				permissionId: p.id,
			})),
			skipDuplicates: true,
		});
	}
}

async function seedUsers() {
	console.log("▸ Seeding 2 test users");

	const password = "Password123!";
	const passwordHash = await bcrypt.hash(password, 12);

	const ownerRole = await prisma.role.findUniqueOrThrow({
		where: { key: "owner" },
	});
	const customerRole = await prisma.role.findUniqueOrThrow({
		where: { key: "customer" },
	});

	const owner = await prisma.user.upsert({
		where: { email: "owner@local.test" },
		update: { passwordHash, emailVerifiedAt: new Date() },
		create: {
			email: "owner@local.test",
			passwordHash,
			emailVerifiedAt: new Date(),
			firstName: "Olive",
			lastName: "Owner",
		},
	});

	await prisma.userRole.upsert({
		where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
		update: {},
		create: { userId: owner.id, roleId: ownerRole.id },
	});

	const customer = await prisma.user.upsert({
		where: { email: "customer@local.test" },
		update: { passwordHash, emailVerifiedAt: new Date() },
		create: {
			email: "customer@local.test",
			passwordHash,
			emailVerifiedAt: new Date(),
			firstName: "Casey",
			lastName: "Customer",
		},
	});

	await prisma.userRole.upsert({
		where: { userId_roleId: { userId: customer.id, roleId: customerRole.id } },
		update: {},
		create: { userId: customer.id, roleId: customerRole.id },
	});

	console.log(`  • owner@local.test (password: ${password})`);
	console.log(`  • customer@local.test (password: ${password})`);
}

// ---------------------------------------------------------------------------
// Sprint 2 — restaurant + menu
// ---------------------------------------------------------------------------

const RESTAURANT_SLUG = "the-test-kitchen";

async function seedRestaurants() {
	console.log("▸ Seeding restaurant: the-test-kitchen (Europe/Warsaw, PLN)");

	const restaurant = await prisma.restaurant.upsert({
		where: { slug: RESTAURANT_SLUG },
		update: {
			name: "The Test Kitchen",
			description: "A Polish demo restaurant seeded for local development.",
			phone: "+48 22 555 0100",
			email: "hello@thetestkitchen.local",
			timezone: "Europe/Warsaw",
			currency: "PLN",
			isActive: true,
		},
		create: {
			slug: RESTAURANT_SLUG,
			name: "The Test Kitchen",
			description: "A Polish demo restaurant seeded for local development.",
			phone: "+48 22 555 0100",
			email: "hello@thetestkitchen.local",
			address: {
				line1: "ul. Marszałkowska 1",
				city: "Warsaw",
				zip: "00-001",
				country: "PL",
			},
			geoPoint: { lat: 52.2297, lng: 21.0122 },
			timezone: "Europe/Warsaw",
			currency: "PLN",
			isActive: true,
		},
	});

	// 7 days, 11:00-23:00 except Mondays closed.
	const days: Array<{
		dayOfWeek: number;
		opensAt: string;
		closesAt: string;
		isClosed: boolean;
	}> = [
		{ dayOfWeek: 0, opensAt: "12:00", closesAt: "22:00", isClosed: false }, // Sun
		{ dayOfWeek: 1, opensAt: "00:00", closesAt: "00:00", isClosed: true }, // Mon
		{ dayOfWeek: 2, opensAt: "11:00", closesAt: "22:00", isClosed: false },
		{ dayOfWeek: 3, opensAt: "11:00", closesAt: "22:00", isClosed: false },
		{ dayOfWeek: 4, opensAt: "11:00", closesAt: "23:00", isClosed: false },
		{ dayOfWeek: 5, opensAt: "11:00", closesAt: "23:00", isClosed: false },
		{ dayOfWeek: 6, opensAt: "12:00", closesAt: "23:00", isClosed: false },
	];

	for (const d of days) {
		await prisma.operatingHours.upsert({
			where: {
				restaurantId_dayOfWeek: {
					restaurantId: restaurant.id,
					dayOfWeek: d.dayOfWeek,
				},
			},
			update: { opensAt: d.opensAt, closesAt: d.closesAt, isClosed: d.isClosed },
			create: { ...d, restaurantId: restaurant.id },
		});
	}

	return restaurant;
}

interface SeedItem {
	slug: string;
	name: string;
	description: string;
	basePrice: string; // PLN, 2dp string
	isVegetarian?: boolean;
	isVegan?: boolean;
	isGlutenFree?: boolean;
	spiceLevel?: number;
	isFeatured?: boolean;
	calories?: number;
	prepMinutes?: number;
	modifierGroups?: Array<{
		name: string;
		isRequired?: boolean;
		minSelect?: number;
		maxSelect?: number;
		options: Array<{ name: string; priceDelta?: string; isDefault?: boolean }>;
	}>;
}

interface SeedCategory {
	slug: string;
	name: string;
	description: string;
	items: SeedItem[];
}

const CATEGORIES: SeedCategory[] = [
	{
		slug: "starters",
		name: "Starters",
		description: "Small plates to begin your meal.",
		items: [
			{
				slug: "zurek",
				name: "Żurek",
				description: "Traditional sour rye soup with sausage and egg.",
				basePrice: "22.00",
				prepMinutes: 8,
			},
			{
				slug: "pierogi-russkie",
				name: "Pierogi Ruskie",
				description: "Dumplings filled with potato and cottage cheese.",
				basePrice: "28.00",
				isVegetarian: true,
				prepMinutes: 12,
			},
			{
				slug: "bruschetta",
				name: "Bruschetta",
				description: "Toasted bread with tomato, basil and olive oil.",
				basePrice: "18.00",
				isVegan: true,
				prepMinutes: 6,
			},
			{
				slug: "tatar",
				name: "Tatar wołowy",
				description: "Hand-chopped beef tartare with onion and pickles.",
				basePrice: "39.00",
				prepMinutes: 10,
			},
		],
	},
	{
		slug: "mains",
		name: "Mains",
		description: "Hearty main dishes.",
		items: [
			{
				slug: "kotlet-schabowy",
				name: "Kotlet Schabowy",
				description: "Breaded pork cutlet served with mashed potatoes and cabbage.",
				basePrice: "48.00",
				isFeatured: true,
				prepMinutes: 18,
			},
			{
				slug: "golabki",
				name: "Gołąbki",
				description: "Cabbage rolls in tomato sauce.",
				basePrice: "42.00",
				prepMinutes: 16,
			},
			{
				slug: "grilled-salmon",
				name: "Grilled Salmon",
				description: "Atlantic salmon with seasonal vegetables.",
				basePrice: "62.00",
				isGlutenFree: true,
				prepMinutes: 14,
			},
			{
				slug: "risotto-funghi",
				name: "Risotto Funghi",
				description: "Arborio rice with wild mushrooms and parmesan.",
				basePrice: "45.00",
				isVegetarian: true,
				prepMinutes: 18,
			},
			{
				slug: "lamb-shank",
				name: "Braised Lamb Shank",
				description: "Slow-cooked lamb shank with root vegetables.",
				basePrice: "65.00",
				prepMinutes: 25,
			},
		],
	},
	{
		slug: "pizzas",
		name: "Pizzas",
		description: "Wood-fired Neapolitan-style pizzas.",
		items: [
			{
				slug: "margherita",
				name: "Margherita",
				description: "San Marzano tomato, mozzarella, basil.",
				basePrice: "35.00",
				isVegetarian: true,
				prepMinutes: 10,
				isFeatured: true,
				modifierGroups: [
					{
						name: "Size",
						isRequired: true,
						minSelect: 1,
						maxSelect: 1,
						options: [
							{ name: "30 cm", priceDelta: "0", isDefault: true },
							{ name: "40 cm", priceDelta: "12.00" },
						],
					},
					{
						name: "Toppings",
						isRequired: false,
						minSelect: 0,
						maxSelect: 4,
						options: [
							{ name: "Extra mozzarella", priceDelta: "6.00" },
							{ name: "Fresh basil", priceDelta: "2.00" },
							{ name: "Mushrooms", priceDelta: "5.00" },
							{ name: "Olives", priceDelta: "4.00" },
						],
					},
				],
			},
			{
				slug: "pepperoni",
				name: "Pepperoni",
				description: "Tomato, mozzarella, spicy pepperoni.",
				basePrice: "42.00",
				spiceLevel: 2,
				prepMinutes: 10,
				modifierGroups: [
					{
						name: "Size",
						isRequired: true,
						minSelect: 1,
						maxSelect: 1,
						options: [
							{ name: "30 cm", priceDelta: "0", isDefault: true },
							{ name: "40 cm", priceDelta: "12.00" },
						],
					},
				],
			},
			{
				slug: "quattro-formaggi",
				name: "Quattro Formaggi",
				description: "Mozzarella, gorgonzola, parmesan and goat cheese.",
				basePrice: "48.00",
				isVegetarian: true,
				prepMinutes: 11,
			},
			{
				slug: "diavola",
				name: "Diavola",
				description: "Hot salami, chili, mozzarella.",
				basePrice: "44.00",
				spiceLevel: 3,
				prepMinutes: 11,
			},
		],
	},
	{
		slug: "burgers",
		name: "Burgers",
		description: "Hand-formed Polish beef patties.",
		items: [
			{
				slug: "classic-burger",
				name: "Classic Burger",
				description: "Beef patty, cheddar, lettuce, tomato, house sauce.",
				basePrice: "38.00",
				prepMinutes: 12,
				isFeatured: true,
				modifierGroups: [
					{
						name: "Doneness",
						isRequired: true,
						minSelect: 1,
						maxSelect: 1,
						options: [
							{ name: "Medium-rare", priceDelta: "0" },
							{ name: "Medium", priceDelta: "0", isDefault: true },
							{ name: "Well done", priceDelta: "0" },
						],
					},
					{
						name: "Add-ons",
						isRequired: false,
						minSelect: 0,
						maxSelect: 3,
						options: [
							{ name: "Bacon", priceDelta: "6.00" },
							{ name: "Egg", priceDelta: "4.00" },
							{ name: "Avocado", priceDelta: "5.00" },
						],
					},
				],
			},
			{
				slug: "bbq-burger",
				name: "BBQ Burger",
				description: "Beef patty, smoked cheddar, onion rings, BBQ sauce.",
				basePrice: "44.00",
				prepMinutes: 12,
			},
			{
				slug: "veggie-burger",
				name: "Veggie Burger",
				description: "Black-bean patty, avocado, sprouts.",
				basePrice: "36.00",
				isVegetarian: true,
				isVegan: false,
				prepMinutes: 11,
			},
			{
				slug: "chicken-burger",
				name: "Chicken Burger",
				description: "Buttermilk-fried chicken, slaw, pickles.",
				basePrice: "40.00",
				prepMinutes: 12,
			},
		],
	},
	{
		slug: "desserts",
		name: "Desserts",
		description: "Sweet endings.",
		items: [
			{
				slug: "sernik",
				name: "Sernik",
				description: "Polish cheesecake with raisins.",
				basePrice: "18.00",
				isVegetarian: true,
				prepMinutes: 4,
			},
			{
				slug: "szarlotka",
				name: "Szarlotka",
				description: "Warm apple pie with vanilla ice cream.",
				basePrice: "20.00",
				isVegetarian: true,
				prepMinutes: 6,
			},
			{
				slug: "tiramisu",
				name: "Tiramisu",
				description: "Layered mascarpone and coffee dessert.",
				basePrice: "22.00",
				isVegetarian: true,
				prepMinutes: 4,
			},
			{
				slug: "lava-cake",
				name: "Chocolate Lava Cake",
				description: "Molten chocolate cake with vanilla ice cream.",
				basePrice: "24.00",
				isVegetarian: true,
				prepMinutes: 9,
			},
		],
	},
	{
		slug: "drinks",
		name: "Drinks",
		description: "Soft drinks, juices, beer and coffee.",
		items: [
			{
				slug: "still-water",
				name: "Still Water",
				description: "330ml bottle.",
				basePrice: "8.00",
				isVegan: true,
				isGlutenFree: true,
				prepMinutes: 1,
				modifierGroups: [
					{
						name: "Size",
						isRequired: true,
						minSelect: 1,
						maxSelect: 1,
						options: [
							{ name: "330 ml", priceDelta: "0", isDefault: true },
							{ name: "500 ml", priceDelta: "3.00" },
							{ name: "1 L", priceDelta: "6.00" },
						],
					},
				],
			},
			{
				slug: "sparkling-water",
				name: "Sparkling Water",
				description: "330ml bottle.",
				basePrice: "8.00",
				isVegan: true,
				prepMinutes: 1,
			},
			{
				slug: "cola",
				name: "Cola",
				description: "Chilled cola, 330ml.",
				basePrice: "10.00",
				prepMinutes: 1,
			},
			{
				slug: "orange-juice",
				name: "Fresh Orange Juice",
				description: "Squeezed to order, 300ml.",
				basePrice: "14.00",
				isVegan: true,
				prepMinutes: 3,
			},
			{
				slug: "tyskie",
				name: "Tyskie",
				description: "Polish lager on tap, 500ml.",
				basePrice: "13.00",
				prepMinutes: 2,
			},
			{
				slug: "espresso",
				name: "Espresso",
				description: "Single shot.",
				basePrice: "9.00",
				prepMinutes: 2,
			},
			{
				slug: "cappuccino",
				name: "Cappuccino",
				description: "Espresso with steamed milk.",
				basePrice: "12.00",
				prepMinutes: 3,
			},
			{
				slug: "lemonade",
				name: "House Lemonade",
				description: "Lemon, mint, ginger.",
				basePrice: "15.00",
				isVegan: true,
				prepMinutes: 3,
			},
		],
	},
];

async function seedMenu(restaurantId: string) {
	console.log("▸ Seeding 6 categories + ~30 menu items + modifier groups");

	for (const [cIdx, cat] of CATEGORIES.entries()) {
		const category = await prisma.menuCategory.upsert({
			where: {
				restaurantId_slug: { restaurantId, slug: cat.slug },
			},
			update: {
				name: cat.name,
				description: cat.description,
				position: cIdx,
				isActive: true,
			},
			create: {
				restaurantId,
				slug: cat.slug,
				name: cat.name,
				description: cat.description,
				position: cIdx,
				isActive: true,
			},
		});

		for (const [iIdx, it] of cat.items.entries()) {
			const item = await prisma.menuItem.upsert({
				where: {
					categoryId_slug: { categoryId: category.id, slug: it.slug },
				},
				update: {
					name: it.name,
					description: it.description,
					basePrice: new Prisma.Decimal(it.basePrice),
					isVegetarian: it.isVegetarian ?? false,
					isVegan: it.isVegan ?? false,
					isGlutenFree: it.isGlutenFree ?? false,
					spiceLevel: it.spiceLevel ?? 0,
					isFeatured: it.isFeatured ?? false,
					calories: it.calories ?? null,
					prepMinutes: it.prepMinutes ?? null,
					position: iIdx,
					isAvailable: true,
				},
				create: {
					categoryId: category.id,
					slug: it.slug,
					name: it.name,
					description: it.description,
					basePrice: new Prisma.Decimal(it.basePrice),
					isVegetarian: it.isVegetarian ?? false,
					isVegan: it.isVegan ?? false,
					isGlutenFree: it.isGlutenFree ?? false,
					spiceLevel: it.spiceLevel ?? 0,
					isFeatured: it.isFeatured ?? false,
					calories: it.calories ?? null,
					prepMinutes: it.prepMinutes ?? null,
					position: iIdx,
					isAvailable: true,
				},
			});

			if (it.modifierGroups) {
				for (const group of it.modifierGroups) {
					// MenuItemModifierGroup has no natural unique key; look up by
					// (itemId, name) and create if missing.
					const existing = await prisma.menuItemModifierGroup.findFirst({
						where: { itemId: item.id, name: group.name },
					});
					const row = existing
						? await prisma.menuItemModifierGroup.update({
								where: { id: existing.id },
								data: {
									isRequired: group.isRequired ?? false,
									minSelect: group.minSelect ?? 0,
									maxSelect: group.maxSelect ?? 1,
								},
							})
						: await prisma.menuItemModifierGroup.create({
								data: {
									itemId: item.id,
									name: group.name,
									isRequired: group.isRequired ?? false,
									minSelect: group.minSelect ?? 0,
									maxSelect: group.maxSelect ?? 1,
								},
							});

					// Replace options for that group to stay idempotent.
					await prisma.menuItemModifierOption.deleteMany({
						where: { groupId: row.id },
					});
					await prisma.menuItemModifierOption.createMany({
						data: group.options.map((o) => ({
							groupId: row.id,
							name: o.name,
							priceDelta: new Prisma.Decimal(o.priceDelta ?? "0"),
							isDefault: o.isDefault ?? false,
						})),
					});
				}
			}
		}
	}
}

async function seedPromotions(restaurantId: string) {
  console.log('▸ Seeding 3 promotions + coupons (WELCOME10, FREEDEL, BOGO-PIZZA)');

  // WELCOME10 — 10% off, first-order only (perUserLimit: 1).
  const welcome = await upsertPromotionByName(restaurantId, 'Welcome 10%', {
    description: 'Welcome offer — 10% off your first order',
    type: 'PERCENT',
    value: new Prisma.Decimal('10'),
    isActive: true,
  });
  await ensureCoupon(welcome.id, 'WELCOME10', { perUserLimit: 1, maxRedemptions: null });

  // FREEDEL — free delivery, min 100 PLN subtotal.
  const freedel = await upsertPromotionByName(restaurantId, 'Free Delivery', {
    description: 'Free delivery on orders over 100 PLN',
    type: 'FREE_DELIVERY',
    value: null,
    minSubtotal: new Prisma.Decimal('100'),
    isActive: true,
  });
  await ensureCoupon(freedel.id, 'FREEDEL', { perUserLimit: null, maxRedemptions: null });

  // BOGO-PIZZA — buy one get one (estimated 20 PLN savings for cart preview).
  const bogo = await upsertPromotionByName(restaurantId, 'BOGO Pizza', {
    description: 'Buy one pizza, get one half off',
    type: 'BOGO',
    value: new Prisma.Decimal('20'),
    minSubtotal: null,
    isActive: true,
  });
  await ensureCoupon(bogo.id, 'BOGO-PIZZA', { perUserLimit: null, maxRedemptions: 500 });
}

async function upsertPromotionByName(
  restaurantId: string,
  name: string,
  data: {
    description: string;
    type: 'PERCENT' | 'FIXED' | 'BOGO' | 'FREE_DELIVERY';
    value: import('@prisma/client').Prisma.Decimal | null;
    minSubtotal?: import('@prisma/client').Prisma.Decimal | null;
    isActive: boolean;
  },
) {
  const existing = await prisma.promotion.findFirst({
    where: { restaurantId, name },
  });
  if (existing) {
    return prisma.promotion.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        type: data.type,
        value: data.value,
        minSubtotal: data.minSubtotal ?? null,
        isActive: data.isActive,
      },
    });
  }
  return prisma.promotion.create({
    data: {
      restaurantId,
      name,
      description: data.description,
      type: data.type,
      value: data.value,
      minSubtotal: data.minSubtotal ?? null,
      isActive: data.isActive,
    },
  });
}

async function ensureCoupon(
  promotionId: string,
  code: string,
  opts: { perUserLimit: number | null; maxRedemptions: number | null },
) {
  await prisma.coupon.upsert({
    where: { code },
    update: {
      promotionId,
      perUserLimit: opts.perUserLimit,
      maxRedemptions: opts.maxRedemptions,
    },
    create: {
      code,
      promotionId,
      perUserLimit: opts.perUserLimit,
      maxRedemptions: opts.maxRedemptions,
    },
  });
}

// ---------------------------------------------------------------------------
// Sprint 7 — tables, reservations, reviews, delivery zones, staff
// ---------------------------------------------------------------------------

async function seedTables(restaurantId: string) {
  console.log('▸ Seeding 8 tables');
  const tables = [
    { name: 'T1', capacity: 2 },
    { name: 'T2', capacity: 2 },
    { name: 'T3', capacity: 4 },
    { name: 'T4', capacity: 4 },
    { name: 'T5', capacity: 4 },
    { name: 'T6', capacity: 6 },
    { name: 'T7', capacity: 6 },
    { name: 'T8', capacity: 8 },
  ];
  for (const t of tables) {
    const existing = await prisma.table.findFirst({
      where: { restaurantId, name: t.name },
    });
    if (existing) {
      await prisma.table.update({ where: { id: existing.id }, data: { capacity: t.capacity } });
    } else {
      await prisma.table.create({ data: { restaurantId, ...t } });
    }
  }
}

async function seedReservations(restaurantId: string) {
  console.log('▸ Seeding 5 future reservations');
  const customer = await prisma.user.findUnique({ where: { email: 'customer@local.test' } });
  if (!customer) return;
  const tables = await prisma.table.findMany({ where: { restaurantId }, take: 5 });
  for (let i = 0; i < 5; i++) {
    const startAt = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
    startAt.setUTCHours(18, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + 90 * 60 * 1000);
    const existing = await prisma.reservation.findFirst({
      where: { userId: customer.id, startAt },
    });
    if (!existing) {
      await prisma.reservation.create({
        data: {
          userId: customer.id,
          restaurantId,
          tableId: tables[i]?.id ?? null,
          guestCount: 2 + i,
          startAt,
          endAt,
          status: 'confirmed',
          contactName: `${customer.firstName ?? 'Guest'} ${customer.lastName ?? ''}`.trim(),
          contactPhone: '+48 600 000 000',
          notes: i === 0 ? 'Birthday' : null,
        },
      });
    }
  }
}

type SeededOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'CANCELLED';

const STATUS_TRAIL: Record<SeededOrderStatus, SeededOrderStatus[]> = {
  PENDING: ['PENDING'],
  CONFIRMED: ['PENDING', 'CONFIRMED'],
  PREPARING: ['PENDING', 'CONFIRMED', 'PREPARING'],
  READY: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
  COMPLETED: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
  DELIVERED: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'],
  CANCELLED: ['PENDING', 'CANCELLED'],
};

const money = (n: number) => n.toFixed(2);

async function seedOrders(restaurantId: string) {
  const existing = await prisma.order.count({ where: { restaurantId } });
  if (existing > 0) {
    console.log(`▸ Skipping orders — ${existing} already present`);
    return;
  }
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@local.test' },
  });
  const menuItem = await prisma.menuItem.findFirst({
    where: { category: { restaurantId } },
  });
  if (!customer || !menuItem) {
    console.log('▸ Skipping orders — missing customer or menu item');
    return;
  }

  // type · status · days-ago · qty — spread across the last ~10 days so KPI
  // deltas, the admin list, the KDS feed, and recent-orders all have data.
  const specs: Array<{
    type: 'PICKUP' | 'DELIVERY' | 'DINE_IN';
    status: SeededOrderStatus;
    daysAgo: number;
    qty: number;
  }> = [
    { type: 'PICKUP', status: 'PENDING', daysAgo: 0, qty: 1 },
    { type: 'DELIVERY', status: 'CONFIRMED', daysAgo: 0, qty: 2 },
    { type: 'DINE_IN', status: 'PREPARING', daysAgo: 0, qty: 3 },
    { type: 'PICKUP', status: 'READY', daysAgo: 1, qty: 1 },
    { type: 'DELIVERY', status: 'DELIVERED', daysAgo: 2, qty: 2 },
    { type: 'PICKUP', status: 'COMPLETED', daysAgo: 4, qty: 1 },
    { type: 'DINE_IN', status: 'COMPLETED', daysAgo: 7, qty: 4 },
    { type: 'DELIVERY', status: 'CANCELLED', daysAgo: 9, qty: 2 },
  ];

  console.log(`▸ Seeding ${specs.length} orders (mixed status/type, last 10 days)`);
  const unitPrice = Number(menuItem.basePrice);

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i]!;
    const createdAt = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000);
    createdAt.setUTCHours(12, 0, 0, 0);

    const subtotal = unitPrice * s.qty;
    const taxTotal = subtotal * 0.08;
    const deliveryFee = s.type === 'DELIVERY' ? 8 : 0;
    const grandTotal = subtotal + taxTotal + deliveryFee;

    const trail = STATUS_TRAIL[s.status];
    const paid =
      s.status !== 'PENDING' && s.status !== 'CANCELLED';
    const refunded = s.status === 'DELIVERED'; // one partial-refund example

    const order = await prisma.order.create({
      data: {
        orderNumber: `R-2026-9${String(i).padStart(5, '0')}`,
        userId: customer.id,
        restaurantId,
        type: s.type,
        status: s.status,
        subtotal: money(subtotal),
        taxTotal: money(taxTotal),
        deliveryFee: money(deliveryFee),
        tipAmount: '0.00',
        discountTotal: '0.00',
        grandTotal: money(grandTotal),
        currency: 'PLN',
        createdAt,
        items: {
          create: [
            {
              menuItemId: menuItem.id,
              nameSnapshot: menuItem.name,
              quantity: s.qty,
              unitPrice: money(unitPrice),
              lineTotal: money(unitPrice * s.qty),
              modifierSnapshot: [] as unknown as Prisma.InputJsonValue,
              notes: null,
            },
          ],
        },
        statusEvents: {
          create: trail.map((st, idx) => ({
            status: st,
            byUserId: idx === 0 ? customer.id : null,
            note: idx === 0 ? 'Order placed' : null,
            createdAt: new Date(createdAt.getTime() + idx * 5 * 60 * 1000),
          })),
        },
      },
    });

    if (paid) {
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: s.type === 'DINE_IN' ? 'cod' : 'stripe',
          providerRef: `pi_seed_${i}`,
          method: s.type === 'DINE_IN' ? 'COD' : 'STRIPE_CARD',
          amount: money(grandTotal),
          currency: 'PLN',
          status: refunded ? 'PARTIALLY_REFUNDED' : 'PAID',
          createdAt,
        },
      });
      if (refunded) {
        await prisma.refund.create({
          data: {
            paymentId: payment.id,
            amount: money(Math.round(grandTotal * 0.5 * 100) / 100),
            reason: 'Partial refund — missing side',
            providerRef: `re_seed_${i}`,
            createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
          },
        });
      }
    }
  }
}

async function seedReviews() {
  const customer = await prisma.user.findUnique({ where: { email: 'customer@local.test' } });
  if (!customer) return;
  const orders = await prisma.order.findMany({
    where: { userId: customer.id, status: { in: ['COMPLETED', 'DELIVERED'] } },
    take: 10,
  });
  if (orders.length === 0) {
    console.log('▸ Skipping reviews — no completed orders yet');
    return;
  }
  console.log(`▸ Seeding ${orders.length} reviews`);
  for (const o of orders) {
    const existing = await prisma.review.findUnique({ where: { orderId: o.id } });
    if (existing) continue;
    await prisma.review.create({
      data: {
        orderId: o.id,
        userId: customer.id,
        rating: 4 + (Math.random() > 0.5 ? 1 : 0),
        comment: 'Tasty, would order again.',
      },
    });
  }
}

async function seedDeliveryZones(restaurantId: string) {
  console.log('▸ Seeding 2 delivery zones (Warsaw)');
  const zones = [
    {
      id: 'zone-central',
      name: 'Central Warsaw',
      fee: '8.00',
      minOrderAmount: '40.00',
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [21.0, 52.2],
            [21.05, 52.2],
            [21.05, 52.25],
            [21.0, 52.25],
            [21.0, 52.2],
          ],
        ],
      },
    },
    {
      id: 'zone-extended',
      name: 'Outer Warsaw',
      fee: '14.00',
      minOrderAmount: '80.00',
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [20.95, 52.15],
            [21.1, 52.15],
            [21.1, 52.3],
            [20.95, 52.3],
            [20.95, 52.15],
          ],
        ],
      },
    },
  ];
  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { deliveryZones: zones as unknown as Prisma.InputJsonValue },
  });
}

async function seedStaff() {
  console.log('▸ Seeding 3 staff users (manager, kitchen, cashier)');
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const accounts: Array<{ email: string; first: string; roleKey: string }> = [
    { email: 'manager@local.test', first: 'Maxi', roleKey: 'manager' },
    { email: 'kitchen@local.test', first: 'Kim', roleKey: 'kitchen' },
    { email: 'cashier@local.test', first: 'Cass', roleKey: 'cashier' },
  ];
  for (const a of accounts) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { passwordHash, emailVerifiedAt: new Date() },
      create: {
        email: a.email,
        passwordHash,
        emailVerifiedAt: new Date(),
        firstName: a.first,
        lastName: 'Staff',
      },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { key: a.roleKey } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
}

async function seedLoyalty() {
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@local.test' },
  });
  if (!customer) return;
  console.log('▸ Seeding loyalty account + ledger for customer@local.test');
  const account = await prisma.loyaltyAccount.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id, points: 120, tier: 'silver' },
  });
  const existing = await prisma.loyaltyTransaction.count({
    where: { accountId: account.id },
  });
  if (existing === 0) {
    await prisma.loyaltyTransaction.createMany({
      data: [
        { accountId: account.id, delta: 100, reason: 'signup_bonus', orderId: null },
        { accountId: account.id, delta: 20, reason: 'order_earned', orderId: null },
      ],
    });
  }
}

async function seedNotifications() {
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@local.test' },
  });
  if (!customer) return;
  const count = await prisma.notification.count({ where: { userId: customer.id } });
  if (count > 0) {
    console.log('▸ Skipping notifications — already seeded');
  } else {
    console.log('▸ Seeding 3 notifications for customer@local.test');
    await prisma.notification.createMany({
      data: [
        {
          userId: customer.id,
          type: 'system',
          title: 'Welcome to the app',
          body: 'Thanks for joining — your first order earns bonus points.',
        },
        {
          userId: customer.id,
          type: 'promo',
          title: 'Weekend offer',
          body: 'Free delivery on orders over 50 PLN this weekend.',
        },
        {
          userId: customer.id,
          type: 'order_status',
          title: 'Order delivered',
          body: 'Hope you enjoyed your meal!',
          readAt: new Date(),
        },
      ],
    });
  }
  await prisma.notificationPreference.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id },
  });
}

async function seedReviewImages() {
  const reviews = await prisma.review.findMany({
    where: { images: { none: {} } },
    take: 3,
  });
  if (reviews.length === 0) {
    console.log('▸ Skipping review images — no reviews without images');
    return;
  }
  console.log(`▸ Seeding images for ${reviews.length} review(s)`);
  for (const r of reviews) {
    await prisma.reviewImage.create({
      data: {
        reviewId: r.id,
        url: 'http://localhost/no-r2/reviews/sample.jpg',
        position: 0,
      },
    });
  }
}

async function seedContactMessages(restaurantId: string) {
  const count = await prisma.contactMessage.count();
  if (count > 0) {
    console.log('▸ Skipping contact messages — already seeded');
    return;
  }
  console.log('▸ Seeding 2 contact messages');
  await prisma.contactMessage.createMany({
    data: [
      {
        restaurantId,
        name: 'Anna Nowak',
        email: 'anna@example.com',
        subject: 'Catering inquiry',
        message: 'Do you cater office events for 30 people?',
      },
      {
        restaurantId,
        name: 'Piotr Kowalski',
        email: 'piotr@example.com',
        subject: null,
        message: 'Loved the pizza, thank you!',
        status: 'read',
      },
    ],
  });
}

async function main() {
  console.log('Seeding…');
  await seedPermissions();
  await seedRoles();
  await seedUsers();
  const restaurant = await seedRestaurants();
  await seedMenu(restaurant.id);
  await seedPromotions(restaurant.id);
  await seedTables(restaurant.id);
  await seedReservations(restaurant.id);
  await seedOrders(restaurant.id);
  await seedReviews();
  await seedReviewImages();
  await seedDeliveryZones(restaurant.id);
  await seedStaff();
  await seedLoyalty();
  await seedNotifications();
  await seedContactMessages(restaurant.id);
  console.log('✓ Seed complete');
}

main()
	.catch((err) => {
		console.error(err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
