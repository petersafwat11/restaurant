import {
  type DishFacts,
  type OptionFact,
  type SizeFact,
  formatPrice,
  joinAlternatives,
  joinList,
  lcFirst,
} from './dish-facts';

/**
 * Factual, data-driven copy for dish pages (`/menu/[category]/[dish]`).
 *
 * Every sentence is assembled from the dish's real menu data (sizes, meat
 * weights, prices, meat / sauce / add-on options, diet flags, allergens) plus
 * the restaurant's delivery terms — so 30 dish pages read differently and stay
 * correct when prices change. No invented claims, no review quotes.
 */

export interface DishCopyContext {
  locale: string;
  /** "Ul. Ks. Piotra Ściegiennego 68a, 25-115 Kielce". */
  address: string;
  /** "0 zł" */
  deliveryFee: string;
  /** "40 zł" */
  minOrder: string;
  radiusKm: number;
  /** Combo deals that include this dish (names), if any. */
  combos: string[];
  /** Localised allergen labels for the dish's allergen keys. */
  allergenLabels: string[];
}

export interface DishFaq {
  q: string;
  a: string;
}

export interface DishCopy {
  h1: string;
  title: string;
  metaDescription: string;
  paragraphs: string[];
  faqs: DishFaq[];
}

function money(v: string, locale: string): string {
  return formatPrice(v, locale);
}

function surcharge(o: OptionFact, locale: string): string {
  return Number.parseFloat(o.priceDelta) > 0
    ? `${lcFirst(o.name)} (+${money(o.priceDelta, locale)})`
    : lcFirst(o.name);
}

function sizeLine(s: SizeFact, locale: string): string {
  const weight =
    s.grams != null ? (locale === 'en' ? `, ${s.grams} g of meat` : `, ${s.grams} g mięsa`) : '';
  return `${s.name}${weight} – ${money(s.price, locale)}`;
}

/** Strip a trailing full stop so a description can be embedded in a sentence. */
function bare(s: string | null): string {
  return (s ?? '').trim().replace(/[.\s]+$/, '');
}

