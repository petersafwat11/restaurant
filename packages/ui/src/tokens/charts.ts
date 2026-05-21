/**
 * Chart palette.
 *
 * Recharts components don't accept Tailwind classes for `fill` / `stroke`;
 * they need string colors. By centralizing into CSS-var references here,
 * every chart picks up the theme automatically when the admin :root vars
 * change (or when web/mobile customer apps later define their own palette).
 */

export const CHART_PALETTE = [
  'rgb(var(--chart-1))',
  'rgb(var(--chart-2))',
  'rgb(var(--chart-3))',
  'rgb(var(--chart-4))',
  'rgb(var(--chart-5))',
] as const;

export const CHART_AXIS_COLOR = 'rgb(var(--fg-subtle))';
export const CHART_GRID_COLOR = 'rgb(var(--border-strong) / 0.08)';
export const CHART_TOOLTIP_BG = 'rgb(var(--surface-elevated))';
export const CHART_TOOLTIP_BORDER = 'rgb(var(--border-strong) / 0.2)';

/**
 * Gradient stops for area-chart fills. Used by Overview KPI sparklines + main
 * chart. README §6 carry-over fix #4: gradient must hit the specced opacity.
 */
export const ACCENT_GRADIENT = {
  topOpacity: 0.25,
  bottomOpacity: 0,
} as const;
