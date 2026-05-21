import { EmptyState } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Nothing here" description="Try a different search." />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try a different search.')).toBeTruthy();
  });

  it('uses role="status" so screen readers announce on mount', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders an anchor when action.href is provided', () => {
    render(<EmptyState title="No orders" action={{ label: 'Browse menu', href: '/menu' }} />);
    const link = screen.getByRole('link', { name: 'Browse menu' });
    expect(link.getAttribute('href')).toBe('/menu');
  });

  it('renders a button when action.onClick is provided (no href)', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Refresh', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onClick).toHaveBeenCalled();
  });
});
