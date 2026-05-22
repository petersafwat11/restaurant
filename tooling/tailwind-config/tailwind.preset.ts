import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Shared Tailwind preset.
 *
 * Two layers:
 *   1. Semantic CSS-variable-backed tokens — apps override the variables in
 *      their globals.css. `@repo/ui` primitives MUST only use these names so
 *      they stay theme-agnostic (admin = dark mint; web/mobile customer apps
 *      will use a lighter palette later, swapped via :root vars only).
 *   2. Legacy literal tokens (`brand`, `text.*`, `surface.*`, etc.) preserved
 *      for web/mobile customer scaffolding until those apps migrate.
 *
 * RGB triple convention: every var is declared as "R G B" (no commas, no
 * rgb() wrapper). The `<alpha-value>` placeholder lets Tailwind compose
 * `bg-surface/60`, `border-border/30`, etc.
 */
const preset = {
	content: [],
	theme: {
		extend: {
			colors: {
				// ── Semantic tokens (per-app overridable) ───────────────────
				bg: "rgb(var(--bg) / <alpha-value>)",
				surface: "rgb(var(--surface) / <alpha-value>)",
				"surface-2": "rgb(var(--surface-elevated) / <alpha-value>)",
				// Alias for the same token under a more descriptive name. Most
				// app code references `bg-surface-elevated`; without this entry
				// Tailwind silently drops those classes and elements lose their
				// background (e.g. the landing hero "Open now" / chef badges).
				"surface-elevated": "rgb(var(--surface-elevated) / <alpha-value>)",
				"surface-warm": "rgb(var(--surface-warm) / <alpha-value>)",
				border: "rgb(var(--border) / <alpha-value>)",
				"border-strong": "rgb(var(--border-strong) / <alpha-value>)",
				fg: "rgb(var(--fg) / <alpha-value>)",
				"fg-muted": "rgb(var(--fg-muted) / <alpha-value>)",
				"fg-subtle": "rgb(var(--fg-subtle) / <alpha-value>)",
				"fg-disabled": "rgb(var(--fg-disabled) / <alpha-value>)",
				"text-on-accent": "rgb(var(--text-on-accent) / <alpha-value>)",

				accent: {
					DEFAULT: "rgb(var(--accent) / <alpha-value>)",
					hover: "rgb(var(--accent-hover) / <alpha-value>)",
					muted: "rgb(var(--accent) / 0.10)",
				},

				positive: "rgb(var(--positive) / <alpha-value>)",
				negative: "rgb(var(--negative) / <alpha-value>)",
				warning: "rgb(var(--warning) / <alpha-value>)",
				info: "rgb(var(--info) / <alpha-value>)",

				// Status palette (one var per order status)
				"status-pending": "rgb(var(--status-pending) / <alpha-value>)",
				"status-confirmed": "rgb(var(--status-confirmed) / <alpha-value>)",
				"status-preparing": "rgb(var(--status-preparing) / <alpha-value>)",
				"status-ready": "rgb(var(--status-ready) / <alpha-value>)",
				"status-out-for-delivery":
					"rgb(var(--status-out-for-delivery) / <alpha-value>)",
				"status-delivered": "rgb(var(--status-delivered) / <alpha-value>)",
				"status-cancelled": "rgb(var(--status-cancelled) / <alpha-value>)",
				"status-refunded": "rgb(var(--status-refunded) / <alpha-value>)",

				// Chart palette (5 series, in plotting order)
				"chart-1": "rgb(var(--chart-1) / <alpha-value>)",
				"chart-2": "rgb(var(--chart-2) / <alpha-value>)",
				"chart-3": "rgb(var(--chart-3) / <alpha-value>)",
				"chart-4": "rgb(var(--chart-4) / <alpha-value>)",
				"chart-5": "rgb(var(--chart-5) / <alpha-value>)",

				// ── Legacy literal tokens (web/mobile customer scaffolding) ──
				brand: {
					50: "#f5f7fa",
					100: "#e4e7eb",
					200: "#cbd2d9",
					300: "#9aa5b1",
					400: "#7b8794",
					500: "#616e7c",
					600: "#52606d",
					700: "#3e4c59",
					800: "#323f4b",
					900: "#1f2933",
				},
				danger: "#dc2626",
				success: "#16a34a",
			},
			spacing: {
				// 8pt grid additions (Tailwind's default 4px scale stays intact)
				"4.5": "1.125rem", // 18px — used in compact row paddings
				"13": "3.25rem", // 52px — sidebar collapsed inner
				"15": "3.75rem", // 60px — Topbar inner
				sidebar: "15rem", // 240px
				"sidebar-collapsed": "4rem", // 64px
				topbar: "3.5rem", // 56px
				"page-max": "90rem", // 1440px
			},
			borderRadius: {
				sm: "0.25rem",
				DEFAULT: "0.5rem",
				md: "0.75rem",
				lg: "1rem",
				xl: "1.5rem",
				"2xl": "2rem",
				card: "0.75rem", // 12px — admin card radius
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				display: ["Inter", "system-ui", "sans-serif"],
				mono: ["JetBrains Mono", "ui-monospace", "monospace"],
			},
			fontSize: {
				// Admin scale from README §4 — keys are admin-design names,
				// utility-class consumers pick a size that fits.
				"display-admin": ["2rem", { lineHeight: "1.2", fontWeight: "600" }], // 32/600
				"h1-admin": ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }], // 24/600
				"h2-admin": ["1rem", { lineHeight: "1.4", fontWeight: "600" }], // 16/600
				"body-admin": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }], // 14/400
				"small-admin": ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }], // 13/400
				"caption-admin": [
					"0.75rem",
					{
						lineHeight: "1.3",
						fontWeight: "500",
						letterSpacing: "0.06em",
					},
				],
			},
			boxShadow: {
				card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
			},
			transitionTimingFunction: {
				"admin-out": "cubic-bezier(0.2, 0.8, 0.2, 1)",
			},
			transitionDuration: {
				"admin-fast": "150ms",
				"admin-base": "200ms",
			},
			keyframes: {
				"row-arrive": {
					"0%": { opacity: "0", transform: "translateY(-12px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				"accent-pulse": {
					"0%": { boxShadow: "inset 2px 0 0 0 rgb(var(--accent) / 1)" },
					"100%": { boxShadow: "inset 2px 0 0 0 rgb(var(--accent) / 0)" },
				},
			},
			animation: {
				"row-arrive": "row-arrive 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
				"accent-pulse": "accent-pulse 3000ms linear forwards",
			},
		},
	},
	plugins: [tailwindcssAnimate],
} satisfies Partial<Config>;

export default preset;
