import { describe, expect, it } from 'vitest';
import { ReservationAvailabilityService } from '../reservation-availability.service';

const restaurant = {
  timezone: 'UTC',
  reservationSlotMinutes: 90,
  reservationBufferMinutes: 15,
  holidayDates: [],
};

const tuesday11to13 = [
  // dayOfWeek 2 = Tuesday
  {
    id: 'h2',
    restaurantId: 'r',
    dayOfWeek: 2,
    opensAt: '11:00',
    closesAt: '13:00',
    isClosed: false,
  },
];

describe('ReservationAvailabilityService', () => {
  const svc = new ReservationAvailabilityService();

  it('returns no slots on a closed day', () => {
    expect(
      svc.generate({
        restaurant,
        hours: [],
        tables: [{ id: 't1', capacity: 4 }],
        existing: [],
        date: '2026-05-19', // Tue but no hours row
        partySize: 2,
        now: new Date('2026-05-19T00:00:00Z'),
      }),
    ).toEqual([]);
  });

  it('generates slots inside hours window with buffer', () => {
    const slots = svc.generate({
      restaurant,
      hours: tuesday11to13,
      tables: [{ id: 't1', capacity: 4 }],
      existing: [],
      date: '2026-05-19',
      partySize: 2,
      now: new Date('2026-05-19T00:00:00Z'),
    });
    // Window 11:00-13:00 = 120 min; slot 90, step 105 → one slot at 11:00.
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startAt).toContain('11:00');
  });

  it('filters slots when capacity is taken', () => {
    const slots = svc.generate({
      restaurant,
      hours: tuesday11to13,
      tables: [{ id: 't1', capacity: 4 }],
      existing: [
        {
          tableId: 't1',
          startAt: new Date('2026-05-19T10:30:00Z'),
          endAt: new Date('2026-05-19T13:30:00Z'),
        },
      ],
      date: '2026-05-19',
      partySize: 2,
      now: new Date('2026-05-19T00:00:00Z'),
    });
    expect(slots).toEqual([]);
  });

  it('respects partySize against capacity', () => {
    const slots = svc.generate({
      restaurant,
      hours: tuesday11to13,
      tables: [{ id: 't1', capacity: 2 }],
      existing: [],
      date: '2026-05-19',
      partySize: 4,
      now: new Date('2026-05-19T00:00:00Z'),
    });
    expect(slots).toEqual([]);
  });

  it('skips slots before now', () => {
    const slots = svc.generate({
      restaurant,
      hours: tuesday11to13,
      tables: [{ id: 't1', capacity: 4 }],
      existing: [],
      date: '2026-05-19',
      partySize: 2,
      now: new Date('2026-05-19T15:00:00Z'),
    });
    expect(slots).toEqual([]);
  });
});
