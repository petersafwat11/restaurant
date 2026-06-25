# Fix: all displayed times must be the restaurant's (Poland) timezone

## Problem
The locations page shows "It's 10:19 PM, Wednesday" while Poland is 9:19 PM. Root
cause: the customer web app computes "now" with `new Date()` and reads
`.getHours()/.getMinutes()/.getDay()` — these are the **visitor's browser**
timezone. A visitor 1h ahead of Poland (e.g. UTC+3) sees the clock and the
open/closed status off by an hour.

The **server** is already correct — it computes everything in
`restaurant.timezone` (`Europe/Warsaw`, seeded) with DST-aware `Intl` helpers
(`period-range.ts`, `reservation-availability.service.ts`, `marketing.service.ts`).
The bug is purely **client-side display logic** that ignores `restaurant.timezone`
(which is already exposed on the public DTO).

## Rule
Every wall-clock time / calendar date rendered to a human is computed in
`restaurant.timezone ?? 'Europe/Warsaw'`. **Never** fall back to host-local (schema
default is `"UTC"`, DTO field optional). Durations / relative deltas ("5m ago",
prep time) are zone-independent and stay as-is.

## Phase 1 — Shared helper (`packages/utils/src/format.ts`, browser-safe)
Add `zonedParts(date, tz)` → `{ year, month, day, hour, minute, weekday }` using
`Intl.DateTimeFormat('en-US', { timeZone, hourCycle:'h23', ... })` (reuse the
`hourCycle:'h23'` midnight-"24" ICU fix already documented in period-range.ts).
Export it. (Server consolidation onto this helper is optional/out-of-scope —
don't rewrite tested-correct server code.)

## Phase 2 — Customer web (the reported bug) — delivery priority
- `features/restaurants/lib/restaurant-info.ts` `todayStatus(hours, now, tz)`:
  derive dayOfWeek & minutes from `zonedParts(now, tz)`.
- `(marketing)/locations/locations-app.tsx`:
  - `computeStatus` uses zoned parts (today + mins).
  - `formatNow(locale, now, tz)` → add `timeZone: tz` (this is the visible bug).
  - clock line `longDay(...)` uses the **zoned** weekday, not `now.getDay()`.
  - **Leave `formatHM` untouched** — it formats a synthetic "HH:MM" label, adding
    a timeZone would shift it wrong.
  - thread `r.timezone` through.
- `features/landing/sections/hero-live-badges.tsx`: pass `restaurant.timezone`.
- `packages/ui/src/hours-table/index.tsx`: add optional `timezone?` prop;
  compute "today" via zoned weekday. Also removes a latent SSR/CSR hydration
  mismatch (`new Date().getDay()` differs server vs browser).
- Pass `timezone` from both `hours-location.tsx` and `locations-app.tsx`.

## Phase 3 — Admin + shared UI primitives (no carve-outs)
Discriminator: renders an absolute wall-clock/date to a human → fix; duration or
relative delta → leave.
- `packages/ui/src/relative-time/index.tsx`: tooltip `toLocaleString` → accept &
  apply `timezone`. Keep the "5m ago" label as-is.
- `packages/ui/src/reservation-calendar/index.tsx`: hour/day grid math + "now"
  line + date labels → zone-aware.
- `packages/ui/src/time-slot-picker/index.tsx`: slot labels → zone-aware.
- Sweep the 27 admin files using date formatting; fix any rendering an absolute
  time/date without threading the restaurant tz (reservations page already does
  it right via `formatRestaurantDateTime(startAt, tz)` — use that as the pattern).

## Out of scope
- Server time math (already zone-correct, spec-covered).
- `apps/mobile` (Expo stubs; "mobile" = responsive web).
- Past-midnight closing hours (`close < open`) — a separate pre-existing bug,
  not timezone. Only touch if Szef Donald's seeded hours actually cross midnight.

## Verification
This machine is the test rig (UTC+3 browser surfaced the bug). After the fix the
locations clock must read Poland time (~9:1x PM), not local (~10:1x PM).
Repeatable: Playwright context `timezoneId: 'Asia/Tokyo'` → clock + open/closed
stay Poland regardless of browser zone. Confirm no React hydration warning.
Run web + ui + utils unit tests (`hours-table.test.tsx` asserts today highlight).
