import ExportsPage from '@/app/(dashboard)/reports/exports/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const exports = [
  {
    id: 'exp_1',
    requestedByUserId: 'u_owner',
    kind: 'sales-by-item',
    format: 'csv',
    status: 'ready',
    fileSize: 12345,
    errorMessage: null,
    createdAt: '2026-05-15T10:00:00.000Z',
    completedAt: '2026-05-15T10:02:00.000Z',
    expiresAt: '2026-05-22T10:00:00.000Z',
  },
  {
    id: 'exp_2',
    requestedByUserId: 'u_owner',
    kind: 'tax-summary',
    format: 'pdf',
    status: 'failed',
    fileSize: null,
    errorMessage: 'Stripe webhook missing',
    createdAt: '2026-05-15T11:00:00.000Z',
    completedAt: null,
    expiresAt: '2026-05-22T11:00:00.000Z',
  },
];

afterEach(() => resetTestState());

describe('ExportsPage', () => {
  it('renders the exports list with status and size', async () => {
    server.use(http.get(/\/reports\/exports/, () => HttpResponse.json(exports)));

    const { container } = renderPage(<ExportsPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('sales-by-item')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('sales-by-item');
    expect(text).toContain('tax-summary');
    expect(text).toContain('ready');
    expect(text).toContain('failed');
    // 12345 bytes -> 12.1 KB via fmtSize helper
    expect(text).toMatch(/12\.[0-9]\s?KB/);
  });

  it('hides when both report:read and report:export are missing', () => {
    renderPage(<ExportsPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
