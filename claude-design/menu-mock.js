/* global window */
/* ============================================================
   Menu mock — 8 categories, ~40 items
   ============================================================ */

function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stock food photos (lazy-loaded). Generic IDs work without API key.
const PIZZA_IMGS = [
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&q=80',
  'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&q=80',
];
const PASTA_IMGS = [
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80',
];
const SALAD_IMGS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1565895405227-31cffbe0cf86?w=400&q=80',
];
const DESSERT_IMGS = [
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80',
];
const DRINK_IMGS = [
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80',
  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
];
const STARTER_IMGS = [
  'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&q=80',
  'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400&q=80',
];

const SIZES = { name: 'Size', required: true, min: 1, max: 1, options: [
  { name: 'Small (10")', priceDelta: 0, isDefault: true },
  { name: 'Medium (12")', priceDelta: 3 },
  { name: 'Large (14")', priceDelta: 6 },
]};
const CRUST = { name: 'Crust', required: true, min: 1, max: 1, options: [
  { name: 'Classic', priceDelta: 0, isDefault: true },
  { name: 'Thin', priceDelta: 0 },
  { name: 'Gluten-free', priceDelta: 3 },
]};
const TOPPINGS = { name: 'Extra toppings', required: false, min: 0, max: 5, options: [
  { name: 'Mushrooms', priceDelta: 2 },
  { name: 'Olives', priceDelta: 2 },
  { name: 'Anchovies', priceDelta: 2.5 },
  { name: 'Burrata', priceDelta: 4 },
  { name: 'Prosciutto', priceDelta: 5 },
]};
const PASTA_ADD = { name: 'Add protein', required: false, min: 0, max: 1, options: [
  { name: 'Grilled chicken', priceDelta: 5 },
  { name: 'Shrimp', priceDelta: 7 },
  { name: 'Italian sausage', priceDelta: 4 },
]};

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

let __imgSeq = 0;
function img(url) { return { id: 'img_' + (++__imgSeq), url, alt: '' }; }
function imgsFrom(pool, count, rnd) {
  const out = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let pick = Math.floor(rnd() * pool.length);
    // try to pick unused
    let tries = 0;
    while (used.has(pick) && tries < 10) { pick = Math.floor(rnd() * pool.length); tries++; }
    used.add(pick);
    out.push(img(pool[pick]));
  }
  return out;
}

