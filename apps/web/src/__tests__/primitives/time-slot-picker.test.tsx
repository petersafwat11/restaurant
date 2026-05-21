import { TimeSlotPicker } from '@repo/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('TimeSlotPicker (TimeSlotValue discriminated union)', () => {
  it('renders ASAP + Schedule toggle and marks ASAP active by default', () => {
    render(
      <TimeSlotPicker
        mode="delivery"
        value={{ kind: 'asap' }}
        onChange={() => {}}
        earliestSlotMinutes={20}
      />,
    );
    expect(screen.getByRole('radio', { name: /ASAP/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /Schedule/i }).getAttribute('aria-checked')).toBe(
      'false',
    );
  });

  it('clicking ASAP emits { kind: "asap" }', () => {
    const onChange = vi.fn();
    render(
      <TimeSlotPicker
        mode="pickup"
        value={{ kind: 'scheduled', iso: '2026-05-17T18:00:00.000Z' }}
        onChange={onChange}
        earliestSlotMinutes={10}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /ASAP/i }));
    expect(onChange).toHaveBeenCalledWith({ kind: 'asap' });
  });

  it('clicking Schedule emits a scheduled value', () => {
    const onChange = vi.fn();
    render(
      <TimeSlotPicker
        mode="pickup"
        value={{ kind: 'asap' }}
        onChange={onChange}
        earliestSlotMinutes={10}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Schedule/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'scheduled' }));
  });

  it('renders the closed-reason banner instead of slots when supplied', () => {
    render(
      <TimeSlotPicker
        mode="delivery"
        value={{ kind: 'asap' }}
        onChange={() => {}}
        earliestSlotMinutes={20}
        closedReason="We're closed right now"
      />,
    );
    expect(screen.getByText(/We're closed right now/i)).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('uses role="radiogroup" labeled by mode', () => {
    render(
      <TimeSlotPicker
        mode="delivery"
        value={{ kind: 'asap' }}
        onChange={() => {}}
        earliestSlotMinutes={20}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: /delivery time/i })).toBeTruthy();
  });
});
