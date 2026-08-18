# Senior SWE Architectural Implementation Plan: Admin Dashboard Overview End-to-End Fixes

## 1. Executive Summary & Root Cause Architecture Review

Based on deep analysis of the 5 user-provided production screenshots and end-to-end tracing from database models to frontend presentation:

| Defect Observed | Architectural Root Cause | Senior SWE Resolution |
| :--- | :--- | :--- |
| **1. Revenue timeseries & sparklines flat on 0.00 zł** (Screenshot 2 & 3) | `revenueTimeseries` relied on raw SQL `date_trunc` with PostgreSQL timezone expressions and enum array casting `${COMPLETED_STATUSES}::text[]::"OrderStatus"[]`. Node-postgres deserialization mismatch caused 100% of time buckets to fail matching and default to `0.00`. | Replace brittle raw SQL with type-safe Prisma `findMany` matching `COMPLETED_STATUSES`, bucketed in-memory by exact millisecond intervals. Guarantees 100% mathematical reconciliation with the Overview KPI cards. |
| **2. Extreme average prep time (`20h 50m`)** (Screenshot 4 & 5) | `avgPrepMinutes` calculated an unbounded time span between `CONFIRMED` and `READY` events. Development/testing orders left overnight produced 1,250-minute outliers that dominated the arithmetic mean. | Filter duration to operational kitchen limits (`1 <= duration_minutes <= 180`) and join acknowledging order creation/confirmation cleanly. |
| **3. KPI Delta rendering `↑ 0.0%` in green** (Screenshot 1 & 2) | `KpiCard` evaluated `deltaPercent >= 0` as positive, rendering a green `↑` arrow and positive color even when change was zero. Backend `moneyDelta` and `numericDelta` returned 0 on zero baselines. | Add neutral styling (`text-fg-subtle`, no arrow) for `deltaPercent === 0`. Standardize delta calculations for initial periods. |
| **4. Hardcoded English segmented date tabs** (Screenshots 1, 2, 3) | `DateRangeSegmented` contained hardcoded strings `'Today'`, `'7 days'`, `'30 days'`, `'Custom'` instead of reading `useTranslations('admin.dashboard.period')`. | Localize tab labels dynamically (`"Dziś"`, `"7 dni"`, `"30 dni"`, `"Własny"` in PL; `"Today"`, `"7 days"`, `"30 days"`, `"Custom"` in EN). |
| **5. Revenue Area Chart Tooltip & Axis localization** (Screenshot 3) | `RevenueAreaChart` hardcoded English series labels `"Revenue"` and `"Orders"`. Y-axis used prefix notation `zł4` instead of Polish suffix `4 zł`. X-axis tick format was not locale-aware. | Pass translated series labels from `RevenueChart`. Use `Intl.DateTimeFormat` with active locale (`11 sie` in PL / `Aug 11` in EN) and locale-aware axis currency formatting. Ensure adequate right-side margin to avoid label clipping. |

---

## 2. Detailed Technical Plan

### A. API Layer (`apps/api`)

#### 1. `apps/api/src/analytics/analytics.service.ts`
- **`revenueTimeseries(q)`**:
  - Query completed orders directly with `prisma.order.findMany({ where: { createdAt: { gte: range.from, lt: range.to }, status: { in: COMPLETED_STATUSES } }, select: { createdAt: true, grandTotal: true } })`.
  - Initialize continuous buckets from `range.from` to `range.to` with step `stepMs` (`hour` for today, `day` for 7d/30d/custom).
  - Accumulate order `grandTotal` and count into the matching bucket index.
  - Return formatted ISO string buckets with 2-decimal revenue strings.
- **`aggregateForRange(from, to)`**:
  - Bound `avgPrepMinutes` query with `AND (EXTRACT(EPOCH FROM (r."createdAt" - c."createdAt")) / 60.0) BETWEEN 1 AND 180`.
- **`moneyDelta` / `numericDelta`**:
  - Ensure `prev === 0 && cur === 0` returns `deltaPercent: 0`.
  - Ensure `prev === 0 && cur > 0` returns `deltaPercent: 100`.

---

### B. UI & Component Layer (`apps/admin`)

#### 1. `apps/admin/src/components/shell/date-range-segmented.tsx`
- Use `useTranslations('admin.dashboard.period')` to translate segment labels:
  - `today` -> `t('today')`
  - `7d` -> `t('7d')`
  - `30d` -> `t('30d')`
  - `custom` -> `t('custom')`

#### 2. `apps/admin/src/features/overview/components/kpi-card.tsx`
- Differentiate `deltaPercent > 0` (green with `ArrowUp`), `deltaPercent < 0` (red with `ArrowDown`), and `deltaPercent === 0` (neutral `text-fg-subtle` without directional arrow).

#### 3. `apps/admin/src/features/overview/components/revenue-chart.tsx` & `revenue-area-chart.tsx`
- In `revenue-chart.tsx`, pass `labelRevenue={t('seriesRevenue')}` and `labelOrders={t('seriesOrders')}` to `RevenueAreaChart`.
- In `revenue-area-chart.tsx`:
  - Display localized series names in tooltip.
  - Format X-axis ticks and tooltips using active locale (`pl-PL` / `en-US`).
  - Format Y-axis ticks with locale currency (`400 zł` / `$400`).
  - Set chart margins (`right: 16`) to prevent label clipping.

---

### C. Translation Layer (`packages/i18n`)
- Verify and update `packages/i18n/messages/pl/admin/dashboard.json` and `en/admin/dashboard.json` for concise custom range labels:
  - PL: `"custom": "Własny"`
  - EN: `"custom": "Custom"`

---

## 3. Verification & Testing Strategy

1. **Unit & E2E Testing**:
   - Run `pnpm --filter @repo/api test` to verify `period-range.spec.ts` and all API unit tests.
   - Run `pnpm --filter @repo/admin test` to verify `overview-page.test.tsx` and all component specs.
2. **Type Safety & Build**:
   - Run `tsc --noEmit` across `@repo/types`, `@repo/api`, and `@repo/admin`.
3. **Data Reconciliation Check**:
   - Verify that sum of timeseries revenue across all buckets strictly equals total overview revenue for all periods (`today`, `7d`, `30d`, `custom`).