const ITEMS = [
  // Pizzas
  { cat: 'pizzas', name: 'Margherita', desc: 'San Marzano tomato, fresh mozzarella, basil, extra-virgin olive oil.', price: 16.5, prep: 12, dietary: ['V'], spice: 0, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 3 },
  { cat: 'pizzas', name: 'Truffle Mushroom', desc: 'Wild mushrooms, mozzarella, truffle oil, parsley.', price: 22, compareAt: 26, prep: 14, dietary: ['V'], spice: 0, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 2, featured: true },
  { cat: 'pizzas', name: 'Bianca Bianca', desc: 'No tomato — ricotta, mozzarella, garlic, lemon zest.', price: 18, prep: 12, dietary: ['V'], spice: 0, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 1 },
  { cat: 'pizzas', name: 'Spicy Calabrian', desc: 'Spicy soppressata, chili oil, hot honey, mozzarella.', price: 19.5, prep: 13, dietary: [], spice: 3, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 2, featured: true },
  { cat: 'pizzas', name: 'Quattro Formaggi', desc: 'Mozzarella, gorgonzola, fontina, parmigiano.', price: 20, prep: 13, dietary: ['V'], spice: 0, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 1 },
  { cat: 'pizzas', name: 'Diavola', desc: 'Spicy salami, tomato, mozzarella, oregano.', price: 19, prep: 12, dietary: [], spice: 2, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 0 },
  { cat: 'pizzas', name: 'Funghi', desc: 'Cremini, oyster, shiitake, fior di latte, thyme.', price: 19, prep: 13, dietary: ['V'], spice: 0, mods: 'pizza', imgPool: PIZZA_IMGS, imgCount: 1, available: false },

  // Pasta
  { cat: 'pasta', name: 'Tagliatelle Bolognese', desc: 'Slow-cooked beef and pork ragù, parmesan.', price: 19, prep: 15, dietary: [], spice: 0, mods: 'pasta', imgPool: PASTA_IMGS, imgCount: 2 },
  { cat: 'pasta', name: 'Cacio e Pepe', desc: 'Pecorino romano, cracked black pepper, hand-pulled tonnarelli.', price: 17.5, prep: 12, dietary: ['V'], spice: 1, mods: 'pasta', imgPool: PASTA_IMGS, imgCount: 1 },
  { cat: 'pasta', name: 'Truffle Carbonara', desc: 'Guanciale, egg yolk, pecorino, black truffle shavings.', price: 21, prep: 14, dietary: [], spice: 0, mods: 'pasta', imgPool: PASTA_IMGS, imgCount: 1, featured: true },
  { cat: 'pasta', name: 'Mushroom Ravioli', desc: 'Hand-folded ravioli, brown butter, sage, parmesan.', price: 19.5, prep: 13, dietary: ['V'], spice: 0, mods: 'pasta', imgPool: PASTA_IMGS, imgCount: 0 },
  { cat: 'pasta', name: 'Arrabbiata', desc: 'Tomato, garlic, calabrian chili, basil.', price: 16, prep: 11, dietary: ['V','Ve'], spice: 3, mods: 'pasta', imgPool: PASTA_IMGS, imgCount: 1 },
  { cat: 'pasta', name: 'Linguine alle Vongole', desc: 'Manila clams, white wine, garlic, parsley.', price: 24, prep: 16, dietary: [], spice: 1, mods: 'pasta', imgPool: PASTA_IMGS, imgCount: 0, available: false },

  // Mains
  { cat: 'mains', name: 'Branzino', desc: 'Whole roasted European sea bass, lemon, herbs.', price: 32, prep: 20, dietary: ['GF'], spice: 0, mods: 'none', imgPool: PIZZA_IMGS, imgCount: 0 },
  { cat: 'mains', name: 'Bistecca Fiorentina', desc: '24oz dry-aged porterhouse, rosemary, sea salt.', price: 64, prep: 25, dietary: ['GF'], spice: 0, mods: 'none', imgPool: PIZZA_IMGS, imgCount: 0, featured: true },
  { cat: 'mains', name: 'Pork Milanese', desc: 'Breaded pork cutlet, arugula, lemon, parmesan.', price: 26, prep: 14, dietary: [], spice: 0, mods: 'none', imgPool: PIZZA_IMGS, imgCount: 0 },
  { cat: 'mains', name: 'Mushroom Risotto', desc: 'Carnaroli rice, porcini, truffle oil, parmesan.', price: 22, prep: 18, dietary: ['V','GF'], spice: 0, mods: 'none', imgPool: PIZZA_IMGS, imgCount: 0 },
  { cat: 'mains', name: 'Lamb Ragu Pappardelle', desc: 'Braised lamb, pappardelle, mint, pecorino.', price: 28, prep: 16, dietary: [], spice: 1, mods: 'none', imgPool: PASTA_IMGS, imgCount: 1 },

  // Salads
  { cat: 'salads', name: 'Caesar', desc: 'Romaine, anchovy, parmesan, garlic croutons.', price: 13.5, prep: 5, dietary: [], spice: 0, mods: 'salad', imgPool: SALAD_IMGS, imgCount: 1 },
  { cat: 'salads', name: 'Burrata & Heirloom', desc: 'Burrata, heirloom tomatoes, basil, balsamic.', price: 15, prep: 6, dietary: ['V','GF'], spice: 0, mods: 'salad', imgPool: SALAD_IMGS, imgCount: 1, featured: true },
  { cat: 'salads', name: 'Beet & Goat Cheese', desc: 'Roasted beets, goat cheese, candied walnuts, citrus vinaigrette.', price: 14, prep: 5, dietary: ['V','GF'], spice: 0, mods: 'salad', imgPool: SALAD_IMGS, imgCount: 0 },
  { cat: 'salads', name: 'Greek', desc: 'Cucumber, tomato, kalamata, feta, oregano.', price: 12.5, prep: 4, dietary: ['V','GF'], spice: 0, mods: 'salad', imgPool: SALAD_IMGS, imgCount: 0 },

  // Sides / Starters
  { cat: 'starters', name: 'Garlic Knots', desc: 'House-pulled dough, garlic butter, parmesan, marinara on the side.', price: 7, prep: 8, dietary: ['V'], spice: 0, mods: 'none', imgPool: STARTER_IMGS, imgCount: 1 },
  { cat: 'starters', name: 'Bruschetta', desc: 'Grilled sourdough, tomato, basil, garlic.', price: 9, prep: 6, dietary: ['V'], spice: 0, mods: 'none', imgPool: STARTER_IMGS, imgCount: 1 },
  { cat: 'starters', name: 'Arancini', desc: 'Fried risotto balls, mozzarella core, spicy tomato.', price: 11, prep: 9, dietary: ['V'], spice: 2, mods: 'none', imgPool: STARTER_IMGS, imgCount: 1 },
  { cat: 'starters', name: 'Calamari Fritti', desc: 'Crispy calamari, lemon, spicy aioli.', price: 14, prep: 8, dietary: [], spice: 1, mods: 'none', imgPool: STARTER_IMGS, imgCount: 0 },
  { cat: 'starters', name: 'Polenta Fries', desc: 'Crispy polenta, parmesan, rosemary, tomato dip.', price: 9, prep: 10, dietary: ['V','GF'], spice: 0, mods: 'none', imgPool: STARTER_IMGS, imgCount: 0 },

  // Sides
  { cat: 'sides', name: 'Side Caesar', desc: 'Half portion.', price: 8, prep: 4, dietary: [], spice: 0, mods: 'none', imgPool: SALAD_IMGS, imgCount: 0 },
  { cat: 'sides', name: 'Roasted Brussels', desc: 'Pancetta, balsamic, parmesan.', price: 9, prep: 8, dietary: ['GF'], spice: 0, mods: 'none', imgPool: SALAD_IMGS, imgCount: 0 },
  { cat: 'sides', name: 'Truffle Fries', desc: 'Hand-cut, truffle oil, parmesan, parsley.', price: 10, prep: 9, dietary: ['V'], spice: 0, mods: 'none', imgPool: STARTER_IMGS, imgCount: 0 },

  // Desserts
  { cat: 'desserts', name: 'Tiramisù', desc: 'Mascarpone, espresso, ladyfingers, cocoa.', price: 9, prep: 3, dietary: ['V'], spice: 0, mods: 'none', imgPool: DESSERT_IMGS, imgCount: 1 },
  { cat: 'desserts', name: 'Lemon Sorbet', desc: 'House-churned. Optional prosecco add.', price: 7.5, prep: 2, dietary: ['V','Ve','GF'], spice: 0, mods: 'dessert', imgPool: DESSERT_IMGS, imgCount: 1 },
  { cat: 'desserts', name: 'Affogato', desc: 'Vanilla gelato, espresso shot, hazelnut crunch.', price: 8, prep: 3, dietary: ['V'], spice: 0, mods: 'none', imgPool: DESSERT_IMGS, imgCount: 0 },
  { cat: 'desserts', name: 'Olive Oil Cake', desc: 'Lemon, fresh ricotta, candied citrus.', price: 9, prep: 4, dietary: ['V'], spice: 0, mods: 'none', imgPool: DESSERT_IMGS, imgCount: 0 },

  // Drinks
  { cat: 'drinks', name: 'House Red', desc: 'Chianti, glass.', price: 11, prep: 1, dietary: ['V','Ve','GF'], spice: 0, mods: 'none', imgPool: DRINK_IMGS, imgCount: 1 },
  { cat: 'drinks', name: 'Aperol Spritz', desc: 'Aperol, prosecco, soda, orange.', price: 12, prep: 2, dietary: ['V','Ve','GF'], spice: 0, mods: 'none', imgPool: DRINK_IMGS, imgCount: 1 },
  { cat: 'drinks', name: 'Italian Soda', desc: 'Choice of syrup, sparkling water, cream optional.', price: 5, prep: 1, dietary: ['V','GF'], spice: 0, mods: 'none', imgPool: DRINK_IMGS, imgCount: 0, breakfast: true },
  { cat: 'drinks', name: 'Espresso', desc: 'Single shot.', price: 3.5, prep: 1, dietary: ['V','Ve','GF'], spice: 0, mods: 'none', imgPool: DRINK_IMGS, imgCount: 0, breakfast: true },
  { cat: 'drinks', name: 'Cappuccino', desc: 'Espresso, steamed milk, foam.', price: 5, prep: 2, dietary: ['V','GF'], spice: 0, mods: 'none', imgPool: DRINK_IMGS, imgCount: 0, breakfast: true },

  // Sauces
  { cat: 'sauces', name: 'House Marinara', desc: 'Side, 4 oz.', price: 2, prep: 1, dietary: ['V','Ve','GF'], spice: 0, mods: 'none', imgPool: STARTER_IMGS, imgCount: 0 },
  { cat: 'sauces', name: 'Chili Oil', desc: 'House-made. 2 oz.', price: 2, prep: 1, dietary: ['V','Ve','GF'], spice: 3, mods: 'none', imgPool: STARTER_IMGS, imgCount: 0 },
  { cat: 'sauces', name: 'Hot Honey', desc: 'Calabrian chili-infused honey. 2 oz.', price: 2.5, prep: 1, dietary: ['V','GF'], spice: 2, mods: 'none', imgPool: STARTER_IMGS, imgCount: 0 },
];

