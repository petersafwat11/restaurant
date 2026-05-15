// k6 load test — order placement hot path.
// Run: k6 run -e BASE_URL=https://api.example.com load/order-flow.js
//
// Profile: ramp to 50 VUs, hold, ramp down. Thresholds fail the run if the
// p95 latency or error rate regress past the launch budget.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const RESTAURANT_ID = __ENV.RESTAURANT_ID || '';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% errors
    http_req_duration: ['p(95)<800'], // p95 < 800ms
    'http_req_duration{name:placeOrder}': ['p(95)<1200'],
  },
};

export default function () {
  // Public menu read — the most-hit endpoint.
  const menu = http.get(`${BASE_URL}/api/v1/menu/categories`, {
    tags: { name: 'menu' },
  });
  check(menu, { 'menu 200': (r) => r.status === 200 });

  // Guest cart + order requires a seeded restaurant + session; in CI this
  // script is smoke-only unless RESTAURANT_ID is provided.
  if (RESTAURANT_ID) {
    const sessionKey = `k6-${__VU}-${__ITER}`;
    http.post(
      `${BASE_URL}/api/v1/cart/items?restaurantId=${RESTAURANT_ID}&sessionKey=${sessionKey}`,
      JSON.stringify({ menuItemId: __ENV.ITEM_ID, quantity: 1, modifierSelections: [] }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'addToCart' } },
    );
    const order = http.post(
      `${BASE_URL}/api/v1/orders`,
      JSON.stringify({ restaurantId: RESTAURANT_ID, type: 'PICKUP', sessionKey, tipAmount: '0' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `k6-${sessionKey}`,
        },
        tags: { name: 'placeOrder' },
      },
    );
    check(order, { 'order created': (r) => r.status === 201 });
  }

  sleep(1);
}
