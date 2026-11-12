import { buildDishCopy, wordCount } from '@/features/menu/lib/dish-copy';
import { getDishFacts } from '@/features/menu/lib/dish-facts';
import { formatHoursSummary } from '@/features/restaurants/lib/restaurant-facts';
import { interpolate } from '@/features/seo/seo-vars';
import { loadMessages } from '@repo/i18n';
import type { MenuItemDetailDto, ModifierGroupDto } from '@repo/types';
import { describe, expect, it } from 'vitest';

function group(
  name: string,
  options: Array<[string, string, number | null, boolean?]>,
  required = true,
): ModifierGroupDto {
  return {
    id: name,
    itemId: 'i',
    name,
    isRequired: required,
    minSelect: required ? 1 : 0,
    maxSelect: required ? 1 : 4,
    options: options.map(([n, delta, grams, isDefault]) => ({
      id: n,
      groupId: name,
      name: n,
      priceDelta: delta,
      grams,
      isDefault: isDefault ?? false,
    })),
  };
}

function item(overrides: Partial<MenuItemDetailDto>): MenuItemDetailDto {
  return {
    id: 'i',
    categoryId: 'c',
    name: 'Dish',
    slug: 'dish',
    description: null,
    basePrice: '10.00',
    compareAt: null,
    calories: null,
    prepMinutes: null,
    grams: null,
    allergens: [],
    isAvailable: true,
    isFeatured: false,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    spiceLevel: 0,
    position: 0,
    images: [],
    modifierGroups: [],
    ...overrides,
  };
}

const sauce = group('Sos', [
  ['Łagodny', '3.00', null, true],
  ['Ostry', '3.00', null],
  ['Mieszany', '3.00', null],
]);

const DISHES: Array<{ cat: { slug: string; name: string }; item: MenuItemDetailDto }> = [
  {
    cat: { slug: 'kebab', name: 'Kebab' },
    item: item({
      name: 'Kebab Tortilla',
      slug: 'kebab-tortilla',
      description: 'Kebab w tortilli — mięso, surówki i sos.',
      basePrice: '22.50',
      grams: 150,
      allergens: ['gluten', 'milk', 'sesame'],
      modifierGroups: [
        group('Rozmiar', [
          ['Mały', '0.00', 150, true],
          ['Średni', '3.00', 200],
          ['Duży', '6.00', 250],
          ['Mega', '10.00', 300],
        ]),
        group('Mięso', [
          ['Kurczak', '0.00', null, true],
          ['Wołowina', '0.00', null],
          ['Mieszane', '0.00', null],
        ]),
        sauce,
        group(
          'Dodatki',
          [
            ['Ser żółty', '4.00', null],
            ['Frytki', '5.00', null],
            ['Opakowanie', '1.00', null],
          ],
          false,
        ),
        group('New group', [], false),
      ],
    }),
  },
  {
    cat: { slug: 'falafel', name: 'Danie Vege — Falafel' },
    item: item({
      name: 'Pita Falafel',
      slug: 'pita-falafel',
      description: 'Falafel w picie z sałatą i sosem.',
      basePrice: '20.50',
      isVegetarian: true,
      modifierGroups: [
        group('Rozmiar', [
          ['Standard (2 szt)', '0.00', null, true],
          ['Mega (5 szt)', '6.00', null],
        ]),
        sauce,
      ],
    }),
  },
  {
    cat: { slug: 'napoje-zimne', name: 'Napoje Zimne' },
    item: item({ name: 'Fanta', slug: 'fanta', description: '0.5L', basePrice: '8.50' }),
  },
  {
    cat: { slug: 'dodatki', name: 'Dodatki' },
    item: item({
      name: 'Baklawa',
      slug: 'baklawa',
      description: 'Tradycyjna baklawa.',
      basePrice: '7.00',
      isVegetarian: true,
    }),
  },
];

const KEBAB = DISHES[0] as (typeof DISHES)[number];

const CTX = {
  address: 'Ul. Ks. Piotra Ściegiennego 68a, 25-115 Kielce',
  deliveryFee: '0 zł',
  minOrder: '40 zł',
  radiusKm: 7,
  combos: [],
  allergenLabels: [],
};

