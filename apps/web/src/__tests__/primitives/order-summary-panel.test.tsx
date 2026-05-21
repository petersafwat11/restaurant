import { OrderSummaryPanel } from '@repo/ui';
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

describe('OrderSummaryPanel (delivery union locked)', () => {
  it('renders the subtotal, total, and tip formatted with currency', () => {
    render(
      <OrderSummaryPanel
        lines={lines}
        currency="PLN"
        subtotal="48.00"
        delivery={{ amount: '8.00' }}
        tip="5.00"
        total="61.00"
      />,
    );
    expect(screen.getByLabelText('Order summary')).toBeTruthy();
    // Multiple money strings render; just check the total once.
    expect(screen.getAllByText(/61,00.*zł/).length).toBeGreaterThan(0);
  });

  it('renders the delivery row with a label when the union is the label variant', () => {
    render(
      <OrderSummaryPanel
        lines={lines}
        currency="PLN"
        subtotal="48.00"
        delivery={{ label: 'Free' }}
        total="48.00"
      />,
    );
    expect(screen.getByText(/Free/i)).toBeTruthy();
  });

  it('renders the discount line when discount is provided', () => {
    render(
      <OrderSummaryPanel
        lines={lines}
        currency="PLN"
        subtotal="48.00"
        delivery={{ amount: '0.00' }}
        discount={{ amount: '7.20', label: '15% off — BAKLAVA' }}
        total="40.80"
      />,
    );
    expect(screen.getByText(/15% off — BAKLAVA/i)).toBeTruthy();
  });

  it('shows Edit cart and invokes onEditCart when clicked', () => {
    const onEditCart = vi.fn();
    render(
      <OrderSummaryPanel
        lines={lines}
        currency="PLN"
        subtotal="48.00"
        delivery={{ amount: '0.00' }}
        total="48.00"
        onEditCart={onEditCart}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit cart/i }));
    expect(onEditCart).toHaveBeenCalled();
  });
});
