import type { RestaurantAddressDto, RestaurantPublicDto } from '@repo/types';
import type { DayOfWeek, HoursRow } from '@repo/ui';
import { zonedParts } from '@repo/utils';
import { GOOGLE_MAPS_URL } from '@/lib/brand';

/** The restaurant lives in Poland; never trust the visitor's browser clock. */
export const FALLBACK_TIMEZONE = 'Europe/Warsaw';

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
 * Google Maps link for "Get directions" / "Open in Maps". Prefers the owner's
 * canonical Google Business place link (`GOOGLE_MAPS_URL`) so it opens the real
 * "Szef Donald" listing; falls back to the stored geo-point, then a text search
 * of the DB address.
 */
export function directionsHref(r: Pick<RestaurantPublicDto, 'geoPoint' | 'address'>): string {
  // Canonical place link first; coordinate/address links remain as fallbacks in
  // case the constant is ever cleared.
  const fallback = r.geoPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${r.geoPoint.lat},${r.geoPoint.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${r.address.line1}, ${r.address.city}`,
      )}`;
  return GOOGLE_MAPS_URL || fallback;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Lightweight "is the restaurant open right now and when does it close" for the
 * hero badge. Returns null when hours aren't loaded yet. The locations page has
 * a richer status (next-open lookahead); this only needs today.
 *
 * `tz` is the restaurant's IANA zone — the day-of-week and minutes are computed
 * there, not in the visitor's browser timezone.
 */
export function todayStatus(
  hours: HourDto[] | undefined | null,
  now: Date,
  tz: string = FALLBACK_TIMEZONE,
): { isOpen: boolean; closesAt: string | null } | null {
  if (!hours || hours.length === 0) return null;
  const parts = zonedParts(now, tz);
  const todayRow = hours.find((h) => h.dayOfWeek === parts.weekday);
  if (!todayRow || todayRow.isClosed) return { isOpen: false, closesAt: null };
  const mins = parts.hour * 60 + parts.minute;
  const open = toMinutes(todayRow.opensAt);
  const close = toMinutes(todayRow.closesAt);
  return { isOpen: mins >= open && mins < close, closesAt: todayRow.closesAt };
}
