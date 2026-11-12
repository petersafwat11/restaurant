import type {
  MenuItemDetailDto,
  MenuTreeDto,
  ModifierGroupDto,
  ModifierOptionDto,
} from '@repo/types';
import { formatMoney, sumMoneyStrings } from '@repo/utils';

/**
 * Pure helpers that turn raw menu data (DB → API) into the facts the SEO
 * pages, JSON-LD and llms.txt need: sizes with real prices and meat weights,
 * meat / sauce / add-on choices, diet flags. Nothing here invents data — every
 * value comes from the menu tree, so copy stays correct when the owner edits
 * prices in admin.
 *
 * Browser- and server-safe (no Decimal / Prisma imports). Money is added via
 * `sumMoneyStrings` (integer cents), never float arithmetic.
 */

export type MenuCategory = MenuTreeDto['categories'][number];
export type MenuEntry = MenuCategory['items'][number];

export type GroupKind = 'size' | 'meat' | 'sauce' | 'addons' | 'swap' | 'other';

const GROUP_PATTERNS: Array<[GroupKind, RegExp]> = [
  ['size', /^(rozmiar|size)$/i],
  ['meat', /^(mi[eę]so|meat)$/i],
  ['sauce', /^(sos|sauce)$/i],
  ['addons', /^(dodatki|add-?ons|extras)$/i],
  ['swap', /^(zamiana|swap)$/i],
];

/** Placeholder rows created in admin and never filled in ("New group" / "New option"). */
const PLACEHOLDER = /^new (group|option)$/i;
/** Add-ons that are fees rather than food — not worth describing in copy. */
const NON_FOOD_ADDON = /^(opakowanie|packaging)$/i;

export function groupKind(group: Pick<ModifierGroupDto, 'name'>): GroupKind {
  for (const [kind, re] of GROUP_PATTERNS) if (re.test(group.name.trim())) return kind;
  return 'other';
}

/** Modifier groups minus empty / placeholder rows. */
export function cleanGroups(groups: ModifierGroupDto[]): ModifierGroupDto[] {
  return groups
    .filter((g) => !PLACEHOLDER.test(g.name.trim()))
    .map((g) => ({ ...g, options: g.options.filter((o) => !PLACEHOLDER.test(o.name.trim())) }))
    .filter((g) => g.options.length > 0);
}

export interface SizeFact {
  name: string;
  /** Final price of the dish in this size (base + delta), 2dp string. */
  price: string;
  grams: number | null;
  isDefault: boolean;
}

export interface OptionFact {
  name: string;
  /** Surcharge, 2dp string ("0.00" when free). */
  priceDelta: string;
}

export interface DishFacts {
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  description: string | null;
  basePrice: string;
  /** Cheapest orderable price (base + cheapest size delta when a size is required). */
  fromPrice: string;
  sizes: SizeFact[];
  meats: OptionFact[];
  sauces: OptionFact[];
  addons: OptionFact[];
  swaps: OptionFact[];
  /** Meat weight in grams for the default size (falls back to `item.grams`). */
  grams: number | null;
  maxGrams: number | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  spiceLevel: number;
  allergens: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  /** True for drinks (no modifiers and in a drinks category). */
  isDrink: boolean;
  /** True when the dish has no meaningful choices (sides, drinks, desserts). */
  isSimple: boolean;
}

/** Order sizes by price (ascending) so copy reads small → large. */
function sortByPrice<T extends { price: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number.parseFloat(a.price) - Number.parseFloat(b.price));
}

function toOption(o: ModifierOptionDto): OptionFact {
  return { name: o.name.trim(), priceDelta: o.priceDelta };
}

export function isDrinkCategory(category: Pick<MenuCategory, 'slug' | 'name'>): boolean {
  return /napo|drink/i.test(category.slug) || /napo|drink/i.test(category.name);
}