/** ≤ max chars, cut on a word boundary. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s–—-]+$/, '')}…`;
}

// ---------------------------------------------------------------------------
// Polish
// ---------------------------------------------------------------------------

function buildPl(d: DishFacts, ctx: DishCopyContext): DishCopy {
  const L = 'pl';
  const p: string[] = [];
  const desc = bare(d.description);

  // 1 — what it is + where it is made
  p.push(
    `${d.name}${desc ? ` — ${lcFirst(desc)}` : ''}. ${
      d.isDrink
        ? 'Podajemy schłodzone, prosto z lodówki, do zamówienia na miejscu, na wynos lub z dostawą.'
        : `Przygotowujemy to danie na miejscu w Szef Donald, małym lokalu przy ${ctx.address}. U nas nie ma zamrażarki — wszystko robimy w ciągu dnia, od 2019 roku.`
    }`,
  );

  // 2 — price, sizes and meat weight
  if (d.sizes.length > 1) {
    p.push(
      `Cena zaczyna się od ${money(d.fromPrice, L)}. Dostępne rozmiary: ${d.sizes
        .map((s) => sizeLine(s, L))
        .join('; ')}.${
        d.maxGrams && d.grams && d.maxGrams > d.grams
          ? ` Największa porcja ma ${d.maxGrams} g mięsa — to wybór dla naprawdę głodnych.`
          : ''
      }`,
    );
  } else {
    p.push(`Cena: ${money(d.fromPrice, L)}${d.grams ? `, porcja z ${d.grams} g mięsa` : ''}.`);
  }

  // 3 — choices
  const choices: string[] = [];
  if (d.meats.length > 0) {
    choices.push(
      `Do wyboru mięso: ${joinAlternatives(
        d.meats.map((m) => surcharge(m, L)),
        L,
      )}.`,
    );
  }
  if (d.sauces.length > 0) {
    const fees = new Set(d.sauces.map((s) => s.priceDelta));
    const sameFee = fees.size === 1 ? [...fees][0] : null;
    const names = joinAlternatives(
      d.sauces.map((s) => (sameFee ? lcFirst(s.name) : surcharge(s, L))),
      L,
    );
    choices.push(
      `Sos wybierasz sam: ${names}${
        sameFee && Number.parseFloat(sameFee) > 0 ? ` (sos +${money(sameFee, L)})` : ''
      }. Jeśli lubisz ostrzej, wybierz sos ostry lub mieszany i dopisz prośbę w uwagach do zamówienia.`,
    );
  }
  if (d.addons.length > 0) {
    choices.push(
      `Możesz dołożyć: ${joinList(
        d.addons.map((a) => surcharge(a, L)),
        L,
      )}.`,
    );
  }
  if (d.swaps.length > 0) {
    choices.push(
      `Opcja: ${joinList(
        d.swaps.map((a) => surcharge(a, L)),
        L,
      )}.`,
    );
  }
  if (choices.length > 0) p.push(choices.join(' '));

  // 4 — diet, allergens, who it is for
  const diet: string[] = [];
  if (d.isVegan) diet.push('Danie jest wegańskie.');
  else if (d.isVegetarian && !d.isDrink) {
    diet.push(
      'Danie jest wegetariańskie — bez mięsa, dobre dla osób, które szukają czegoś sycącego bez kebaba.',
    );
  }
  if (d.isGlutenFree) diet.push('Nie zawiera glutenu.');
  if (ctx.allergenLabels.length > 0) {
    diet.push(
      `Alergeny: ${joinList(ctx.allergenLabels, L)}. Szczegóły o alergenach przekaże obsługa przed zamówieniem.`,
    );
  } else if (!d.isDrink) {
    diet.push('O alergeny zapytaj obsługę — chętnie powiemy, co jest w środku.');
  }
  if (ctx.combos.length > 0) {
    diet.push(`Taniej w zestawie: ${joinList(ctx.combos, L)}.`);
  }
  if (d.isDrink) {
    diet.push(
      'Dobrze pasuje do kebaba, falafela albo kapsalonu — dodaj do zamówienia jednym kliknięciem.',
    );
  }
  if (diet.length > 0) p.push(diet.join(' '));

  // 4b — simple items (drinks, sides, desserts) have few facts of their own:
  // add the context a customer needs, still without invented claims.
  if (d.isSimple) {
    p.push(
      `${d.name} to ${d.isDrink ? 'napój' : 'dodatek'}, który dobrze uzupełnia zamówienie. Minimalne zamówienie z dostawą to ${ctx.minOrder}, więc ${d.isDrink ? 'napoje i dodatki' : 'dodatki i napoje'} łatwo dołożyć do kebaba, kapsalonu albo falafela. Główne dania przygotowujemy na miejscu w kilku rozmiarach, z mięsem do wyboru i jednym z trzech sosów.`,
    );
    p.push(
      `Szef Donald to mały lokal z kebabem i falafelem przy ${ctx.address}, działający od 2019 roku. Zamówienie odbierzesz osobiście w lokalu albo zamówisz z dostawą pod wskazany adres w Kielcach.`,
    );
  }

  // 5 — how to order
  p.push(
    `Zamów bezpośrednio na szefdonald.pl: dostawa ${ctx.deliveryFee} w promieniu ok. ${ctx.radiusKm} km od lokalu, minimalne zamówienie ${ctx.minOrder}, płatność kartą, BLIK-iem lub gotówką. Możesz też wybrać odbiór osobisty przy ul. Ściegiennego w Kielcach.`,
  );

  // FAQs — only questions the data can answer
  const faqs: DishFaq[] = [];
  faqs.push({
    q: `Ile kosztuje ${d.name} w Szef Donald?`,
    a:
      d.sizes.length > 1
        ? `Od ${money(d.fromPrice, L)}. Ceny w rozmiarach: ${d.sizes.map((s) => `${s.name} ${money(s.price, L)}`).join(', ')}.`
        : `${money(d.fromPrice, L)}. Aktualne ceny są zawsze w menu na szefdonald.pl.`,
  });
  if (d.sizes.some((s) => s.grams != null)) {
    faqs.push({
      q: `Ile mięsa jest w daniu ${d.name}?`,
      a: `${d.sizes
        .filter((s) => s.grams != null)
        .map((s) => `${s.name}: ${s.grams} g`)
        .join(', ')} mięsa.`,
    });
  } else if (d.grams) {
    faqs.push({ q: `Ile mięsa jest w daniu ${d.name}?`, a: `Porcja zawiera ${d.grams} g mięsa.` });
  }
  if (d.meats.length > 0) {
    faqs.push({
      q: `Jakie mięso mogę wybrać do dania ${d.name}?`,
      a: `${joinAlternatives(
        d.meats.map((m) => lcFirst(m.name)),
        L,
      ).replace(/^./, (c) => c.toUpperCase())}.`,
    });
  }
  if (d.sauces.length > 0) {
    faqs.push({
      q: 'Jakie sosy są dostępne?',
      a: `${joinAlternatives(
        d.sauces.map((s) => lcFirst(s.name)),
        L,
      ).replace(/^./, (c) =>
        c.toUpperCase(),
      )}. Jeśli wolisz bardziej ostro, napisz to w uwagach do zamówienia.`,
    });
  }
  if (d.isVegetarian && !d.isDrink) {
    faqs.push({
      q: `Czy ${d.name} jest wegetariańskie?`,
      a: 'Tak, to danie nie zawiera mięsa.',
    });
  }
  faqs.push({
    q: `Czy mogę zamówić ${d.name} z dostawą?`,
    a: `Tak. Przy zamówieniu bezpośrednio na szefdonald.pl dostawa kosztuje ${ctx.deliveryFee} (w promieniu ok. ${ctx.radiusKm} km, minimalne zamówienie ${ctx.minOrder}). Możesz też odebrać zamówienie osobiście.`,
  });

  return {
    h1: `${d.name} w Kielcach`,
    title: clamp(`${d.name} Kielce — dostawa ${ctx.deliveryFee} | Szef Donald`, 60),
    metaDescription: clamp(
      `${d.name}${desc ? ` — ${lcFirst(desc)}` : ''}. Od ${money(d.fromPrice, L)}. Zamów z dostawą ${ctx.deliveryFee} lub odbierz przy Ściegiennego 68a w Kielcach.`,
      155,
    ),
    paragraphs: p,
    faqs: faqs.slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------

function buildEn(d: DishFacts, ctx: DishCopyContext): DishCopy {
  const L = 'en';
  const p: string[] = [];
  const desc = bare(d.description);

  p.push(
    `${d.name}${desc ? ` — ${lcFirst(desc)}` : ''}. ${
      d.isDrink
        ? 'Served chilled for eat-in, takeaway or delivery.'
        : `We make it on site at Szef Donald, a small local kebab shop at ${ctx.address}. We have no freezer — everything is prepared during the day, as it has been since 2019.`
    }`,
  );

  if (d.sizes.length > 1) {
    p.push(
      `Prices start at ${money(d.fromPrice, L)}. Sizes: ${d.sizes.map((s) => sizeLine(s, L)).join('; ')}.${
        d.maxGrams && d.grams && d.maxGrams > d.grams
          ? ` The largest portion has ${d.maxGrams} g of meat — the pick for a big appetite.`
          : ''
      }`,
    );
  } else {
    p.push(`Price: ${money(d.fromPrice, L)}${d.grams ? `, with ${d.grams} g of meat` : ''}.`);
  }

  const choices: string[] = [];
  if (d.meats.length > 0) {
    choices.push(
      `Choose your meat: ${joinAlternatives(
        d.meats.map((m) => surcharge(m, L)),
        L,
      )}.`,
    );
  }
  if (d.sauces.length > 0) {
    const fees = new Set(d.sauces.map((s) => s.priceDelta));
    const sameFee = fees.size === 1 ? [...fees][0] : null;
    choices.push(
      `Pick a sauce: ${joinAlternatives(
        d.sauces.map((s) => (sameFee ? lcFirst(s.name) : surcharge(s, L))),
        L,
      )}${sameFee && Number.parseFloat(sameFee) > 0 ? ` (sauce +${money(sameFee, L)})` : ''}. If you like it hotter, choose spicy or mixed and add a note to your order.`,
    );
  }
  if (d.addons.length > 0) {
    choices.push(
      `Add-ons: ${joinList(
        d.addons.map((a) => surcharge(a, L)),
        L,
      )}.`,
    );
  }
  if (d.swaps.length > 0) {
    choices.push(
      `Option: ${joinList(
        d.swaps.map((a) => surcharge(a, L)),
        L,
      )}.`,
    );
  }
  if (choices.length > 0) p.push(choices.join(' '));

  const diet: string[] = [];
  if (d.isVegan) diet.push('This dish is vegan.');
  else if (d.isVegetarian && !d.isDrink) {
    diet.push('This dish is vegetarian — no meat, a filling choice if you skip kebab.');
  }
  if (d.isGlutenFree) diet.push('It is gluten-free.');
  if (ctx.allergenLabels.length > 0) {
    diet.push(
      `Allergens: ${joinList(ctx.allergenLabels, L)}. Ask our staff for full allergen details before ordering.`,
    );
  } else if (!d.isDrink) {
    diet.push('Ask our staff about allergens — we are happy to tell you what is inside.');
  }
  if (ctx.combos.length > 0) diet.push(`Cheaper as a combo: ${joinList(ctx.combos, L)}.`);
  if (d.isDrink)
    diet.push('Goes well with a kebab, falafel or kapsalon — add it to your order in one click.');
  if (diet.length > 0) p.push(diet.join(' '));

  if (d.isSimple) {
    p.push(
      `The ${d.name} is a ${d.isDrink ? 'drink' : 'side'} that rounds off an order. The minimum order for delivery is ${ctx.minOrder}, so drinks and sides are easy to add to a kebab, kapsalon or falafel. Our main dishes are made on site in several sizes, with your choice of meat and one of three sauces.`,
    );
    p.push(
      `Szef Donald is a small kebab and falafel place at ${ctx.address}, open since 2019. Pick up your order at the restaurant or have it delivered to your address in Kielce.`,
    );
  }

  p.push(
    `Order direct on szefdonald.pl: delivery ${ctx.deliveryFee} within about ${ctx.radiusKm} km of the restaurant, minimum order ${ctx.minOrder}, pay by card, BLIK or cash. Or choose pickup on Ściegiennego street in Kielce.`,
  );

  const faqs: DishFaq[] = [];
  faqs.push({
    q: `How much is the ${d.name} at Szef Donald?`,
    a:
      d.sizes.length > 1
        ? `From ${money(d.fromPrice, L)}. By size: ${d.sizes.map((s) => `${s.name} ${money(s.price, L)}`).join(', ')}.`
        : `${money(d.fromPrice, L)}. Current prices are always on the menu at szefdonald.pl.`,
  });
  if (d.sizes.some((s) => s.grams != null)) {
    faqs.push({
      q: `How much meat is in the ${d.name}?`,
      a: `${d.sizes
        .filter((s) => s.grams != null)
        .map((s) => `${s.name}: ${s.grams} g`)
        .join(', ')} of meat.`,
    });
  } else if (d.grams) {
    faqs.push({ q: `How much meat is in the ${d.name}?`, a: `${d.grams} g of meat.` });
  }
  if (d.meats.length > 0) {
    faqs.push({
      q: `Which meat can I choose for the ${d.name}?`,
      a: `${joinAlternatives(
        d.meats.map((m) => lcFirst(m.name)),
        L,
      ).replace(/^./, (c) => c.toUpperCase())}.`,
    });
  }
  if (d.sauces.length > 0) {
    faqs.push({
      q: 'Which sauces are available?',
      a: `${joinAlternatives(
        d.sauces.map((s) => lcFirst(s.name)),
        L,
      ).replace(/^./, (c) => c.toUpperCase())}. If you want it hotter, say so in the order notes.`,
    });
  }
  if (d.isVegetarian && !d.isDrink) {
    faqs.push({ q: `Is the ${d.name} vegetarian?`, a: 'Yes, this dish contains no meat.' });
  }
  faqs.push({
    q: `Can I get the ${d.name} delivered?`,
    a: `Yes. Ordering direct on szefdonald.pl, delivery costs ${ctx.deliveryFee} (within about ${ctx.radiusKm} km, minimum order ${ctx.minOrder}). Pickup is available too.`,
  });

  return {
    h1: `${d.name} in Kielce`,
    title: clamp(`${d.name} Kielce — ${ctx.deliveryFee} delivery | Szef Donald`, 60),
    metaDescription: clamp(
      `${d.name}${desc ? ` — ${lcFirst(desc)}` : ''}. From ${money(d.fromPrice, L)}. Order with ${ctx.deliveryFee} delivery or pick up at Ściegiennego 68a, Kielce.`,
      155,
    ),
    paragraphs: p,
    faqs: faqs.slice(0, 5),
  };
}

export function buildDishCopy(d: DishFacts, ctx: DishCopyContext): DishCopy {
  return ctx.locale === 'en' ? buildEn(d, ctx) : buildPl(d, ctx);
}

/** Word count used by tests / guards (120–250 words target). */
export function wordCount(paragraphs: string[]): number {
  return paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
}
