// Top-level so it's set before any module under test evaluates its env schema.
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';

import { cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// vitest's `globals: false` config disables @testing-library/react's
// auto-cleanup, so register it manually. Without this each render() leaks
// DOM into the next test → spurious "multiple elements found" errors.
afterEach(() => cleanup());

// Default handlers for Next.js Route Handlers that the auth store hits as
// side effects. Tests can override with `server.use(...)` if they need to
// observe these calls.
const defaultHandlers = [
  http.post(/\/api\/auth\/(set-session|clear-session)/, () => HttpResponse.json({ success: true })),
  http.get(/\/api\/auth\/get-refresh-token/, () => HttpResponse.json({ refreshToken: null })),
];

export const server = setupServer(...defaultHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Polyfill matchMedia for happy-dom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}
