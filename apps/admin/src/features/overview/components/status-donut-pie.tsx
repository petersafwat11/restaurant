'use client';

import { CHART_TOOLTIP_BG, CHART_TOOLTIP_BORDER } from '@repo/ui';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts';

interface DonutItem {
  status: string;
  count: number;
  varRef: string;
}

interface StatusDonutPieProps {
  items: DonutItem[];
  total: number;
}

interface DonutTooltipDatum {
  status: string;
  count: number;
  fill?: string;
}

function humanize(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DonutTooltip({
  active,
  payload,
  total,
}: TooltipProps<number, string> & { total: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  if (!p) return null;
  const datum = p.payload as DonutTooltipDatum;
  const pct = total > 0 ? ((p.value as number) / total) * 100 : 0;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-card"
      style={{ background: CHART_TOOLTIP_BG, border: `1px solid ${CHART_TOOLTIP_BORDER}` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-fg-subtle">
          <span className="h-2 w-2 rounded-full" style={{ background: datum.fill }} />
          {humanize(datum.status)}
        </span>
        <span className="ml-auto font-medium tabular-nums text-fg">
          {p.value} · {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export default function StatusDonutPie({ items, total }: StatusDonutPieProps) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie
          data={items}
          dataKey="count"
          nameKey="status"
          innerRadius={60}
          outerRadius={80}
          startAngle={90}
          endAngle={-270}
          stroke="rgb(var(--surface))"
          strokeWidth={2}
          paddingAngle={1}
          isAnimationActive
          animationDuration={500}
        >
          {items.map((it) => (
            <Cell key={it.status} fill={it.varRef} />
          ))}
        </Pie>
        <Tooltip content={<DonutTooltip total={total} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
