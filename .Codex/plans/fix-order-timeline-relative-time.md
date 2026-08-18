# Fix Order Popup Timeline Relative Time Formatting

## Problem
In the admin dashboard's order popup (Detail Drawer), the Activity Timeline renders relative timestamps using `<RelativeTime />`. The formatter previously abbreviated minutes as `m` (e.g. `11m ago`, `9m ago`), which is ambiguous and easily misread as "11 months ago" or "9 months ago".

## Proposed Changes
1. **`packages/ui/src/relative-time/index.tsx`**:
   - Update `formatRelative(ms: number)` to format minutes as `${min} min ago` / `${min} mins ago` (and `in ${min} min(s)` for future timestamps).
   - Clarify other units: `hr`/`hrs`, `day`/`days`, `month`/`months`, `yr`/`yrs`.
   - Export `formatRelative`.

2. **`packages/ui/src/relative-time/relative-time.test.ts`**:
   - Add unit tests for `formatRelative` covering seconds, minutes, hours, days, months, and years in both past and future.

3. **`apps/admin/src/components/orders/order-alarm-banner.tsx`**:
   - Update `minutesPending` string to `${minutesPending} ${minutesPending === 1 ? 'min' : 'mins'} ago`.

## Verification
- `pnpm typecheck`
- `pnpm test`
