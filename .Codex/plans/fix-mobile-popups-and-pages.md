# Plan: Fix Mobile Popups and Page Layout Issues (Admin & PWA)

## Goal
Fix popup/modal sizing on mobile screens (Admin Dashboard & PWA) so they don't stretch edge-to-edge covering full width/height. Address mobile UI defects in Admin Dashboard Overview KPI cards, Order Details page title/keyboard section, and Reservations calendar view.

## 1. Mobile Popups & Modals (Admin & PWA)
- **`packages/ui/src/_shadcn/dialog.tsx`**: Update `DialogContent` to use `w-[calc(100vw-2rem)] sm:w-full max-w-lg` and `max-h-[calc(100vh-2rem)] overflow-y-auto` with responsive padding `p-4 sm:p-6`. This ensures floating popups maintain rounded corners, margins, backdrop visibility, and clean internal scrolling on mobile viewports.
- **`packages/ui/src/action-modal/index.tsx`**: Clamp explicitly configured `width` to `min(${width}px, calc(100vw - 2rem))` on mobile viewports.
- **`packages/ui/src/_shadcn/sheet.tsx` & `packages/ui/src/detail-drawer/index.tsx`**: Ensure drawers on mobile viewports cap max-width at `max-w-[calc(100vw-1.5rem)]` so backdrop overlay remains visible on mobile screen edges.

## 2. Admin Dashboard Overview KPI Cards (Image 1)
- **`apps/admin/src/features/overview/components/kpi-row.tsx`**: Change grid definition to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5` so stat cards have full width on narrow phones.
- **`apps/admin/src/features/overview/components/kpi-card.tsx`**: Apply `whitespace-nowrap` on trend label (`vs. poprzedni okres`) and allow flex wrapping so text doesn't break awkwardly onto isolated lines.

## 3. Admin Order Details Page Mobile Layout (Images 2 & 3)
- **`apps/admin/src/app/[locale]/(dashboard)/orders/[id]/page.tsx`**:
  - Prevent Order ID (`R-2026-000019`) from breaking character-by-character into 3 lines by adding `whitespace-nowrap` / `truncate` / responsive text size (`text-xl sm:text-h1`) and responsive flex container.
  - Hide keyboard shortcuts section on touch / mobile devices (`hidden md:block`).

## 4. Admin Reservations Page Mobile Layout (Image 4)
- **`packages/ui/src/reservation-calendar/index.tsx`**: Hide the 120px empty balancing spacer in `CalendarHeader` on mobile screens (`hidden sm:block sm:w-[120px]`), allowing date string (`Tuesday, August 11, 2026`) to fit on one line.
- **`apps/admin/src/app/[locale]/(dashboard)/reservations/page.tsx`**: Make view switcher and action button container responsive on mobile and fix container scrollbar clipping.

## Verification
- Run `pnpm --filter @repo/ui build` and check TypeScript compilation across `apps/admin` and `apps/web`.
- Inspect components visually against mobile viewport dimensions.
