import {
  categoryHref,
  dishHref,
  formatPrice,
  getDishFacts,
  joinAlternatives,
  latestUpdate,
  lcFirst,
} from '@/features/menu/lib/dish-facts';
import {
  formatHoursSummary,
  fullAddress,
  shortFee,
  shortMinOrder,
} from '@/features/restaurants/lib/restaurant-facts';
import { FOUNDING_YEAR, PYSZNE_RATING, SAME_AS, WRAPS_PER_WEEK } from '@/lib/brand';
import { fetchMenuTree } from '@/lib/seo/fetch-menu';
import { fetchPublicRestaurant } from '@/lib/seo/fetch-restaurant';
import { absoluteUrl, siteUrl } from '@/lib/seo/site';
import type { MenuTreeDto, RestaurantPublicDto } from '@repo/types';

/**
 * /llms.txt — a Markdown brief for AI assistants (ChatGPT, Claude, Gemini,
 * Perplexity): who we are, address, hours, delivery terms and the full
 * current menu with prices, generated from the live API. Rendered per request
 * from cached data (menu 300 s, restaurant 300 s) and served with a 1 h CDN /
 * browser cache. No email address is published.
 */
export const dynamic = 'force-dynamic';

function md(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function menuSection(tree: MenuTreeDto, locale: 'pl' | 'en'): string[] {
  const lines: string[] = [];
  for (const category of tree.categories) {
    if (category.items.length === 0) continue;
    lines.push('', `### [${category.name}](${absoluteUrl(locale, categoryHref(category.slug))})`);
    if (category.description) lines.push(md(category.description));
    lines.push('');
    for (const item of category.items) {
      const f = getDishFacts(item, category);
      const price =
        f.sizes.length > 1
          ? f.sizes
              .map(
                (s) =>
                  `${s.name}${s.grams != null ? ` (${s.grams} g ${locale === 'en' ? 'meat' : 'mięsa'})` : ''} ${formatPrice(s.price, locale)}`,
              )
              .join(', ')
          : formatPrice(f.fromPrice, locale);
      const extras: string[] = [];
      if (f.meats.length > 0) {
        extras.push(
          `${locale === 'en' ? 'meat' : 'mięso'}: ${joinAlternatives(
            f.meats.map((m) => lcFirst(m.name)),
            locale,
          )}`,
        );
      }
      if (f.sauces.length > 0) {
        extras.push(
          `${locale === 'en' ? 'sauce' : 'sos'}: ${joinAlternatives(
            f.sauces.map((s) => lcFirst(s.name)),
            locale,
          )}`,
        );
      }
      if (f.isVegan) extras.push(locale === 'en' ? 'vegan' : 'wegańskie');
      else if (f.isVegetarian) extras.push(locale === 'en' ? 'vegetarian' : 'wegetariańskie');
      if (!item.isAvailable)
        extras.push(locale === 'en' ? 'currently unavailable' : 'chwilowo niedostępne');
      const desc = item.description ? ` — ${md(item.description)}` : '';
      lines.push(
        `- [${item.name}](${absoluteUrl(locale, dishHref(category.slug, item.slug))})${desc} **${price}**${extras.length ? ` (${extras.join('; ')})` : ''}`,
      );
    }
  }
  return lines;
}

function build(r: RestaurantPublicDto | null, tree: MenuTreeDto | null, now: Date): string {
  const site = siteUrl();
  const updated = latestUpdate(tree?.categories.flatMap((c) => c.items) ?? []);
  const date = (d: Date) => d.toISOString().slice(0, 10);
  const L: string[] = [];

  L.push('# Szef Donald — kebab i falafel w Kielcach');
  L.push('');
  L.push(
    `> Szef Donald to mały lokal z kebabem i falafelem w Kielcach${r ? ` (${fullAddress(r)})` : ''}, działający od ${FOUNDING_YEAR} roku. Wszystko przygotowujemy na miejscu w ciągu dnia — nie mamy zamrażarki. W sezonie wydajemy ok. ${WRAPS_PER_WEEK} zawijańców tygodniowo. Zamówienia z dostawą i odbiorem osobistym przyjmujemy bezpośrednio na ${site}.`,
  );
  L.push('');
  L.push(`Ostatnia aktualizacja: ${date(now)}${updated ? ` (menu: ${date(updated)})` : ''}`);

  L.push('', '## Najważniejsze informacje', '');
  if (r) {
    L.push(`- Adres: ${fullAddress(r)}, Polska`);
    if (r.geoPoint) L.push(`- Współrzędne: ${r.geoPoint.lat}, ${r.geoPoint.lng}`);
    L.push(`- Telefon: ${r.phone}`);
    L.push(`- Godziny otwarcia: ${formatHoursSummary(r.hours, 'pl')}`);
    if (r.acceptsDelivery) {
      L.push(
        `- Dostawa przy zamówieniu na ${site}: ${shortFee(r, 'pl')}, minimalne zamówienie ${shortMinOrder(r, 'pl')}, w promieniu ok. ${r.deliveryRadiusKm} km od lokalu${
          r.estimatedDeliveryMinutesMin
            ? `, zwykle ${r.estimatedDeliveryMinutesMin}–${r.estimatedDeliveryMinutesMax ?? r.estimatedDeliveryMinutesMin} min`
            : ''
        }`,
      );
    }
    if (r.acceptsPickup) L.push('- Odbiór osobisty: tak, w lokalu');
    L.push('- Płatności: karta, BLIK, gotówka');
    L.push(`- Kuchnia: ${r.servesCuisine.join(', ') || 'kebab, falafel'}`);
    if (r.priceRange) L.push(`- Przedział cen: ${r.priceRange}`);
  }
  L.push(`- Oceny: ${PYSZNE_RATING.value}/5 na Pyszne.pl (${PYSZNE_RATING.countLabel} ocen)`);

  L.push('', '## Jak zamówić', '');
  L.push(
    `1. Online, bezpośrednio: [${site}/menu](${absoluteUrl('pl', '/menu')}) — dostawa${r ? ` ${shortFee(r, 'pl')}` : ''} albo odbiór osobisty.`,
  );
  if (r) L.push(`2. Telefonicznie: ${r.phone}.`);
  L.push('3. Na miejscu w lokalu.');

  L.push('', '## Najważniejsze strony', '');
  L.push(`- [Menu z cenami](${absoluteUrl('pl', '/menu')})`);
  L.push(`- [Kebab w Kielcach](${absoluteUrl('pl', '/kebab-kielce')})`);
  L.push(`- [Falafel w Kielcach](${absoluteUrl('pl', '/falafel-kielce')})`);
  L.push(`- [Kapsalon w Kielcach](${absoluteUrl('pl', '/kapsalon-kielce')})`);
  L.push(`- [Dostawa](${absoluteUrl('pl', '/dostawa')})`);
  L.push(`- [Najczęstsze pytania](${absoluteUrl('pl', '/faq')})`);
  L.push(`- [Dojazd i godziny](${absoluteUrl('pl', '/locations')})`);
  L.push(`- [O nas](${absoluteUrl('pl', '/about')})`);

  if (tree) {
    L.push('', '## Menu (aktualne ceny)');
    L.push(...menuSection(tree, 'pl'));
  }

  L.push('', '## Profile', '');
  for (const url of SAME_AS) L.push(`- ${url}`);

  L.push('', '## English summary', '');
  L.push(
    `Szef Donald is a small kebab and falafel restaurant in Kielce, Poland${r ? ` (${fullAddress(r)})` : ''}, open since ${FOUNDING_YEAR}. Everything is made on site daily — no freezer. Menu: kebab in a wrap, pita or bun, kapsalon, kebab plate and box, tacos, chicken tenders, vegetarian falafel, combos and drinks.${
      r
        ? ` Opening hours: ${formatHoursSummary(r.hours, 'en')}. Phone: ${r.phone}. Order direct at ${absoluteUrl('en', '/menu')}: ${shortFee(r, 'en')} delivery within about ${r.deliveryRadiusKm} km, minimum order ${shortMinOrder(r, 'en')}, or pickup. Payment by card, BLIK or cash.`
        : ''
    }`,
  );
  L.push('');
  return `${L.join('\n')}\n`;
}

export async function GET(): Promise<Response> {
  const [restaurant, tree] = await Promise.all([fetchPublicRestaurant(), fetchMenuTree('pl')]);
  return new Response(build(restaurant, tree, new Date()), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
