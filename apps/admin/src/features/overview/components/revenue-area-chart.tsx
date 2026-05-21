'use client';

import {
  ACCENT_GRADIENT,
  CHART_AXIS_COLOR,
  CHART_GRID_COLOR,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_BORDER,
} from '@repo/ui';
import { fmtAxisCurrency, fmtInt, formatMoney } from '@repo/utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartPoint {
  t: string;
  revenue: number;
  orders: number;
}

interface RevenueAreaChartProps {
  points: ChartPoint[];
  showOrders: boolean;
  xInterval: number;
  currency: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: TooltipProps<number, string> & { currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-card"
      style={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
    >
      <div className="mb-1 font-medium text-fg">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey as string} className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-fg-subtle">
            <span className="h-2 w-2 rounded-full" style={{ background: p.stroke as string }} />
            {p.dataKey === 'revenue' ? 'Revenue' : 'Orders'}
          </span>
          <span className="ml-auto font-medium tabular-nums text-fg">
            {p.dataKey === 'revenue'
              ? formatMoney(Number(p.value), currency)
              : fmtInt(Number(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueAreaChart({
  points,
  showOrders,
  xInterval,
  currency,
}: RevenueAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="rgb(var(--chart-1))"
              stopOpacity={ACCENT_GRADIENT.topOpacity}
            />
            <stop
              offset="100%"
              stopColor="rgb(var(--chart-1))"
              stopOpacity={ACCENT_GRADIENT.bottomOpacity}
            />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="t"
          axisLine={false}
          tickLine={false}
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
          interval={xInterval}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
          tickFormatter={(v: number) => fmtAxisCurrency(v)}
          width={56}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="rgb(var(--chart-1))"
          strokeWidth={2}
          fill="url(#revGrad)"
          isAnimationActive
          animationDuration={400}
        />
        {showOrders && (
          <Area
            type="monotone"
            dataKey="orders"
            stroke="rgb(var(--chart-2))"
            strokeWidth={1.5}
            fill="transparent"
            isAnimationActive
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
