import { PromoCodeInput } from '@repo/ui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('PromoCodeInput', () => {
  it('renders collapsed "Have a code?" when not applied', () => {
    render(
      <PromoCodeInput applied={null} onApply={async () => ({ ok: true })} onRemove={() => {}} />,
    );
    expect(screen.getByText(/Have a code\?/i)).toBeTruthy();
  });

  it('shows the form when collapsed=false', () => {
    render(
      <PromoCodeInput
        applied={null}
        collapsed={false}
        onApply={async () => ({ ok: true })}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByLabelText('Promo code')).toBeTruthy();
  });

  it('renders applied chip + Remove button when applied', () => {
    render(
      <PromoCodeInput
        applied={{ code: 'BAKLAVA', label: '15% off — first order' }}
        onApply={async () => ({ ok: true })}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText('BAKLAVA')).toBeTruthy();
    expect(screen.getByText(/15% off/)).toBeTruthy();
    expect(screen.getByLabelText('Remove promo')).toBeTruthy();
  });

  it('clicking Remove invokes onRemove', () => {
    const onRemove = vi.fn();
    render(
      <PromoCodeInput
        applied={{ code: 'BAKLAVA', label: '15% off' }}
        onApply={async () => ({ ok: true })}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove promo'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('upper-cases the code and calls onApply on submit', async () => {
    const onApply = vi.fn().mockResolvedValue({ ok: true });
    render(
      <PromoCodeInput applied={null} collapsed={false} onApply={onApply} onRemove={() => {}} />,
    );
    const input = screen.getByLabelText('Promo code');
    fireEvent.change(input, { target: { value: 'baklava' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith('BAKLAVA'));
  });

  it('shows the error message returned by onApply', async () => {
    render(
      <PromoCodeInput
        applied={null}
        collapsed={false}
        onApply={async () => ({ ok: false, error: 'Code expired' })}
        onRemove={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('Promo code'), { target: { value: 'OLD' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apply/i }));
    });
    await waitFor(() => expect(screen.getByText('Code expired')).toBeTruthy());
  });
});
