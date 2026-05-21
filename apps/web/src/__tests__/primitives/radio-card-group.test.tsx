import { RadioCardGroup } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const options = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'dinein', label: 'Eat in', disabled: true, disabledReason: 'Tables full' },
] as const;

describe('RadioCardGroup', () => {
  it('renders role="radiogroup" with aria-label', () => {
    render(
      <RadioCardGroup
        ariaLabel="Order type"
        options={options as unknown as { id: string; label: string }[]}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Order type' })).toBeTruthy();
  });

  it('marks the selected option aria-checked', () => {
    render(
      <RadioCardGroup
        ariaLabel="Order type"
        options={options as unknown as { id: string; label: string }[]}
        value="pickup"
        onChange={() => {}}
      />,
    );
    const pickup = screen.getByRole('radio', { name: /Pickup/ });
    expect(pickup.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /Delivery/ }).getAttribute('aria-checked')).toBe(
      'false',
    );
  });

  it('emits onChange when an enabled option is clicked', () => {
    const onChange = vi.fn();
    render(
      <RadioCardGroup
        ariaLabel="Order type"
        options={options as unknown as { id: string; label: string }[]}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Delivery/ }));
    expect(onChange).toHaveBeenCalledWith('delivery');
  });

  it('does NOT emit onChange when a disabled option is clicked', () => {
    const onChange = vi.fn();
    render(
      <RadioCardGroup
        ariaLabel="Order type"
        options={options as unknown as { id: string; label: string }[]}
        value={null}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Eat in/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets `title` to disabledReason for disabled options (tooltip surface)', () => {
    render(
      <RadioCardGroup
        ariaLabel="Order type"
        options={options as unknown as { id: string; label: string }[]}
        value={null}
        onChange={() => {}}
      />,
    );
    const dinein = screen.getByRole('radio', { name: /Eat in/ });
    expect(dinein.getAttribute('title')).toBe('Tables full');
  });

  it('accepts value=null for the unselected starting state', () => {
    render(
      <RadioCardGroup
        ariaLabel="Order type"
        options={options as unknown as { id: string; label: string }[]}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radio', { name: /Delivery/ }).getAttribute('aria-checked')).toBe(
      'false',
    );
  });
});
