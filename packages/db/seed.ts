/**
 * Seed script. Idempotent — safe to re-run.
 *
 * Sprint 1: permissions + roles + 2 test users.
 * Sprint 2: 1 Polish restaurant — Szef Donald (Europe/Warsaw, PLN, kebab +
 *           falafel) + 6 categories + 29 menu items + modifier groups
 *           (size, meat, sauce, add-ons) + operating hours.
 *
 * Later sprints append their own seed functions below; do NOT rewrite the
 * earlier seeders.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Keep this list in sync with packages/types/src/permissions.ts.
const ALL_PERMISSIONS = [
  'order:read',
  'order:create',
  'order:update',
  'order:status_update',
  'order:cancel',
  'order:refund',
  'menu:read',
  'menu:write',
  'restaurant:read',
  'restaurant:write',
  'customer:read',
  'customer:write',
  'customer:notes',
  'customer:tag',
  'customer:email',
  'promotion:read',
  'promotion:write',
  'promotion:archive',
  'reservation:read',
  'reservation:write',
  'review:read',
  'review:moderate',
  'staff:read',
  'staff:write',
  'settings:read',
  'settings:write',
  'payment:create',
  'payment:read',
  'payment:refund',
  'kitchen:read',
  'analytics:read',
  'audit:read',
  'contact:read',
  'contact:reply',
  'contact:notes',
  'flags:write',
] as const;

type PermissionKey = (typeof ALL_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<string, readonly PermissionKey[]> = {
  owner: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS.filter((p) => p !== 'staff:write' && p !== 'settings:write'),
  kitchen: ['order:read', 'order:status_update', 'kitchen:read'],
  cashier: [
    'order:read',
    'order:create',
    'payment:create',
    'payment:read',
    'kitchen:read',
    'reservation:read',
    'reservation:write',
    'customer:read',
  ],
  customer: [],
};

const ROLE_NAMES: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  kitchen: 'Kitchen',
  cashier: 'Cashier',
  customer: 'Customer',
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
  console.log('▸ Seeding 2 test users');

  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { key: 'owner' },
  });
  const customerRole = await prisma.role.findUniqueOrThrow({
    where: { key: 'customer' },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@local.test' },
    update: { passwordHash, emailVerifiedAt: new Date() },
    create: {
      email: 'owner@local.test',
      passwordHash,
      emailVerifiedAt: new Date(),
      firstName: 'Olive',
      lastName: 'Owner',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: owner.id, roleId: ownerRole.id },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@local.test' },
    update: { passwordHash, emailVerifiedAt: new Date() },
    create: {
      email: 'customer@local.test',
      passwordHash,
      emailVerifiedAt: new Date(),
      firstName: 'Casey',
      lastName: 'Customer',
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

const RESTAURANT_SLUG = 'szef-donald';

async function seedRestaurants() {
  console.log(`▸ Seeding restaurant: ${RESTAURANT_SLUG} (Europe/Warsaw, PLN)`);

  // One source of truth for the restaurant fields, applied on both create and
  // update so re-seeding an existing DB actually propagates address/geo/SEO
  // changes (the previous split put address + geoPoint only on `create`, so
  // they never refreshed on an existing row).
  const restaurantData = {
    name: 'Szef Donald',
    description:
      'Kebab i falafel na świeżo — Kielce, ul. Ściegiennego. Wszystko robione na miejscu.',
    descriptionEn: 'Fresh kebab and falafel in Kielce, on Ściegiennego — everything made to order.',
    phone: '+48 883 953 589',
    email: 'mahmodrasul123@gmail.com',
    address: {
      line1: 'ul. Ks. Piotra Ściegiennego 68a',
      city: 'Kielce',
      zip: '25-115',
      country: 'PL',
    },
    // Google Maps place pin for "Szef Donald" (the !3d/!4d marker, not the
    // viewport centre) so the location-page map + directions land on the shop.
    geoPoint: { lat: 50.8478329, lng: 20.6231079 },
    // schema.org discovery fields surfaced in the Restaurant JSON-LD.
    // `priceRange` mirrors the range Google shows on the Business Profile.
    servesCuisine: ['Kebab', 'Falafel', 'Middle Eastern', 'Turkish', 'Vegetarian'],
    priceRange: '20–40 zł',
    // Canonical social / map profiles — emitted as schema.org `sameAs` and
    // rendered as the footer social icons.
    sameAs: [
      'https://www.facebook.com/share/18Xj8ksRwy/?mibextid=wwXIfr',
      'https://maps.app.goo.gl/xvbbF5kpVVKvbXW8A',
    ],
    timezone: 'Europe/Warsaw',
    currency: 'PLN',
    isActive: true,
    estimatedDeliveryMinutesMin: 30,
    estimatedDeliveryMinutesMax: 45,
    estimatedPickupMinutesMin: 12,
    estimatedPickupMinutesMax: 20,
  };

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: restaurantData,
    create: { slug: RESTAURANT_SLUG, ...restaurantData },
  });

  // 7 days, 11:00-23:00 except Mondays closed.
  const days: Array<{
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
    isClosed: boolean;
  }> = [
    { dayOfWeek: 0, opensAt: '12:00', closesAt: '22:00', isClosed: false }, // Sun
    { dayOfWeek: 1, opensAt: '00:00', closesAt: '00:00', isClosed: true }, // Mon
    { dayOfWeek: 2, opensAt: '11:00', closesAt: '22:00', isClosed: false },
    { dayOfWeek: 3, opensAt: '11:00', closesAt: '22:00', isClosed: false },
    { dayOfWeek: 4, opensAt: '11:00', closesAt: '23:00', isClosed: false },
    { dayOfWeek: 5, opensAt: '11:00', closesAt: '23:00', isClosed: false },
    { dayOfWeek: 6, opensAt: '12:00', closesAt: '23:00', isClosed: false },
  ];

  for (const d of days) {
    await prisma.operatingHours.upsert({
      where: { dayOfWeek: d.dayOfWeek },
      update: { opensAt: d.opensAt, closesAt: d.closesAt, isClosed: d.isClosed },
      create: { ...d },
    });
  }

  return restaurant;
}

interface SeedItem {
  slug: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  basePrice: string; // PLN, 2dp string
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  isFeatured?: boolean;
  calories?: number;
  prepMinutes?: number;
  grams?: number;
  allergens?: string[];
  modifierGroups?: Array<{
    name: string;
    nameEn?: string;
    isRequired?: boolean;
    minSelect?: number;
    maxSelect?: number;
    options: Array<{ name: string; nameEn?: string; priceDelta?: string; isDefault?: boolean }>;
  }>;
}

interface SeedCategory {
  slug: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  items: SeedItem[];
}

const SAUCE_OPTIONS = [
  { name: 'Łagodny', isDefault: true },
  { name: 'Ostry' },
  { name: 'Mieszany' },
];

const MEAT_OPTIONS = [
  { name: 'Kurczak', isDefault: true },
  { name: 'Wołowina' },
  { name: 'Mieszane' },
];

const ADDONS_OPTIONS = [
  { name: 'Ser żółty', priceDelta: '4.00' },
  { name: 'Ser feta', priceDelta: '4.00' },
  { name: 'Dodatkowy sos', priceDelta: '1.00' },
  { name: 'Opakowanie', priceDelta: '1.00' },
];

type ModGroup = NonNullable<SeedItem['modifierGroups']>[number];

const kebabMods = (): ModGroup[] => [
  { name: 'Mięso', isRequired: true, minSelect: 1, maxSelect: 1, options: MEAT_OPTIONS },
  { name: 'Sos', isRequired: true, minSelect: 1, maxSelect: 1, options: SAUCE_OPTIONS },
  { name: 'Dodatki', isRequired: false, minSelect: 0, maxSelect: 4, options: ADDONS_OPTIONS },
];

const falafelMods = (): ModGroup[] => [
  { name: 'Sos', isRequired: true, minSelect: 1, maxSelect: 1, options: SAUCE_OPTIONS },
  { name: 'Dodatki', isRequired: false, minSelect: 0, maxSelect: 4, options: ADDONS_OPTIONS },
];

const sizeGroup = (
  options: Array<{ name: string; priceDelta: string; isDefault?: boolean }>,
): ModGroup => ({
  name: 'Rozmiar',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  options,
});

const CATEGORIES: SeedCategory[] = [
  {
    slug: 'kebab',
    name: 'Kebab',
    description: 'Mięso (kurczak, wołowina lub mieszane) + surówki + sos.',
    items: [
      {
        slug: 'kebab-tortilla',
        name: 'Kebab Tortilla',
        description: 'Kebab w tortilli — mięso, surówki i sos.',
        basePrice: '21.00',
        isFeatured: true,
        prepMinutes: 8,
        grams: 200,
        allergens: ['gluten', 'milk', 'sesame'],
        modifierGroups: [
          sizeGroup([
            { name: 'Mały', priceDelta: '0.00', isDefault: true },
            { name: 'Średni', priceDelta: '3.00' },
            { name: 'Duży', priceDelta: '6.00' },
            { name: 'Mega', priceDelta: '10.00' },
          ]),
          ...kebabMods(),
        ],
      },
      {
        slug: 'kebab-pita',
        name: 'Kebab Pita',
        description: 'Kebab w picie — mięso, surówki i sos.',
        basePrice: '21.00',
        prepMinutes: 8,
        grams: 200,
        modifierGroups: [
          sizeGroup([
            { name: 'Mały', priceDelta: '0.00', isDefault: true },
            { name: 'Średni', priceDelta: '3.00' },
            { name: 'Duży', priceDelta: '6.00' },
            { name: 'Mega', priceDelta: '10.00' },
          ]),
          ...kebabMods(),
        ],
      },
      {
        slug: 'kebab-w-bulce',
        name: 'Kebab w Bułce',
        description: 'Kebab w bułce — mięso, surówki i sos.',
        basePrice: '22.00',
        prepMinutes: 8,
        grams: 180,
        allergens: ['gluten', 'milk', 'sesame'],
        modifierGroups: [
          sizeGroup([
            { name: 'Mały', priceDelta: '0.00', isDefault: true },
            { name: 'Średni', priceDelta: '3.00' },
            { name: 'Duży', priceDelta: '6.00' },
            { name: 'Mega', priceDelta: '10.00' },
          ]),
          ...kebabMods(),
        ],
      },
      {
        slug: 'kebab-kapsalon',
        name: 'Kebab Kapsalon',
        description: 'Mięso + ser + frytki + sos.',
        basePrice: '36.00',
        isFeatured: true,
        prepMinutes: 12,
        grams: 300,
        allergens: ['gluten', 'milk'],
        modifierGroups: [
          sizeGroup([
            { name: 'Duży', priceDelta: '0.00', isDefault: true },
            { name: 'Mega', priceDelta: '6.00' },
          ]),
          ...kebabMods(),
        ],
      },
      {
        slug: 'kebab-na-talerzu',
        name: 'Kebab na Talerzu',
        description: 'Kebab na talerzu — mięso, surówki i sos.',
        basePrice: '29.00',
        prepMinutes: 10,
        grams: 250,
        allergens: ['milk', 'sesame'],
        modifierGroups: [
          sizeGroup([
            { name: 'Standard', priceDelta: '0.00', isDefault: true },
            { name: 'Duży', priceDelta: '5.00' },
            { name: 'Mega', priceDelta: '11.00' },
          ]),
          ...kebabMods(),
        ],
      },
      {
        slug: 'kebab-box',
        name: 'Kebab Box',
        description: 'Mięso, surówki, frytki i sos w boxie.',
        basePrice: '26.00',
        prepMinutes: 10,
        modifierGroups: [
          sizeGroup([
            { name: 'Standard', priceDelta: '0.00', isDefault: true },
            { name: 'Duży', priceDelta: '6.00' },
            { name: 'Mega', priceDelta: '12.00' },
          ]),
          ...kebabMods(),
        ],
      },
      {
        slug: 'fryto-kebab',
        name: 'Fryto Kebab',
        description: 'Mięso, surówki, frytki i sos w tortilli.',
        basePrice: '29.00',
        prepMinutes: 10,
        modifierGroups: kebabMods(),
      },
      {
        slug: 'salatka-kebab',
        name: 'Sałatka Kebab',
        description: 'Sałatka z mięsem, surówkami i sosem.',
        basePrice: '26.00',
        prepMinutes: 8,
        modifierGroups: [
          sizeGroup([
            { name: 'Standard', priceDelta: '0.00', isDefault: true },
            { name: 'Duży', priceDelta: '6.00' },
            { name: 'Mega', priceDelta: '12.00' },
          ]),
          ...kebabMods(),
        ],
      },
    ],
  },
  {
    slug: 'falafel',
    name: 'Danie Vege — Falafel',
    description: 'Falafel, sałata + sos łagodny, mieszany lub ostry.',
    items: [
      {
        slug: 'tortilla-falafel',
        name: 'Tortilla Falafel',
        description: 'Falafel w tortilli z sałatą i sosem.',
        basePrice: '19.00',
        isVegetarian: true,
        prepMinutes: 8,
        modifierGroups: [
          sizeGroup([
            { name: 'Standard (2 szt)', priceDelta: '0.00', isDefault: true },
            { name: 'Średni (3 szt)', priceDelta: '2.00' },
            { name: 'Duży (4 szt)', priceDelta: '4.00' },
            { name: 'Mega (5 szt)', priceDelta: '6.00' },
          ]),
          ...falafelMods(),
        ],
      },
      {
        slug: 'bulka-falafel',
        name: 'Bułka Falafel',
        description: 'Falafel w bułce z sałatą i sosem.',
        basePrice: '20.00',
        isVegetarian: true,
        prepMinutes: 8,
        modifierGroups: [
          sizeGroup([
            { name: 'Standard (2 szt)', priceDelta: '0.00', isDefault: true },
            { name: 'Średni (3 szt)', priceDelta: '2.00' },
            { name: 'Duży (4 szt)', priceDelta: '4.00' },
            { name: 'Mega (5 szt)', priceDelta: '6.00' },
          ]),
          ...falafelMods(),
        ],
      },
      {
        slug: 'pita-falafel',
        name: 'Pita Falafel',
        description: 'Falafel w picie z sałatą i sosem.',
        basePrice: '19.00',
        isVegetarian: true,
        prepMinutes: 8,
        modifierGroups: [
          sizeGroup([
            { name: 'Standard (2 szt)', priceDelta: '0.00', isDefault: true },
            { name: 'Średni (3 szt)', priceDelta: '2.00' },
            { name: 'Duży (4 szt)', priceDelta: '4.00' },
            { name: 'Mega (5 szt)', priceDelta: '6.00' },
          ]),
          ...falafelMods(),
        ],
      },
      {
        slug: 'talerz-falafel',
        name: 'Talerz Falafel',
        description: 'Falafel na talerzu z sałatą i sosem.',
        basePrice: '24.00',
        isVegetarian: true,
        prepMinutes: 10,
        modifierGroups: [
          sizeGroup([
            { name: 'Mały (3 szt)', priceDelta: '0.00', isDefault: true },
            { name: 'Duży (4 szt)', priceDelta: '3.00' },
            { name: 'Mega (5 szt)', priceDelta: '6.00' },
          ]),
          ...falafelMods(),
        ],
      },
    ],
  },
  {
    slug: 'strips-tacos',
    name: 'Box Strips i Tacos',
    description: 'Stripsy z kurczaka i tacos.',
    items: [
      {
        slug: 'box-strips',
        name: 'Box Strips',
        description: 'Stripsy + frytki + surówki + sos.',
        basePrice: '28.00',
        prepMinutes: 10,
        modifierGroups: [
          sizeGroup([
            { name: 'Standard (3 szt)', priceDelta: '0.00', isDefault: true },
            { name: 'Duży (4 szt)', priceDelta: '5.00' },
            { name: 'Mega (5 szt)', priceDelta: '11.00' },
          ]),
          { name: 'Sos', isRequired: true, minSelect: 1, maxSelect: 1, options: SAUCE_OPTIONS },
          {
            name: 'Dodatki',
            isRequired: false,
            minSelect: 0,
            maxSelect: 4,
            options: ADDONS_OPTIONS,
          },
        ],
      },
      {
        slug: 'tacos',
        name: 'Tacos',
        description: 'Ser, sos, sałata lodowa, frytki i 3 stripsy w tortilli.',
        basePrice: '29.00',
        prepMinutes: 10,
        modifierGroups: [
          { name: 'Sos', isRequired: true, minSelect: 1, maxSelect: 1, options: SAUCE_OPTIONS },
          {
            name: 'Dodatki',
            isRequired: false,
            minSelect: 0,
            maxSelect: 4,
            options: ADDONS_OPTIONS,
          },
        ],
      },
    ],
  },
  {
    slug: 'zestawy',
    name: 'Zestawy',
    description: 'Zestawy kebab + Coca-Cola 0.5L w cenie promocyjnej.',
    items: [
      {
        slug: 'zestaw-kebab-tortilla-sredni-cola',
        name: 'Kebab Tortilla Średni + Coca-Cola 0.5L',
        description: 'Kebab Tortilla Średni z napojem Coca-Cola 0.5L. Oszczędzasz 2 zł.',
        basePrice: '34.00',
        isFeatured: true,
        prepMinutes: 10,
        modifierGroups: kebabMods(),
      },
      {
        slug: 'zestaw-kapsalon-duzy-cola',
        name: 'Kapsalon Duży + Coca-Cola 0.5L',
        description: 'Kebab Kapsalon Duży z napojem Coca-Cola 0.5L. Oszczędzasz 2 zł.',
        basePrice: '43.00',
        isFeatured: true,
        prepMinutes: 12,
        modifierGroups: kebabMods(),
      },
    ],
  },
  {
    slug: 'dodatki',
    name: 'Dodatki',
    description: 'Frytki i deser.',
    items: [
      {
        slug: 'frytki-male',
        name: 'Frytki Małe',
        description: 'Małe frytki.',
        basePrice: '9.00',
        isVegetarian: true,
        prepMinutes: 5,
      },
      {
        slug: 'frytki-duze',
        name: 'Frytki Duże',
        description: 'Duże frytki.',
        basePrice: '13.00',
        isVegetarian: true,
        prepMinutes: 5,
      },
      {
        slug: 'baklawa',
        name: 'Baklawa',
        description: 'Tradycyjna baklawa.',
        basePrice: '7.00',
        isVegetarian: true,
        prepMinutes: 1,
      },
    ],
  },
  {
    slug: 'napoje-zimne',
    name: 'Napoje Zimne',
    description: 'Napoje gazowane, soki, woda.',
    items: [
      {
        slug: 'coca-cola',
        name: 'Coca-Cola',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'coca-cola-zero',
        name: 'Coca-Cola Zero',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'coca-cola-light',
        name: 'Coca-Cola Light',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'fanta',
        name: 'Fanta',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'sprite',
        name: 'Sprite',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'kinley',
        name: 'Kinley',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'kropla-beskidu',
        name: 'Kropla Beskidu',
        description: 'Woda 0.5L',
        basePrice: '5.50',
        isVegan: true,
        isGlutenFree: true,
        prepMinutes: 1,
      },
      {
        slug: 'fuze-tea',
        name: 'Fuze Tea',
        description: '0.5L',
        basePrice: '8.50',
        prepMinutes: 1,
      },
      {
        slug: 'cappy',
        name: 'Cappy',
        description: 'Sok 0.33L',
        basePrice: '7.50',
        prepMinutes: 1,
      },
      {
        slug: 'burn',
        name: 'Burn',
        description: 'Napój energetyczny 0.25L',
        basePrice: '7.50',
        prepMinutes: 1,
      },
    ],
  },
];

// Locally hosted menu images live under apps/api/uploads/menu-items/ and are
// served by the API at /uploads/. Base URL resolution order:
//   1. MENU_IMAGE_BASE_URL — explicit override (e.g. CDN)
//   2. APP_URL_API + /uploads/menu-items — production case; APP_URL_API is
//      set in the prod .env to https://api.{domain}
//   3. localhost fallback for dev
const MENU_IMAGE_BASE =
  process.env.MENU_IMAGE_BASE_URL ??
  (process.env.APP_URL_API
    ? `${process.env.APP_URL_API.replace(/\/+$/, '')}/uploads/menu-items`
    : 'http://localhost:4000/uploads/menu-items');

// --- English translations (PL above is the source/default) -----------------
// Keyed by slug so the PL `CATEGORIES` data stays untouched and the EN copy is
// reviewable in one place. Served on /en with PL fallback when an entry is
// missing. Modifier group/option names use a closed vocabulary, so they're
// translated by small maps rather than per-row copy.

const CATEGORY_EN: Record<string, { name: string; description: string }> = {
  kebab: {
    name: 'Kebab',
    description: 'Meat (chicken, beef or mixed) with fresh salad and sauce.',
  },
  falafel: {
    name: 'Vegetarian — Falafel',
    description: 'Falafel and salad with mild, mixed or spicy sauce.',
  },
  'strips-tacos': { name: 'Box Strips & Tacos', description: 'Chicken strips and tacos.' },
  zestawy: { name: 'Combo Deals', description: 'Kebab + Coca-Cola 0.5L at a combo price.' },
  dodatki: { name: 'Sides', description: 'Fries and dessert.' },
  'napoje-zimne': { name: 'Cold Drinks', description: 'Soft drinks, juices and water.' },
};

const ITEM_EN: Record<string, { name: string; description: string }> = {
  'kebab-tortilla': {
    name: 'Kebab Tortilla (Wrap)',
    description:
      'Döner kebab in a tortilla wrap — chicken, beef or mixed meat with fresh salad and your choice of sauce.',
  },
  'kebab-pita': {
    name: 'Kebab in Pita',
    description: 'Döner kebab in pita bread — meat, fresh salad and sauce.',
  },
  'kebab-w-bulce': {
    name: 'Kebab in a Bun',
    description: 'Döner kebab in a bun — meat, fresh salad and sauce.',
  },
  'kebab-kapsalon': {
    name: 'Kapsalon',
    description: 'Meat over fries, topped with melted cheese and sauce.',
  },
  'kebab-na-talerzu': {
    name: 'Kebab Plate',
    description: 'Döner kebab on a plate — meat, fresh salad and sauce.',
  },
  'kebab-box': { name: 'Kebab Box', description: 'Meat, fresh salad, fries and sauce in a box.' },
  'fryto-kebab': {
    name: 'Fryto Kebab',
    description: 'Meat, fresh salad, fries and sauce wrapped in a tortilla.',
  },
  'salatka-kebab': {
    name: 'Kebab Salad',
    description: 'Salad with kebab meat, fresh veg and sauce.',
  },
  'tortilla-falafel': {
    name: 'Falafel Tortilla (Wrap)',
    description: 'Falafel in a tortilla wrap with salad and sauce.',
  },
  'bulka-falafel': {
    name: 'Falafel in a Bun',
    description: 'Falafel in a bun with salad and sauce.',
  },
  'pita-falafel': {
    name: 'Falafel in Pita',
    description: 'Falafel in pita bread with salad and sauce.',
  },
  'talerz-falafel': {
    name: 'Falafel Plate',
    description: 'Falafel on a plate with salad and sauce.',
  },
  'box-strips': {
    name: 'Chicken Strips Box',
    description: 'Chicken strips with fries, fresh salad and sauce.',
  },
  tacos: {
    name: 'Tacos',
    description:
      'Three chicken strips in a tortilla with cheese, sauce, iceberg lettuce and fries.',
  },
  'zestaw-kebab-tortilla-sredni-cola': {
    name: 'Medium Kebab Tortilla + Coca-Cola 0.5L',
    description: 'Medium kebab tortilla with a Coca-Cola 0.5L. Save 2 zł.',
  },
  'zestaw-kapsalon-duzy-cola': {
    name: 'Large Kapsalon + Coca-Cola 0.5L',
    description: 'Large kapsalon with a Coca-Cola 0.5L. Save 2 zł.',
  },
  'frytki-male': { name: 'Small Fries', description: 'Small portion of fries.' },
  'frytki-duze': { name: 'Large Fries', description: 'Large portion of fries.' },
  baklawa: { name: 'Baklava', description: 'Traditional baklava.' },
  'coca-cola': { name: 'Coca-Cola', description: '0.5L' },
  'coca-cola-zero': { name: 'Coca-Cola Zero', description: '0.5L' },
  'coca-cola-light': { name: 'Coca-Cola Light', description: '0.5L' },
  fanta: { name: 'Fanta', description: '0.5L' },
  sprite: { name: 'Sprite', description: '0.5L' },
  kinley: { name: 'Kinley', description: '0.5L' },
  'kropla-beskidu': { name: 'Kropla Beskidu', description: 'Still water 0.5L' },
  'fuze-tea': { name: 'Fuze Tea', description: '0.5L' },
  cappy: { name: 'Cappy', description: 'Juice 0.33L' },
  burn: { name: 'Burn', description: 'Energy drink 0.25L' },
};

const GROUP_NAME_EN: Record<string, string> = {
  Rozmiar: 'Size',
  Mięso: 'Meat',
  Sos: 'Sauce',
  Dodatki: 'Add-ons',
};

const OPTION_NAME_EN: Record<string, string> = {
  Łagodny: 'Mild',
  Ostry: 'Spicy',
  Mieszany: 'Mixed',
  Kurczak: 'Chicken',
  Wołowina: 'Beef',
  Mieszane: 'Mixed',
  'Ser żółty': 'Cheese',
  'Ser feta': 'Feta',
  'Dodatkowy sos': 'Extra sauce',
  Opakowanie: 'Packaging',
  Mały: 'Small',
  Średni: 'Medium',
  Duży: 'Large',
  Mega: 'Mega',
  Standard: 'Standard',
};

/** EN for a modifier option name, handling the "(N szt)" → "(N pcs)" suffix. */
function optionNameEn(name: string): string {
  if (OPTION_NAME_EN[name]) return OPTION_NAME_EN[name];
  const m = name.match(/^(.+?)\s*\((\d+)\s*szt\)$/);
  if (m) {
    const base = OPTION_NAME_EN[m[1]] ?? m[1];
    return `${base} (${m[2]} pcs)`;
  }
  return name;
}

