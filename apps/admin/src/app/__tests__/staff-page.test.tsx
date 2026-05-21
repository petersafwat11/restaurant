import StaffPage from '@/app/[locale]/(dashboard)/staff/page';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

const staff = [
  {
    id: 'u_owner',
    email: 'owner@test.local',
    firstName: 'Olivia',
    lastName: 'Owner',
    phone: null,
    roleKeys: ['owner'],
    isActive: true,
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u_manager',
    email: 'manager@test.local',
    firstName: 'Maya',
    lastName: 'Manager',
    phone: '+48 22 555 0010',
    roleKeys: ['manager'],
    isActive: true,
    emailVerifiedAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'u_invited',
    email: 'invited@test.local',
    firstName: null,
    lastName: null,
    phone: null,
    roleKeys: ['cashier'],
    isActive: true,
    emailVerifiedAt: null,
    createdAt: '2026-05-10T00:00:00.000Z',
  },
];

afterEach(() => resetTestState());

describe('StaffPage', () => {
  it('renders staff rows with their resolved name + status', async () => {
    server.use(http.get(/\/admin\/staff/, () => HttpResponse.json(staff)));

    const { container } = renderPage(<StaffPage />);

    await waitFor(() => {
      expect((container.textContent ?? '').includes('Olivia')).toBe(true);
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Olivia Owner');
    expect(text).toContain('Maya Manager');
    // Status pills: verified+active='Active', unverified='Invited'
    expect(text).toContain('Active');
    expect(text).toContain('Invited');
  });

  it('blocks the page when both staff:read and staff:write are missing', () => {
    renderPage(<StaffPage />, { permissions: [] });
    expect(screen.getAllByText(/don.{0,2}t have access/i).length).toBeGreaterThan(0);
  });
});
