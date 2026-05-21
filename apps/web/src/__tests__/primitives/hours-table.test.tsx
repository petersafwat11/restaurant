import { HoursTable } from '@repo/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