async function seedMenu() {
  // Wipe existing menu so renamed/removed items don't linger. CartItem has
  // no FK on menuItemId — clear cart items first so live carts don't hold
  // dead references after the cascade. OrderItem also lacks an FK but is
  // self-contained via nameSnapshot/unitPrice/modifierSnapshot, so order
  // history stays intact and readable.
  await prisma.cartItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});

  const itemCount = CATEGORIES.reduce((n, c) => n + c.items.length, 0);
  console.log(
    `▸ Seeding ${CATEGORIES.length} categories + ${itemCount} menu items + modifier groups`,
  );

  for (const [cIdx, cat] of CATEGORIES.entries()) {
    const catEn = CATEGORY_EN[cat.slug];
    const category = await prisma.menuCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        nameEn: catEn?.name ?? cat.nameEn ?? null,
        description: cat.description,
        descriptionEn: catEn?.description ?? cat.descriptionEn ?? null,
        position: cIdx,
        isActive: true,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        nameEn: catEn?.name ?? cat.nameEn ?? null,
        description: cat.description,
        descriptionEn: catEn?.description ?? cat.descriptionEn ?? null,
        position: cIdx,
        isActive: true,
      },
    });

    for (const [iIdx, it] of cat.items.entries()) {
      const itEn = ITEM_EN[it.slug];
      const item = await prisma.menuItem.upsert({
        where: {
          categoryId_slug: { categoryId: category.id, slug: it.slug },
        },
        update: {
          name: it.name,
          nameEn: itEn?.name ?? it.nameEn ?? null,
          description: it.description,
          descriptionEn: itEn?.description ?? it.descriptionEn ?? null,
          basePrice: new Prisma.Decimal(it.basePrice),
          isVegetarian: it.isVegetarian ?? false,
          isVegan: it.isVegan ?? false,
          isGlutenFree: it.isGlutenFree ?? false,
          spiceLevel: it.spiceLevel ?? 0,
          isFeatured: it.isFeatured ?? false,
          calories: it.calories ?? null,
          prepMinutes: it.prepMinutes ?? null,
          grams: it.grams ?? null,
          allergens: it.allergens ?? [],
          position: iIdx,
          isAvailable: true,
        },
        create: {
          categoryId: category.id,
          slug: it.slug,
          name: it.name,
          nameEn: itEn?.name ?? it.nameEn ?? null,
          description: it.description,
          descriptionEn: itEn?.description ?? it.descriptionEn ?? null,
          basePrice: new Prisma.Decimal(it.basePrice),
          isVegetarian: it.isVegetarian ?? false,
          isVegan: it.isVegan ?? false,
          isGlutenFree: it.isGlutenFree ?? false,
          spiceLevel: it.spiceLevel ?? 0,
          isFeatured: it.isFeatured ?? false,
          calories: it.calories ?? null,
          prepMinutes: it.prepMinutes ?? null,
          grams: it.grams ?? null,
          allergens: it.allergens ?? [],
          position: iIdx,
          isAvailable: true,
        },
      });

      // Each item gets one MenuItemImage row pointing at the locally hosted
      // JPG. The cascade from menuCategory.deleteMany above already cleared
      // these, so a plain create keeps the seed idempotent.
      await prisma.menuItemImage.create({
        data: {
          itemId: item.id,
          url: `${MENU_IMAGE_BASE}/${it.slug}.jpg`,
          alt: it.name,
          position: 0,
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
                  nameEn: group.nameEn ?? GROUP_NAME_EN[group.name] ?? null,
                  isRequired: group.isRequired ?? false,
                  minSelect: group.minSelect ?? 0,
                  maxSelect: group.maxSelect ?? 1,
                },
              })
            : await prisma.menuItemModifierGroup.create({
                data: {
                  itemId: item.id,
                  name: group.name,
                  nameEn: group.nameEn ?? GROUP_NAME_EN[group.name] ?? null,
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
              nameEn: o.nameEn ?? optionNameEn(o.name),
              priceDelta: new Prisma.Decimal(o.priceDelta ?? '0'),
              isDefault: o.isDefault ?? false,
            })),
          });
        }
      }
    }
  }
}

