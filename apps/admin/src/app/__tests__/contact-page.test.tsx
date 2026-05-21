import ContactPage from '@/app/(dashboard)/contact/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const contactPayload = {
  items: [
    {
      id: 'cm_1',
      name: 'Alice Reviewer',
      email: 'alice@example.test',
      subject: 'Question about catering',
      message: 'Do you cater weddings?',
      status: 'new',
      handledByUserId: null,
      handledAt: null,
      createdAt: '2026-05-15T09:00:00.000Z',
    },
    {
      id: 'cm_2',
      name: 'Bob Builder',
      email: 'bob@example.test',
      subject: null,
      message: 'Loved the burger',
      status: 'read',
      handledByUserId: 'u_owner',
      handledAt: '2026-05-15T09:30:00.000Z',
      createdAt: '2026-05-14T18:00:00.000Z',
    },
  ],
  nextCursor: null,
};

afterEach(() => resetTestState());

describe('ContactPage', () => {
  it('renders incoming messages with subject and sender name', async () => {
    server.use(http.get(/\/admin\/contact/, () => HttpResponse.json(contactPayload)));

    const { container } = renderPage(<ContactPage />);

    await waitFor(() => {
      const text = container.textContent ?? '';
      expect(text).toContain('Alice Reviewer');
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Question about catering');
    expect(text).toContain('Bob Builder');
  });

  it('shows the empty state when no messages exist', async () => {
    server.use(
      http.get(/\/admin\/contact/, () => HttpResponse.json({ items: [], nextCursor: null })),
    );

    const { container } = renderPage(<ContactPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('No contact messages')).toBe(true);
    });
  });

  it('hides the page when contact:read is missing', () => {
    renderPage(<ContactPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
