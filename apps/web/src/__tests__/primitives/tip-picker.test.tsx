import { TipPicker } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('TipPicker (MoneyString crossings)', () => {
  it('renders preset percentages and "No tip"', () => {
    render(<TipPicker subtotal="100.00" value="0.00" onChange={() => {}} currency="PLN" />);
    expect(screen.getByText('No tip')).toBeTruthy();
    expect(screen.getByText('5%')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.getByText('15%')).toBeTruthy();
  });

  it('marks the active preset aria-checked based on the current value', () => {
    render(<TipPicker subtotal="100.00" value="10.00" onChange={() => {}} currency="PLN" />);
    const ten = screen.getByRole('radio', { name: /10%/ });
    expect(ten.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /^5% / }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a preset emits the computed MoneyString amount', () => {
    const onChange = vi.fn();
    render(<TipPicker subtotal="100.00" value="0.00" onChange={onChange} currency="PLN" />);
    fireEvent.click(screen.getByRole('radio', { name: /^15% / }));
    expect(onChange).toHaveBeenCalledWith('15.00');
  });

  it('clicking "No tip" emits "0.00"', () => {
    const onChange = vi.fn();
    render(<TipPicker subtotal="100.00" value="5.00" onChange={onChange} currency="PLN" />);
    fireEvent.click(screen.getByRole('radio', { name: /No tip/i }));
    expect(onChange).toHaveBeenCalledWith('0.00');
  });

  it('uses a radiogroup container', () => {
    render(<TipPicker subtotal="20.00" value="0.00" onChange={() => {}} currency="PLN" />);
    expect(screen.getByRole('radiogroup', { name: 'Tip' })).toBeTruthy();
  });
});
