import { ModifierGroup, type ModifierGroupShape } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const radioGroup: ModifierGroupShape = {
  id: 'size',
  name: 'Size',
  required: true,
  min: 1,
  max: 1,
  options: [
    { id: 'sm', name: 'Small', priceDelta: '0.00' },
    { id: 'md', name: 'Medium', priceDelta: '4.00' },
    { id: 'lg', name: 'Large', priceDelta: '8.00' },
  ],
};

const checkboxGroup: ModifierGroupShape = {
  id: 'sauces',
  name: 'Sauces',
  required: false,
  min: 0,
  max: 2,
  options: [
    { id: 'tahini', name: 'Tahini', priceDelta: '0.00' },
    { id: 'garlic', name: 'Garlic', priceDelta: '2.00' },
    { id: 'chili', name: 'Chili', priceDelta: '2.00' },
  ],
};

describe('ModifierGroup (locked: value: string[] for both radio and checkbox)', () => {
  it('radio (max=1): clicking an option replaces value with [optionId]', () => {
    const onChange = vi.fn();
    render(<ModifierGroup group={radioGroup} value={['sm']} onChange={onChange} currency="PLN" />);
    fireEvent.click(screen.getByText('Medium'));
    expect(onChange).toHaveBeenCalledWith(['md']);
  });

  it('checkbox (max>1): toggling an unchecked option appends', () => {
    const onChange = vi.fn();
    render(
      <ModifierGroup group={checkboxGroup} value={['tahini']} onChange={onChange} currency="PLN" />,
    );
    fireEvent.click(screen.getByText('Garlic'));
    expect(onChange).toHaveBeenCalledWith(['tahini', 'garlic']);
  });

  it('checkbox: at max, further selections are ignored', () => {
    const onChange = vi.fn();
    render(
      <ModifierGroup
        group={checkboxGroup}
        value={['tahini', 'garlic']}
        onChange={onChange}
        currency="PLN"
      />,
    );
    fireEvent.click(screen.getByText('Chili'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders inside a fieldset with the group name as legend', () => {
    const { container } = render(
      <ModifierGroup group={radioGroup} value={['sm']} onChange={() => {}} currency="PLN" />,
    );
    expect(container.querySelector('fieldset')).toBeTruthy();
    expect(container.querySelector('legend')).toBeTruthy();
    expect(screen.getByText('Size')).toBeTruthy();
  });

  it('marks the fieldset aria-invalid when error is passed', () => {
    const { container } = render(
      <ModifierGroup
        group={radioGroup}
        value={[]}
        onChange={() => {}}
        currency="PLN"
        error="Pick one"
      />,
    );
    expect(container.querySelector('fieldset')?.getAttribute('aria-invalid')).toBe('true');
  });
});
