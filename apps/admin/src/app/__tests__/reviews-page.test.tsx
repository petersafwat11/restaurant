import ReviewsPage from '@/app/[locale]/(dashboard)/reviews/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const reviewsPayload = {
  items: [
    {
      id: 'rev_1',
      orderId: 'ord_1',
      userId: 'u_1',
      rating: 5,
      comment: 'Amazing burger, came back twice',
      isVisible: true,
      moderationStatus: 'PUBLISHED',
      flagReason: null,
      ownerReply: null,
      ownerReplyAt: null,
      createdAt: '2026-05-15T10:00:00.000Z',
      authorName: 'Alice',
      images: [],
    },
    {
      id: 'rev_2',
      orderId: 'ord_2',
      userId: 'u_2',
      rating: 2,
      comment: 'Was cold when delivered',
      isVisible: false,
      moderationStatus: 'FLAGGED',
      flagReason: 'profanity',
      ownerReply: 'Sorry, refunded',
      ownerReplyAt: '2026-05-15T11:00:00.000Z',
      createdAt: '2026-05-14T18:00:00.000Z',
      authorName: 'Bob',
      images: [],
    },
  ],
  nextCursor: null,
};

afterEach(() => resetTestState());

describe('ReviewsPage', () => {
  it('renders reviews with star rating, customer, comment, and moderation status', async () => {
    server.use(http.get(/\/admin\/reviews/, () => HttpResponse.json(reviewsPayload)));

    const { container } = renderPage(<ReviewsPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('Alice')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Alice');
    expect(text).toContain('Bob');
    expect(text).toContain('Amazing burger');
    // Moderation status shows translated labels instead of raw enum values.
    expect(text).toMatch(/Published/);
    expect(text).toMatch(/Flagged/);
  });

  it('shows empty-state copy when no reviews match', async () => {
    server.use(
      http.get(/\/admin\/reviews/, () => HttpResponse.json({ items: [], nextCursor: null })),
    );

    const { container } = renderPage(<ReviewsPage />);
    await waitFor(() => {
      expect((container.textContent ?? '').includes('No reviews match')).toBe(true);
    });
  });

  it('hides when both review:read and review:moderate are missing', () => {
    renderPage(<ReviewsPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
