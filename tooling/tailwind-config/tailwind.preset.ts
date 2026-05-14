import type { Config } from "tailwindcss";

/**
 * Shared Tailwind preset — token primitives ONLY.
 * Values are placeholders; the design-system sprint will replace them.
 * Do not author utility classes against these tokens yet; this file exists
 * so the build pipeline compiles.
 */
const preset = {
	content: [],
	theme: {
		extend: {
			colors: {
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
				surface: {
					DEFAULT: "#ffffff",
					muted: "#f5f7fa",
					inverse: "#1f2933",
				},
				text: {
					DEFAULT: "#1f2933",
					muted: "#52606d",
					inverse: "#ffffff",
				},
				accent: {
					DEFAULT: "#d97706",
					muted: "#fef3c7",
				},
				danger: "#dc2626",
				success: "#16a34a",
				warning: "#d97706",
			},
			spacing: {
				// 4px scale; extend in design-system sprint
			},
			borderRadius: {
				sm: "0.25rem",
				DEFAULT: "0.5rem",
				md: "0.75rem",
				lg: "1rem",
				xl: "1.5rem",
				"2xl": "2rem",
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				display: ["Inter", "system-ui", "sans-serif"],
				mono: ["JetBrains Mono", "ui-monospace", "monospace"],
			},
			fontSize: {
				// Inherits Tailwind defaults; override in design-system sprint
			},
			boxShadow: {
				card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
			},
		},
	},
	plugins: [],
} satisfies Partial<Config>;

export default preset;
