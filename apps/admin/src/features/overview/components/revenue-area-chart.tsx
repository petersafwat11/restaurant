'use client';

import {
  ACCENT_GRADIENT,
  CHART_AXIS_COLOR,
  CHART_GRID_COLOR,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_BORDER,
} from '@repo/ui';
import { fmtAxisCurrency, fmtInt, formatMoney } from '@repo/utils';
import { useLocale } from 'next-intl';
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
  period?: string;
  labelRevenue?: string;
  labelOrders?: string;
}

function formatAxisTime(iso: string, period?: string, locale = 'en-US'): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    if (period === 'today') {
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
  } catch {
    return iso;
  }
}

function formatTooltipLabel(iso: string, period?: string, locale = 'en-US'): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    if (period === 'today') {
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      return `Today ${h}:${m}`;
    }
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  } catch {
    return iso;
  }
}

function formatAxisMoney(value: number, currency: string, locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  period,
  locale = 'en-US',
  labelRevenue = 'Revenue',
  labelOrders = 'Orders',
}: TooltipProps<number, string> & {
  currency: string;
  period?: string;
  locale?: string;
  labelRevenue?: string;
  labelOrders?: string;
}) {
  if (!active || !payload?.length) return null;
  const formattedLabel = typeof label === 'string' ? formatTooltipLabel(label, period, locale) : label;

  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-card"
      style={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
    >
      <div className="mb-1 font-medium text-fg">{formattedLabel}</div>
      {payload.map((p) => (
        <div key={p.dataKey as string} className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-fg-subtle">
            <span className="h-2 w-2 rounded-full" style={{ background: p.stroke as string }} />
            {p.dataKey === 'revenue' ? labelRevenue : labelOrders}
          </span>
          <span className="ml-auto font-medium tabular-nums text-fg">
            {p.dataKey === 'revenue'
              ? formatMoney(Number(p.value), currency, locale)
              : fmtInt(Number(p.value), locale)}
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
  period = 'today',
  labelRevenue = 'Revenue',
  labelOrders = 'Orders',
}: RevenueAreaChartProps) {
  const locale = useLocale();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
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
          tickFormatter={(v: string) => formatAxisTime(v, period, locale)}
          interval={xInterval}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
          tickFormatter={(v: number) => formatAxisMoney(v, currency, locale)}
          width={56}
        />
        <Tooltip
          content={
            <ChartTooltip
              currency={currency}
              period={period}
              locale={locale}
              labelRevenue={labelRevenue}
              labelOrders={labelOrders}
            />
          }
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
