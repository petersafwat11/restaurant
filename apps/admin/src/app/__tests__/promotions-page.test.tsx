import PromotionsPage from '@/app/[locale]/(dashboard)/promotions/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const promotions = [
  {
    id: 'promo_1',
    name: 'Spring 20% off',
    description: '20% off any order over 50 PLN',
    type: 'PERCENT',
    value: '20.00',
    minSubtotal: '50.00',
    startsAt: '2026-04-01T00:00:00.000Z',
    endsAt: '2026-06-01T00:00:00.000Z',
    isActive: true,
    isArchived: false,
    archivedAt: null,
  },
  {
    id: 'promo_2',
    name: 'Free delivery weekend',
    description: null,
    type: 'FREE_DELIVERY',
    value: null,
    minSubtotal: null,
    startsAt: null,
    endsAt: null,
    isActive: false,
    isArchived: false,
    archivedAt: null,
  },
];

afterEach(() => resetTestState());

describe('PromotionsPage', () => {
  it('renders promotion rows with type badge and value summary', async () => {
    server.use(http.get(/\/promotions/, () => HttpResponse.json(promotions)));

    const { container } = renderPage(<PromotionsPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('Spring 20% off')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Spring 20% off');
    expect(text).toContain('Free delivery weekend');
    // Type column shows translated labels (i18n) instead of raw enum values.
    expect(text).toMatch(/Percent off/i);
    expect(text).toMatch(/Free delivery/i);
    expect(text).toMatch(/20\s?% off/);
  });

  it('hides when promotion:read is missing', () => {
    renderPage(<PromotionsPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
