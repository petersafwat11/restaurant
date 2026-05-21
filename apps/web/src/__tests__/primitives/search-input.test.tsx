import { SearchInput } from '@repo/ui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('SearchInput (debounce + shortcut + clear)', () => {
  it('debounces outbound onChange', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} debounceMs={200} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'a' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ab' } });
    // No call yet — still inside the debounce window.
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    vi.useRealTimers();
    expect(onChange).toHaveBeenCalledWith('ab');
  });

  it('renders a clear button when there is content; clears on click', () => {
    const onChange = vi.fn();
    render(<SearchInput value="hello" onChange={onChange} />);
    const clear = screen.getByLabelText('Clear search');
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('focuses on the configured shortcut key from anywhere on the page', () => {
    render(<SearchInput value="" onChange={() => {}} shortcutKey="/" />);
    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(input);
  });

  it('uses role="searchbox" with the provided aria-label', () => {
    render(<SearchInput value="" onChange={() => {}} ariaLabel="Find dishes" />);
    expect(screen.getByRole('searchbox', { name: 'Find dishes' })).toBeTruthy();
  });
});