async function seedPromotions() {
  console.log('▸ Seeding 2 promotions (WELCOME10, FREEDEL)');

  // Remove legacy BOGO Pizza promo from earlier seeds.
  const legacyBogo = await prisma.promotion.findFirst({
    where: { name: 'BOGO Pizza' },
  });
  if (legacyBogo) {
    await prisma.promotion.delete({ where: { id: legacyBogo.id } });
  }

  // WELCOME10 — 10% off, first-order only (perUserLimit: 1).
  await upsertPromotionByName('Welcome 10%', {
    description: 'Welcome offer — 10% off your first order',
    type: 'PERCENT',
    value: new Prisma.Decimal('10'),
    isActive: true,
    code: 'WELCOME10',
    perUserLimit: 1,
    maxRedemptions: null,
  });

  // FREEDEL — free delivery, min 100 PLN subtotal.
  await upsertPromotionByName('Free Delivery', {
    description: 'Free delivery on orders over 100 PLN',
    type: 'FREE_DELIVERY',
    value: null,
    minSubtotal: new Prisma.Decimal('100'),
    isActive: true,
    code: 'FREEDEL',
    perUserLimit: null,
    maxRedemptions: null,
  });
}

async function upsertPromotionByName(
  name: string,
  data: {
    description: string;
    type: 'PERCENT' | 'FIXED' | 'BOGO' | 'FREE_DELIVERY';
    value: import('@prisma/client').Prisma.Decimal | null;
    minSubtotal?: import('@prisma/client').Prisma.Decimal | null;
    isActive: boolean;
    code: string;
    perUserLimit: number | null;
    maxRedemptions: number | null;
  },
) {
  const existing = await prisma.promotion.findFirst({
    where: { name },
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
        code: data.code,
        perUserLimit: data.perUserLimit,
        maxRedemptions: data.maxRedemptions,
      },
    });
  }
  return prisma.promotion.create({
    data: {
      name,
      description: data.description,
      type: data.type,
      value: data.value,
      minSubtotal: data.minSubtotal ?? null,
      isActive: data.isActive,
      code: data.code,
      perUserLimit: data.perUserLimit,
      maxRedemptions: data.maxRedemptions,
    },
  });
}