describe('dish page copy', () => {
  for (const locale of ['pl', 'en'] as const) {
    for (const d of DISHES) {
      it(`${locale}/${d.item.slug}: 120–250 factual words, short meta, no email`, () => {
        const copy = buildDishCopy(getDishFacts(d.item, d.cat), { ...CTX, locale });
        const words = wordCount(copy.paragraphs);
        expect(words).toBeGreaterThanOrEqual(120);
        expect(words).toBeLessThanOrEqual(250);
        expect(copy.title.length).toBeLessThanOrEqual(60);
        expect(copy.metaDescription.length).toBeLessThanOrEqual(155);
        expect(copy.faqs.length).toBeGreaterThanOrEqual(2);
        expect(copy.faqs.length).toBeLessThanOrEqual(5);
        const all = JSON.stringify(copy);
        expect(all).not.toContain('@');
        expect(all).not.toMatch(/New group|Opakowanie/);
      });
    }
  }

  it('prices include required surcharges (the +3 zł sauce), integer-cent maths', () => {
    const facts = getDishFacts(KEBAB.item, KEBAB.cat);
    // base 22.50 + required sauce 3.00 + size delta
    expect(facts.sizes.map((s) => s.price)).toEqual(['25.50', '28.50', '31.50', '35.50']);
    expect(facts.fromPrice).toBe('25.50');
    expect(facts.saucesRequired).toBe(true);
    expect(facts.maxGrams).toBe(300);
  });

  it('dish H1 is "{Dish} w Kielcach"', () => {
    const copy = buildDishCopy(getDishFacts(KEBAB.item, KEBAB.cat), {
      ...CTX,
      locale: 'pl',
    });
    expect(copy.h1).toBe('Kebab Tortilla w Kielcach');
  });
});

describe('page titles and descriptions', () => {
  const hours = [
    { id: '0', dayOfWeek: 0, opensAt: '00:00', closesAt: '00:00', isClosed: true },
    ...[1, 2, 3, 4, 5].map((d) => ({
      id: String(d),
      dayOfWeek: d,
      opensAt: '10:00',
      closesAt: '21:00',
      isClosed: false,
    })),
    { id: '6', dayOfWeek: 6, opensAt: '12:00', closesAt: '21:00', isClosed: false },
  ];

  it('formats the real opening hours (closed on Sunday)', () => {
    expect(formatHoursSummary(hours, 'pl')).toBe(
      'pon.–pt. 10:00–21:00, sob. 12:00–21:00, niedz. nieczynne',
    );
    expect(formatHoursSummary(hours, 'en')).toBe(
      'Mon–Fri 10:00–21:00, Sat 12:00–21:00, Sun closed',
    );
  });

  for (const locale of ['pl', 'en'] as const) {
    it(`${locale}: every page title ≤ 60 and description ≤ 155 chars`, () => {
      const meta = (loadMessages(locale).web as Record<string, Record<string, unknown>>).seo
        ?.meta as Record<string, { title?: string; description?: string }>;
      const vars = {
        fee: locale === 'en' ? 'PLN 0' : '0 zł',
        minOrder: locale === 'en' ? 'PLN 40' : '40 zł',
        radius: '7',
        hours: formatHoursSummary(hours, locale),
        category: 'Kebab',
        count: '9',
        from: '22,50 zł',
      };
      for (const [key, value] of Object.entries(meta)) {
        if (!value.title) continue;
        const title = interpolate(value.title, vars);
        const desc = interpolate(value.description ?? '', vars);
        expect(title.length, `${key} title: ${title}`).toBeLessThanOrEqual(60);
        expect(desc.length, `${key} description: ${desc}`).toBeLessThanOrEqual(155);
      }
    });
  }

  it('no copy claims the restaurant is open seven days a week', () => {
    for (const locale of ['pl', 'en'] as const) {
      const all = JSON.stringify(loadMessages(locale));
      expect(all).not.toMatch(/siedem dni|seven days/i);
    }
  });
});
