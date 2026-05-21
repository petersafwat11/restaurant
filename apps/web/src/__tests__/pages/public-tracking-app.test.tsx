import { PublicTrackingApp } from '@/features/checkout/components/public-tracking-app';
import { server } from '@/test/setup';
import { loadMessages } from '@repo/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

const messages = loadMessages('en');

function withProviders(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Warsaw">
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('PublicTrackingApp', () => {
  it('renders "Tracking link required" when token is missing', () => {
    render(withProviders(<PublicTrackingApp orderId="order_abc" token={null} />));
    expect(screen.getByText(/Tracking link required/i)).toBeTruthy();
  });

  it('renders stepper and order number when API returns matching tracking data', async () => {
    server.use(
      http.get('http://localhost:4000/api/v1/orders/track', () =>
        HttpResponse.json({
          orderId: 'order_abc',
          orderNumber: 'R-2026-000001',
          type: 'DELIVERY',
          status: 'PREPARING',
          isTerminal: false,
          timeline: [],
          etaMinutes: 35,
          estimatedReadyAt: null,
          restaurantGeo: null,
          deliveryGeo: null,
        }),
      ),
    );
    render(withProviders(<PublicTrackingApp orderId="order_abc" token="t.s" />));
    await waitFor(() => {
      expect(screen.getByText(/R-2026-000001/i)).toBeTruthy();
    });
    expect(screen.getByLabelText('Order progress')).toBeTruthy();
    expect(screen.getByText(/35 min/)).toBeTruthy();
  });

  it('shows expired/invalid state when the API returns an error', async () => {
    server.use(
      http.get('http://localhost:4000/api/v1/orders/track', () =>
        HttpResponse.json({ message: 'forbidden' }, { status: 403 }),
      ),
    );
    render(withProviders(<PublicTrackingApp orderId="order_abc" token="t.s" />));
    await waitFor(() => {
      expect(screen.getByText(/Tracking link expired or invalid/i)).toBeTruthy();
    });
  });

  it('shows mismatched-id state when token resolves to a different orderId', async () => {
    server.use(
      http.get('http://localhost:4000/api/v1/orders/track', () =>
        HttpResponse.json({
          orderId: 'order_other',
          orderNumber: 'R-2026-000002',
          type: 'PICKUP',
          status: 'READY',
          isTerminal: false,
          timeline: [],
          etaMinutes: null,
          estimatedReadyAt: null,
          restaurantGeo: null,
          deliveryGeo: null,
        }),
      ),
    );
    render(withProviders(<PublicTrackingApp orderId="order_abc" token="t.s" />));
    await waitFor(() => {
      expect(screen.getByText(/tracking link doesn't match the order/i)).toBeTruthy();
    });
  });
});