// ---------------------------------------------------------------------------
// Sprint 7 — tables, reservations, reviews, delivery zones, staff
// ---------------------------------------------------------------------------

async function seedTables() {
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
      where: { name: t.name },
    });
    if (existing) {
      await prisma.table.update({ where: { id: existing.id }, data: { capacity: t.capacity } });
    } else {
      await prisma.table.create({ data: { ...t } });
    }
  }
}

async function seedReservations() {
  console.log('▸ Seeding 5 future reservations');
  const customer = await prisma.user.findUnique({ where: { email: 'customer@local.test' } });
  if (!customer) return;
  const tables = await prisma.table.findMany({ take: 5 });
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

async function seedOrders() {
  const existing = await prisma.order.count();
  if (existing > 0) {
    console.log(`▸ Skipping orders — ${existing} already present`);
    return;
  }
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@local.test' },
  });
  const menuItem = await prisma.menuItem.findFirst();
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
    const paid = s.status !== 'PENDING' && s.status !== 'CANCELLED';
    const refunded = s.status === 'DELIVERED'; // one partial-refund example

    const order = await prisma.order.create({
      data: {
        orderNumber: `R-2026-9${String(i).padStart(5, '0')}`,
        userId: customer.id,
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
    update: { lifetimePoints: 120 },
    create: {
      userId: customer.id,
      points: 120,
      lifetimePoints: 120,
      tier: 'bronze',
    },
  });
  const existing = await prisma.loyaltyTransaction.count({
    where: { accountId: account.id },
  });
  if (existing === 0) {
    await prisma.loyaltyTransaction.createMany({
      data: [
        {
          accountId: account.id,
          delta: 100,
          kind: 'REFERRAL',
          reason: 'Welcome referral bonus',
          orderId: null,
        },
        {
          accountId: account.id,
          delta: 20,
          kind: 'ADJUST',
          reason: 'Goodwill adjustment',
          orderId: null,
        },
      ],
    });
  }
}

