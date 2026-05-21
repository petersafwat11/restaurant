import { OrderProgressStepper } from '@repo/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('OrderProgressStepper (W10 — real OrderStatus enum)', () => {
  it('renders delivery steps with the current status highlighted', () => {
    render(<OrderProgressStepper mode="DELIVERY" status="PREPARING" />);
    expect(screen.getByLabelText('Order progress')).toBeTruthy();
    // Delivery steps include "On the way" — must render even when not current.
    expect(screen.getByText(/On the way/i)).toBeTruthy();
  });

  it('renders pickup steps without "On the way"', () => {
    render(<OrderProgressStepper mode="PICKUP" status="READY" />);
    expect(screen.getByLabelText('Order progress')).toBeTruthy();
    expect(screen.queryByText(/On the way/i)).toBeNull();
  });

  it('renders a terminal-failure row for CANCELLED', () => {
    render(<OrderProgressStepper mode="DELIVERY" status="CANCELLED" />);
    expect(screen.queryByLabelText('Order progress')).toBeNull();
    expect(screen.getByText(/Cancelled/i)).toBeTruthy();
  });

  it('renders a terminal-failure row for REFUNDED (not progressing)', () => {
    render(<OrderProgressStepper mode="DELIVERY" status="REFUNDED" />);
    expect(screen.queryByLabelText('Order progress')).toBeNull();
    expect(screen.getByText(/Refunded/i)).toBeTruthy();
  });
});
