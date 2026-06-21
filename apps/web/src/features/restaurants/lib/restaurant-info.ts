import type { RestaurantAddressDto, RestaurantPublicDto } from '@repo/types';
import type { DayOfWeek, HoursRow } from '@repo/ui';

type HourDto = NonNullable<RestaurantPublicDto['hours']>[number];

/** Map the API's operating-hours DTOs to the `<HoursTable>` row shape. */
export function hoursToRows(hours: HourDto[] | undefined | null): HoursRow[] {
  return (hours ?? []).map((h) => ({
    dayOfWeek: h.dayOfWeek as DayOfWeek,
    opensAt: h.opensAt,
    closesAt: h.closesAt,
    isClosed: h.isClosed,
  }));
}

/** "25-115 Kielce" — zip + city from the DB address (no hardcoded copy). */
export function formatAddressLine2(address: RestaurantAddressDto): string {
  return [address.zip, address.city].filter(Boolean).join(' ');
}

/**
 * Google Maps directions link. Prefers the restaurant's stored geo-point and
 * falls back to a text search of the DB address — never hardcoded coordinates.
 */
export function directionsHref(r: Pick<RestaurantPublicDto, 'geoPoint' | 'address'>): string {
  if (r.geoPoint) {
    return `https://www.google.com/maps/dir/?api=1&destination=${r.geoPoint.lat},${r.geoPoint.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.address.line1}, ${r.address.city}`,
  )}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Lightweight "is the restaurant open right now and when does it close" for the
 * hero badge. Returns null when hours aren't loaded yet. The locations page has
 * a richer status (next-open lookahead); this only needs today.
 */
export function todayStatus(
  hours: HourDto[] | undefined | null,
  now: Date,
): { isOpen: boolean; closesAt: string | null } | null {
  if (!hours || hours.length === 0) return null;
  const todayRow = hours.find((h) => h.dayOfWeek === now.getDay());
  if (!todayRow || todayRow.isClosed) return { isOpen: false, closesAt: null };
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(todayRow.opensAt);
  const close = toMinutes(todayRow.closesAt);
  return { isOpen: mins >= open && mins < close, closesAt: todayRow.closesAt };
}
