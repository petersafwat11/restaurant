# Plan: Fix All 5 KPI Sparklines, Dual Y-Axis Chart, and Delta Percent Calculations

## 1. Identified Issues & Senior SWE Solutions

1. **Missing Sparklines for Completion Rate & New Customers**:
   - `kpi-row.tsx` omitted `sparkData` on `completionRate` and `newCustomers`.
   - **Fix**: Update `RevenueTimeseriesPointSchema` to include `completionRate` and `newCustomers` per bucket. Calculate completed orders, cancelled orders, and new user registrations per bucket in `revenueTimeseries`. Pass `sparkData` to all 5 KPI cards in `kpi-row.tsx`.

2. **Dual Y-Axis for Revenue vs Orders Chart**:
   - Currently, when "Zamówienia" (Orders) is toggled ON, the orders line is rendered on the same 0–600 zł monetary Y-axis, causing order counts (3, 5, 12) to sit invisibly flat on the bottom axis.
   - **Fix**: Implement Recharts Dual Y-Axis (`yAxisId="revenue"` on left with currency formatting, and `yAxisId="orders"` on right with integer count formatting). Scale the orders area/line to its own independent vertical axis.

3. **Consistent Sparklines Across All Timeframes (`today`, `7d`, `30d`, `custom`)**:
   - Ensure all completed orders map reliably to their step bucket in `revenueTimeseries`.
   - Update `KpiSparkline` with proper horizontal and vertical padding to prevent single-point or edge-point clipping.

4. **100% Reliable Delta Percent Calculation for all 5 KPI Cards**:
   - In `AnalyticsOverviewSchema`, add `deltaPercent` to `completionRate`.
   - In `analytics.service.ts`, ensure `moneyDelta`, `numericDelta`, `completionRate.deltaPercent`, and `newCustomers.deltaPercent` accurately report percentage changes vs previous periods across all 5 KPIs (returning `+100.0%` for new positive growth from a zero baseline, `0.0%` for neutral, and `(cur - prev) / prev * 100` for active historical baselines).

---

## 2. Proposed File Changes

### A. Types (`packages/types`)
- **`packages/types/src/analytics.ts`**:
  - Add `deltaPercent?: number` to `completionRate` in `AnalyticsOverviewSchema`.
  - Add `completionRate?: number` and `newCustomers?: number` to `RevenueTimeseriesPointSchema`.

### B. API (`apps/api`)
- **`apps/api/src/analytics/analytics.service.ts`**:
  - In `revenueTimeseries`: compute `revenue`, `orders`, `completionRate`, and `newCustomers` per time bucket.
  - In `overview`: return accurate `deltaPercent` across all 5 metrics.

### C. Admin UI (`apps/admin`)
- **`apps/admin/src/features/overview/components/revenue-area-chart.tsx`**:
  - Add secondary `YAxis` (`yAxisId="orders"`) with right orientation when `showOrders` is true.
  - Bind `Area dataKey="orders"` to `yAxisId="orders"` with distinct stroke and semi-transparent fill.
- **`apps/admin/src/features/overview/components/kpi-row.tsx`**:
  - Supply `sparkData` for all 5 KPI cards (`sparkRevenue`, `sparkOrders`, `sparkAov`, `sparkCompletionRate`, `sparkNewCustomers`).
- **`apps/admin/src/features/overview/components/kpi-sparkline.tsx`**:
  - Set margins (`margin={{ top: 6, right: 4, bottom: 6, left: 4 }}`) for clean visual rendering.

---

## 3. Verification Plan

- Run `@repo/types`, `@repo/admin`, and `@repo/api` typechecks.
- Run `@repo/admin` and `@repo/api` test suites.
- Verify Dual Y-Axis chart scaling and sparkline arrays across all 5 cards.
