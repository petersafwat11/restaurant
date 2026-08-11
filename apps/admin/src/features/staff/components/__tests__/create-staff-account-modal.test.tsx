import { CreateStaffAccountModal } from '@/features/staff/components';
import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => resetTestState());

describe('CreateStaffAccountModal', () => {
  it('submits all owner-provided account fields and closes on success', async () => {
    let submitted: Record<string, unknown> | undefined;
    server.use(
      http.post(/\/admin\/staff$/, async ({ request }) => {
        submitted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            id: 'staff-1',
            ...submitted,
            roleKeys: [submitted.roleKey],
            isActive: true,
            emailVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );
    const onOpenChange = vi.fn();
    renderPage(<CreateStaffAccountModal open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Maya' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Manager' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'Maya.Manager@Example.com' },
    });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+48 600 123 456' } });
    fireEvent.change(screen.getByLabelText('Temporary password'), {
      target: { value: 'Temporary123' },
    });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'manager' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(submitted).toEqual({
      firstName: 'Maya',
      lastName: 'Manager',
      email: 'maya.manager@example.com',
      phone: '+48 600 123 456',
      password: 'Temporary123',
      roleKey: 'manager',
    });
  });

  it('keeps invalid account data in the modal and shows validation errors', async () => {
    const onOpenChange = vi.fn();
    renderPage(<CreateStaffAccountModal open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findAllByText(/required|at least|invalid/i)).not.toHaveLength(0);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
