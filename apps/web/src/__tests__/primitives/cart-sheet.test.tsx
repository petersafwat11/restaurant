import { CartSheet } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lines = [
  {
    id: 'l1',
    name: 'Box Strips',
    unitPrice: '24.00',
    quantity: 2,
  },
];

describe('CartSheet', () => {
  it('renders the empty state when no lines', () => {
    render(
      <CartSheet
        open
        onOpenChange={() => {}}
        lines={[]}
        onUpdateQty={() => {}}
        onRemove={() => {}}
        onCheckout={() => {}}
        subtotal="0.00"
        currency="PLN"
      />,
    );
    expect(screen.getByText(/Your cart is empty|empty/i)).toBeTruthy();
  });

  it('renders lines and the subtotal when items are present', () => {
    render(
      <CartSheet
        open
        onOpenChange={() => {}}
        lines={lines}
        onUpdateQty={() => {}}
        onRemove={() => {}}
        onCheckout={() => {}}
        subtotal="48.00"
        currency="PLN"
      />,
    );
    expect(screen.getByText('Box Strips')).toBeTruthy();
    // Subtotal formatted as PLN.
    expect(screen.getAllByText(/48,00.*zł/).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 items/i)).toBeTruthy();
  });

  it('invokes onCheckout when the CTA is clicked', () => {
    const onCheckout = vi.fn();
    render(
      <CartSheet
        open
        onOpenChange={() => {}}
        lines={lines}
        onUpdateQty={() => {}}
        onRemove={() => {}}
        onCheckout={onCheckout}
        subtotal="48.00"
        currency="PLN"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Checkout|Place/i }));
    expect(onCheckout).toHaveBeenCalled();
  });

  it('exposes a Close cart button that calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    render(
      <CartSheet
        open
        onOpenChange={onOpenChange}
        lines={lines}
        onUpdateQty={() => {}}
        onRemove={() => {}}
        onCheckout={() => {}}
        subtotal="48.00"
        currency="PLN"
      />,
    );
    fireEvent.click(screen.getByLabelText('Close cart'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
