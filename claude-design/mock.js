/* global window */
/* ============================================================
   Mock data — overview
   ============================================================ */

const STATUS_COLORS = {
  PENDING: 'var(--text-tertiary)',
  CONFIRMED: 'var(--info)',
  PREPARING: 'var(--warning)',
  READY: 'var(--accent)',
  OUT_FOR_DELIVERY: 'var(--blue)',
  DELIVERED: 'var(--positive)',
  CANCELLED: 'var(--negative)',
};
const STATUS_HEX = {
  PENDING: '#5B6070',
  CONFIRMED: '#A78BFA',
  PREPARING: '#FBBF24',
  READY: '#7FE8C8',
  OUT_FOR_DELIVERY: '#60A5FA',
  DELIVERED: '#34D399',
  CANCELLED: '#F87171',
};

// deterministic-ish prng for stable mock
function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Amelia','Ben','Cara','Diego','Elena','Farah','Gabe','Hana','Ivo','Jules',
  'Kai','Lina','Mateo','Nora','Owen','Priya','Quinn','Rhea','Sami','Tara',
  'Uma','Vince','Wren','Xan','Yara','Zane','Mira','Noah','Otis','Sage'
];
const LAST_INITS = ['A','B','C','D','F','G','H','J','K','L','M','N','P','R','S','T','V','W'];

const MENU_ITEMS = [
  { name: 'Margherita Pizza',    cat: 'Pizza' },
  { name: 'Truffle Mushroom Pizza', cat: 'Pizza' },
  { name: 'Bianca Bianca',       cat: 'Pizza' },
  { name: 'Garlic Knots',        cat: 'Sides' },
  { name: 'Caesar Salad',        cat: 'Salads' },
  { name: 'Burrata & Heirloom',  cat: 'Salads' },
  { name: 'Spicy Calabrian',     cat: 'Pizza' },
  { name: 'Tagliatelle Bolognese', cat: 'Pasta' },
  { name: 'Cacio e Pepe',        cat: 'Pasta' },
  { name: 'Tiramisù',            cat: 'Dessert' },
];

const ORDER_TYPES = ['DELIVERY','PICKUP','DINE_IN'];

function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

// natural daily curve: smoothed sine + lunch/dinner peaks at 12:30 & 19:00
function dayCurve(hour) {
  const base = 1 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 0.2;
  const lunch  = Math.exp(-Math.pow((hour - 12.5) / 1.3, 2)) * 1.8;
  const dinner = Math.exp(-Math.pow((hour - 19)   / 1.6, 2)) * 2.4;
  const open = hour < 10 ? 0.15 : (hour > 22 ? 0.2 : 1);
  return Math.max(0, (base + lunch + dinner) * open);
}

function buildSeries(range, rnd) {
  const points = [];
  if (range === 'today') {
    for (let h = 0; h < 24; h++) {
      const c = dayCurve(h + 0.0);
      const rev = c * 220 + rnd() * 40;
      const ord = c * 7   + rnd() * 1.5;
      points.push({
        t: String(h).padStart(2, '0') + ':00',
        revenue: Math.round(rev),
        orders: Math.round(ord),
      });
    }
  } else {
    const days = range === '7d' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      // weekly rhythm: weekends busier
      const dow = (new Date().getDay() - i + 7) % 7;
      const weekend = (dow === 5 || dow === 6) ? 1.35 : (dow === 0 ? 1.1 : 1.0);
      const monthDip = range === '30d' ? (0.92 + 0.16 * Math.sin(i / 5)) : 1;
      const rev = (3500 + rnd() * 900) * weekend * monthDip;
      const ord = (105 + rnd() * 30) * weekend * monthDip;
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      points.push({ t: label, revenue: Math.round(rev), orders: Math.round(ord) });
    }
  }
  return points;
}

function buildByStatus(rnd, totalOrders) {
  // realistic distribution for the day
  const weights = {
    PENDING: 0.03,
    CONFIRMED: 0.06,
    PREPARING: 0.08,
    READY: 0.04,
    OUT_FOR_DELIVERY: 0.07,
    DELIVERED: 0.68,
    CANCELLED: 0.04,
  };
  let arr = Object.entries(weights).map(([status, w]) => ({
    status,
    count: Math.max(0, Math.round(totalOrders * w + (rnd() - 0.5) * 4)),
  }));
  return arr;
}

