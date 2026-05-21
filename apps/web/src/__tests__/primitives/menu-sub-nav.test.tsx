import { MenuSubNav } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const sections = [
  { id: 'kebab', label: 'Kebab', count: 12 },
  { id: 'falafel', label: 'Falafel', count: 6 },
  { id: 'sides', label: 'Sides' },
];

describe('MenuSubNav (tablist semantics)', () => {
  it('uses role="tablist" with role="tab" pills', () => {
    render(<MenuSubNav sections={sections} activeId="kebab" onSelect={() => {}} />);
    expect(screen.getByRole('tablist', { name: 'Menu categories' })).toBeTruthy();
    expect(screen.getAllByRole('tab').length).toBe(3);
  });

  it('marks the active pill aria-selected', () => {
    render(<MenuSubNav sections={sections} activeId="falafel" onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: /Falafel/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /Kebab/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('clicking a pill invokes onSelect with the id', () => {
    const onSelect = vi.fn();
    render(<MenuSubNav sections={sections} activeId="kebab" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: /Sides/ }));
    expect(onSelect).toHaveBeenCalledWith('sides');
  });

  it('renders count badges only when provided', () => {
    render(<MenuSubNav sections={sections} activeId="kebab" onSelect={() => {}} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });
});
