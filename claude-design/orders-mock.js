/* global window */
/* ============================================================
   Orders mock — 247 realistic orders
   ============================================================ */

function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  // mix of locales: Polish, English, Arabic transliterated, Hispanic, Asian
  'Aleksandra','Bartek','Jakub','Kasia','Marta','Tomasz','Piotr','Zofia',
  'Amelia','Benjamin','Charlotte','Daniel','Eleanor','Felix','Grace','Henry','Isla','Oliver',
  'Yusuf','Layla','Omar','Fatima','Karim','Noor','Hassan','Aisha',
  'Diego','Elena','Mateo','Sofia','Camila','Luis','Valeria','Andres',
  'Hiroshi','Mei','Jin','Yuki','Kenji','Aya'
];
const LAST = [
  'Nowak','Kowalski','Wójcik','Lewandowska','Wiśniewski','Dąbrowska',
  'Smith','Jones','Brown','Taylor','Wilson','Davies','Clark','Hughes',
  'Khan','Hassan','Ahmad','Saeed','Mahmoud','El-Sayed',
  'García','Martínez','Rodríguez','Hernández','López','González',
  'Tanaka','Yamamoto','Suzuki','Kim','Park','Chen','Lee','Nakamura'
];

const ITEMS = [
  { name: 'Margherita Pizza', cat: 'Pizza', price: 16.50, mods: ['Extra basil', 'Thin crust'] },
  { name: 'Truffle Mushroom Pizza', cat: 'Pizza', price: 22.00, mods: ['Add burrata', 'Gluten-free base (+$3)'] },
  { name: 'Spicy Calabrian', cat: 'Pizza', price: 19.50, mods: ['Extra chili oil', 'No anchovy'] },
  { name: 'Bianca Bianca', cat: 'Pizza', price: 18.00, mods: ['Add prosciutto'] },
  { name: 'Garlic Knots', cat: 'Sides', price: 7.00, mods: ['Side of marinara'] },
  { name: 'Caesar Salad', cat: 'Salads', price: 13.50, mods: ['Add chicken (+$6)', 'No anchovy'] },
  { name: 'Burrata & Heirloom', cat: 'Salads', price: 15.00, mods: ['Balsamic on side'] },
  { name: 'Tagliatelle Bolognese', cat: 'Pasta', price: 19.00, mods: ['Extra parmesan', 'Less salt'] },
  { name: 'Cacio e Pepe', cat: 'Pasta', price: 17.50, mods: [] },
  { name: 'Truffle Carbonara', cat: 'Pasta', price: 21.00, mods: ['Add poached egg'] },
  { name: 'Tiramisù', cat: 'Dessert', price: 9.00, mods: [] },
  { name: 'Lemon Sorbet', cat: 'Dessert', price: 7.50, mods: ['Add prosecco (+$4)'] },
];

const ADDRESSES = [
  '14 Brick Lane, London E1 6QR',
  '88 Park Slope Ave, Brooklyn NY',
  '47 Mokotowska, Warsaw',
  '212 Mission St, San Francisco CA',
  '9 Rue de Lévis, Paris',
  '31 Carnaby St, London W1F',
  '6 Hayarkon, Tel Aviv',
  '55 Calle del Sol, Madrid',
];

const TABLES = ['Bar 3', 'Table 7', 'Booth 4', 'Window 2', 'Patio 1', 'Patio 5', 'Counter 9'];

function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

function pad6(n) { return String(n).padStart(6, '0'); }
function fmtOrderNumber(n) { return 'R-2026-' + pad6(n); }

const TYPES = ['DELIVERY','DELIVERY','DELIVERY','DELIVERY','DELIVERY','DELIVERY','PICKUP','PICKUP','PICKUP','DINE_IN'];

// status distribution — 247 orders weighted
function pickStatus(rnd) {
  const r = rnd();
  if (r < 0.55) return 'DELIVERED';
  if (r < 0.62) return 'CANCELLED';
  if (r < 0.74) return 'CONFIRMED';
  if (r < 0.85) return 'PREPARING';
  if (r < 0.90) return 'READY';
  if (r < 0.97) return 'OUT_FOR_DELIVERY';
  return 'PENDING';
}

function buildItems(rnd) {
  const count = 1 + Math.floor(rnd() * 4);
  const out = [];
  for (let i = 0; i < count; i++) {
    const it = ITEMS[Math.floor(rnd() * ITEMS.length)];
    const qty = 1 + Math.floor(rnd() * (i === 0 ? 2 : 1));
    const mods = it.mods.filter(() => rnd() > 0.5);
    out.push({
      id: 'li_' + i + '_' + Math.floor(rnd() * 9999),
      name: it.name,
      cat: it.cat,
      qty,
      unitPrice: it.price,
      mods,
      note: rnd() < 0.1 ? 'No onions, please.' : null,
    });
  }
  return out;
}