async function seedReferrals() {
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@local.test' },
  });
  const owner = await prisma.user.findUnique({
    where: { email: 'owner@local.test' },
  });
  if (!customer || !owner) return;

  const code = await prisma.referralCode.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id, code: 'WELCOME8' },
  });
  const already = await prisma.referral.findUnique({
    where: { refereeId: owner.id },
  });
  if (already) {
    console.log('▸ Skipping referrals — already seeded');
    return;
  }
  console.log('▸ Seeding 1 completed referral (customer → owner)');
  await prisma.referral.create({
    data: {
      codeId: code.id,
      referrerId: customer.id,
      refereeId: owner.id,
      status: 'COMPLETED',
      rewardGranted: true,
      completedAt: new Date(),
    },
  });
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

async function seedContactMessages() {
  const count = await prisma.contactMessage.count();
  if (count > 0) {
    console.log('▸ Skipping contact messages — already seeded');
    return;
  }
  console.log('▸ Seeding 2 contact messages');
  await prisma.contactMessage.createMany({
    data: [
      {
        name: 'Anna Nowak',
        email: 'anna@example.com',
        subject: 'Catering inquiry',
        message: 'Do you cater office events for 30 people?',
      },
      {
        name: 'Piotr Kowalski',
        email: 'piotr@example.com',
        subject: null,
        message: 'Loved the pizza, thank you!',
        status: 'read',
      },
    ],
  });
}

