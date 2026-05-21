import preset from "@repo/tailwind-config/tailwind.preset";
import type { Config } from "tailwindcss";

/**
 * Customer web Tailwind config.
 *
 * Extends the shared preset with:
 *  - Web's type scale (Hero 88px, H1 56px, …) — content-first, airier than admin.
 *  - Container max-width 1280px with responsive horizontal padding.
 *  - Web-specific border-radius overrides (softer than admin's 12px card).
 *  - Display font (Fraunces) wired to the --font-display CSS variable that
 *    next/font/google sets in apps/web/src/app/layout.tsx.
 *
 * Tokens are added via `extend` — admin's keys aren't overridden.
 */
const config: Config = {
	presets: [preset as Partial<Config>],
	content: [
		"./src/**/*.{ts,tsx}",
		// Pick up class names used inside shared primitives so utilities are emitted.
		"../../packages/ui/src/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
				sans: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
				body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
			},
			fontSize: {
				// Web type scale from web-01-landing.md §1.2.
				// Format: [size, { lineHeight, fontWeight?, letterSpacing? }].
				// Mobile sizes live in @screen breakpoints applied at the call site.
				hero: ["5.5rem", { lineHeight: "1.05", fontWeight: "500", letterSpacing: "-0.02em" }], // 88
				h1: ["3.5rem", { lineHeight: "1.1", fontWeight: "500" }], // 56
				h2: ["2.5rem", { lineHeight: "1.15", fontWeight: "500" }], // 40
				h3: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }], // 22
				eyebrow: ["0.8125rem", { lineHeight: "1.0", fontWeight: "500", letterSpacing: "0.12em" }], // 13
				"body-l": ["1.1875rem", { lineHeight: "1.55", fontWeight: "400" }], // 19
				body: ["1rem", { lineHeight: "1.55", fontWeight: "400" }], // 16
				small: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }], // 14
				caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.08em" }], // 12
				price: ["1.5rem", { lineHeight: "1.2", fontWeight: "500" }], // 24 — Fraunces, tnum
			},
			borderRadius: {
				// Web softer than admin's 12px default
				card: "1rem", // 16px — dish/category/testimonial cards
				image: "0.75rem", // 12px — inline thumbs
				"image-lg": "1.25rem", // 20px — hero/feature photos
				input: "0.75rem", // 12px — inputs
				button: "1rem", // 16px — pill buttons
			},
			boxShadow: {
				// Allowed in light theme (admin is shadow-free)
				sm: "0 1px 2px rgb(42 31 24 / 0.06)",
				md: "0 4px 12px rgb(42 31 24 / 0.08)",
				lg: "0 12px 32px rgb(42 31 24 / 0.12)",
			},
			maxWidth: {
				"container-narrow": "45rem", // 720px
				container: "80rem", // 1280px
			},
			spacing: {
				"site-nav": "4.5rem", // 72px — desktop site nav height
				"site-nav-mobile": "3.75rem", // 60px — mobile
				// Section vertical rhythm (web-01-landing §1.3)
				"section-y": "6rem", // 96px desktop
				"section-y-mobile": "4rem", // 64px mobile
			},
			transitionDuration: {
				"web-color": "200ms", // color / opacity
				"web-motion": "300ms", // transform
			},
			transitionTimingFunction: {
				"web-out": "cubic-bezier(0.2, 0.8, 0.2, 1)",
			},
			keyframes: {
				"sheet-in-right": {
					"0%": { transform: "translateX(100%)" },
					"100%": { transform: "translateX(0)" },
				},
				"sheet-out-right": {
					"0%": { transform: "translateX(0)" },
					"100%": { transform: "translateX(100%)" },
				},
				"reveal-up": {
					"0%": { opacity: "0", transform: "translateY(20px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				"toast-in": {
					"0%": { opacity: "0", transform: "translateY(-8px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				"sheet-in-right": "sheet-in-right 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
				"sheet-out-right": "sheet-out-right 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
				"reveal-up": "reveal-up 400ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
				"toast-in": "toast-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
			},
		},
	},
};

export default config;
