import { HoursTable } from '@repo/ui';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const week = [
  { dayOfWeek: 1 as const, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 2 as const, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 3 as const, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 4 as const, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 5 as const, opensAt: '11:00', closesAt: '23:00' },
  { dayOfWeek: 6 as const, opensAt: '12:00', closesAt: '23:00' },
  { dayOfWeek: 0 as const, opensAt: '12:00', closesAt: '21:00' },
];

describe('HoursTable (ISO day numbers)', () => {
  it('renders 7 rows in list layout', () => {
    const { container } = render(<HoursTable hours={week} highlightToday={false} />);
    expect(container.querySelectorAll('tbody tr').length).toBe(7);
  });

  it('renders "Closed" for closed rows', () => {
    render(
      <HoursTable
        hours={[{ dayOfWeek: 0 as const, opensAt: '00:00', closesAt: '00:00', isClosed: true }]}
        highlightToday={false}
      />,
    );
    expect(screen.getByText('Closed')).toBeTruthy();
  });

  it('compact layout groups consecutive matching ranges', () => {
    const { container } = render(
      <HoursTable hours={week} layout="compact" highlightToday={false} />,
    );
    // Mon-Thu share one range, Fri/Sat differ, Sun differs again → 4 groups.
    expect(container.children[0]?.children.length).toBe(4);
    expect(screen.getByText(/Mon.*Thu/)).toBeTruthy();
  });

  it('marks today with aria-current="date" when highlightToday is on', () => {
    const today = new Date().getDay();
    const { container } = render(<HoursTable hours={week} highlightToday />);
    const todayRow = container.querySelector(`tr[aria-current="date"]`);
    expect(todayRow).toBeTruthy();
    expect(todayRow?.querySelector('th')?.textContent).toBe(
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today],
    );
  });

  it('with a timezone, highlights the restaurant-zone day, not the browser day', () => {
    // 2026-06-23T21:30:00Z → Warsaw (UTC+2) = Tue 23:30, but Tokyo (UTC+9) is
    // already Wed 06:30. With a fake system clock in Tokyo's frame, the table
    // must still follow Warsaw and highlight Tuesday.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T21:30:00Z'));
    try {
      const { container } = render(
        <HoursTable hours={week} highlightToday timezone="Europe/Warsaw" />,
      );
      const th = container
        .querySelector('tr[aria-current="date"]')
        ?.querySelector('th')?.textContent;
      expect(th).toBe('Tue');
    } finally {
      vi.useRealTimers();
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});