export function getDishFacts(
  item: MenuItemDetailDto,
  category: Pick<MenuCategory, 'slug' | 'name'>,
): DishFacts {
  const groups = cleanGroups(item.modifierGroups);
  const byKind = (kind: GroupKind) => groups.filter((g) => groupKind(g) === kind);

  const sizeGroup = byKind('size')[0];
  const sizes: SizeFact[] = sizeGroup
    ? sortByPrice(
        sizeGroup.options.map((o) => ({
          name: o.name.trim(),
          price: sumMoneyStrings([item.basePrice, o.priceDelta]),
          grams: o.grams ?? null,
          isDefault: o.isDefault,
        })),
      )
    : [];

  const fromPrice = sizeGroup?.isRequired && sizes[0] ? sizes[0].price : item.basePrice;
  const defaultSize = sizes.find((s) => s.isDefault) ?? sizes[0];
  const gramsList = sizes.map((s) => s.grams).filter((g): g is number => typeof g === 'number');
  const grams = defaultSize?.grams ?? item.grams ?? null;
  const maxGrams = gramsList.length > 0 ? Math.max(...gramsList) : (item.grams ?? null);

  const optionsOf = (kind: GroupKind) => byKind(kind).flatMap((g) => g.options.map(toOption));
  const addons = optionsOf('addons').filter((o) => !NON_FOOD_ADDON.test(o.name));
  const isDrink = isDrinkCategory(category);

  return {
    name: item.name,
    slug: item.slug,
    categorySlug: category.slug,
    categoryName: category.name,
    description: item.description,
    basePrice: item.basePrice,
    fromPrice,
    sizes,
    meats: optionsOf('meat'),
    sauces: optionsOf('sauce'),
    addons,
    swaps: optionsOf('swap'),
    grams,
    maxGrams,
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isGlutenFree: item.isGlutenFree,
    spiceLevel: item.spiceLevel,
    allergens: item.allergens,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    imageUrl: item.images[0]?.url ?? null,
    isDrink,
    isSimple: isDrink || groups.length === 0,
  };
}

/** "22,50 zł" (pl) / "PLN 22.50" (en). */
export function formatPrice(value: string, locale: string): string {
  return formatMoney(value, 'PLN', locale === 'en' ? 'en-GB' : 'pl-PL');
}

/** Lower-case the first letter for mid-sentence use ("Kurczak" → "kurczak"). */
export function lcFirst(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase('pl-PL') + s.slice(1) : s;
}

/** Natural-language list: "a, b i c" (pl) / "a, b and c" (en). */
export function joinList(items: string[], locale: string): string {
  const conj = locale === 'en' ? 'and' : 'i';
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

/** Same as joinList but with "or" / "lub" for alternatives. */
export function joinAlternatives(items: string[], locale: string): string {
  const conj = locale === 'en' ? 'or' : 'lub';
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

/** Locale-agnostic routes for the generated menu pages. */
export function categoryHref(categorySlug: string): string {
  return `/menu/${categorySlug}`;
}

export function dishHref(categorySlug: string, itemSlug: string): string {
  return `/menu/${categorySlug}/${itemSlug}`;
}

/**
 * Descriptive image alt built from the dish data (owner-entered alts are
 * often just the name or English). E.g. "Kebab Pita — kebab w picie z
 * mięsem, surówkami i sosem, Szef Donald Kielce".
 */
export function dishImageAlt(
  item: Pick<MenuEntry, 'name' | 'description'>,
  locale: string,
): string {
  const desc = (item.description ?? '').trim().replace(/[.\s]+$/, '');
  const tail = locale === 'en' ? 'Szef Donald, Kielce' : 'Szef Donald Kielce';
  const useDesc = desc && desc.length > 4 && desc.toLowerCase() !== item.name.toLowerCase();
  return useDesc ? `${item.name} — ${lcFirst(desc)}, ${tail}` : `${item.name}, ${tail}`;
}

/** Find a dish (and its category) in the tree by slugs. */
export function findDish(
  tree: MenuTreeDto,
  categorySlug: string,
  itemSlug: string,
): { category: MenuCategory; item: MenuEntry } | null {
  const category = tree.categories.find((c) => c.slug === categorySlug);
  const item = category?.items.find((i) => i.slug === itemSlug);
  return category && item ? { category, item } : null;
}

/** Find a dish anywhere in the tree by item slug (first match). */
export function findDishBySlug(
  tree: MenuTreeDto,
  itemSlug: string,
): { category: MenuCategory; item: MenuEntry } | null {
  for (const category of tree.categories) {
    const item = category.items.find((i) => i.slug === itemSlug);
    if (item) return { category, item };
  }
  return null;
}

/** Latest `updatedAt` among items (for sitemap lastmod); null when unknown. */
export function latestUpdate(items: Array<{ updatedAt?: string | null }>): Date | null {
  let max: number | null = null;
  for (const it of items) {
    const t = it.updatedAt ? Date.parse(it.updatedAt) : Number.NaN;
    if (!Number.isNaN(t) && (max === null || t > max)) max = t;
  }
  return max === null ? null : new Date(max);
}
