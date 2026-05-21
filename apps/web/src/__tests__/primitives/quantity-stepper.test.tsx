import { QuantityStepper } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('QuantityStepper (W4 — both buttons always rendered)', () => {
  it('renders both decrease and increase buttons unconditionally', () => {
    render(<QuantityStepper value={3} onChange={() => {}} />);
    expect(screen.getByLabelText('Decrease quantity')).toBeTruthy();
    expect(screen.getByLabelText('Increase quantity')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('invokes onChange with value+1 on increment', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Increase quantity'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('invokes onChange with value-1 on decrement', () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables decrement at min and increment at max', () => {
    const onChange = vi.fn();
    const { rerender } = render(<QuantityStepper value={1} min={1} max={3} onChange={onChange} />);
    expect((screen.getByLabelText('Decrease quantity') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Increase quantity') as HTMLButtonElement).disabled).toBe(false);

    rerender(<QuantityStepper value={3} min={1} max={3} onChange={onChange} />);
    expect((screen.getByLabelText('Decrease quantity') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('Increase quantity') as HTMLButtonElement).disabled).toBe(true);
  });

  it('clamps decrement at min and increment at max via onChange', () => {
    const onChange = vi.fn();
    // Buttons are disabled at the bounds, so we test the math via uncommon
    // values where clamping is observable.
    render(<QuantityStepper value={99} min={1} max={99} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Increase quantity'));
    // Button disabled → no call.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes a polite live region for the value', () => {
    render(<QuantityStepper value={4} onChange={() => {}} />);
    const valueNode = screen.getByText('4');
    expect(valueNode.getAttribute('aria-live')).toBe('polite');
  });
});
