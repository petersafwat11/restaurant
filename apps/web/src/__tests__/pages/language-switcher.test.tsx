import { LanguageSwitcher } from '@/components/language-switcher';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('LanguageSwitcher (PL/EN emit the correct locale codes)', () => {
  it('emits "pl" when PL is clicked', () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher value="en" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'PL' }));
    expect(onChange).toHaveBeenCalledWith('pl');
  });

  it('emits "en" when EN is clicked', () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher value="pl" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('marks the active pill with aria-pressed', () => {
    render(<LanguageSwitcher value="pl" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'PL' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('false');
  });
});
