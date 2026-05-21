import CustomersPage from '@/app/[locale]/(dashboard)/customers/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const customersPayload = {
  items: [
    {
      id: 'cust_1',
      email: 'alice@example.test',
      phone: '+48 22 555 0001',
      firstName: 'Alice',
      lastName: 'Adams',
      lifetimeOrders: 12,
      lifetimeSpend: '420.50',
      lastOrderAt: '2026-05-15T10:00:00.000Z',
      firstOrderAt: '2025-09-01T10:00:00.000Z',
      segment: 'frequent',
      createdAt: '2025-09-01T10:00:00.000Z',
    },
    {
      id: 'cust_2',
      email: 'bob@example.test',
      phone: null,
      firstName: 'Bob',
      lastName: null,
      lifetimeOrders: 1,
      lifetimeSpend: '12.00',
      lastOrderAt: '2026-05-01T10:00:00.000Z',
      firstOrderAt: '2026-05-01T10:00:00.000Z',
      segment: 'new',
      createdAt: '2026-05-01T10:00:00.000Z',
    },
  ],
  nextCursor: null,
};

afterEach(() => resetTestState());

describe('CustomersPage', () => {
  it('renders the list with lifetime metrics formatted as money', async () => {
    server.use(
      http.get(/\/admin\/customers\/tags\/all/, () => HttpResponse.json([])),
      http.get(/\/admin\/customers(\?|$)/, () => HttpResponse.json(customersPayload)),
    );

    const { container } = renderPage(<CustomersPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('Alice')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    // formatMoney enforces 2dp — verifies carry-over fix #7 in a rendered surface.
    expect(text).toMatch(/420[.,]50/);
    expect(text).toMatch(/12[.,]00/);
  });

  it('blocks the page when customer:read is missing', () => {
    renderPage(<CustomersPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