function paymentMethod(rnd) {
  const r = rnd();
  if (r < 0.7) {
    const last4 = String(Math.floor(rnd() * 10000)).padStart(4, '0');
    const brand = ['Visa','Mastercard','Amex'][Math.floor(rnd() * 3)];
    return { kind: 'card', brand, last4, label: `${brand} •••• ${last4}`, icon: brand.slice(0, 4).toUpperCase() };
  }
  if (r < 0.9) {
    return { kind: 'wallet', label: rnd() < 0.5 ? 'Apple Pay' : 'Google Pay', icon: 'PAY' };
  }
  return { kind: 'cash', label: 'Cash', icon: 'CSH' };
}

function paymentStatus(rnd, orderStatus) {
  if (orderStatus === 'CANCELLED') return rnd() < 0.4 ? 'refunded' : 'pending';
  if (orderStatus === 'PENDING') return 'pending';
  return rnd() < 0.96 ? 'paid' : 'pending';
}

function buildTimeline(rnd, status, type, createdAt) {
  const flow = ['PENDING','CONFIRMED','PREPARING','READY'];
  if (type === 'DELIVERY') flow.push('OUT_FOR_DELIVERY');
  flow.push('DELIVERED');

  let idx = status === 'CANCELLED' ? Math.max(1, Math.floor(rnd() * 3)) : flow.indexOf(status);
  if (idx < 0) idx = flow.length - 2; // safety net for status/type mismatch
  const out = [];
  let t = createdAt;
  for (let i = 0; i <= idx; i++) {
    const dt = i === 0 ? 0 : (60 + rnd() * 600) * 1000;
    t += dt;
    out.push({
      id: 'ev_' + i,
      status: flow[i],
      at: t,
      actor: i === 0 ? null : pick(rnd, ['Maya R.', 'Jorge S.', 'Priya K.', 'Tomas B.']),
      role: i === 0 ? 'Customer' : pick(rnd, ['Manager','Cashier','Kitchen']),
    });
  }
  if (status === 'CANCELLED') {
    out.push({
      id: 'ev_cancel',
      status: 'CANCELLED',
      at: t + 120000,
      actor: pick(rnd, ['Maya R.', 'Jorge S.']),
      role: 'Manager',
      note: pick(rnd, ['Customer requested cancellation.','Item out of stock — refunded.','Payment authorization failed.']),
    });
  }
  return out;
}

function makeOrderDetail(rnd, idx, opts = {}) {
  const orderNumber = fmtOrderNumber(2764 + 247 - idx);
  const status = opts.status || pickStatus(rnd);
  const type = opts.type || pick(rnd, TYPES);
  const items = buildItems(rnd);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const tax = Math.round(subtotal * 0.0875 * 100) / 100;
  const deliveryFee = type === 'DELIVERY' ? 3.99 : 0;
  const tipPct = rnd() < 0.7 ? pick(rnd, [0.15, 0.18, 0.20, 0.22]) : 0;
  const tip = Math.round(subtotal * tipPct * 100) / 100;
  const discount = rnd() < 0.15 ? Math.round((subtotal * 0.1) * 100) / 100 : 0;
  const loyaltyRedemption = rnd() < 0.08 ? 5 : 0;
  const grandTotal = Math.round((subtotal + tax + deliveryFee + tip - discount - loyaltyRedemption) * 100) / 100;

  const firstName = pick(rnd, FIRST);
  const lastName = pick(rnd, LAST);
  const phone = `+1 (415) ${String(Math.floor(rnd() * 900) + 100)}-${String(Math.floor(rnd() * 9000) + 1000)}`;
  const email = (firstName + '.' + lastName + '@example.com').toLowerCase();

  // makeOrderDetail can be called for "live new" orders — those should be very fresh
  const baseSeconds = opts.secondsAgo != null
    ? opts.secondsAgo
    : (status === 'PENDING'
        ? Math.floor(rnd() * 240) + (rnd() < 0.3 ? 130 : 0)  // some stale (>2 min)
        : 60 + Math.floor(rnd() * 86400 * (status === 'DELIVERED' ? 0.3 : 0.05)));
  const createdAt = Date.now() - baseSeconds * 1000;

  const payment = paymentMethod(rnd);
  const payStatus = paymentStatus(rnd, status);

  const timeline = buildTimeline(rnd, status, type, createdAt);
  const lastEventAt = timeline[timeline.length - 1].at;

  // elapsed since CONFIRMED
  const confirmedEv = timeline.find(t => t.status === 'CONFIRMED');
  const elapsedSec = confirmedEv ? Math.floor((Date.now() - confirmedEv.at) / 1000) : null;

  let address = null, table = null, pickupTime = null;
  if (type === 'DELIVERY') address = pick(rnd, ADDRESSES);
  if (type === 'DINE_IN') table = pick(rnd, TABLES);
  if (type === 'PICKUP') pickupTime = createdAt + (15 + Math.floor(rnd() * 30)) * 60 * 1000;

  const refunds = (payStatus === 'refunded' || (status === 'CANCELLED' && rnd() < 0.5))
    ? [{ amount: grandTotal, reason: pick(rnd, ['Customer requested','Item out of stock','Food quality issue']),
         at: lastEventAt, by: 'Maya R.' }]
    : [];

  return {
    id: 'ord_' + idx,
    orderNumber,
    customer: {
      firstName,
      lastName,
      lastInitial: lastName[0],
      phone,
      email,
      avatarUrl: null,
    },
    type, status,
    items,
    itemCount,
    subtotal, tax, deliveryFee, tip, discount, loyaltyRedemption,
    total: grandTotal,
    payment, paymentStatus: payStatus,
    paymentRef: 'pi_3R' + Math.random().toString(36).slice(2, 12).toUpperCase(),
    refunds,
    timeline,
    placedAt: createdAt,
    elapsedSinceConfirmedSec: elapsedSec,
    address, table, pickupTime,
    isNew: opts.isNew || false,
  };
}

