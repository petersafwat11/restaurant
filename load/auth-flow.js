// k6 load test — auth hot path (register + login + refresh).
// Run: k6 run -e BASE_URL=https://api.example.com load/auth-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{name:login}': ['p(95)<700'],
    'http_req_duration{name:register}': ['p(95)<1500'], // bcrypt cost
  },
};

export default function () {
  const email = `k6-${__VU}-${__ITER}-${Date.now()}@load.local`;
  const password = 'Password123!';

  const reg = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'register' } },
  );
  check(reg, { 'register 201': (r) => r.status === 201 });

  const login = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  check(login, { 'login 200/201': (r) => r.status === 200 || r.status === 201 });

  sleep(1);
}
