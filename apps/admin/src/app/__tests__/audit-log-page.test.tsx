import AuditLogPage from '@/app/[locale]/(dashboard)/audit-log/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const API = 'http://localhost:4000/api/v1';

const auditPayload = {
  items: [
    {
      id: 'al_1',
      actorUserId: 'u_owner',
      action: 'order:create',
      resourceType: 'order',
      resourceId: 'ord_1',
      beforeJson: null,
      afterJson: { total: '12.00' },
      ip: '10.0.0.1',
      userAgent: 'vitest',
      createdAt: '2026-05-15T10:00:00.000Z',
    },
    {
      id: 'al_2',
      actorUserId: 'u_manager',
      action: 'promotion:write',
      resourceType: 'promotion',
      resourceId: 'promo_1',
      beforeJson: { isActive: false },
      afterJson: { isActive: true },
      ip: null,
      userAgent: null,
      createdAt: '2026-05-15T11:30:00.000Z',
    },
  ],
  nextCursor: null,
};

afterEach(() => resetTestState());

describe('AuditLogPage', () => {
  it('renders the table with entries returned by the api', async () => {
    server.use(
      http.get(/\/admin\/audit-log/, (info) => {
        console.log('MSW MATCH:', info.request.url);
        return HttpResponse.json(auditPayload);
      }),
    );

    const { container } = renderPage(<AuditLogPage />);

    await waitFor(() => {
      const text = container.textContent ?? '';
      expect(text).toContain('u_owner');
    });
    const text = container.textContent ?? '';
    expect(text).toContain('u_owner');
    expect(text).toContain('u_manager');
  });

  it('renders the permission-denied fallback when audit:read is missing', () => {
    renderPage(<AuditLogPage />, { permissions: [] });
    expect(screen.getByText(/don.{0,2}t have access/i)).toBeDefined();
  });

  it('shows the empty state when the api returns no entries', async () => {
    server.use(
      http.get(`${API}/admin/audit-log`, () => HttpResponse.json({ items: [], nextCursor: null })),
    );

    renderPage(<AuditLogPage />);

    await waitFor(() =>
      expect(screen.getByText(/No audit log entries match these filters/i)).toBeDefined(),
    );
  });
});
