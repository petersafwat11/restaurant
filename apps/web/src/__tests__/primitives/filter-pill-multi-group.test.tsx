import { FilterPillMultiGroup } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const options = [
  { id: 'all', label: 'All' },
  { id: 'veg', label: 'Vegetarian' },
  { id: 'gf', label: 'Gluten free' },
] as const;

describe('FilterPillMultiGroup', () => {
  it('marks all pills with aria-pressed reflecting selection', () => {
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={['veg']}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Vegetarian/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /Gluten free/ }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('toggling an unselected pill appends to value', () => {
    const onChange = vi.fn();
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={['veg']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Gluten free/ }));
    expect(onChange).toHaveBeenCalledWith(['veg', 'gf']);
  });

  it('toggling a selected pill removes it', () => {
    const onChange = vi.fn();
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={['veg', 'gf']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Vegetarian/ }));
    expect(onChange).toHaveBeenCalledWith(['gf']);
  });

  it('clicking the all sentinel resets selection to [allOptionId]', () => {
    const onChange = vi.fn();
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={['veg', 'gf']}
        onChange={onChange}
        allOptionId="all"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /All/ }));
    expect(onChange).toHaveBeenCalledWith(['all']);
  });

  it('un-toggling the last specific filter re-asserts the all sentinel', () => {
    const onChange = vi.fn();
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={['veg']}
        onChange={onChange}
        allOptionId="all"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Vegetarian/ }));
    expect(onChange).toHaveBeenCalledWith(['all']);
  });

  it('selecting a specific pill clears the all sentinel from value', () => {
    const onChange = vi.fn();
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={['all']}
        onChange={onChange}
        allOptionId="all"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Vegetarian/ }));
    expect(onChange).toHaveBeenCalledWith(['veg']);
  });

  it('uses role="group" for the container (not tablist — these are toggles)', () => {
    render(
      <FilterPillMultiGroup
        options={options as unknown as { id: string; label: string }[]}
        value={[]}
        onChange={() => {}}
        ariaLabel="Diet filters"
      />,
    );
    expect(screen.getByRole('group', { name: 'Diet filters' })).toBeTruthy();
  });
});
