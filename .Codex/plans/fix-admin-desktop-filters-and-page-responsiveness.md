# Plan: Admin Dashboard Desktop Orders Filters & Full Responsive Audit

## Goal
Fix the desktop Orders page filters layout issue (stair-step staggered inputs/buttons as seen in screenshot) by restructuring the header into 2 clean, full-width rows. Audit and polish page responsiveness across all Admin Dashboard pages.

## 1. Orders Page Filters & Header Redesign (Desktop & Mobile)
- **`apps/admin/src/app/[locale]/(dashboard)/orders/page.tsx`**:
  - Restructure `PageHeader` into 2 distinct, clean rows:
    - **Row 1**: Status filter pills strip (`FilterPillGroup` + `LivePulseChip`) on the left, with action controls (`SoundToggle` + `ExportDropdown`) aligned on the right.
    - **Row 2**: Search & Filters bar containing Search input on the left (`w-64 sm:w-72`), `Type` filter dropdown, `Payment` filter dropdown, `Sort` select dropdown, and `Clear filters` button.
- **`apps/admin/src/features/orders/components/orders-filters.tsx`**:
  - Modularize `OrdersFilters` to support clean 2-row layout without inline flex wrapping conflicts or stair-step displacement.

## 2. Page-by-Page Admin Responsiveness & Layout Polish
- **Customers (`customers-list.tsx`)**: Align segment pills and search bar in 2-row header for clean desktop/mobile alignment.
- **Reviews (`reviews-list.tsx`)**: Ensure review rating pills and search controls scale smoothly on all viewports.
- **Staff (`staff-list.tsx`)**: Polish staff member table and action buttons responsiveness.
- **Menu (`menu/page.tsx`)**: Ensure `TwoPaneLayout` category/item panes stack cleanly on mobile (< lg) and scroll independently on desktop (lg+).

## Verification
- Run `pnpm typecheck` across all workspace packages and apps.
- Verify desktop and mobile layouts for Orders, Customers, Menu, Staff, and Reviews pages.