// Mirror of @repo/feature-flags FLAG_CATALOG (kept inline so seed runs
// standalone — same pattern as ALL_PERMISSIONS).
const FEATURE_FLAGS: { key: string; description: string; default: boolean }[] = [
  {
    key: 'loyalty.redemption',
    description: 'Allow redeeming loyalty points at checkout',
    default: true,
  },
  {
    key: 'referral.program',
    description: 'Referral code capture + reward on first order',
    default: true,
  },
  {
    key: 'marketing.new_landing',
    description: 'Serve the new marketing landing aggregation',
    default: false,
  },
  { key: 'mobile.push_v2', description: 'New mobile push payload + deep links', default: false },
  { key: 'soft_launch', description: 'Master soft-launch gate (kill switch)', default: false },
];

async function seedFeatureFlags() {
  console.log(`▸ Seeding ${FEATURE_FLAGS.length} feature flags`);
  for (const f of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {},
      create: {
        key: f.key,
        description: f.description,
        enabled: f.default,
        rolloutPercent: f.default ? 100 : 0,
      },
    });
  }
}

async function main() {
  console.log('Seeding…');
  await seedPermissions();
  await seedRoles();
  await seedUsers();
  await seedRestaurants();
  await seedMenu();
  await seedPromotions();
  await seedTables();
  await seedReservations();
  await seedOrders();
  await seedReviews();
  await seedReviewImages();
  await seedStaff();
  await seedLoyalty();
  await seedReferrals();
  await seedNotifications();
  await seedContactMessages();
  await seedFeatureFlags();
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