function buildAllOrders() {
  const rnd = mulberry32(42);
  const orders = [];
  for (let i = 0; i < 247; i++) {
    orders.push(makeOrderDetail(rnd, i));
  }
  // ensure status distribution matches what we promised in the filter pills
  // counts: pending 6, confirmed 12, preparing 18, ready 9, out_for_delivery 15, delivered 137, cancelled 10 — these are deterministic targets
  const targets = { PENDING: 6, CONFIRMED: 12, PREPARING: 18, READY: 9, OUT_FOR_DELIVERY: 15, DELIVERED: 137, CANCELLED: 10 };
  const remaining = 247 - Object.values(targets).reduce((s, v) => s + v, 0);
  // distribute remaining → delivered
  targets.DELIVERED += remaining;

  // assign statuses to fit targets, keep newest in earliest pages by sorting after
  const list = [];
  let idx = 0;
  for (const [st, cnt] of Object.entries(targets)) {
    for (let i = 0; i < cnt; i++) {
      const o = orders[idx++];
      o.status = st;
      // OUT_FOR_DELIVERY only valid for DELIVERY type
      if (st === 'OUT_FOR_DELIVERY') o.type = 'DELIVERY';
      // rebuild timeline + freshness to match the new status
      const rnd2 = mulberry32(idx * 7);
      const secondsAgo = st === 'PENDING'
        ? (i < 2 ? 130 + Math.floor(rnd2() * 60) : 30 + Math.floor(rnd2() * 90))   // 2 stale pendings
        : st === 'CONFIRMED' ? 60 + Math.floor(rnd2() * 240)
        : st === 'PREPARING' ? 240 + Math.floor(rnd2() * 600)
        : st === 'READY' ? 480 + Math.floor(rnd2() * 600)
        : st === 'OUT_FOR_DELIVERY' ? 600 + Math.floor(rnd2() * 1800)
        : st === 'DELIVERED' ? 1800 + Math.floor(rnd2() * 86400 * 0.3)
        : 600 + Math.floor(rnd2() * 3600);
      o.placedAt = Date.now() - secondsAgo * 1000;
      o.timeline = buildTimeline(rnd2, st, o.type, o.placedAt);
      const conf = o.timeline.find(t => t.status === 'CONFIRMED');
      o.elapsedSinceConfirmedSec = conf ? Math.floor((Date.now() - conf.at) / 1000) : null;
      o.paymentStatus = paymentStatus(rnd2, st);
      if (o.paymentStatus === 'refunded') {
        o.refunds = [{ amount: o.total, reason: pick(rnd2, ['Customer requested','Item out of stock','Food quality issue']), at: Date.now(), by: 'Maya R.' }];
      } else {
        o.refunds = [];
      }
      list.push(o);
    }
  }

  // sort newest first
  list.sort((a, b) => b.placedAt - a.placedAt);
  return list;
}

function statusCounts(list) {
  const out = { ALL: list.length };
  for (const st of ['PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED']) {
    out[st] = list.filter(o => o.status === st).length;
  }
  return out;
}

window.OrdersMock = {
  buildAllOrders,
  statusCounts,
  makeOrderDetail,
  mulberry32,
};
