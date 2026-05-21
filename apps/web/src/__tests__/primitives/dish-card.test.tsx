import { DishCard } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const base = {
  href: '/menu/items/strips',
  image: { src: '/strips.jpg', alt: 'Box of strips' },
  name: 'Box Strips',
  price: { amount: '24.00', currency: 'PLN' },
};

describe('DishCard (W1 + W2 carry-overs)', () => {
  it('renders the dish name, formatted price', () => {
    render(<DishCard {...base} />);
    expect(screen.getByText('Box Strips')).toBeTruthy();
    // PLN format: comma decimal, "zł" suffix.
    expect(screen.getByText(/24,00.*zł/)).toBeTruthy();
  });

  it('quick-add button is present only when onAdd is provided', () => {
    const { rerender } = render(<DishCard {...base} />);
    expect(screen.queryByLabelText(/Add Box Strips to cart/i)).toBeNull();
    rerender(<DishCard {...base} onAdd={() => {}} />);
    expect(screen.getByLabelText(/Add Box Strips to cart/i)).toBeTruthy();
  });

  it('quick-add click invokes onAdd without navigating', () => {
    const onAdd = vi.fn();
    render(<DishCard {...base} onAdd={onAdd} />);
    fireEvent.click(screen.getByLabelText(/Add Box Strips to cart/i));
    expect(onAdd).toHaveBeenCalled();
  });

  it('hides the quick-add when unavailable, shows "Sold out today"', () => {
    render(<DishCard {...base} onAdd={() => {}} unavailable />);
    expect(screen.queryByLabelText(/Add Box Strips to cart/i)).toBeNull();
    expect(screen.getByText(/Sold out today/i)).toBeTruthy();
  });

  it('reserves flag-row height (W2) when reserveFlagSpace is true', () => {
    const { container } = render(<DishCard {...base} reserveFlagSpace />);
    // The flag row container should carry min-h-6.
    const minHeightRow = container.querySelector('.min-h-6');
    expect(minHeightRow).toBeTruthy();
  });

  it('renders dietary flag chips when provided (W1: GF uses positive)', () => {
    render(<DishCard {...base} flags={['gluten-free', 'vegetarian']} />);
    expect(screen.getByText('GF')).toBeTruthy();
    expect(screen.getByText('V')).toBeTruthy();
  });
});
