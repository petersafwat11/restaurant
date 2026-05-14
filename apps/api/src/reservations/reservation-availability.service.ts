import { Injectable } from '@nestjs/common';
import type { OperatingHours, Restaurant, Table } from '@repo/db';
import type { AvailabilitySlotDto, HolidayDto } from '@repo/types';

export interface AvailabilityInputs {
  restaurant: Pick<
    Restaurant,
    'timezone' | 'reservationSlotMinutes' | 'reservationBufferMinutes' | 'holidayDates'
  >;
  hours: OperatingHours[];
  tables: Pick<Table, 'id' | 'capacity'>[];
  // Existing reservations that occupy a table during the day.
  existing: { startAt: Date; endAt: Date; tableId: string | null }[];
  /** Local YYYY-MM-DD. */
  date: string;
  partySize: number;
  /** Now in UTC; slots before now are filtered out. */
  now: Date;
}

/**
 * Pure functional slot generation. Time math intentionally simple — we treat
 * `opensAt` / `closesAt` as wall-clock times in the restaurant's timezone and
 * build UTC Date objects by composing the date with that timezone offset via
 * Intl. We use date-fns-tz where available; here we keep a minimal portable
 * implementation so the service is unit-testable without a TZ database.
 */
@Injectable()
export class ReservationAvailabilityService {
  generate(input: AvailabilityInputs): AvailabilitySlotDto[] {
    const { restaurant, hours, tables, existing, date, partySize, now } = input;

    const dayOfWeek = wallClockDayOfWeek(date, restaurant.timezone);
    const hoursRow = hours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!hoursRow || hoursRow.isClosed) return [];

    const holidays = (restaurant.holidayDates as unknown as HolidayDto[]) || [];
    const holiday = holidays.find((h) => h.date === date);
    if (holiday?.isClosed) return [];

    const opensAt = holiday?.openOverride ?? hoursRow.opensAt;
    const closesAt = holiday?.closeOverride ?? hoursRow.closesAt;

    const slotMinutes = restaurant.reservationSlotMinutes;
    const bufferMinutes = restaurant.reservationBufferMinutes;
    const slots: AvailabilitySlotDto[] = [];

    const openTs = composeWallClockUtc(date, opensAt, restaurant.timezone);
    const closeTs = composeWallClockUtc(date, closesAt, restaurant.timezone);
    const stepMs = (slotMinutes + bufferMinutes) * 60_000;
    const slotMs = slotMinutes * 60_000;

    for (let t = openTs; t + slotMs <= closeTs; t += stepMs) {
      if (t < now.getTime()) continue;
      const start = new Date(t);
      const end = new Date(t + slotMs);

      let capacity = 0;
      for (const table of tables) {
        const occupied = existing.some(
          (r) => r.tableId === table.id && overlaps(r.startAt, r.endAt, start, end),
        );
        if (!occupied) capacity += table.capacity;
      }

      if (capacity >= partySize) {
        slots.push({ startAt: start.toISOString(), endAt: end.toISOString(), capacity });
      }
    }

    return slots;
  }
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function wallClockDayOfWeek(dateStr: string, tz: string): number {
  // dateStr is already a local date; safest is to ask Intl for the weekday
  // of midday in that zone so DST does not flip the day.
  const midday = new Date(`${dateStr}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz });
  const wd = fmt.format(midday);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

/**
 * Compose a YYYY-MM-DD + HH:mm in the given IANA tz into a UTC ms timestamp.
 * Uses Intl to find the zone offset for that wall clock; correct under DST.
 */
function composeWallClockUtc(dateStr: string, time: string, tz: string): number {
  const [hh, mm] = time.split(':').map(Number);
  // Pretend the wall time is UTC, then correct by the tz offset.
  const asUtc = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    hh,
    mm,
  );
  const tzOffsetMin = tzOffsetMinutes(new Date(asUtc), tz);
  return asUtc - tzOffsetMin * 60_000;
}

function tzOffsetMinutes(d: Date, tz: string): number {
  // Format the same instant in the target tz; compute offset from the diff.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - d.getTime()) / 60_000);
}