function buildTopItems(rnd) {
  const items = MENU_ITEMS.slice(0, 8).map((m, i) => {
    const qty = Math.round(48 - i * 5 + rnd() * 6);
    const unit = 14 + i * 1.8 + rnd() * 4;
    const revenue = Math.round(qty * unit * 100) / 100;
    const spark = Array.from({ length: 14 }, (_, k) => Math.max(2, qty / 14 + Math.sin(k / 2) * 3 + rnd() * 4));
    return {
      id: 'it_' + i,
      name: m.name,
      category: m.cat,
      qty,
      revenue,
      sparkline: spark,
    };
  });
  items.sort((a, b) => b.revenue - a.revenue);
  return items.slice(0, 5);
}

function fmtOrderNumber(n) {
  return 'R-2026-' + String(n).padStart(6, '0');
}

let __orderCounter = 1247;
function buildRecentOrders(rnd, count = 8) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(makeOrder(rnd, i * 60 + 30 + Math.floor(rnd() * 120)));
  }
  return out;
}
function makeOrder(rnd, secondsAgo) {
  const itemPick = MENU_ITEMS[Math.floor(rnd() * MENU_ITEMS.length)];
  const itemCount = 1 + Math.floor(rnd() * 5);
  const items = `${itemCount} item${itemCount > 1 ? 's' : ''} · ${itemPick.name}`;
  const fn = pick(rnd, FIRST_NAMES);
  const li = pick(rnd, LAST_INITS);
  const total = Math.round((12 + rnd() * 65) * 100) / 100;
  const allStatus = ['PENDING','CONFIRMED','PREPARING','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','DELIVERED'];
  const status = pick(rnd, allStatus);
  const type = pick(rnd, ORDER_TYPES);
  return {
    id: 'ord_' + (__orderCounter--),
    orderNumber: fmtOrderNumber(__orderCounter + 1),
    customer: { firstName: fn, lastInitial: li },
    items, itemCount,
    type, status,
    total,
    placedAt: Date.now() - secondsAgo * 1000,
  };
}

function deltaPct(rnd, magnitude = 18) {
  return Math.round((rnd() * 2 - 1) * magnitude * 10) / 10;
}

function buildOverview(range) {
  const seed = range === 'today' ? 24 : range === '7d' ? 77 : 303;
  const rnd = mulberry32(seed);

  const series = buildSeries(range, rnd);
  const orders = series.reduce((s, p) => s + p.orders, 0);
  const revenue = series.reduce((s, p) => s + p.revenue, 0);
  const aov = orders ? revenue / orders : 0;
  const completionRate = 95.4 + (rnd() - 0.5) * 1.6;
  const newCustomers = range === 'today'
    ? Math.round(9 + rnd() * 6)
    : range === '7d' ? Math.round(72 + rnd() * 18) : Math.round(310 + rnd() * 60);

  const byStatus = buildByStatus(rnd, range === 'today' ? orders : Math.round(orders / (range === '7d' ? 7 : 30)));
  const topItems = buildTopItems(rnd);

  const live = {
    activeOrders: 14 + Math.floor(rnd() * 6),
    inKitchen: 6 + Math.floor(rnd() * 4),
    avgPrepSeconds: 12 * 60 + Math.floor(rnd() * 60),
  };

  const recentOrders = buildRecentOrders(rnd, 8);

  return {
    range,
    currency: 'USD',
    kpis: {
      revenue,
      orders,
      aov,
      completionRate,
      newCustomers,
      deltas: {
        revenue: deltaPct(rnd, 16),
        orders: deltaPct(rnd, 14),
        aov: deltaPct(rnd, 8),
        completionRate: deltaPct(rnd, 3),
        newCustomers: deltaPct(rnd, 22),
      },
    },
    series: { points: series },
    byStatus,
    topItems,
    live,
    recentOrders,
  };
}

// expose globals
window.MOCK = {
  buildOverview,
  makeOrder,
  mulberry32,
  STATUS_COLORS,
  STATUS_HEX,
};