const CATEGORIES = [
  { id: 'starters', name: 'Starters' },
  { id: 'salads',   name: 'Salads' },
  { id: 'pizzas',   name: 'Pizzas' },
  { id: 'pasta',    name: 'Pasta' },
  { id: 'mains',    name: 'Mains' },
  { id: 'sides',    name: 'Sides' },
  { id: 'desserts', name: 'Desserts' },
  { id: 'drinks',   name: 'Drinks' },
  { id: 'sauces',   name: 'Sauces' },
];

function buildMenu() {
  const rnd = mulberry32(7);

  const itemsByCategory = {};
  for (const c of CATEGORIES) itemsByCategory[c.id] = [];

  let itemSeq = 1;
  for (const def of ITEMS) {
    const id = 'item_' + String(itemSeq++).padStart(3, '0');
    const itemSlug = `menu/${def.cat}/${slug(def.name)}`;
    const modifierGroups = [];
    if (def.mods === 'pizza') {
      modifierGroups.push(deep(SIZES), deep(CRUST), deep(TOPPINGS));
    } else if (def.mods === 'pasta') {
      modifierGroups.push(deep(PASTA_ADD));
    } else if (def.mods === 'salad') {
      modifierGroups.push({
        name: 'Add protein', required: false, min: 0, max: 1, options: [
          { name: 'Grilled chicken', priceDelta: 6 },
          { name: 'Salmon', priceDelta: 8 },
        ],
      });
    } else if (def.mods === 'dessert') {
      modifierGroups.push({
        name: 'Add-ons', required: false, min: 0, max: 2, options: [
          { name: 'Prosecco', priceDelta: 4 },
          { name: 'Berries', priceDelta: 2 },
        ],
      });
    }

    const images = imgsFrom(def.imgPool, def.imgCount, rnd);

    itemsByCategory[def.cat].push({
      id, slug: itemSlug,
      categoryId: def.cat,
      name: def.name,
      description: def.desc,
      basePrice: def.price,
      compareAt: def.compareAt || null,
      currency: 'USD',
      calories: 200 + Math.floor(rnd() * 800),
      prepMinutes: def.prep,
      spiceLevel: def.spice || 0,
      featured: !!def.featured,
      dietary: def.dietary || [],
      available: def.available !== false,
      images,
      modifierGroups: modifierGroups.map((g, gi) => ({
        id: id + '_g' + gi,
        ...g,
        options: g.options.map((o, oi) => ({ id: id + '_g' + gi + '_o' + oi, ...o })),
      })),
      schedule: def.breakfast
        ? { days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], windows: [{ from: '07:00', to: '11:00' }] }
        : null,
      updatedAt: Date.now() - Math.floor(rnd() * 86400000 * 30),
      orderedLast30d: Math.floor(rnd() * 800),
    });
  }

  // Sort by position (insertion order) but later allow drag-reorder
  const categories = CATEGORIES.map((c, i) => ({
    id: c.id, name: c.name, slug: c.id, position: i,
    image: null,
    itemCount: itemsByCategory[c.id].length,
  }));

  return { categories, itemsByCategory };
}

function deep(g) {
  return { ...g, options: g.options.map(o => ({ ...o })) };
}

window.MenuMock = { buildMenu };
